/* global Parse */

const { CMSTrigger, TriggerExecution } = require('./shared');

Parse.Cloud.define('listTriggerExecutions', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { triggerId, limit = 10 } = request.params;

  const trigger = await new Parse.Query(CMSTrigger)
    .include('application')
    .get(triggerId, { useMasterKey: true });

  // Check permissions
  const userOrg = request.user.get('organization');
  const appOrg = trigger.get('application').get('organization');

  if (userOrg.id !== appOrg.id) {
    throw new Error('Access denied');
  }

  const query = new Parse.Query(TriggerExecution)
    .equalTo('trigger', trigger)
    .descending('startTime')
    .limit(limit);

  const executions = await query.find({ useMasterKey: true });

  return executions;
});