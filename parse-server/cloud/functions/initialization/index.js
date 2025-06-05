/* global Parse */

const { getAdminUser } = require('../roles');
const { createStatsObject } = require('../analytics');

const createExampleAPI = async () => {
  const query = new Parse.Query('CMSAPIEndpoint');
  const count = await query.count();

  if (count === 0) {
    const exampleAPI = new Parse.Object('CMSAPIEndpoint');

    exampleAPI.set('name', 'Example API');
    exampleAPI.set('description', 'A simple example API endpoint');
    exampleAPI.set('method', 'GET');
    exampleAPI.set('path', '/api/example');
    exampleAPI.set('authentication', 'none');
    exampleAPI.set('parameters', []);
    exampleAPI.set('responseSchema', {});
    exampleAPI.set(
      'code',
      `// Example API endpoint
// The API code has access to:
// - request: The incoming request object
// - response: The response object to send back
// - Parse: The Parse SDK for database operations
// - console: For logging

// Get query parameters
const { name = 'World' } = request.params;

// Set response
response.result = {
  message: \`Hello, \${name}!\`,
  timestamp: new Date().toISOString()
};

// You can also perform database operations
const query = new Parse.Query('YourClass');
// const results = await query.find();

// Or call other cloud functions
// const result = await Parse.Cloud.run('otherFunction', { param: 'value' });
`
    );

    await exampleAPI.save();

    return { success: true, message: 'Example API created' };
  }

  return { success: true, message: 'Example API already exists' };
};

const initialize = async () => {
  try {
    // First ensure admin user exists
    const admin = await getAdminUser();
    const options = { useMasterKey: true };

    // Create sample data
    const query = new Parse.Query('Organization');

    query.equalTo('name', 'Test Organization');
    let organization = await query.first(options);

    if (!organization) {
      organization = new Parse.Object('Organization');
      organization.set('name', 'Test Organization');
      organization.set('subdomain', 'test');

      // Always use admin user during initialization
      organization.set('createdBy', admin);
      organization.set('updatedBy', admin);
      organization.set('settings', {
        enableNotifications: true,
        enableTwoFactorAuth: false,
        allowExternalIntegrations: true,
        auditLogging: true,
      });

      // Set up ACL for organization
      const orgAcl = new Parse.ACL();

      orgAcl.setPublicReadAccess(false);
      orgAcl.setRoleReadAccess('admin', true);
      orgAcl.setReadAccess(admin, true);
      orgAcl.setWriteAccess(admin, true);
      organization.setACL(orgAcl);

      await organization.save(null, options);

      // Set up ACL for stats objects
      const statsAcl = new Parse.ACL();

      statsAcl.setPublicReadAccess(false);
      statsAcl.setRoleReadAccess('admin', true);
      statsAcl.setReadAccess(admin, true);

      // Create sample stats
      await Promise.all([
        createStatsObject('VisitorStats', { count: 100 }, organization.id, statsAcl, options),
        createStatsObject(
          'APIStats',
          { requests: 500, avgResponseTime: 150 },
          organization.id,
          statsAcl,
          options
        ),
        createStatsObject(
          'StorageStats',
          { used: 512, total: 1024 },
          organization.id,
          statsAcl,
          options
        ),
      ]);
    }

    // Create example API if none exist
    await createExampleAPI();

    return {
      success: true,
      message: 'Cloud functions initialized successfully',
      organizationId: organization.id,
    };
  } catch (error) {
    console.error('Error during initialization:', error);
    throw error;
  }
};

module.exports = {
  initialize,
  createExampleAPI,
};
