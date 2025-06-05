/* global Parse */

const getSecurityMetrics = async request => {
  const { timeRange } = request.params;
  const user = request.user;

  if (!user) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
  }

  // Verify admin access
  const userRoles = await Parse.Cloud.run(
    'checkUserRole',
    { userId: user.id },
    { useMasterKey: true }
  );

  if (!userRoles.isAdmin) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin access required');
  }

  try {
    // Validate and parse timeRange
    const days = parseInt(timeRange, 10);

    if (isNaN(days) || days <= 0) {
      throw new Parse.Error(
        Parse.Error.INVALID_QUERY,
        'Invalid time range. Must be a positive number.'
      );
    }

    // Calculate start date
    const startDate = new Date();

    startDate.setDate(startDate.getDate() - days);

    // Create SecurityEvent class if it doesn't exist
    const schema = new Parse.Schema('SecurityEvent');

    try {
      await schema.get({ useMasterKey: true });
    } catch (error) {
      if (error.code === Parse.Error.INVALID_CLASS_NAME) {
        await schema
          .addString('type')
          .addString('status')
          .addString('userId')
          .addDate('eventDate')
          .save(null, { useMasterKey: true });
      }
    }

    // Query security events
    const securityEvents = new Parse.Query('SecurityEvent').greaterThanOrEqualTo(
      'eventDate',
      startDate
    );

    const loginAttempts = securityEvents.clone().equalTo('type', 'login');

    const failedLogins = securityEvents
      .clone()
      .equalTo('type', 'login')
      .equalTo('status', 'failed');

    const roleChanges = securityEvents.clone().equalTo('type', 'roleChange');

    // Query active sessions
    const sessions = new Parse.Query('_Session').greaterThanOrEqualTo('createdAt', startDate);

    // Execute all queries with master key
    const [loginAttemptsCount, failedLoginsCount, roleChangesCount, activeSessionsCount] =
      await Promise.all([
        loginAttempts.count({ useMasterKey: true }),
        failedLogins.count({ useMasterKey: true }),
        roleChanges.count({ useMasterKey: true }),
        sessions.count({ useMasterKey: true }),
      ]);

    return {
      timestamp: new Date(),
      metrics: [
        {
          name: 'Login Attempts',
          value: loginAttemptsCount,
          trend: 0,
        },
        {
          name: 'Failed Logins',
          value: failedLoginsCount,
          trend: 0,
        },
        {
          name: 'Active Sessions',
          value: activeSessionsCount,
          trend: 0,
        },
        {
          name: 'Role Changes',
          value: roleChangesCount,
          trend: 0,
        },
      ],
    };
  } catch (error) {
    console.error('Security metrics error:', error);
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Error fetching security metrics: ${error.message}`
    );
  }
};

module.exports = {
  getSecurityMetrics,
};
