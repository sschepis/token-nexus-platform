/* global Parse */

const { CMSTrigger } = require('./shared');

Parse.Cloud.define('getTriggerLogs', async request => {
  const { triggerId, limit = 100, status, startDate, endDate } = request.params;

  if (!triggerId) {
    throw new Error('Trigger ID is required');
  }

  const query = new Parse.Query('TriggerLog')
    .equalTo('trigger', new Parse.Object('CMSTrigger', { id: triggerId }))
    .descending('timestamp')
    .limit(limit);

  if (status) {
    query.equalTo('status', status);
  }

  if (startDate) {
    query.greaterThanOrEqualTo('timestamp', new Date(startDate));
  }

  if (endDate) {
    query.lessThanOrEqualTo('timestamp', new Date(endDate));
  }

  const logs = await query.find();

  return logs.map(log => ({
    id: log.id,
    status: log.get('status'),
    type: log.get('type'),
    error: log.get('error'),
    retryCount: log.get('retryCount'),
    executionTime: log.get('executionTime'),
    request: log.get('request'),
    response: log.get('response'),
    timestamp: log.get('timestamp'),
  }));
});