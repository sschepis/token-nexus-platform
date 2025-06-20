const crypto = require('crypto');

/**
 * Create API key
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - API key name
 * @param {string} request.params.description - API key description
 * @param {string[]} request.params.scopes - API key scopes/permissions
 * @param {string} request.params.expiresAt - Optional expiration date
 * @param {Object} request.params.restrictions - Optional IP/domain restrictions
 * @returns {Object} Response with created API key
 */
Parse.Cloud.define('createApiKey', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.name || !params.scopes || !Array.isArray(params.scopes)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: name, scopes');
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

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canCreateApiKeys = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canCreateApiKeys) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to create API keys');
    }

    // Validate scopes
    const validScopes = [
      'read:profile', 'write:profile',
      'read:tokens', 'write:tokens',
      'read:organizations', 'write:organizations',
      'read:users', 'write:users',
      'read:audit', 'write:audit',
      'read:integrations', 'write:integrations',
      'read:notifications', 'write:notifications',
      'read:reports', 'write:reports'
    ];
    
    const invalidScopes = params.scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Validate expiration date if provided
    let expiresAt = null;
    if (params.expiresAt) {
      expiresAt = new Date(params.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid expiration date - must be in the future');
      }
    }

    // Generate API key
    const apiKey = `tnp_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Create the API key record
    const ApiKey = Parse.Object.extend('ApiKey');
    const apiKeyRecord = new ApiKey();
    
    apiKeyRecord.set('name', params.name.trim());
    apiKeyRecord.set('description', params.description?.trim() || '');
    apiKeyRecord.set('keyHash', keyHash);
    apiKeyRecord.set('keyPrefix', apiKey.substring(0, 12) + '...');
    apiKeyRecord.set('scopes', params.scopes);
    apiKeyRecord.set('orgId', orgId);
    apiKeyRecord.set('createdBy', user.id);
    apiKeyRecord.set('isActive', true);
    apiKeyRecord.set('expiresAt', expiresAt);
    apiKeyRecord.set('restrictions', params.restrictions || {});
    apiKeyRecord.set('lastUsed', null);
    apiKeyRecord.set('usageCount', 0);
    
    // Set ACL
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(`org_${orgId}_members`, true);
    acl.setRoleWriteAccess(`org_${orgId}_admins`, true);
    apiKeyRecord.setACL(acl);
    
    await apiKeyRecord.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'api_key_created');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'ApiKey');
    auditLog.set('resourceId', apiKeyRecord.id);
    auditLog.set('details', {
      keyName: params.name,
      keyPrefix: apiKeyRecord.get('keyPrefix'),
      scopes: params.scopes,
      expiresAt: expiresAt?.toISOString(),
      restrictions: params.restrictions
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      apiKey: {
        id: apiKeyRecord.id,
        name: apiKeyRecord.get('name'),
        description: apiKeyRecord.get('description'),
        key: apiKey, // Return full key only on creation
        keyPrefix: apiKeyRecord.get('keyPrefix'),
        scopes: apiKeyRecord.get('scopes'),
        isActive: apiKeyRecord.get('isActive'),
        expiresAt: apiKeyRecord.get('expiresAt')?.toISOString(),
        restrictions: apiKeyRecord.get('restrictions'),
        createdAt: apiKeyRecord.get('createdAt')?.toISOString(),
        createdBy: apiKeyRecord.get('createdBy')
      }
    };

  } catch (error) {
    console.error('Error in createApiKey:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create API key');
  }
});

/**
 * Get API keys for the organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {boolean} request.params.activeOnly - Filter for active keys only
 * @param {number} request.params.limit - Pagination limit
 * @param {number} request.params.skip - Pagination skip
 * @returns {Object} Response with API keys list
 */
Parse.Cloud.define('getApiKeys', async (request) => {
  const { user, params } = request;
  
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

    // Build query
    const apiKeyQuery = new Parse.Query('ApiKey');
    apiKeyQuery.equalTo('orgId', orgId);
    
    if (params.activeOnly === true) {
      apiKeyQuery.equalTo('isActive', true);
    }
    
    const limit = Math.min(params.limit || 50, 100);
    const skip = params.skip || 0;
    
    apiKeyQuery.limit(limit);
    apiKeyQuery.skip(skip);
    apiKeyQuery.descending('createdAt');
    
    const apiKeys = await apiKeyQuery.find({ useMasterKey: true });
    
    // Transform keys (don't include full key or hash in response)
    const transformedKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.get('name'),
      description: key.get('description'),
      keyPrefix: key.get('keyPrefix'),
      scopes: key.get('scopes'),
      isActive: key.get('isActive'),
      expiresAt: key.get('expiresAt')?.toISOString(),
      restrictions: key.get('restrictions'),
      lastUsed: key.get('lastUsed')?.toISOString(),
      usageCount: key.get('usageCount') || 0,
      createdAt: key.get('createdAt')?.toISOString(),
      updatedAt: key.get('updatedAt')?.toISOString(),
      createdBy: key.get('createdBy')
    }));

    return {
      success: true,
      apiKeys: transformedKeys
    };

  } catch (error) {
    console.error('Error in getApiKeys:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch API keys');
  }
});

/**
 * Update API key
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.apiKeyId - API key ID to update
 * @param {string} request.params.name - Updated name
 * @param {string} request.params.description - Updated description
 * @param {string[]} request.params.scopes - Updated scopes
 * @param {boolean} request.params.isActive - Updated active status
 * @param {Object} request.params.restrictions - Updated restrictions
 * @returns {Object} Response with updated API key
 */
Parse.Cloud.define('updateApiKey', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.apiKeyId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: apiKeyId');
    }

    // Get the API key
    const apiKeyQuery = new Parse.Query('ApiKey');
    const apiKey = await apiKeyQuery.get(params.apiKeyId, { useMasterKey: true });
    
    if (!apiKey) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'API key not found');
    }

    const orgId = apiKey.get('orgId');
    
    // Verify user has access
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this API key');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canUpdateApiKeys = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canUpdateApiKeys) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to update API keys');
    }

    // Update fields if provided
    if (params.name !== undefined) {
      apiKey.set('name', params.name.trim());
    }
    
    if (params.description !== undefined) {
      apiKey.set('description', params.description.trim());
    }
    
    if (params.scopes !== undefined) {
      const validScopes = [
        'read:profile', 'write:profile',
        'read:tokens', 'write:tokens',
        'read:organizations', 'write:organizations',
        'read:users', 'write:users',
        'read:audit', 'write:audit',
        'read:integrations', 'write:integrations',
        'read:notifications', 'write:notifications',
        'read:reports', 'write:reports'
      ];
      
      const invalidScopes = params.scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid scopes: ${invalidScopes.join(', ')}`);
      }
      
      apiKey.set('scopes', params.scopes);
    }
    
    if (params.isActive !== undefined) {
      apiKey.set('isActive', params.isActive);
    }
    
    if (params.restrictions !== undefined) {
      apiKey.set('restrictions', params.restrictions);
    }
    
    apiKey.set('updatedBy', user.id);
    await apiKey.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'api_key_updated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'ApiKey');
    auditLog.set('resourceId', apiKey.id);
    auditLog.set('details', {
      keyName: apiKey.get('name'),
      keyPrefix: apiKey.get('keyPrefix'),
      isActive: apiKey.get('isActive'),
      scopes: apiKey.get('scopes')
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.get('name'),
        description: apiKey.get('description'),
        keyPrefix: apiKey.get('keyPrefix'),
        scopes: apiKey.get('scopes'),
        isActive: apiKey.get('isActive'),
        expiresAt: apiKey.get('expiresAt')?.toISOString(),
        restrictions: apiKey.get('restrictions'),
        lastUsed: apiKey.get('lastUsed')?.toISOString(),
        usageCount: apiKey.get('usageCount') || 0,
        createdAt: apiKey.get('createdAt')?.toISOString(),
        updatedAt: apiKey.get('updatedAt')?.toISOString(),
        createdBy: apiKey.get('createdBy'),
        updatedBy: apiKey.get('updatedBy')
      }
    };

  } catch (error) {
    console.error('Error in updateApiKey:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update API key');
  }
});

/**
 * Delete API key
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.apiKeyId - API key ID to delete
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('deleteApiKey', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.apiKeyId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: apiKeyId');
    }

    // Get the API key
    const apiKeyQuery = new Parse.Query('ApiKey');
    const apiKey = await apiKeyQuery.get(params.apiKeyId, { useMasterKey: true });
    
    if (!apiKey) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'API key not found');
    }

    const orgId = apiKey.get('orgId');
    
    // Verify user has access and permissions
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this API key');
    }

    const userRoles = orgUser.get('roles') || [];
    const canDeleteApiKeys = userRoles.some(role => 
      ['admin', 'system_admin'].includes(role)
    );
    
    if (!canDeleteApiKeys) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to delete API keys');
    }

    // Store key details for audit log
    const keyDetails = {
      name: apiKey.get('name'),
      keyPrefix: apiKey.get('keyPrefix'),
      scopes: apiKey.get('scopes'),
      usageCount: apiKey.get('usageCount') || 0
    };

    // Delete the API key
    await apiKey.destroy({ useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'api_key_deleted');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'ApiKey');
    auditLog.set('resourceId', params.apiKeyId);
    auditLog.set('details', {
      deletedKey: keyDetails,
      deletedBy: user.id,
      deletedAt: new Date().toISOString()
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'API key deleted successfully'
    };

  } catch (error) {
    console.error('Error in deleteApiKey:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete API key');
  }
});

/**
 * Validate API key (for internal use by API endpoints)
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.apiKey - API key to validate
 * @param {string} request.params.requiredScope - Required scope for the operation
 * @param {string} request.params.ipAddress - Client IP address
 * @returns {Object} Response with validation result
 */
Parse.Cloud.define('validateApiKey', async (request) => {
  const { params } = request;
  
  try {
    if (!params.apiKey) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: apiKey');
    }

    // Hash the provided key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(params.apiKey).digest('hex');

    // Find the API key by hash
    const apiKeyQuery = new Parse.Query('ApiKey');
    apiKeyQuery.equalTo('keyHash', keyHash);
    apiKeyQuery.equalTo('isActive', true);
    
    const apiKey = await apiKeyQuery.first({ useMasterKey: true });
    
    if (!apiKey) {
      return {
        valid: false,
        reason: 'Invalid API key'
      };
    }

    // Check if key is expired
    const expiresAt = apiKey.get('expiresAt');
    if (expiresAt && new Date() > expiresAt) {
      return {
        valid: false,
        reason: 'API key has expired'
      };
    }

    // Check scope if required
    if (params.requiredScope) {
      const scopes = apiKey.get('scopes') || [];
      if (!scopes.includes(params.requiredScope)) {
        return {
          valid: false,
          reason: 'Insufficient scope permissions'
        };
      }
    }

    // Check IP restrictions if configured
    const restrictions = apiKey.get('restrictions') || {};
    if (restrictions.allowedIps && restrictions.allowedIps.length > 0 && params.ipAddress) {
      if (!restrictions.allowedIps.includes(params.ipAddress)) {
        return {
          valid: false,
          reason: 'IP address not allowed'
        };
      }
    }

    // Update usage statistics
    apiKey.increment('usageCount');
    apiKey.set('lastUsed', new Date());
    await apiKey.save(null, { useMasterKey: true });

    return {
      valid: true,
      orgId: apiKey.get('orgId'),
      scopes: apiKey.get('scopes'),
      keyId: apiKey.id,
      keyName: apiKey.get('name')
    };

  } catch (error) {
    console.error('Error in validateApiKey:', error);
    
    return {
      valid: false,
      reason: 'Internal validation error'
    };
  }
});

/**
 * Get API key usage statistics
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.apiKeyId - API key ID (optional, if not provided returns org stats)
 * @returns {Object} Response with usage statistics
 */
Parse.Cloud.define('getApiKeyUsage', async (request) => {
  const { user, params } = request;
  
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

    if (params.apiKeyId) {
      // Get usage for specific API key
      const apiKeyQuery = new Parse.Query('ApiKey');
      apiKeyQuery.equalTo('orgId', orgId);
      const apiKey = await apiKeyQuery.get(params.apiKeyId, { useMasterKey: true });
      
      if (!apiKey) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'API key not found');
      }

      return {
        success: true,
        usage: {
          keyId: apiKey.id,
          keyName: apiKey.get('name'),
          usageCount: apiKey.get('usageCount') || 0,
          lastUsed: apiKey.get('lastUsed')?.toISOString(),
          createdAt: apiKey.get('createdAt')?.toISOString(),
          isActive: apiKey.get('isActive')
        }
      };
    } else {
      // Get usage statistics for all API keys in the organization
      const apiKeyQuery = new Parse.Query('ApiKey');
      apiKeyQuery.equalTo('orgId', orgId);
      const apiKeys = await apiKeyQuery.find({ useMasterKey: true });
      
      const statistics = {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(key => key.get('isActive')).length,
        totalUsage: apiKeys.reduce((sum, key) => sum + (key.get('usageCount') || 0), 0),
        keyUsage: apiKeys.map(key => ({
          keyId: key.id,
          keyName: key.get('name'),
          keyPrefix: key.get('keyPrefix'),
          usageCount: key.get('usageCount') || 0,
          lastUsed: key.get('lastUsed')?.toISOString(),
          isActive: key.get('isActive')
        }))
      };

      return {
        success: true,
        statistics
      };
    }

  } catch (error) {
    console.error('Error in getApiKeyUsage:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get API key usage');
  }
});