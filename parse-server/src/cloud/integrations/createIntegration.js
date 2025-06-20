/**
 * Create a new integration
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - Integration name
 * @param {string} request.params.type - Integration type (webhook, oauth, api_key, etc.)
 * @param {string} request.params.description - Integration description
 * @param {Object} request.params.config - Integration configuration
 * @param {Object} request.params.metadata - Optional metadata
 * @returns {Object} Response with created integration
 */
Parse.Cloud.define('createIntegration', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.name || !params.type) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: name, type');
    }

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

    // Check permissions - admin or integration manager roles can create integrations
    const userRoles = orgUser.get('roles') || [];
    const canCreateIntegrations = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canCreateIntegrations) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to create integrations');
    }

    // Validate integration type
    const validTypes = ['webhook', 'oauth', 'api_key', 'database', 'file_sync', 'notification', 'analytics'];
    if (!validTypes.includes(params.type)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid integration type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check for duplicate integration names within the organization
    const duplicateQuery = new Parse.Query('Integration');
    duplicateQuery.equalTo('orgId', orgId);
    duplicateQuery.equalTo('name', params.name);
    const existingIntegration = await duplicateQuery.first({ useMasterKey: true });
    
    if (existingIntegration) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'An integration with this name already exists');
    }

    // Validate configuration based on integration type
    const validatedConfig = validateIntegrationConfig(params.type, params.config || {});

    // Create the integration
    const Integration = Parse.Object.extend('Integration');
    const integration = new Integration();
    
    integration.set('name', params.name.trim());
    integration.set('type', params.type);
    integration.set('description', params.description?.trim() || '');
    integration.set('orgId', orgId);
    integration.set('config', validatedConfig);
    integration.set('metadata', params.metadata || {});
    integration.set('isActive', false); // Start as inactive until configured
    integration.set('status', 'created');
    integration.set('createdBy', user.id);
    integration.set('lastSync', null);
    
    // Set ACL for organization access
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    // Allow read/write access to organization members
    acl.setRoleReadAccess(`org_${orgId}_members`, true);
    acl.setRoleWriteAccess(`org_${orgId}_admins`, true);
    integration.setACL(acl);
    
    await integration.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'integration_created');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Integration');
    auditLog.set('resourceId', integration.id);
    auditLog.set('details', {
      integrationName: params.name,
      integrationType: params.type,
      description: params.description
    });
    await auditLog.save(null, { useMasterKey: true });

    // Send notification to organization admins
    try {
      const adminQuery = new Parse.Query('OrgUser');
      adminQuery.equalTo('orgId', orgId);
      adminQuery.containsAll('roles', ['admin']);
      adminQuery.equalTo('isActive', true);
      adminQuery.notEqualTo('userId', user.id); // Don't notify the creator
      
      const admins = await adminQuery.find({ useMasterKey: true });
      
      for (const admin of admins) {
        const Notification = Parse.Object.extend('Notification');
        const notification = new Notification();
        notification.set('userId', admin.get('userId'));
        notification.set('type', 'integration');
        notification.set('title', 'New Integration Created');
        notification.set('message', `${user.get('firstName')} ${user.get('lastName')} created a new ${params.type} integration: ${params.name}`);
        notification.set('priority', 'normal');
        notification.set('isRead', false);
        notification.set('data', {
          integrationId: integration.id,
          integrationType: params.type,
          createdBy: user.id
        });
        await notification.save(null, { useMasterKey: true });
      }
    } catch (notificationError) {
      console.error('Error sending integration creation notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    return {
      success: true,
      integration: {
        id: integration.id,
        name: integration.get('name'),
        type: integration.get('type'),
        description: integration.get('description'),
        isActive: integration.get('isActive'),
        status: integration.get('status'),
        config: integration.get('config'),
        metadata: integration.get('metadata'),
        createdAt: integration.get('createdAt')?.toISOString(),
        createdBy: integration.get('createdBy')
      }
    };

  } catch (error) {
    console.error('Error in createIntegration:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create integration');
  }
});

/**
 * Update an existing integration
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.integrationId - Integration ID to update
 * @param {string} request.params.name - Updated integration name
 * @param {string} request.params.description - Updated description
 * @param {Object} request.params.config - Updated configuration
 * @param {Object} request.params.metadata - Updated metadata
 * @param {boolean} request.params.isActive - Updated active status
 * @returns {Object} Response with updated integration
 */
Parse.Cloud.define('updateIntegration', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.integrationId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: integrationId');
    }

    // Get the integration
    const integrationQuery = new Parse.Query('Integration');
    const integration = await integrationQuery.get(params.integrationId, { useMasterKey: true });
    
    if (!integration) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Integration not found');
    }

    const orgId = integration.get('orgId');
    
    // Verify user has access to this integration's organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this integration');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canUpdateIntegrations = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canUpdateIntegrations) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to update integrations');
    }

    // Store original values for audit log
    const originalValues = {
      name: integration.get('name'),
      description: integration.get('description'),
      isActive: integration.get('isActive'),
      config: integration.get('config'),
      metadata: integration.get('metadata')
    };

    // Update fields if provided
    if (params.name !== undefined) {
      // Check for duplicate names (excluding current integration)
      const duplicateQuery = new Parse.Query('Integration');
      duplicateQuery.equalTo('orgId', orgId);
      duplicateQuery.equalTo('name', params.name);
      duplicateQuery.notEqualTo('objectId', params.integrationId);
      const existingIntegration = await duplicateQuery.first({ useMasterKey: true });
      
      if (existingIntegration) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'An integration with this name already exists');
      }
      
      integration.set('name', params.name.trim());
    }
    
    if (params.description !== undefined) {
      integration.set('description', params.description.trim());
    }
    
    if (params.config !== undefined) {
      const validatedConfig = validateIntegrationConfig(integration.get('type'), params.config);
      integration.set('config', validatedConfig);
    }
    
    if (params.metadata !== undefined) {
      integration.set('metadata', params.metadata);
    }
    
    if (params.isActive !== undefined) {
      integration.set('isActive', params.isActive);
      integration.set('status', params.isActive ? 'active' : 'inactive');
    }
    
    integration.set('updatedBy', user.id);
    await integration.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'integration_updated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Integration');
    auditLog.set('resourceId', integration.id);
    auditLog.set('details', {
      integrationName: integration.get('name'),
      integrationType: integration.get('type'),
      changes: getChangedFields(originalValues, {
        name: integration.get('name'),
        description: integration.get('description'),
        isActive: integration.get('isActive'),
        config: integration.get('config'),
        metadata: integration.get('metadata')
      })
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      integration: {
        id: integration.id,
        name: integration.get('name'),
        type: integration.get('type'),
        description: integration.get('description'),
        isActive: integration.get('isActive'),
        status: integration.get('status'),
        config: integration.get('config'),
        metadata: integration.get('metadata'),
        createdAt: integration.get('createdAt')?.toISOString(),
        updatedAt: integration.get('updatedAt')?.toISOString(),
        createdBy: integration.get('createdBy'),
        updatedBy: integration.get('updatedBy')
      }
    };

  } catch (error) {
    console.error('Error in updateIntegration:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update integration');
  }
});

/**
 * Validate integration configuration based on type
 */
function validateIntegrationConfig(type, config) {
  const validatedConfig = { ...config };
  
  switch (type) {
    case 'webhook':
      if (!config.url) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Webhook integrations require a URL');
      }
      if (!isValidUrl(config.url)) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid webhook URL format');
      }
      validatedConfig.method = config.method || 'POST';
      validatedConfig.headers = config.headers || {};
      validatedConfig.events = config.events || [];
      break;
      
    case 'oauth':
      if (!config.clientId || !config.clientSecret) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'OAuth integrations require clientId and clientSecret');
      }
      validatedConfig.scopes = config.scopes || [];
      validatedConfig.redirectUri = config.redirectUri || '';
      break;
      
    case 'api_key':
      if (!config.apiKey) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'API key integrations require an apiKey');
      }
      validatedConfig.baseUrl = config.baseUrl || '';
      validatedConfig.headers = config.headers || {};
      break;
      
    case 'database':
      if (!config.connectionString && !config.host) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Database integrations require connectionString or host');
      }
      validatedConfig.database = config.database || '';
      validatedConfig.port = config.port || 5432;
      break;
  }
  
  return validatedConfig;
}

/**
 * Check if URL is valid
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Get changed fields between original and updated values
 */
function getChangedFields(original, updated) {
  const changes = {};
  
  for (const key in updated) {
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      changes[key] = {
        from: original[key],
        to: updated[key]
      };
    }
  }
  
  return changes;
}