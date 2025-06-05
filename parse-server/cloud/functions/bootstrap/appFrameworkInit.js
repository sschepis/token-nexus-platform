// App Framework Initialization
// This function sets up the complete app framework system

Parse.Cloud.define('initializeAppFramework', async (request) => {
  const { user } = request;
  const { force = false } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can initialize the app framework');
  }

  const results = {
    schemas: [],
    scheduledJobs: 0,
    triggers: 0,
    apis: 0,
    errors: []
  };

  try {
    console.log('Starting App Framework initialization...');

    // Step 1: Initialize schemas
    try {
      console.log('Initializing app framework schemas...');
      const schemaResult = await Parse.Cloud.run('initializeAppFrameworkSchemas', {}, { useMasterKey: true });
      results.schemas = schemaResult.results;
      console.log(`✓ Schemas initialized: ${schemaResult.results.length} schemas processed`);
    } catch (error) {
      console.error('Schema initialization failed:', error);
      results.errors.push(`Schema initialization: ${error.message}`);
    }

    // Step 2: Initialize scheduled jobs
    try {
      console.log('Initializing scheduled jobs...');
      const jobResult = await Parse.Cloud.run('initializeScheduledJobs', {}, { useMasterKey: true });
      results.scheduledJobs = jobResult.jobCount;
      console.log(`✓ Scheduled jobs initialized: ${jobResult.jobCount} jobs`);
    } catch (error) {
      console.error('Scheduled jobs initialization failed:', error);
      results.errors.push(`Scheduled jobs: ${error.message}`);
    }

    // Step 3: Initialize triggers
    try {
      console.log('Initializing app triggers...');
      const triggerResult = await Parse.Cloud.run('initializeAppTriggers', {}, { useMasterKey: true });
      results.triggers = triggerResult.triggerCount;
      console.log(`✓ Triggers initialized: ${triggerResult.triggerCount} triggers`);
    } catch (error) {
      console.error('Triggers initialization failed:', error);
      results.errors.push(`Triggers: ${error.message}`);
    }

    // Step 4: Initialize APIs
    try {
      console.log('Initializing app APIs...');
      const apiResult = await Parse.Cloud.run('initializeAppAPIs', {}, { useMasterKey: true });
      results.apis = apiResult.apiCount;
      console.log(`✓ APIs initialized: ${apiResult.apiCount} APIs`);
    } catch (error) {
      console.error('APIs initialization failed:', error);
      results.errors.push(`APIs: ${error.message}`);
    }

    // Step 5: Create sample app if none exist
    try {
      console.log('Checking for sample apps...');
      const AppDefinition = Parse.Object.extend('AppDefinition');
      const appQuery = new Parse.Query(AppDefinition);
      const existingApps = await appQuery.count({ useMasterKey: true });
      
      if (existingApps === 0 || force) {
        console.log('Creating sample Todo app...');
        await createSampleTodoApp(user);
        console.log('✓ Sample Todo app created');
      } else {
        console.log(`✓ Found ${existingApps} existing apps, skipping sample creation`);
      }
    } catch (error) {
      console.error('Sample app creation failed:', error);
      results.errors.push(`Sample app: ${error.message}`);
    }

    const successCount = [
      results.schemas.filter(s => s.status === 'success').length,
      results.scheduledJobs > 0 ? 1 : 0,
      results.triggers >= 0 ? 1 : 0,
      results.apis >= 0 ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    console.log('App Framework initialization completed!');
    
    return {
      success: results.errors.length === 0,
      message: results.errors.length === 0 
        ? 'App Framework initialized successfully' 
        : `App Framework initialized with ${results.errors.length} errors`,
      results: results,
      summary: {
        schemasProcessed: results.schemas.length,
        schemasSuccessful: results.schemas.filter(s => s.status === 'success').length,
        scheduledJobs: results.scheduledJobs,
        triggers: results.triggers,
        apis: results.apis,
        errors: results.errors.length
      }
    };

  } catch (error) {
    console.error('App Framework initialization error:', error);
    throw error;
  }
});

// Helper function to create sample Todo app
async function createSampleTodoApp(user) {
  try {
    // Create AppBundle
    const AppBundle = Parse.Object.extend('AppBundle');
    const bundle = new AppBundle();
    
    bundle.set('name', 'Todo Manager');
    bundle.set('description', 'A comprehensive todo management application for organizations');
    bundle.set('category', 'productivity');
    bundle.set('status', 'published');
    bundle.set('currentVersion', '1.0.0');
    bundle.set('publishedVersion', '1.0.0');
    bundle.set('developer', user.id);
    bundle.set('icon', '📋');
    bundle.set('permissions', ['todo:read', 'todo:write', 'todo:delete']);
    bundle.set('configuration', {
      autoArchive: { type: 'boolean', default: false },
      maxTodos: { type: 'number', default: 100 },
      reminderEnabled: { type: 'boolean', default: false }
    });
    bundle.set('supportEmail', 'support@tokennexus.com');
    bundle.set('publishedAt', new Date());

    await bundle.save(null, { useMasterKey: true });

    // Create AppVersion
    const AppVersion = Parse.Object.extend('AppVersion');
    const version = new AppVersion();
    
    version.set('appBundle', bundle);
    version.set('version', '1.0.0');
    version.set('status', 'published');
    version.set('releaseNotes', 'Initial release of Todo Manager with basic task management features');
    version.set('submittedBy', user);
    version.set('submittedAt', new Date());
    version.set('approvedAt', new Date());
    version.set('approvedBy', user.id);
    version.set('publishedAt', new Date());
    version.set('publishedBy', user.id);

    await version.save(null, { useMasterKey: true });

    // Create AppDefinition for marketplace
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const appDef = new AppDefinition();
    
    appDef.set('appBundle', bundle);
    appDef.set('name', 'Todo Manager');
    appDef.set('description', 'A comprehensive todo management application for organizations');
    appDef.set('category', 'productivity');
    appDef.set('version', '1.0.0');
    appDef.set('bundleUrl', '/apps/todo-manager/bundle.js');
    appDef.set('icon', '📋');
    appDef.set('permissions', ['todo:read', 'todo:write', 'todo:delete']);
    appDef.set('configuration', {
      autoArchive: { type: 'boolean', default: false },
      maxTodos: { type: 'number', default: 100 },
      reminderEnabled: { type: 'boolean', default: false }
    });
    appDef.set('manifest', {
      id: 'todo-manager',
      name: 'Todo Manager',
      version: '1.0.0',
      adminUI: {
        enabled: true,
        routes: [
          { path: '/', component: 'TodoDashboard', title: 'Dashboard' },
          { path: '/settings', component: 'TodoSettings', title: 'Settings' }
        ]
      },
      scheduledJobs: [
        {
          id: 'daily-cleanup',
          name: 'Daily Todo Cleanup',
          schedule: '0 2 * * *',
          function: 'dailyTodoCleanup'
        }
      ]
    });
    appDef.set('developer', user.id);
    appDef.set('isActive', true);
    appDef.set('isFeatured', true);
    appDef.set('rating', 4.5);
    appDef.set('downloadCount', 0);
    appDef.set('publishedAt', new Date());

    // Set public read access for marketplace
    const appDefACL = new Parse.ACL();
    appDefACL.setPublicReadAccess(true);
    appDefACL.setRoleWriteAccess('SystemAdmin', true);
    appDef.setACL(appDefACL);

    await appDef.save(null, { useMasterKey: true });

    console.log('Sample Todo app created successfully');
    return { bundle, version, appDef };

  } catch (error) {
    console.error('Error creating sample Todo app:', error);
    throw error;
  }
}

// Get app framework status
Parse.Cloud.define('getAppFrameworkStatus', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can view app framework status');
  }

  try {
    const status = {
      schemas: {},
      apps: {},
      installations: {},
      scheduledJobs: {},
      triggers: {},
      apis: {},
      executionLogs: {}
    };

    // Check schemas
    try {
      const schemaResult = await Parse.Cloud.run('getAppFrameworkSchemaStatus', {}, { useMasterKey: true });
      status.schemas = {
        available: schemaResult.schemas.length,
        existing: schemaResult.schemas.filter(s => s.exists).length,
        missing: schemaResult.schemas.filter(s => !s.exists).length
      };
    } catch (error) {
      status.schemas.error = error.message;
    }

    // Check apps
    try {
      const AppDefinition = Parse.Object.extend('AppDefinition');
      const appQuery = new Parse.Query(AppDefinition);
      status.apps.total = await appQuery.count({ useMasterKey: true });
      
      appQuery.equalTo('isActive', true);
      status.apps.active = await appQuery.count({ useMasterKey: true });
    } catch (error) {
      status.apps.error = error.message;
    }

    // Check installations
    try {
      const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
      const installQuery = new Parse.Query(OrgAppInstallation);
      status.installations.total = await installQuery.count({ useMasterKey: true });
      
      installQuery.equalTo('status', 'active');
      status.installations.active = await installQuery.count({ useMasterKey: true });
    } catch (error) {
      status.installations.error = error.message;
    }

    // Check scheduled jobs
    try {
      const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
      const jobQuery = new Parse.Query(AppScheduledJob);
      status.scheduledJobs.total = await jobQuery.count({ useMasterKey: true });
      
      jobQuery.equalTo('enabled', true);
      status.scheduledJobs.enabled = await jobQuery.count({ useMasterKey: true });
    } catch (error) {
      status.scheduledJobs.error = error.message;
    }

    // Check triggers
    try {
      const AppTrigger = Parse.Object.extend('AppTrigger');
      const triggerQuery = new Parse.Query(AppTrigger);
      status.triggers.total = await triggerQuery.count({ useMasterKey: true });
      
      triggerQuery.equalTo('enabled', true);
      status.triggers.enabled = await triggerQuery.count({ useMasterKey: true });
    } catch (error) {
      status.triggers.error = error.message;
    }

    // Check APIs
    try {
      const AppAPI = Parse.Object.extend('AppAPI');
      const apiQuery = new Parse.Query(AppAPI);
      status.apis.total = await apiQuery.count({ useMasterKey: true });
      
      apiQuery.equalTo('enabled', true);
      status.apis.enabled = await apiQuery.count({ useMasterKey: true });
    } catch (error) {
      status.apis.error = error.message;
    }

    // Check execution logs (last 24 hours)
    try {
      const AppExecutionLog = Parse.Object.extend('AppExecutionLog');
      const logQuery = new Parse.Query(AppExecutionLog);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      logQuery.greaterThan('startTime', yesterday);
      status.executionLogs.last24h = await logQuery.count({ useMasterKey: true });
      
      logQuery.equalTo('status', 'success');
      status.executionLogs.successful = await logQuery.count({ useMasterKey: true });
    } catch (error) {
      status.executionLogs.error = error.message;
    }

    return {
      success: true,
      status: status,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Get app framework status error:', error);
    throw error;
  }
});

// Reset app framework (for development/testing)
Parse.Cloud.define('resetAppFramework', async (request) => {
  const { user } = request;
  const { confirm } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can reset the app framework');
  }
  
  if (confirm !== 'YES_RESET_EVERYTHING') {
    throw new Error('Confirmation required: pass confirm: "YES_RESET_EVERYTHING"');
  }

  try {
    console.log('Starting App Framework reset...');
    
    const results = [];

    // Drop all app framework schemas
    try {
      const dropResult = await Parse.Cloud.run('dropAppFrameworkSchemas', { 
        confirm: 'YES_DELETE_ALL_SCHEMAS' 
      }, { useMasterKey: true });
      results.push({ step: 'drop_schemas', ...dropResult });
    } catch (error) {
      results.push({ step: 'drop_schemas', error: error.message });
    }

    // Clear in-memory registrations
    // Note: This would require server restart in production
    
    console.log('App Framework reset completed');
    
    return {
      success: true,
      message: 'App Framework reset completed. Server restart recommended.',
      results: results
    };

  } catch (error) {
    console.error('App Framework reset error:', error);
    throw error;
  }
});

module.exports = {};