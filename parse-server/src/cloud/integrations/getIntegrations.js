/**
 * Get all integrations for the organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.type - Optional filter by integration type
 * @param {boolean} request.params.activeOnly - Optional filter for active integrations only
 * @param {number} request.params.limit - Optional limit for pagination
 * @param {number} request.params.skip - Optional skip for pagination
 * @returns {Object} Response with integrations list
 */
Parse.Cloud.define('getIntegrations', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Get user's organization and verify permissions
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User organization access not found');
    }

    // Check permissions - admin or integration manager roles can view integrations
    const userRoles = orgUser.get('roles') || [];
    const canViewIntegrations = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canViewIntegrations) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to view integrations');
    }

    // Build query for integrations
    const integrationQuery = new Parse.Query('Integration');
    integrationQuery.equalTo('orgId', orgId);
    
    // Apply filters
    if (params.type) {
      integrationQuery.equalTo('type', params.type);
    }
    
    if (params.activeOnly === true) {
      integrationQuery.equalTo('isActive', true);
    }
    
    // Apply pagination
    const limit = Math.min(params.limit || 50, 100);
    const skip = params.skip || 0;
    
    integrationQuery.limit(limit);
    integrationQuery.skip(skip);
    integrationQuery.descending('createdAt');
    
    // Execute query
    const integrations = await integrationQuery.find({ useMasterKey: true });
    
    // Get total count for pagination
    const totalQuery = new Parse.Query('Integration');
    totalQuery.equalTo('orgId', orgId);
    if (params.type) {
      totalQuery.equalTo('type', params.type);
    }
    if (params.activeOnly === true) {
      totalQuery.equalTo('isActive', true);
    }
    const totalCount = await totalQuery.count({ useMasterKey: true });
    
    // Transform integrations for response
    const transformedIntegrations = integrations.map(integration => ({
      id: integration.id,
      name: integration.get('name'),
      type: integration.get('type'),
      description: integration.get('description'),
      isActive: integration.get('isActive'),
      status: integration.get('status'),
      config: integration.get('config') || {},
      lastSync: integration.get('lastSync')?.toISOString(),
      createdAt: integration.get('createdAt')?.toISOString(),
      updatedAt: integration.get('updatedAt')?.toISOString(),
      createdBy: integration.get('createdBy'),
      metadata: integration.get('metadata') || {}
    }));

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'integrations_viewed');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Integration');
    auditLog.set('details', {
      filters: {
        type: params.type,
        activeOnly: params.activeOnly
      },
      resultCount: integrations.length,
      totalCount: totalCount
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      integrations: transformedIntegrations,
      pagination: {
        total: totalCount,
        limit: limit,
        skip: skip,
        hasMore: skip + integrations.length < totalCount
      }
    };

  } catch (error) {
    console.error('Error in getIntegrations:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch integrations');
  }
});

/**
 * Get integration statistics for the organization
 * @param {Object} request - Parse Cloud Function request
 * @returns {Object} Response with integration statistics
 */
Parse.Cloud.define('getIntegrationStatistics', async (request) => {
  const { user } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    // Get all integrations for the organization
    const integrationQuery = new Parse.Query('Integration');
    integrationQuery.equalTo('orgId', orgId);
    const integrations = await integrationQuery.find({ useMasterKey: true });
    
    // Calculate statistics
    const statistics = {
      total: integrations.length,
      active: integrations.filter(i => i.get('isActive')).length,
      inactive: integrations.filter(i => !i.get('isActive')).length,
      byType: {},
      byStatus: {},
      recentActivity: []
    };
    
    // Group by type and status
    integrations.forEach(integration => {
      const type = integration.get('type') || 'unknown';
      const status = integration.get('status') || 'unknown';
      
      statistics.byType[type] = (statistics.byType[type] || 0) + 1;
      statistics.byStatus[status] = (statistics.byStatus[status] || 0) + 1;
    });
    
    // Get recent integration activity from audit logs
    const auditQuery = new Parse.Query('AuditLog');
    auditQuery.equalTo('orgId', orgId);
    auditQuery.equalTo('resourceType', 'Integration');
    auditQuery.descending('createdAt');
    auditQuery.limit(10);
    
    const recentAudits = await auditQuery.find({ useMasterKey: true });
    statistics.recentActivity = recentAudits.map(audit => ({
      action: audit.get('action'),
      timestamp: audit.get('createdAt')?.toISOString(),
      userId: audit.get('userId'),
      details: audit.get('details')
    }));

    return {
      success: true,
      statistics
    };

  } catch (error) {
    console.error('Error in getIntegrationStatistics:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get integration statistics');
  }
});