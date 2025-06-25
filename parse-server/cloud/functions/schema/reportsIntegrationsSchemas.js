// Reports and Integrations Schema Initialization
const reportsIntegrationsSchemas = require('../../schemas/reportsAndIntegrations');

// Initialize all reports and integrations schemas
Parse.Cloud.define('initializeReportsIntegrationsSchemas', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can initialize schemas');
  }

  try {
    console.log('Starting reports and integrations schema initialization...');
    
    // Initialize schemas using the module function
    await reportsIntegrationsSchemas(Parse);
    
    return {
      success: true,
      message: 'Reports and integrations schemas initialization completed'
    };
    
  } catch (error) {
    console.error('Reports and integrations schema initialization error:', error);
    throw error;
  }
});

// Get schema status for all reports and integrations schemas
Parse.Cloud.define('getReportsIntegrationsSchemaStatus', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can view schema status');
  }

  try {
    const results = [];
    const schemaNames = [
      'CMSReport',
      'CMSReportResult', 
      'Integration',
      'CustomPage',
      'CMSMetric',
      'VisitorStats',
      'APIStats'
    ];
    
    for (const className of schemaNames) {
      try {
        const schema = await Parse.Schema.get(className, { useMasterKey: true });
        results.push({
          className: className,
          exists: true,
          fields: Object.keys(schema.fields || {}),
          indexes: Object.keys(schema.indexes || {}),
          clp: schema.classLevelPermissions || {}
        });
      } catch (error) {
        results.push({
          className: className,
          exists: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      schemas: results
    };
    
  } catch (error) {
    console.error('Schema status error:', error);
    throw error;
  }
});

// Auto-initialize schemas on server start
Parse.Cloud.define('autoInitializeReportsIntegrationsSchemas', async () => {
  try {
    console.log('Auto-initializing reports and integrations schemas...');
    await reportsIntegrationsSchemas(Parse);
    console.log('✓ Reports and integrations schemas auto-initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('✗ Auto-initialization failed:', error);
    return { success: false, error: error.message };
  }
});

module.exports = {};