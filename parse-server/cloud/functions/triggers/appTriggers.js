// App Triggers Management
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware'); // Add middleware import

const registeredTriggers = new Map();

// Create or update an app trigger
Parse.Cloud.define('createAppTrigger', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { 
    appInstallationId, 
    triggerId, 
    name, 
    description, 
    eventType, 
    className, 
    customEvent,
    functionName, 
    conditions = {},
    enabled = true,
    maxRetries = 3,
    timeout = 30
  } = request.params;

  // No need for explicit user or organization role checks, middleware handles it
  if (!appInstallationId || !triggerId || !name || !eventType || !functionName) {
    throw new Error('App installation ID, trigger ID, name, event type, and function name are required');
  }

  // Validate event type
  const validEventTypes = ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete', 'custom'];
  if (!validEventTypes.includes(eventType)) {
    throw new Error(`Invalid event type. Must be one of: ${validEventTypes.join(', ')}`);
  }

  // For DB triggers, className is required
  if (['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete'].includes(eventType) && !className) {
    throw new Error('Class name is required for database triggers');
  }

  // For custom triggers, customEvent is required
  if (eventType === 'custom' && !customEvent) {
    throw new Error('Custom event name is required for custom triggers');
  }

  try {
    // Get the app installation and verify it belongs to the current organization
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installQuery = new Parse.Query(OrgAppInstallation);
    installQuery.equalTo('objectId', appInstallationId);
    installQuery.equalTo('organization', organization); // Ensure it belongs to the current organization
    const installation = await installQuery.first({ useMasterKey: true });

    if (!installation) {
      throw new Error('App installation not found in this organization');
    }

    // Check if trigger already exists
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const existingQuery = new Parse.Query(AppTrigger);
    existingQuery.equalTo('appInstallation', installation);
    existingQuery.equalTo('triggerId', triggerId);
    // Also include organization filter for robustness
    existingQuery.equalTo('organization', organization); 
    let trigger = await existingQuery.first({ useMasterKey: true });

    if (trigger) {
      // Update existing trigger
      trigger.set('name', name);
      trigger.set('description', description);
      trigger.set('eventType', eventType);
      trigger.set('className', className);
      trigger.set('customEvent', customEvent);
      trigger.set('functionName', functionName);
      trigger.set('conditions', conditions);
      trigger.set('enabled', enabled);
      trigger.set('maxRetries', maxRetries);
      trigger.set('timeout', timeout);
      trigger.set('updatedBy', user);
    } else {
      // Create new trigger
      trigger = new AppTrigger();
      trigger.set('appInstallation', installation);
      trigger.set('organization', organization); // Set organization from middleware
      trigger.set('triggerId', triggerId);
      trigger.set('name', name);
      trigger.set('description', description);
      trigger.set('eventType', eventType);
      trigger.set('className', className);
      trigger.set('customEvent', customEvent);
      trigger.set('functionName', functionName);
      trigger.set('conditions', conditions);
      trigger.set('enabled', enabled);
      trigger.set('maxRetries', maxRetries);
      trigger.set('timeout', timeout);
      trigger.set('status', 'active');
      trigger.set('executionCount', 0);
      trigger.set('errorCount', 0);
      trigger.set('createdBy', user);

      // Set ACL
      const triggerACL = new Parse.ACL();
      triggerACL.setPublicReadAccess(false);
      triggerACL.setRoleReadAccess(`org_${organizationId}_member`, true); // Use organizationId from middleware
      triggerACL.setRoleWriteAccess(`org_${organizationId}_admin`, true); // Use organizationId from middleware
      triggerACL.setRoleReadAccess('SystemAdmin', true);
      triggerACL.setRoleWriteAccess('SystemAdmin', true);
      trigger.setACL(triggerACL);
    }

    await trigger.save(null, { useMasterKey: true });

    // Register the trigger in Parse Server
    if (enabled) {
      await registerTrigger(trigger);
    }

    return {
      success: true,
      triggerId: trigger.id,
      message: `Trigger ${trigger.get('name')} ${trigger.existed() ? 'updated' : 'created'} successfully`
    };

  } catch (error) {
    console.error('Create trigger error:', error);
    throw error;
  }
}));

// Get triggers for an app installation
Parse.Cloud.define('getAppTriggers', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { appInstallationId } = request.params; // organizationId parameter removed as middleware provides it

  // No need for explicit user check (middleware handles auth)
  if (!appInstallationId && !organizationId) { // Check if either is present in params
    throw new Error('Either app installation ID or organization ID is required');
  }

  try {
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const query = new Parse.Query(AppTrigger);

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

    const triggers = await query.find({ useMasterKey: true });

    const results = triggers.map(trigger => ({
      id: trigger.id,
      triggerId: trigger.get('triggerId'),
      name: trigger.get('name'),
      description: trigger.get('description'),
      eventType: trigger.get('eventType'),
      className: trigger.get('className'),
      customEvent: trigger.get('customEvent'),
      functionName: trigger.get('functionName'),
      conditions: trigger.get('conditions'),
      enabled: trigger.get('enabled'),
      status: trigger.get('status'),
      executionCount: trigger.get('executionCount'),
      lastExecuted: trigger.get('lastExecuted'),
      errorCount: trigger.get('errorCount'),
      lastError: trigger.get('lastError'),
      maxRetries: trigger.get('maxRetries'),
      timeout: trigger.get('timeout'),
      createdAt: trigger.get('createdAt'),
      updatedAt: trigger.get('updatedAt'),
      createdBy: trigger.get('createdBy') ? {
        id: trigger.get('createdBy').id,
        email: trigger.get('createdBy').get('email')
      } : null
    }));

    return {
      success: true,
      triggers: results
    };

  } catch (error) {
    console.error('Get triggers error:', error);
    throw error;
  }
}));

// Enable/disable a trigger
Parse.Cloud.define('toggleAppTrigger', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { triggerObjectId, enabled } = request.params;

  // No need for explicit user or organization role checks, middleware handles it
  if (!triggerObjectId || enabled === undefined) {
    throw new Error('Trigger object ID and enabled status are required');
  }

  try {
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const query = new Parse.Query(AppTrigger);
    query.equalTo('objectId', triggerObjectId);
    query.equalTo('organization', organization); // Ensure trigger belongs to current organization
    const trigger = await query.first({ useMasterKey: true });

    if (!trigger) {
      throw new Error('Trigger not found in this organization');
    }

    // Update trigger status
    trigger.set('enabled', enabled);
    trigger.set('updatedBy', user);
    
    if (enabled) {
      trigger.set('status', 'active');
    } else {
      trigger.set('status', 'paused');
    }

    await trigger.save(null, { useMasterKey: true });

    // Update trigger registration
    if (enabled) {
      await registerTrigger(trigger);
    } else {
      await unregisterTrigger(trigger.id);
    }

    return {
      success: true,
      message: `Trigger ${enabled ? 'enabled' : 'disabled'} successfully`
    };

  } catch (error) {
    console.error('Toggle trigger error:', error);
    throw error;
  }
}));

// Delete a trigger
Parse.Cloud.define('deleteAppTrigger', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { triggerObjectId } = request.params;

  // No need for explicit user or organization role checks, middleware handles it
  if (!triggerObjectId) {
    throw new Error('Trigger object ID is required');
  }

  try {
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const query = new Parse.Query(AppTrigger);
    query.equalTo('objectId', triggerObjectId);
    query.equalTo('organization', organization); // Ensure trigger belongs to current organization
    const trigger = await query.first({ useMasterKey: true });

    if (!trigger) {
      throw new Error('Trigger not found in this organization');
    }

    const triggerName = trigger.get('name');

    // Unregister from Parse Server
    await unregisterTrigger(trigger.id);

    // Delete the trigger
    await trigger.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `Trigger "${triggerName}" deleted successfully`
    };

  } catch (error) {
    console.error('Delete trigger error:', error);
    throw error;
  }
}));

// Fire a custom trigger
Parse.Cloud.define('fireCustomTrigger', withOrganizationContext(async (request) => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { customEvent, data = {} } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it
  if (!customEvent) { // organizationId check handled by middleware
    throw new Error('Custom event name is required');
  }

  try {
    // Find all custom triggers for this event in the organization
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const query = new Parse.Query(AppTrigger);
    
    query.equalTo('organization', organization); // Use organization object from middleware
    query.equalTo('eventType', 'custom');
    query.equalTo('customEvent', customEvent);
    query.equalTo('enabled', true);
    query.equalTo('status', 'active');

    const triggers = await query.find({ useMasterKey: true });

    const results = [];
    for (const trigger of triggers) {
      try {
        const result = await executeTrigger(trigger, {
          eventType: 'custom',
          customEvent: customEvent,
          data: data,
          user: user,
          triggeredBy: 'manual',
          organization: organization, // Pass organization object to context for execution
          organizationId: organizationId // Pass organizationId to context for execution
        });
        results.push({
          triggerId: trigger.get('triggerId'),
          status: 'success',
          result: result
        });
      } catch (error) {
        results.push({
          triggerId: trigger.get('triggerId'),
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Fired ${triggers.length} triggers for event "${customEvent}"`,
      results: results
    };

  } catch (error) {
    console.error('Fire custom trigger error:', error);
    throw error;
  }
}));

// Helper function to register a trigger in Parse Server
async function registerTrigger(trigger) {
  try {
    const triggerId = trigger.id;
    const eventType = trigger.get('eventType');
    const className = trigger.get('className');
    const customEvent = trigger.get('customEvent');

    // Unregister existing trigger if it exists
    await unregisterTrigger(triggerId);

    if (eventType === 'custom') {
      // For custom triggers, we don't register with Parse Server
      // They are fired manually via fireCustomTrigger
      registeredTriggers.set(triggerId, { type: 'custom', trigger });
    } else {
      // Register database triggers with Parse Server
      const triggerFunction = async (request) => {
        await executeTrigger(trigger, {
          eventType: eventType,
          object: request.object,
          original: request.original,
          user: request.user,
          master: request.master,
          triggeredBy: 'database',
          organization: trigger.get('organization'), // Pass organization for database triggers
          organizationId: trigger.get('organization')?.id // Pass organizationId for database triggers
        });
      };

      if (eventType === 'beforeSave') {
        Parse.Cloud.beforeSave(className, triggerFunction);
      } else if (eventType === 'afterSave') {
        Parse.Cloud.afterSave(className, triggerFunction);
      } else if (eventType === 'beforeDelete') {
        Parse.Cloud.beforeDelete(className, triggerFunction);
      } else if (eventType === 'afterDelete') {
        Parse.Cloud.afterDelete(className, triggerFunction);
      }

      registeredTriggers.set(triggerId, { 
        type: 'database', 
        trigger, 
        className, 
        eventType,
        function: triggerFunction 
      });
    }

    console.log(`Registered trigger ${trigger.get('name')} (${triggerId})`);
  } catch (error) {
    console.error('Error registering trigger:', error);
  }
}

// Helper function to unregister a trigger
async function unregisterTrigger(triggerId) {
  try {
    if (registeredTriggers.has(triggerId)) {
      const registration = registeredTriggers.get(triggerId);
      
      // Note: Parse Server doesn't provide a way to unregister triggers
      // In a production environment, you would need to restart the server
      // or implement a more sophisticated trigger management system
      
      registeredTriggers.delete(triggerId);
      console.log(`Unregistered trigger: ${triggerId}`);
    }
  } catch (error) {
    console.error('Error unregistering trigger:', error);
  }
}

// Helper function to execute a trigger
async function executeTrigger(trigger, context) {
  const startTime = new Date();
  let result = null;
  let status = 'success';
  let errorMessage = null;

  try {
    const functionName = trigger.get('functionName');
    const conditions = trigger.get('conditions') || {};
    const timeout = trigger.get('timeout') || 30;

    // Check conditions
    if (!evaluateConditions(conditions, context)) {
      return { skipped: true, reason: 'Conditions not met' };
    }

    // Prepare execution parameters
    const executionParams = {
      ...context,
      _appFramework: {
        appInstallationId: trigger.get('appInstallation').id,
        organizationId: trigger.get('organization').id,
        triggerId: trigger.get('triggerId'),
        eventType: context.eventType,
        triggeredBy: context.triggeredBy
      }
    };

    // Execute the cloud function with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Trigger execution timeout')), timeout * 1000);
    });

    const executionPromise = Parse.Cloud.run(functionName, executionParams, { useMasterKey: true });
    
    result = await Promise.race([executionPromise, timeoutPromise]);

    // Update trigger with successful execution
    const executionCount = (trigger.get('executionCount') || 0) + 1;
    trigger.set('executionCount', executionCount);
    trigger.set('lastExecuted', startTime);
    trigger.set('lastResult', result);
    trigger.set('errorCount', 0);
    trigger.set('lastError', null);
    trigger.set('status', 'active');

  } catch (error) {
    console.error(`Trigger execution error (${trigger.get('name')}):`, error);
    
    status = 'error';
    errorMessage = error.message;
    
    // Update trigger with error
    const errorCount = (trigger.get('errorCount') || 0) + 1;
    trigger.set('errorCount', errorCount);
    trigger.set('lastError', errorMessage);
    
    // Disable trigger if too many errors
    const maxRetries = trigger.get('maxRetries') || 3;
    if (errorCount >= maxRetries) {
      trigger.set('status', 'error');
      trigger.set('enabled', false);
      await unregisterTrigger(trigger.id);
    }
  }

  // Save trigger updates
  await trigger.save(null, { useMasterKey: true });

  // Log execution
  await logTriggerExecution(trigger, startTime, new Date(), status, result, errorMessage, context);

  return result;
}

// Helper function to evaluate trigger conditions
function evaluateConditions(conditions, context) {
  try {
    // This is a simplified condition evaluator
    // In production, implement a more sophisticated condition engine
    
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // No conditions means always execute
    }

    // Example condition evaluation
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'className' && context.object) {
        if (context.object.className !== value) {
          return false;
        }
      }
      // Add more condition types as needed
    }

    return true;
  } catch (error) {
    console.error('Error evaluating conditions:', error);
    return false;
  }
}

// Helper function to log trigger execution
async function logTriggerExecution(trigger, startTime, endTime, status, result, errorMessage, context) {
  try {
    const AppExecutionLog = Parse.Object.extend('AppExecutionLog');
    const log = new AppExecutionLog();
    
    log.set('appInstallation', trigger.get('appInstallation'));
    log.set('organization', trigger.get('organization'));
    log.set('executionType', 'trigger');
    log.set('executionId', trigger.get('triggerId'));
    log.set('functionName', trigger.get('functionName'));
    log.set('triggeredBy', context.triggeredBy || 'unknown');
    log.set('input', {
      eventType: context.eventType,
      conditions: trigger.get('conditions'),
      context: context.data || {}
    });
    log.set('output', result);
    log.set('status', status);
    log.set('startTime', startTime);
    log.set('endTime', endTime);
    log.set('duration', endTime.getTime() - startTime.getTime());
    
    if (errorMessage) {
      log.set('errorMessage', errorMessage);
    }
    
    await log.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Error logging trigger execution:', error);
  }
}

// Initialize triggers on server startup
Parse.Cloud.define('initializeAppTriggers', async (request) => {
  const { user } = request;
  
  if (!user || user.get('isSystemAdmin') !== true) { // Explicit check for system admin
    throw new Error('Only system administrators can initialize triggers');
  }

  try {
    const AppTrigger = Parse.Object.extend('AppTrigger');
    const query = new Parse.Query(AppTrigger);
    query.equalTo('enabled', true);
    query.equalTo('status', 'active');
    
    const triggers = await query.find({ useMasterKey: true });
    
    for (const trigger of triggers) {
      await registerTrigger(trigger);
    }
    
    return {
      success: true,
      message: `Initialized ${triggers.length} triggers`,
      triggerCount: triggers.length
    };
    
  } catch (error) {
    console.error('Initialize triggers error:', error);
    throw error;
  }
});

module.exports = {};