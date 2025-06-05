/* global Parse */

const { CMSTrigger } = require('./shared');

Parse.Cloud.define('updateApplicationTrigger', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const {
    triggerId,
    name,
    description,
    type,
    config,
    monitoring,
    retryPolicy,
    timeout,
    tags,
    version,
    changes,
  } = request.params;

  const trigger = await new Parse.Query(CMSTrigger)
    .include('application')
    .get(triggerId, { useMasterKey: true });

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = trigger.get('application').get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  // Update fields
  if (name) trigger.set('name', name);
  if (description) trigger.set('description', description);
  if (type) trigger.set('type', type);
  if (config) trigger.set('config', config);
  if (monitoring) trigger.set('monitoring', monitoring);
  if (retryPolicy) trigger.set('retryPolicy', retryPolicy);
  if (timeout) trigger.set('timeout', timeout);
  if (tags) trigger.set('tags', tags);

  // Add new version if provided
  if (version && changes) {
    const versions = trigger.get('versions') || [];

    versions.push({
      version,
      changes,
      createdAt: new Date(),
      createdBy: request.user.id,
      config: config || trigger.get('config'),
    });
    trigger.set('versions', versions);
  }

  await trigger.save(null, { useMasterKey: true });

  return trigger;
});