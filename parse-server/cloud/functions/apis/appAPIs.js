// App APIs Management
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

const registeredAPIs = new Map();

// Create or update an app API
Parse.Cloud.define('createAppAPI', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { 
    appInstallationId, 
    apiId, 
    name, 
    description, 
    path, 
    method, 
    functionName, 
    isPublic = false,
    requiredPermissions = [],
    allowedRoles = [],
    requestSchema = {},
    responseSchema = {},
    rateLimit = {},
    enabled = true
  } = request.params;

  // No need for explicit user, organization role, or organization ID checks, middleware handles it
  if (!appInstallationId || !apiId || !name || !path || !method || !functionName) {
    throw new Error('App installation ID, API ID, name, path, method, and function name are required');
  }

  // Validate HTTP method
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  if (!validMethods.includes(method.toUpperCase())) {
    throw new Error(`Invalid HTTP method. Must be one of: ${validMethods.join(', ')}`);
  }

  // Validate path format
  if (!path.startsWith('/')) {
    throw new Error('API path must start with "/"');
  }

  try {
    // Get the app installation and verify it belongs to the current organization
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installQuery = new Parse.Query(OrgAppInstallation);
    installQuery.equalTo('objectId', appInstallationId);
    installQuery.equalTo('organization', organization); // Ensure it belongs to the current organization
    installQuery.include('appDefinition');
    const installation = await installQuery.first({ useMasterKey: true });

    if (!installation) {
      throw new Error('App installation not found in this organization');
    }

    // Check for path conflicts within the organization
    const AppAPI = Parse.Object.extend('AppAPI');
    const conflictQuery = new Parse.Query(AppAPI);
    conflictQuery.equalTo('organization', organization);
    conflictQuery.equalTo('path', path);
    conflictQuery.equalTo('method', method.toUpperCase());
    conflictQuery.notEqualTo('apiId', apiId); // Exclude current API if updating
    const conflictingAPI = await conflictQuery.first({ useMasterKey: true });

    if (conflictingAPI) {
      throw new Error(`API endpoint ${method.toUpperCase()} ${path} already exists in this organization`);
    }

    // Check if API already exists
    const existingQuery = new Parse.Query(AppAPI);
    existingQuery.equalTo('appInstallation', installation);
    existingQuery.equalTo('apiId', apiId);
    // Also include organization filter for robustness, though appInstallation should already limit it
    existingQuery.equalTo('organization', organization); 
    let api = await existingQuery.first({ useMasterKey: true });

    if (api) {
      // Update existing API
      api.set('name', name);
      api.set('description', description);
      api.set('path', path);
      api.set('method', method.toUpperCase());
      api.set('functionName', functionName);
      api.set('isPublic', isPublic);
      api.set('requiredPermissions', requiredPermissions);
      api.set('allowedRoles', allowedRoles);
      api.set('requestSchema', requestSchema);
      api.set('responseSchema', responseSchema);
      api.set('rateLimit', rateLimit);
      api.set('enabled', enabled);
      api.set('updatedBy', user);
    } else {
      // Create new API
      api = new AppAPI();
      api.set('appInstallation', installation);
      api.set('organization', organization); // Set organization from middleware
      api.set('apiId', apiId);
      api.set('name', name);
      api.set('description', description);
      api.set('path', path);
      api.set('method', method.toUpperCase());
      api.set('functionName', functionName);
      api.set('isPublic', isPublic);
      api.set('requiredPermissions', requiredPermissions);
      api.set('allowedRoles', allowedRoles);
      api.set('requestSchema', requestSchema);
      api.set('responseSchema', responseSchema);
      api.set('rateLimit', rateLimit);
      api.set('enabled', enabled);
      api.set('status', 'active');
      api.set('callCount', 0);
      api.set('errorCount', 0);
      api.set('createdBy', user);

      // Set ACL
      const apiACL = new Parse.ACL();
      apiACL.setPublicReadAccess(isPublic);
      apiACL.setRoleReadAccess(`org_${organizationId}_member`, true); // Use organizationId from middleware
      apiACL.setRoleWriteAccess(`org_${organizationId}_admin`, true); // Use organizationId from middleware
      apiACL.setRoleReadAccess('SystemAdmin', true);
      apiACL.setRoleWriteAccess('SystemAdmin', true);
      api.setACL(apiACL);
    }

    await api.save(null, { useMasterKey: true });

    // Register the API endpoint
    if (enabled) {
      await registerAPI(api);
    }

    return {
      success: true,
      apiId: api.id,
      message: `API ${api.get('name')} ${api.existed() ? 'updated' : 'created'} successfully`,
      endpoint: `${method.toUpperCase()} ${path}`
    };

  } catch (error) {
    console.error('Create API error:', error);
    throw error;
  }
}));

// Get APIs for an app installation
Parse.Cloud.define('getAppAPIs', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { appInstallationId } = request.params; // organizationId parameter removed as middleware provides it

  // No need for explicit user check (middleware handles auth)
  if (!appInstallationId && !organizationId) { // Check if either is present in params
    throw new Error('Either app installation ID or organization ID is required');
  }

  try {
    const AppAPI = Parse.Object.extend('AppAPI');
    const query = new Parse.Query(AppAPI);

    if (appInstallationId) {
      const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
      const installation = OrgAppInstallation.createWithoutData(appInstallationId);
      query.equalTo('appInstallation', installation);
      query.equalTo('organization', organization); // Ensure appInstallation belongs to current organization
    } else if (organizationId) {
      query.equalTo('organization', organization); // Use organization object from middleware
    }

    query.include('appInstallation');
    query.include('createdBy');
    query.include('updatedBy');
    query.descending('createdAt');

    const apis = await query.find({ useMasterKey: true });

    const results = apis.map(api => ({
      id: api.id,
      apiId: api.get('apiId'),
      name: api.get('name'),
      description: api.get('description'),
      path: api.get('path'),
      method: api.get('method'),
      functionName: api.get('functionName'),
      isPublic: api.get('isPublic'),
      requiredPermissions: api.get('requiredPermissions'),
      allowedRoles: api.get('allowedRoles'),
      requestSchema: api.get('requestSchema'),
      responseSchema: api.get('responseSchema'),
      rateLimit: api.get('rateLimit'),
      enabled: api.get('enabled'),
      status: api.get('status'),
      callCount: api.get('callCount'),
      lastCalled: api.get('lastCalled'),
      errorCount: api.get('errorCount'),
      lastError: api.get('lastError'),
      createdAt: api.get('createdAt'),
      updatedAt: api.get('updatedAt'),
      createdBy: api.get('createdBy') ? {
        id: api.get('createdBy').id,
        email: api.get('createdBy').get('email')
      } : null
    }));

    return {
      success: true,
      apis: results
    };

  } catch (error) {
    console.error('Get APIs error:', error);
    throw error;
  }
}));

// Enable/disable an API
Parse.Cloud.define('toggleAppAPI', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { apiObjectId, enabled } = request.params;

  // No need for explicit user or organization role checks, middleware handles it
  if (!apiObjectId || enabled === undefined) {
    throw new Error('API object ID and enabled status are required');
  }

  try {
    const AppAPI = Parse.Object.extend('AppAPI');
    const query = new Parse.Query(AppAPI);
    query.equalTo('objectId', apiObjectId);
    query.equalTo('organization', organization); // Ensure API belongs to current organization
    const api = await query.first({ useMasterKey: true });

    if (!api) {
      throw new Error('API not found in this organization');
    }

    // Update API status
    api.set('enabled', enabled);
    api.set('updatedBy', user);
    
    if (enabled) {
      api.set('status', 'active');
    } else {
      api.set('status', 'disabled');
    }

    await api.save(null, { useMasterKey: true });

    // Update API registration
    if (enabled) {
      await registerAPI(api);
    } else {
      await unregisterAPI(api.id);
    }

    return {
      success: true,
      message: `API ${enabled ? 'enabled' : 'disabled'} successfully`
    };

  } catch (error) {
    console.error('Toggle API error:', error);
    throw error;
  }
}));

// Delete an API
Parse.Cloud.define('deleteAppAPI', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { apiObjectId } = request.params;

  // No need for explicit user or organization role checks, middleware handles it
  if (!apiObjectId) {
    throw new Error('API object ID is required');
  }

  try {
    const AppAPI = Parse.Object.extend('AppAPI');
    const query = new Parse.Query(AppAPI);
    query.equalTo('objectId', apiObjectId);
    query.equalTo('organization', organization); // Ensure API belongs to current organization
    const api = await query.first({ useMasterKey: true });

    if (!api) {
      throw new Error('API not found in this organization');
    }

    const apiName = api.get('name');
    const endpoint = `${api.get('method')} ${api.get('path')}`;

    // Unregister from API router
    await unregisterAPI(api.id);

    // Delete the API
    await api.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `API "${apiName}" (${endpoint}) deleted successfully`
    };

  } catch (error) {
    console.error('Delete API error:', error);
    throw error;
  }
}));

// Call an app API
Parse.Cloud.define('callAppAPI', async (request) => {
  const { user } = request;
  const { organizationId, path, method = 'GET', data = {}, headers = {} } = request.params;

  if (!organizationId || !path) {
    throw new Error('Organization ID and path are required');
  }

  try {
    // Find the API
    const AppAPI = Parse.Object.extend('AppAPI');
    const query = new Parse.Query(AppAPI);
    
    const Organization = Parse.Object.extend('Organization');
    const organization = Organization.createWithoutData(organizationId);
    query.equalTo('organization', organization);
    query.equalTo('path', path);
    query.equalTo('method', method.toUpperCase());
    query.equalTo('enabled', true);
    query.equalTo('status', 'active');
    query.include('appInstallation');

    const api = await query.first({ useMasterKey: true });

    if (!api) {
      throw new Error(`API endpoint ${method.toUpperCase()} ${path} not found`);
    }

    // Check permissions
    if (!api.get('isPublic')) {
      if (!user) {
        throw new Error('Authentication required for this API');
      }

      // Check required permissions
      const requiredPermissions = api.get('requiredPermissions') || [];
      if (requiredPermissions.length > 0) {
        // TODO: Implement permission checking
        // For now, assume user has permissions if authenticated
      }

      // Check allowed roles
      const allowedRoles = api.get('allowedRoles') || [];
      if (allowedRoles.length > 0) {
        // TODO: Implement role checking
        // For now, assume user has role if authenticated
      }
    }

    // Validate request data against schema
    const requestSchema = api.get('requestSchema');
    if (requestSchema && Object.keys(requestSchema).length > 0) {
      // TODO: Implement JSON schema validation
      // For now, skip validation
    }

    // Check rate limiting
    const rateLimit = api.get('rateLimit');
    if (rateLimit && Object.keys(rateLimit).length > 0) {
      // TODO: Implement rate limiting
      // For now, skip rate limiting
    }

    // Execute the API
    const result = await executeAPI(api, {
      method: context.method,
      path: context.path,
      data: context.data,
      headers: context.headers,
      user: context.user,
      organization: organization
    });

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('Call API error:', error);
    throw error;
  }
});

// Helper function to register an API endpoint
async function registerAPI(api) {
  try {
    const apiId = api.id;
    const path = api.get('path');
    const method = api.get('method');
    const functionName = api.get('functionName');

    // Store API registration info
    registeredAPIs.set(apiId, {
      api: api,
      path: path,
      method: method,
      functionName: functionName
    });

    // Note: In a production environment, you would register this with your API router
    // For now, we just store it in memory for the callAppAPI function to use

    console.log(`Registered API ${method} ${path} (${apiId})`);
  } catch (error) {
    console.error('Error registering API:', error);
  }
}

// Helper function to unregister an API endpoint
async function unregisterAPI(apiId) {
  try {
    if (registeredAPIs.has(apiId)) {
      const registration = registeredAPIs.get(apiId);
      registeredAPIs.delete(apiId);
      console.log(`Unregistered API ${registration.method} ${registration.path} (${apiId})`);
    }
  } catch (error) {
    console.error('Error unregistering API:', error);
  }
}

// Helper function to execute an API call
async function executeAPI(api, context) {
  const startTime = new Date();
  let result = null;
  let status = 'success';
  let errorMessage = null;

  try {
    const functionName = api.get('functionName');

    // Prepare execution parameters
    const executionParams = {
      method: context.method,
      path: context.path,
      data: context.data,
      headers: context.headers,
      user: context.user,
      _appFramework: {
        appInstallationId: api.get('appInstallation').id,
        organizationId: api.get('organization').id,
        apiId: api.get('apiId'),
        isPublic: api.get('isPublic')
      }
    };

    // Execute the cloud function
    result = await Parse.Cloud.run(functionName, executionParams, { 
      useMasterKey: true,
      user: context.user 
    });

    // Update API with successful call
    const callCount = (api.get('callCount') || 0) + 1;
    api.set('callCount', callCount);
    api.set('lastCalled', startTime);
    api.set('errorCount', 0);
    api.set('lastError', null);

  } catch (error) {
    console.error(`API execution error (${api.get('name')}):`, error);
    
    status = 'error';
    errorMessage = error.message;
    
    // Update API with error
    const errorCount = (api.get('errorCount') || 0) + 1;
    api.set('errorCount', errorCount);
    api.set('lastError', errorMessage);
    
    // Disable API if too many errors (optional)
    // if (errorCount >= 10) {
    //   api.set('status', 'error');
    //   api.set('enabled', false);
    //   await unregisterAPI(api.id);
    // }

    throw error; // Re-throw to return error to caller
  }

  // Save API updates
  await api.save(null, { useMasterKey: true });

  // Log execution
  await logAPIExecution(api, startTime, new Date(), status, result, errorMessage, context);

  return result;
}

// Helper function to log API execution
async function logAPIExecution(api, startTime, endTime, status, result, errorMessage, context) {
  try {
    const AppExecutionLog = Parse.Object.extend('AppExecutionLog');
    const log = new AppExecutionLog();
    
    log.set('appInstallation', api.get('appInstallation'));
    log.set('organization', api.get('organization'));
    log.set('executionType', 'api');
    log.set('executionId', api.get('apiId'));
    log.set('functionName', api.get('functionName'));
    log.set('triggeredBy', context.user ? context.user.id : 'anonymous');
    log.set('input', {
      method: context.method,
      path: context.path,
      data: context.data,
      headers: context.headers
    });
    log.set('output', result);
    log.set('status', status);
    log.set('startTime', startTime);
    log.set('endTime', endTime);
    log.set('duration', endTime.getTime() - startTime.getTime());
    
    if (errorMessage) {
      log.set('errorMessage', errorMessage);
    }
    
    if (context.user) {
      log.set('userAgent', context.headers['user-agent']);
      log.set('ipAddress', context.headers['x-forwarded-for'] || context.headers['x-real-ip']);
    }
    
    await log.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Error logging API execution:', error);
  }
}

// Initialize APIs on server startup
Parse.Cloud.define('initializeAppAPIs', async (request) => {
  const { user } = request;
  
  if (!user || user.get('isSystemAdmin') !== true) { // Explicitly check system admin
    throw new Error('Only system administrators can initialize APIs');
  }

  try {
    const AppAPI = Parse.Object.extend('AppAPI');
    const query = new Parse.Query(AppAPI);
    query.equalTo('enabled', true);
    query.equalTo('status', 'active');
    
    const apis = await query.find({ useMasterKey: true });
    
    for (const api of apis) {
      await registerAPI(api);
    }
    
    return {
      success: true,
      message: `Initialized ${apis.length} APIs`,
      apiCount: apis.length
    };
    
  } catch (error) {
    console.error('Initialize APIs error:', error);
    throw error;
  }
});

module.exports = {};