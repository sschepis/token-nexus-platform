/* global Parse */

Parse.Cloud.define('createAPIEndpoint', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { 
    applicationId, 
    name, 
    description, 
    method, 
    path, 
    authentication, 
    parameters, 
    responseSchema 
  } = request.params;

  const application = await new Parse.Query('CMSApplication')
    .get(applicationId, { useMasterKey: true });

  if (!application) {
    throw new Error('Application not found');
  }

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  const APIEndpoint = Parse.Object.extend('CMSAPIEndpoint');
  const endpoint = new APIEndpoint();

  endpoint.set('name', name);
  endpoint.set('description', description);
  endpoint.set('method', method);
  endpoint.set('path', path);
  endpoint.set('authentication', authentication);
  endpoint.set('parameters', parameters);
  endpoint.set('responseSchema', responseSchema);
  endpoint.set('application', application);
  endpoint.set('createdBy', request.user);

  await endpoint.save(null, { useMasterKey: true });

  // Update application's API endpoints array
  const endpoints = application.get('apis') || [];
  endpoints.push(endpoint);
  application.set('apis', endpoints);
  await application.save(null, { useMasterKey: true });

  return endpoint;
});

Parse.Cloud.define('updateAPIEndpoint', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { 
    endpointId, 
    name, 
    description, 
    method, 
    path, 
    authentication, 
    parameters, 
    responseSchema 
  } = request.params;

  const endpoint = await new Parse.Query('CMSAPIEndpoint')
    .get(endpointId, { useMasterKey: true });

  if (!endpoint) {
    throw new Error('API endpoint not found');
  }

  // Check permissions
  const application = endpoint.get('application');
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  endpoint.set('name', name);
  endpoint.set('description', description);
  endpoint.set('method', method);
  endpoint.set('path', path);
  endpoint.set('authentication', authentication);
  endpoint.set('parameters', parameters);
  endpoint.set('responseSchema', responseSchema);
  endpoint.set('updatedBy', request.user);

  await endpoint.save(null, { useMasterKey: true });

  return endpoint;
});

Parse.Cloud.define('deleteAPIEndpoint', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { endpointId } = request.params;

  const endpoint = await new Parse.Query('CMSAPIEndpoint')
    .get(endpointId, { useMasterKey: true });

  if (!endpoint) {
    throw new Error('API endpoint not found');
  }

  // Check permissions
  const application = endpoint.get('application');
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  // Remove from application's API endpoints array
  const endpoints = application.get('apis') || [];
  application.set('apis', endpoints.filter(e => e.id !== endpointId));
  await application.save(null, { useMasterKey: true });

  await endpoint.destroy({ useMasterKey: true });

  return { success: true };
});

Parse.Cloud.beforeSave('CMSAPIEndpoint', request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const endpoint = request.object;

  // If this is a new endpoint
  if (!endpoint.existed()) {
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${request.user.get('organization').id}`, true);
    acl.setRoleWriteAccess(`org_${request.user.get('organization').id}`, true);
    endpoint.setACL(acl);
  }

  // Validate required fields
  const method = endpoint.get('method');
  const path = endpoint.get('path');
  const authentication = endpoint.get('authentication');

  if (!method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    throw new Error('Invalid HTTP method');
  }

  if (!path || !path.startsWith('/')) {
    throw new Error('Path must start with /');
  }

  if (!authentication || !['none', 'api_key', 'jwt', 'oauth2'].includes(authentication)) {
    throw new Error('Invalid authentication type');
  }

  // Validate parameters
  const parameters = endpoint.get('parameters') || [];
  parameters.forEach(param => {
    if (!param.name || !param.type || !param.location) {
      throw new Error('Invalid parameter configuration');
    }

    if (!['string', 'number', 'boolean', 'object', 'array', 'query'].includes(param.type)) {
      throw new Error('Invalid parameter type');
    }

    if (!['query', 'body', 'path', 'header'].includes(param.location)) {
      throw new Error('Invalid parameter location');
    }
  });

  // Validate response schema
  const responseSchema = endpoint.get('responseSchema');
  if (responseSchema && typeof responseSchema !== 'object') {
    throw new Error('Response schema must be an object');
  }
});

Parse.Cloud.afterSave('CMSAPIEndpoint', async request => {
  const endpoint = request.object;

  // If this is a new endpoint
  if (!endpoint.existed()) {
    // Generate OpenAPI spec
    const spec = {
      path: endpoint.get('path'),
      method: endpoint.get('method').toLowerCase(),
      summary: endpoint.get('name'),
      description: endpoint.get('description'),
      parameters: endpoint.get('parameters').map(param => ({
        name: param.name,
        in: param.location,
        required: param.required,
        schema: {
          type: param.type
        },
        description: param.description
      })),
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: endpoint.get('responseSchema')
            }
          }
        }
      }
    };

    // Add authentication requirements
    const auth = endpoint.get('authentication');
    if (auth !== 'none') {
      spec.security = [{
        [auth]: []
      }];
    }

    // Store OpenAPI spec
    endpoint.set('openApiSpec', spec);
    await endpoint.save(null, { useMasterKey: true });
  }
});
