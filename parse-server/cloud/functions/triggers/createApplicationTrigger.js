/* global Parse */

const { CMSTrigger } = require('./shared');

Parse.Cloud.define('createApplicationTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { applicationId, name, description, type, config, monitoring, retryPolicy, timeout, tags } =
    request.params;

  // Get application
  const application = await new Parse.Query('Application').get(applicationId, {
    useMasterKey: true,
  });

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = application.get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  const trigger = new CMSTrigger();

  trigger.set('name', name);
  trigger.set('description', description);
  trigger.set('type', type);
  trigger.set('status', 'inactive');
  trigger.set('config', config);
  trigger.set('monitoring', monitoring);
  trigger.set('retryPolicy', retryPolicy);
  trigger.set('timeout', timeout);
  trigger.set('tags', tags);
  trigger.set('application', application);
  trigger.set('createdBy', request.user);
  trigger.set('versions', [
    {
      version: '0.1.0',
      changes: ['Initial version'],
      createdAt: new Date(),
      createdBy: request.user.id,
      config,
    },
  ]);

  await trigger.save(null, { useMasterKey: true });

  return trigger;
});