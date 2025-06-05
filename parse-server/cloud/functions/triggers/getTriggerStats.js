/* global Parse */

const { CMSTrigger } = require('./shared');

Parse.Cloud.define('getTriggerStats', async request => {
  const { triggerId, timeframe = '24h' } = request.params;

  if (!triggerId) {
    throw new Error('Trigger ID is required');
  }

  const query = new Parse.Query('TriggerLog').equalTo(
    'trigger',
    new Parse.Object('CMSTrigger', { id: triggerId })
  );

  // Set time range based on timeframe
  const now = new Date();

  switch (timeframe) {
    case '1h':
      query.greaterThan('timestamp', new Date(now - 60 * 60 * 1000));
      break;
    case '24h':
      query.greaterThan('timestamp', new Date(now - 24 * 60 * 60 * 1000));
      break;
    case '7d':
      query.greaterThan('timestamp', new Date(now - 7 * 24 * 60 * 60 * 1000));
      break;
    case '30d':
      query.greaterThan('timestamp', new Date(now - 30 * 24 * 60 * 60 * 1000));
      break;
  }

  const logs = await query.find();

  // Calculate stats
  const stats = {
    total: logs.length,
    success: 0,
    error: 0,
    retry: 0,
    avgExecutionTime: 0,
    totalExecutionTime: 0,
  };

  logs.forEach(log => {
    const status = log.get('status');

    stats[status]++;
    stats.totalExecutionTime += log.get('executionTime') || 0;
  });

  if (stats.total > 0) {
    stats.avgExecutionTime = stats.totalExecutionTime / stats.total;
  }

  return stats;
});