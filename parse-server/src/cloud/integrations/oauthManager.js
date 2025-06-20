const crypto = require('crypto');

/**
 * Create OAuth application
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - OAuth app name
 * @param {string} request.params.description - OAuth app description
 * @param {string[]} request.params.redirectUris - Allowed redirect URIs
 * @param {string[]} request.params.scopes - Requested scopes
 * @param {string} request.params.applicationType - Application type (web, mobile, desktop)
 * @returns {Object} Response with created OAuth app
 */
Parse.Cloud.define('createOAuthApp', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.name || !params.redirectUris || !Array.isArray(params.redirectUris)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: name, redirectUris');
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
    const canCreateOAuth = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canCreateOAuth) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to create OAuth applications');
    }

    // Validate redirect URIs
    for (const uri of params.redirectUris) {
      if (!isValidUrl(uri)) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid redirect URI: ${uri}`);
      }
    }

    // Validate scopes
    const validScopes = [
      'read:profile', 'write:profile',
      'read:tokens', 'write:tokens',
      'read:organizations', 'write:organizations',
      'read:users', 'write:users',
      'read:audit', 'write:audit',
      'read:integrations', 'write:integrations',
      'read:notifications', 'write:notifications'
    ];
    
    const requestedScopes = params.scopes || [];
    const invalidScopes = requestedScopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Generate client credentials
    const clientId = `tnp_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');

    // Create the OAuth app
    const OAuthApp = Parse.Object.extend('OAuthApp');
    const oauthApp = new OAuthApp();
    
    oauthApp.set('name', params.name.trim());
    oauthApp.set('description', params.description?.trim() || '');
    oauthApp.set('clientId', clientId);
    oauthApp.set('clientSecret', clientSecret);
    oauthApp.set('redirectUris', params.redirectUris);
    oauthApp.set('scopes', requestedScopes);
    oauthApp.set('applicationType', params.applicationType || 'web');
    oauthApp.set('orgId', orgId);
    oauthApp.set('isActive', true);
    oauthApp.set('createdBy', user.id);
    oauthApp.set('tokenCount', 0);
    oauthApp.set('lastUsed', null);
    
    // Set ACL
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(`org_${orgId}_members`, true);
    acl.setRoleWriteAccess(`org_${orgId}_admins`, true);
    oauthApp.setACL(acl);
    
    await oauthApp.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'oauth_app_created');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'OAuthApp');
    auditLog.set('resourceId', oauthApp.id);
    auditLog.set('details', {
      appName: params.name,
      clientId: clientId,
      scopes: requestedScopes,
      applicationType: params.applicationType || 'web'
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      oauthApp: {
        id: oauthApp.id,
        name: oauthApp.get('name'),
        description: oauthApp.get('description'),
        clientId: clientId,
        clientSecret: clientSecret, // Return secret only on creation
        redirectUris: oauthApp.get('redirectUris'),
        scopes: oauthApp.get('scopes'),
        applicationType: oauthApp.get('applicationType'),
        isActive: oauthApp.get('isActive'),
        createdAt: oauthApp.get('createdAt')?.toISOString(),
        createdBy: oauthApp.get('createdBy')
      }
    };

  } catch (error) {
    console.error('Error in createOAuthApp:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create OAuth application');
  }
});

/**
 * Get OAuth applications for the organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {boolean} request.params.activeOnly - Filter for active apps only
 * @param {number} request.params.limit - Pagination limit
 * @param {number} request.params.skip - Pagination skip
 * @returns {Object} Response with OAuth apps list
 */
Parse.Cloud.define('getOAuthApps', async (request) => {
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
    const oauthQuery = new Parse.Query('OAuthApp');
    oauthQuery.equalTo('orgId', orgId);
    
    if (params.activeOnly === true) {
      oauthQuery.equalTo('isActive', true);
    }
    
    const limit = Math.min(params.limit || 50, 100);
    const skip = params.skip || 0;
    
    oauthQuery.limit(limit);
    oauthQuery.skip(skip);
    oauthQuery.descending('createdAt');
    
    const oauthApps = await oauthQuery.find({ useMasterKey: true });
    
    // Transform apps (don't include client secret in response)
    const transformedApps = oauthApps.map(app => ({
      id: app.id,
      name: app.get('name'),
      description: app.get('description'),
      clientId: app.get('clientId'),
      redirectUris: app.get('redirectUris'),
      scopes: app.get('scopes'),
      applicationType: app.get('applicationType'),
      isActive: app.get('isActive'),
      tokenCount: app.get('tokenCount') || 0,
      lastUsed: app.get('lastUsed')?.toISOString(),
      createdAt: app.get('createdAt')?.toISOString(),
      updatedAt: app.get('updatedAt')?.toISOString(),
      createdBy: app.get('createdBy')
    }));

    return {
      success: true,
      oauthApps: transformedApps
    };

  } catch (error) {
    console.error('Error in getOAuthApps:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch OAuth applications');
  }
});

/**
 * Update OAuth application
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.oauthAppId - OAuth app ID to update
 * @param {string} request.params.name - Updated name
 * @param {string} request.params.description - Updated description
 * @param {string[]} request.params.redirectUris - Updated redirect URIs
 * @param {string[]} request.params.scopes - Updated scopes
 * @param {boolean} request.params.isActive - Updated active status
 * @returns {Object} Response with updated OAuth app
 */
Parse.Cloud.define('updateOAuthApp', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.oauthAppId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: oauthAppId');
    }

    // Get the OAuth app
    const oauthQuery = new Parse.Query('OAuthApp');
    const oauthApp = await oauthQuery.get(params.oauthAppId, { useMasterKey: true });
    
    if (!oauthApp) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'OAuth application not found');
    }

    const orgId = oauthApp.get('orgId');
    
    // Verify user has access
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this OAuth application');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canUpdateOAuth = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canUpdateOAuth) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to update OAuth applications');
    }

    // Update fields if provided
    if (params.name !== undefined) {
      oauthApp.set('name', params.name.trim());
    }
    
    if (params.description !== undefined) {
      oauthApp.set('description', params.description.trim());
    }
    
    if (params.redirectUris !== undefined) {
      // Validate redirect URIs
      for (const uri of params.redirectUris) {
        if (!isValidUrl(uri)) {
          throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid redirect URI: ${uri}`);
        }
      }
      oauthApp.set('redirectUris', params.redirectUris);
    }
    
    if (params.scopes !== undefined) {
      const validScopes = [
        'read:profile', 'write:profile',
        'read:tokens', 'write:tokens',
        'read:organizations', 'write:organizations',
        'read:users', 'write:users',
        'read:audit', 'write:audit',
        'read:integrations', 'write:integrations',
        'read:notifications', 'write:notifications'
      ];
      
      const invalidScopes = params.scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid scopes: ${invalidScopes.join(', ')}`);
      }
      
      oauthApp.set('scopes', params.scopes);
    }
    
    if (params.isActive !== undefined) {
      oauthApp.set('isActive', params.isActive);
    }
    
    oauthApp.set('updatedBy', user.id);
    await oauthApp.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'oauth_app_updated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'OAuthApp');
    auditLog.set('resourceId', oauthApp.id);
    auditLog.set('details', {
      appName: oauthApp.get('name'),
      clientId: oauthApp.get('clientId'),
      isActive: oauthApp.get('isActive')
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      oauthApp: {
        id: oauthApp.id,
        name: oauthApp.get('name'),
        description: oauthApp.get('description'),
        clientId: oauthApp.get('clientId'),
        redirectUris: oauthApp.get('redirectUris'),
        scopes: oauthApp.get('scopes'),
        applicationType: oauthApp.get('applicationType'),
        isActive: oauthApp.get('isActive'),
        tokenCount: oauthApp.get('tokenCount') || 0,
        lastUsed: oauthApp.get('lastUsed')?.toISOString(),
        createdAt: oauthApp.get('createdAt')?.toISOString(),
        updatedAt: oauthApp.get('updatedAt')?.toISOString(),
        createdBy: oauthApp.get('createdBy'),
        updatedBy: oauthApp.get('updatedBy')
      }
    };

  } catch (error) {
    console.error('Error in updateOAuthApp:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update OAuth application');
  }
});

/**
 * Regenerate OAuth client secret
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.oauthAppId - OAuth app ID
 * @returns {Object} Response with new client secret
 */
Parse.Cloud.define('regenerateOAuthSecret', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.oauthAppId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: oauthAppId');
    }

    // Get the OAuth app
    const oauthQuery = new Parse.Query('OAuthApp');
    const oauthApp = await oauthQuery.get(params.oauthAppId, { useMasterKey: true });
    
    if (!oauthApp) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'OAuth application not found');
    }

    const orgId = oauthApp.get('orgId');
    
    // Verify user has access and permissions
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this OAuth application');
    }

    const userRoles = orgUser.get('roles') || [];
    const canRegenerateSecret = userRoles.some(role => 
      ['admin', 'system_admin'].includes(role)
    );
    
    if (!canRegenerateSecret) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to regenerate OAuth secrets');
    }

    // Generate new client secret
    const newClientSecret = crypto.randomBytes(32).toString('hex');
    const oldSecretHash = crypto.createHash('sha256').update(oauthApp.get('clientSecret')).digest('hex');
    
    oauthApp.set('clientSecret', newClientSecret);
    oauthApp.set('updatedBy', user.id);
    await oauthApp.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'oauth_secret_regenerated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'OAuthApp');
    auditLog.set('resourceId', oauthApp.id);
    auditLog.set('details', {
      appName: oauthApp.get('name'),
      clientId: oauthApp.get('clientId'),
      oldSecretHash: oldSecretHash,
      regeneratedBy: user.id,
      regeneratedAt: new Date().toISOString()
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      clientSecret: newClientSecret,
      message: 'Client secret regenerated successfully'
    };

  } catch (error) {
    console.error('Error in regenerateOAuthSecret:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to regenerate OAuth secret');
  }
});

/**
 * Delete OAuth application
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.oauthAppId - OAuth app ID to delete
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('deleteOAuthApp', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.oauthAppId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: oauthAppId');
    }

    // Get the OAuth app
    const oauthQuery = new Parse.Query('OAuthApp');
    const oauthApp = await oauthQuery.get(params.oauthAppId, { useMasterKey: true });
    
    if (!oauthApp) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'OAuth application not found');
    }

    const orgId = oauthApp.get('orgId');
    
    // Verify user has access and permissions
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this OAuth application');
    }

    const userRoles = orgUser.get('roles') || [];
    const canDeleteOAuth = userRoles.some(role => 
      ['admin', 'system_admin'].includes(role)
    );
    
    if (!canDeleteOAuth) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to delete OAuth applications');
    }

    // Store app details for audit log
    const appDetails = {
      name: oauthApp.get('name'),
      clientId: oauthApp.get('clientId'),
      scopes: oauthApp.get('scopes')
    };

    // Delete the OAuth app
    await oauthApp.destroy({ useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'oauth_app_deleted');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'OAuthApp');
    auditLog.set('resourceId', params.oauthAppId);
    auditLog.set('details', {
      deletedApp: appDetails,
      deletedBy: user.id,
      deletedAt: new Date().toISOString()
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'OAuth application deleted successfully'
    };

  } catch (error) {
    console.error('Error in deleteOAuthApp:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete OAuth application');
  }
});

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