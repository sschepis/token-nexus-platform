const Parse = require('parse/node');

/**
 * Delete audit log entries (admin only, with strict controls)
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.auditLogId - Audit log ID to delete
 * @param {string} request.params.reason - Reason for deletion (required)
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('deleteAuditLog', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.auditLogId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: auditLogId');
    }

    if (!params.reason || params.reason.trim().length < 10) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Deletion reason must be at least 10 characters long');
    }

    // Query the audit log
    const auditLogQuery = new Parse.Query('AuditLog');
    const auditLog = await auditLogQuery.get(params.auditLogId, { useMasterKey: true });
    
    if (!auditLog) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Audit log not found');
    }

    const auditOrgId = auditLog.get('orgId');
    
    // Verify user has access to this audit log's organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', auditOrgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this audit log');
    }

    // Check permissions - only system admins can delete audit logs
    const userRoles = orgUser.get('roles') || [];
    const isSystemAdmin = userRoles.includes('system_admin');
    
    if (!isSystemAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can delete audit logs');
    }

    // Store audit log details before deletion for the deletion audit trail
    const auditLogDetails = {
      id: auditLog.id,
      action: auditLog.get('action'),
      userId: auditLog.get('userId'),
      resourceType: auditLog.get('resourceType'),
      resourceId: auditLog.get('resourceId'),
      createdAt: auditLog.get('createdAt')?.toISOString(),
      details: auditLog.get('details')
    };

    // Delete the audit log
    await auditLog.destroy({ useMasterKey: true });

    // Create a new audit log entry for the deletion (this cannot be deleted)
    const DeletionAuditLog = Parse.Object.extend('AuditLog');
    const deletionLog = new DeletionAuditLog();
    deletionLog.set('action', 'audit_log_deleted');
    deletionLog.set('userId', user.id);
    deletionLog.set('orgId', auditOrgId);
    deletionLog.set('resourceType', 'AuditLog');
    deletionLog.set('resourceId', params.auditLogId);
    deletionLog.set('details', {
      deletedAuditLog: auditLogDetails,
      deletionReason: params.reason.trim(),
      deletedBy: user.id,
      deletedAt: new Date().toISOString(),
      // Mark this as a system-critical log that cannot be deleted
      systemCritical: true,
      immutable: true
    });
    
    // Set special ACL that prevents deletion
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    // Only allow read access to system admins, no write access to anyone
    acl.setRoleReadAccess('system_admins', true);
    deletionLog.setACL(acl);
    
    await deletionLog.save(null, { useMasterKey: true });

    // Send notification to all system admins about the deletion
    try {
      const systemAdminQuery = new Parse.Query('OrgUser');
      systemAdminQuery.equalTo('orgId', auditOrgId);
      systemAdminQuery.containsAll('roles', ['system_admin']);
      systemAdminQuery.equalTo('isActive', true);
      systemAdminQuery.notEqualTo('userId', user.id); // Don't notify the user who deleted it
      
      const systemAdmins = await systemAdminQuery.find({ useMasterKey: true });
      
      for (const admin of systemAdmins) {
        const Notification = Parse.Object.extend('Notification');
        const notification = new Notification();
        notification.set('userId', admin.get('userId'));
        notification.set('type', 'security');
        notification.set('title', 'Audit Log Deleted');
        notification.set('message', `An audit log entry was deleted by ${user.get('firstName')} ${user.get('lastName')}. Reason: ${params.reason.trim()}`);
        notification.set('priority', 'high');
        notification.set('isRead', false);
        notification.set('data', {
          deletedAuditLogId: params.auditLogId,
          deletedBy: user.id,
          deletionReason: params.reason.trim(),
          originalAction: auditLogDetails.action
        });
        await notification.save(null, { useMasterKey: true });
      }
    } catch (notificationError) {
      console.error('Error sending deletion notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    return {
      success: true,
      message: 'Audit log deleted successfully',
      deletedAuditLog: {
        id: auditLogDetails.id,
        action: auditLogDetails.action,
        deletedAt: new Date().toISOString()
      },
      deletionAuditLogId: deletionLog.id
    };

  } catch (error) {
    console.error('Error in deleteAuditLog:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete audit log');
  }
});

/**
 * Bulk delete audit logs with strict controls (system admin only)
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string[]} request.params.auditLogIds - Array of audit log IDs to delete
 * @param {string} request.params.reason - Reason for bulk deletion (required)
 * @param {string} request.params.confirmationCode - Special confirmation code for bulk operations
 * @returns {Object} Response with deletion results
 */
Parse.Cloud.define('bulkDeleteAuditLogs', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.auditLogIds || !Array.isArray(params.auditLogIds) || params.auditLogIds.length === 0) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing or invalid auditLogIds array');
    }

    if (params.auditLogIds.length > 100) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Cannot delete more than 100 audit logs at once');
    }

    if (!params.reason || params.reason.trim().length < 20) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Bulk deletion reason must be at least 20 characters long');
    }

    if (!params.confirmationCode || params.confirmationCode !== 'BULK_DELETE_CONFIRMED') {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid confirmation code for bulk deletion');
    }

    // Verify user is system admin
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User organization access not found');
    }

    const userRoles = orgUser.get('roles') || [];
    const isSystemAdmin = userRoles.includes('system_admin');
    
    if (!isSystemAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can perform bulk audit log deletion');
    }

    const deletionResults = {
      successful: [],
      failed: [],
      totalRequested: params.auditLogIds.length
    };

    // Process each audit log deletion
    for (const auditLogId of params.auditLogIds) {
      try {
        const auditLogQuery = new Parse.Query('AuditLog');
        const auditLog = await auditLogQuery.get(auditLogId, { useMasterKey: true });
        
        if (!auditLog) {
          deletionResults.failed.push({
            id: auditLogId,
            error: 'Audit log not found'
          });
          continue;
        }

        // Store details before deletion
        const auditLogDetails = {
          id: auditLog.id,
          action: auditLog.get('action'),
          userId: auditLog.get('userId'),
          resourceType: auditLog.get('resourceType'),
          resourceId: auditLog.get('resourceId'),
          createdAt: auditLog.get('createdAt')?.toISOString()
        };

        // Delete the audit log
        await auditLog.destroy({ useMasterKey: true });

        deletionResults.successful.push({
          id: auditLogId,
          action: auditLogDetails.action,
          deletedAt: new Date().toISOString()
        });

      } catch (deleteError) {
        console.error(`Error deleting audit log ${auditLogId}:`, deleteError);
        deletionResults.failed.push({
          id: auditLogId,
          error: deleteError.message || 'Unknown error'
        });
      }
    }

    // Create bulk deletion audit log
    const BulkDeletionAuditLog = Parse.Object.extend('AuditLog');
    const bulkDeletionLog = new BulkDeletionAuditLog();
    bulkDeletionLog.set('action', 'bulk_audit_logs_deleted');
    bulkDeletionLog.set('userId', user.id);
    bulkDeletionLog.set('orgId', orgId);
    bulkDeletionLog.set('resourceType', 'AuditLog');
    bulkDeletionLog.set('details', {
      bulkDeletionReason: params.reason.trim(),
      deletedBy: user.id,
      deletedAt: new Date().toISOString(),
      deletionResults: deletionResults,
      systemCritical: true,
      immutable: true
    });
    
    const acl = new Parse.ACL();
    acl.setRoleReadAccess('system_admins', true);
    bulkDeletionLog.setACL(acl);
    
    await bulkDeletionLog.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `Bulk deletion completed. ${deletionResults.successful.length} successful, ${deletionResults.failed.length} failed.`,
      results: deletionResults,
      bulkDeletionAuditLogId: bulkDeletionLog.id
    };

  } catch (error) {
    console.error('Error in bulkDeleteAuditLogs:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to perform bulk audit log deletion');
  }
});