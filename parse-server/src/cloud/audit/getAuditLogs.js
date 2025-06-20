/**
 * Get audit logs with filtering and pagination
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.orgId - Organization ID (optional, uses current org if not provided)
 * @param {string[]} request.params.eventTypes - Filter by event types (optional)
 * @param {string[]} request.params.severities - Filter by severities (optional)
 * @param {string} request.params.userId - Filter by user ID (optional)
 * @param {string} request.params.resourceType - Filter by resource type (optional)
 * @param {string} request.params.resourceId - Filter by resource ID (optional)
 * @param {string} request.params.startDate - Start date filter (ISO string, optional)
 * @param {string} request.params.endDate - End date filter (ISO string, optional)
 * @param {number} request.params.limit - Limit number of results (optional, default 50)
 * @param {number} request.params.skip - Skip number of results (optional, default 0)
 * @returns {Object} Response with audit logs array
 */
Parse.Cloud.define('getAuditLogs', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Get organization context
    let orgId = params.orgId;
    if (!orgId) {
      // Get user's current organization
      const userQuery = new Parse.Query(Parse.User);
      const currentUser = await userQuery.get(user.id, { useMasterKey: true });
      orgId = currentUser.get('currentOrgId');
      
      if (!orgId) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No current organization set for user');
      }
    }

    // Verify user has access to this organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this organization');
    }

    // Check permissions - only admins and users with audit:read permission can view audit logs
    const userRoles = orgUser.get('roles') || [];
    const hasAuditReadPermission = userRoles.some(role => 
      ['org_admin', 'security_admin'].includes(role)
    );
    
    if (!hasAuditReadPermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to read audit logs');
    }

    // Query audit logs for the organization
    const auditQuery = new Parse.Query('AuditLog');
    auditQuery.equalTo('orgId', orgId);
    
    // Apply filters
    if (params.eventTypes && Array.isArray(params.eventTypes) && params.eventTypes.length > 0) {
      auditQuery.containedIn('action', params.eventTypes);
    }
    
    if (params.userId) {
      auditQuery.equalTo('userId', params.userId);
    }
    
    if (params.resourceType) {
      auditQuery.equalTo('resourceType', params.resourceType);
    }
    
    if (params.resourceId) {
      auditQuery.equalTo('resourceId', params.resourceId);
    }
    
    // Apply date range filters
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      if (!isNaN(startDate.getTime())) {
        auditQuery.greaterThanOrEqualTo('createdAt', startDate);
      }
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      if (!isNaN(endDate.getTime())) {
        auditQuery.lessThanOrEqualTo('createdAt', endDate);
      }
    }
    
    // Apply pagination
    const limit = Math.min(params.limit || 50, 500); // Max 500 audit logs per request
    const skip = params.skip || 0;
    auditQuery.limit(limit);
    auditQuery.skip(skip);
    
    // Order by creation date (newest first)
    auditQuery.descending('createdAt');
    
    // Include user information
    auditQuery.include('userId');

    const auditLogs = await auditQuery.find({ useMasterKey: true }); // Use master key for audit logs

    // Get total count for pagination
    const countQuery = new Parse.Query('AuditLog');
    countQuery.equalTo('orgId', orgId);
    
    // Apply same filters for count
    if (params.eventTypes && Array.isArray(params.eventTypes) && params.eventTypes.length > 0) {
      countQuery.containedIn('action', params.eventTypes);
    }
    if (params.userId) {
      countQuery.equalTo('userId', params.userId);
    }
    if (params.resourceType) {
      countQuery.equalTo('resourceType', params.resourceType);
    }
    if (params.resourceId) {
      countQuery.equalTo('resourceId', params.resourceId);
    }
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      if (!isNaN(startDate.getTime())) {
        countQuery.greaterThanOrEqualTo('createdAt', startDate);
      }
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      if (!isNaN(endDate.getTime())) {
        countQuery.lessThanOrEqualTo('createdAt', endDate);
      }
    }
    
    const totalCount = await countQuery.count({ useMasterKey: true });

    // Format response to match frontend expectations
    const formattedAuditLogs = auditLogs.map(log => {
      const userObj = log.get('userId');
      return {
        id: log.id,
        eventType: log.get('action'), // Map action to eventType for frontend compatibility
        description: log.get('action'), // Use action as description, can be enhanced
        userId: log.get('userId'),
        userEmail: userObj ? userObj.get('email') : null,
        timestamp: log.get('createdAt')?.toISOString(),
        severity: determineSeverity(log.get('action')), // Helper function to determine severity
        ipAddress: log.get('ipAddress'),
        metadata: {
          resourceType: log.get('resourceType'),
          resourceId: log.get('resourceId'),
          details: log.get('details'),
          orgId: log.get('orgId')
        },
        createdAt: log.get('createdAt')?.toISOString(),
        updatedAt: log.get('updatedAt')?.toISOString()
      };
    });

    return {
      success: true,
      events: formattedAuditLogs, // Use 'events' to match frontend expectations
      total: totalCount,
      limit: limit,
      skip: skip,
      hasMore: (skip + formattedAuditLogs.length) < totalCount
    };

  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch audit logs');
  }
});

/**
 * Helper function to determine severity based on action type
 * @param {string} action - The audit action
 * @returns {string} Severity level
 */
function determineSeverity(action) {
  const highSeverityActions = [
    'user_deleted', 'user_suspended', 'token_status_updated', 
    'organization_suspended', 'security_breach', 'unauthorized_access'
  ];
  
  const mediumSeverityActions = [
    'user_created', 'user_updated', 'token_created', 
    'notification_preferences_updated', 'organization_updated'
  ];
  
  const criticalSeverityActions = [
    'admin_access_granted', 'system_configuration_changed',
    'bulk_data_export', 'security_settings_changed'
  ];
  
  if (criticalSeverityActions.includes(action)) {
    return 'critical';
  } else if (highSeverityActions.includes(action)) {
    return 'high';
  } else if (mediumSeverityActions.includes(action)) {
    return 'medium';
  } else {
    return 'low';
  }
}