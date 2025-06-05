/* global Parse */

// Shared Parse Object extensions for trigger management
const CMSTrigger = Parse.Object.extend('CMSTrigger');
const TriggerLog = Parse.Object.extend('TriggerLog');
const TriggerExecution = Parse.Object.extend('TriggerExecution');

// Shared helper functions
const testTrigger = async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { triggerId, className, type } = request.params;

  if (!triggerId || !className || !type) {
    throw new Error('Trigger ID, class name, and type are required');
  }

  const query = new Parse.Query('CMSTrigger');
  const trigger = await query.get(triggerId);

  if (!trigger) {
    throw new Error('Trigger not found');
  }

  const code = trigger.get('code');

  if (!code) {
    throw new Error('Trigger code not found');
  }

  try {
    // Create a mock request object based on trigger type
    const mockRequest = {
      object: new Parse.Object(className),
      user: request.user,
      context: {},
    };

    // Create a safe context for executing the trigger code
    const context = {
      request: mockRequest,
      response: null,
      Parse: Parse,
    };

    // Execute the trigger code in the context
    const fn = new Function('context', `with (context) { ${code} }`);
    const result = await fn(context);

    return {
      success: true,
      result: result,
      message: 'Trigger executed successfully',
    };
  } catch (error) {
    throw new Error(`Trigger execution failed: ${error.message}`);
  }
};

// Register all active Parse Cloud triggers
const registerTriggers = async () => {
  const query = new Parse.Query('CMSTrigger');

  query.equalTo('enabled', true);
  const triggers = await query.find();

  triggers.forEach(trigger => {
    const type = trigger.get('type');
    const className = trigger.get('className');
    const code = trigger.get('code');

    if (!type || !className || !code) {
      console.error(`Invalid trigger configuration for trigger ${trigger.id}`);
      return;
    }

    try {
      // Create the trigger function dynamically based on the stored code
      const fn = new Function('request', code);
      
      // Register the trigger based on its type
      switch (type) {
        case 'beforeSave':
          Parse.Cloud.beforeSave(className, fn);
          break;
        case 'afterSave':
          Parse.Cloud.afterSave(className, fn);
          break;
        case 'beforeDelete':
          Parse.Cloud.beforeDelete(className, fn);
          break;
        case 'afterDelete':
          Parse.Cloud.afterDelete(className, fn);
          break;
        default:
          console.error(`Unsupported trigger type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to register trigger ${trigger.id}:`, error);
    }
  });
};

// Helper functions for trigger execution
async function handleScheduledTrigger(trigger, context) {
  const config = trigger.get('config');
  const actions = config.actions || [];

  const results = [];

  for (const action of actions) {
    const result = await executeAction(action, context);
    results.push(result);
  }

  return results;
}

async function handleEventTrigger(trigger, context) {
  const config = trigger.get('config');
  const event = config.event;

  // Check if event matches filter
  if (event.filter) {
    const matches = matchEventFilter(event.filter, context);

    if (!matches) {
      return { skipped: true, reason: 'Event filter did not match' };
    }
  }

  const results = [];

  for (const action of config.actions || []) {
    const result = await executeAction(action, context);
    results.push(result);
  }

  return results;
}

async function handleWebhookTrigger(trigger, context) {
  const config = trigger.get('config');
  const webhook = config.webhook;

  // Validate webhook signature if provided
  if (webhook.secret && context.signature) {
    const isValid = validateWebhookSignature(webhook.secret, context);

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }
  }

  const results = [];

  for (const action of config.actions || []) {
    const result = await executeAction(action, context);
    results.push(result);
  }

  return results;
}

async function executeAction(action, context) {
  switch (action.type) {
    case 'function':
      return Parse.Cloud.run(action.config.function.name, {
        ...action.config.function.parameters,
        context,
      });

    case 'http':
      return (
        await Parse.Cloud.httpRequest({
          method: action.config.http.method,
          url: action.config.http.url,
          headers: action.config.http.headers,
          body: action.config.http.body,
        })
      ).data;

    case 'email':
      // Implement email sending
      return { sent: true };

    case 'notification':
      // Implement notification sending
      return { sent: true };

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function matchEventFilter(filter, event) {
  const { type, data } = event;

  if (filter.type && filter.type !== type) {
    return false;
  }
  if (filter.data) {
    for (const key in filter.data) {
      if (filter.data[key] !== data[key]) {
        return false;
      }
    }
  }

  return true;
}

function validateWebhookSignature(secret, context) {
  const crypto = require('crypto');

  const signature = context.headers['x-signature'];
  const hash = crypto.createHmac('sha256', secret).update(context.body).digest('hex');

  return signature === hash;
}

module.exports = {
  CMSTrigger,
  TriggerLog,
  TriggerExecution,
  testTrigger,
  registerTriggers,
  handleScheduledTrigger,
  handleEventTrigger,
  handleWebhookTrigger,
  executeAction,
  matchEventFilter,
  validateWebhookSignature
};