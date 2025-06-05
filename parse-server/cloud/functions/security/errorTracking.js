/* global Parse */

const ErrorEvent = Parse.Object.extend('ErrorEvent');
const ErrorGroup = Parse.Object.extend('ErrorGroup');

/**
 * Track an error event
 */
Parse.Cloud.define('trackError', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { type, message, stackTrace, component, severity = 'error' } = request.params;

  try {
    // Find or create error group
    const groupHash = generateErrorHash(type, message);
    const groupQuery = new Parse.Query(ErrorGroup);

    groupQuery.equalTo('hash', groupHash);
    let group = await groupQuery.first({ useMasterKey: true });

    if (!group) {
      group = new ErrorGroup();
      group.set({
        hash: groupHash,
        type,
        message,
        firstSeen: new Date(),
        status: 'active',
        occurrences: 0,
        lastOccurrence: null,
      });

      // Set ACL for group
      const acl = new Parse.ACL();

      acl.setRoleReadAccess('admin', true);
      acl.setRoleWriteAccess('admin', true);
      group.setACL(acl);

      await group.save(null, { useMasterKey: true });
    }

    // Create error event
    const event = new ErrorEvent();

    event.set({
      group,
      type,
      message,
      stackTrace,
      component,
      severity,
      user: request.user,
      organization: request.user.get('organization'),
      timestamp: new Date(),
      status: 'new',
      metadata: {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        url: request.headers['referer'],
      },
    });

    // Set ACL for event
    const eventAcl = new Parse.ACL();

    eventAcl.setRoleReadAccess('admin', true);
    eventAcl.setRoleWriteAccess('admin', true);
    if (request.user.get('organization')) {
      eventAcl.setRoleReadAccess(`org_${request.user.get('organization').id}_admin`, true);
    }
    event.setACL(eventAcl);

    await event.save(null, { useMasterKey: true });

    // Update group stats
    group.increment('occurrences');
    group.set('lastOccurrence', new Date());
    await group.save(null, { useMasterKey: true });

    // Check alert thresholds
    await checkAlertThresholds(group);

    return {
      eventId: event.id,
      groupId: group.id,
    };
  } catch (error) {
    console.error('Error tracking error event:', error);
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to track error: ${error.message}`
    );
  }
});

/**
 * Get error groups with stats
 */
Parse.Cloud.define('getErrorGroups', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { status, timeRange } = request.params;

  try {
    const query = new Parse.Query(ErrorGroup);

    if (status) {
      query.equalTo('status', status);
    }

    if (timeRange) {
      const startDate = new Date();

      startDate.setDate(startDate.getDate() - timeRange);
      query.greaterThanOrEqualTo('lastOccurrence', startDate);
    }

    query.descending('lastOccurrence');
    const groups = await query.find({ useMasterKey: true });

    // Get recent events for each group
    const groupsWithEvents = await Promise.all(
      groups.map(async group => {
        const eventsQuery = new Parse.Query(ErrorEvent);

        eventsQuery.equalTo('group', group);
        eventsQuery.descending('timestamp');
        eventsQuery.limit(5);
        const events = await eventsQuery.find({ useMasterKey: true });

        return {
          ...group.toJSON(),
          recentEvents: events.map(event => ({
            id: event.id,
            timestamp: event.get('timestamp'),
            user: event.get('user')?.id,
            organization: event.get('organization')?.id,
            severity: event.get('severity'),
            component: event.get('component'),
          })),
        };
      })
    );

    return groupsWithEvents;
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to fetch error groups: ${error.message}`
    );
  }
});

/**
 * Update error group status
 */
Parse.Cloud.define('updateErrorGroupStatus', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { groupId, status, resolution } = request.params;

  try {
    const group = await new Parse.Query(ErrorGroup).get(groupId, { useMasterKey: true });

    group.set({
      status,
      resolution,
      resolvedBy: status === 'resolved' ? request.user : null,
      resolvedAt: status === 'resolved' ? new Date() : null,
    });

    await group.save(null, { useMasterKey: true });

    // If resolving, update all new events to resolved
    if (status === 'resolved') {
      const query = new Parse.Query(ErrorEvent);

      query.equalTo('group', group);
      query.equalTo('status', 'new');
      const events = await query.find({ useMasterKey: true });

      const updates = events.map(event => {
        event.set('status', 'resolved');

        return event.save(null, { useMasterKey: true });
      });

      await Promise.all(updates);
    }

    return group.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to update error group: ${error.message}`
    );
  }
});

/**
 * Get error trends
 */
Parse.Cloud.define('getErrorTrends', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { timeRange = 7, organization } = request.params;

  try {
    const startDate = new Date();

    startDate.setDate(startDate.getDate() - timeRange);

    const query = new Parse.Query(ErrorEvent);

    query.greaterThanOrEqualTo('timestamp', startDate);
    if (organization) {
      query.equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organization,
      });
    }

    const events = await query.find({ useMasterKey: true });

    // Group by date and type
    const trends = events.reduce((acc, event) => {
      const date = event.get('timestamp').toISOString().split('T')[0];
      const type = event.get('type');
      const severity = event.get('severity');

      if (!acc[date]) {
        acc[date] = {
          total: 0,
          byType: {},
          bySeverity: {
            error: 0,
            warning: 0,
            info: 0,
          },
        };
      }

      acc[date].total++;
      acc[date].byType[type] = (acc[date].byType[type] || 0) + 1;
      acc[date].bySeverity[severity]++;

      return acc;
    }, {});

    return {
      startDate,
      endDate: new Date(),
      trends,
    };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to get error trends: ${error.message}`
    );
  }
});

// Helper functions

function generateErrorHash(type, message) {
  const hash = require('crypto').createHash('sha256');

  return hash.update(`${type}:${message}`).digest('hex');
}

async function checkAlertThresholds(group) {
  const thresholds = {
    occurrences: 100, // Alert after 100 occurrences
    frequency: 10, // Alert if 10 occurrences in 1 hour
  };

  try {
    if (group.get('occurrences') >= thresholds.occurrences) {
      await createAlert(group, 'occurrence_threshold');
    }

    // Check frequency
    const oneHourAgo = new Date();

    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const query = new Parse.Query(ErrorEvent);

    query.equalTo('group', group);
    query.greaterThanOrEqualTo('timestamp', oneHourAgo);
    const recentCount = await query.count({ useMasterKey: true });

    if (recentCount >= thresholds.frequency) {
      await createAlert(group, 'frequency_threshold');
    }
  } catch (error) {
    console.error('Error checking alert thresholds:', error);
  }
}

async function createAlert(group, reason) {
  const Alert = Parse.Object.extend('Alert');
  const alert = new Alert();

  alert.set({
    type: 'error_threshold',
    reason,
    errorGroup: group,
    message: `Error threshold exceeded: ${reason}`,
    status: 'new',
    timestamp: new Date(),
  });

  const acl = new Parse.ACL();

  acl.setRoleReadAccess('admin', true);
  acl.setRoleWriteAccess('admin', true);
  alert.setACL(acl);

  await alert.save(null, { useMasterKey: true });
}
