/* global Parse */

Parse.Cloud.define('createTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { applicationId, name, description, type, event, condition, action, enabled } =
    request.params;

  const application = await new Parse.Query('CMSApplication').get(applicationId, {
    useMasterKey: true,
  });

  if (!application) {
    throw new Error('Application not found');
  }

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  const Trigger = Parse.Object.extend('CMSTrigger');
  const trigger = new Trigger();

  trigger.set('name', name);
  trigger.set('description', description);
  trigger.set('type', type);
  trigger.set('event', event);
  trigger.set('condition', condition);
  trigger.set('action', action);
  trigger.set('enabled', enabled);
  trigger.set('application', application);
  trigger.set('createdBy', request.user);

  await trigger.save(null, { useMasterKey: true });

  // Update application's triggers array
  const triggers = application.get('triggers') || [];

  triggers.push(trigger);
  application.set('triggers', triggers);
  await application.save(null, { useMasterKey: true });

  return trigger;
});

Parse.Cloud.define('updateTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { triggerId, name, description, type, event, condition, action, enabled } = request.params;

  const trigger = await new Parse.Query('CMSTrigger').get(triggerId, { useMasterKey: true });

  if (!trigger) {
    throw new Error('Trigger not found');
  }

  // Check permissions
  const application = trigger.get('application');
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  trigger.set('name', name);
  trigger.set('description', description);
  trigger.set('type', type);
  trigger.set('event', event);
  trigger.set('condition', condition);
  trigger.set('action', action);
  trigger.set('enabled', enabled);
  trigger.set('updatedBy', request.user);

  await trigger.save(null, { useMasterKey: true });

  return trigger;
});

Parse.Cloud.define('deleteTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { triggerId } = request.params;

  const trigger = await new Parse.Query('CMSTrigger').get(triggerId, { useMasterKey: true });

  if (!trigger) {
    throw new Error('Trigger not found');
  }

  // Check permissions
  const application = trigger.get('application');
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  // Remove from application's triggers array
  const triggers = application.get('triggers') || [];

  application.set(
    'triggers',
    triggers.filter(t => t.id !== triggerId)
  );
  await application.save(null, { useMasterKey: true });

  await trigger.destroy({ useMasterKey: true });

  return { success: true };
});

Parse.Cloud.beforeSave('CMSTrigger', request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const trigger = request.object;

  // If this is a new trigger
  if (!trigger.existed()) {
    const acl = new Parse.ACL();

    acl.setRoleReadAccess(`org_${request.user.get('organization').id}`, true);
    acl.setRoleWriteAccess(`org_${request.user.get('organization').id}`, true);
    trigger.setACL(acl);
  }

  // Validate required fields
  const type = trigger.get('type');
  const event = trigger.get('event');
  const action = trigger.get('action');

  if (!type || !['data', 'workflow', 'integration', 'notification'].includes(type)) {
    throw new Error('Invalid trigger type');
  }

  if (!event || typeof event !== 'object') {
    throw new Error('Event must be an object');
  }

  if (!event.type || !['create', 'update', 'delete', 'custom'].includes(event.type)) {
    throw new Error('Invalid event type');
  }

  if (!action || typeof action !== 'object') {
    throw new Error('Action must be an object');
  }

  if (!action.type || !['function', 'webhook', 'email', 'notification'].includes(action.type)) {
    throw new Error('Invalid action type');
  }

  // Validate condition if present
  const condition = trigger.get('condition');

  if (condition) {
    if (typeof condition !== 'object') {
      throw new Error('Condition must be an object');
    }

    if (!condition.type || !['simple', 'advanced'].includes(condition.type)) {
      throw new Error('Invalid condition type');
    }

    if (condition.type === 'simple') {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        throw new Error('Simple condition must have field, operator, and value');
      }
    } else {
      if (!condition.expression || typeof condition.expression !== 'string') {
        throw new Error('Advanced condition must have an expression string');
      }
    }
  }
});

Parse.Cloud.afterSave('CMSTrigger', async request => {
  const trigger = request.object;

  // If this is a new trigger
  if (!trigger.existed()) {
    // Register trigger with event system
    const event = trigger.get('event');
    const action = trigger.get('action');

    if (action.type === 'function') {
      // Register cloud function trigger
      Parse.Cloud.define(`trigger_${trigger.id}`, async triggerRequest => {
        const condition = trigger.get('condition');

        if (condition) {
          // Evaluate condition
          const result = await evaluateTriggerCondition(condition, triggerRequest);

          if (!result) {
            return { skipped: true, reason: 'Condition not met' };
          }
        }

        // Execute function
        return Parse.Cloud.run(action.function, triggerRequest.params);
      });
    }

    // Update trigger with registration info
    trigger.set('registered', true);
    trigger.set('registeredAt', new Date());
    await trigger.save(null, { useMasterKey: true });
  }
});

async function evaluateTriggerCondition(condition, request) {
  if (condition.type === 'simple') {
    const { field, operator, value } = condition;
    const actualValue = request.params[field];

    switch (operator) {
      case 'equals':
        return actualValue === value;
      case 'notEquals':
        return actualValue !== value;
      case 'contains':
        return actualValue.includes(value);
      case 'greaterThan':
        return actualValue > value;
      case 'lessThan':
        return actualValue < value;
      default:
        throw new Error('Invalid operator');
    }
  } else {
    // Advanced condition using expression
    const { expression } = condition;

    // TODO: Implement safe expression evaluation
    return true;
  }
}
