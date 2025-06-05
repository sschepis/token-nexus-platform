/* global Parse */

const { CMSTrigger, TriggerExecution, handleScheduledTrigger, handleEventTrigger, handleWebhookTrigger } = require('./shared');

Parse.Cloud.define('testApplicationTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { triggerId, context } = request.params;

  const trigger = await new Parse.Query(CMSTrigger)
    .include('application')
    .get(triggerId, { useMasterKey: true });

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = trigger.get('application').get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  // Create execution record
  const execution = new TriggerExecution();

  execution.set('trigger', trigger);
  execution.set('application', trigger.get('application'));
  execution.set('status', 'running');
  execution.set('startTime', new Date());
  execution.set('context', context);

  await execution.save(null, { useMasterKey: true });

  try {
    let result;

    switch (trigger.get('type')) {
      case 'scheduled':
        // Simulate scheduled execution
        result = await handleScheduledTrigger(trigger, context);
        break;
      case 'event':
        // Simulate event trigger
        result = await handleEventTrigger(trigger, context);
        break;
      case 'webhook':
        // Simulate webhook trigger
        result = await handleWebhookTrigger(trigger, context);
        break;
      default:
        throw new Error(`Unknown trigger type: ${trigger.get('type')}`);
    }

    execution.set('status', 'success');
    execution.set('endTime', new Date());
    execution.set('duration', new Date() - execution.get('startTime'));
    execution.set('result', result);
    await execution.save(null, { useMasterKey: true });

    return { success: true, result };
  } catch (error) {
    execution.set('status', 'error');
    execution.set('endTime', new Date());
    execution.set('duration', new Date() - execution.get('startTime'));
    execution.set('error', {
      message: error.message,
      stack: error.stack,
    });
    await execution.save(null, { useMasterKey: true });

    throw error;
  }
});