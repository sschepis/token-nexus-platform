module.exports = Parse => {
  const { format } = require('date-fns');
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

  Parse.Cloud.define('fetchTokenActivityMetrics', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Error('Master key required');
    }

    const { timeRange, startDate, endDate } = request.params;
    const { organizationId } = request;

    const now = new Date();
    let queryStartDate;

    switch (timeRange) {
      case '7d':
        queryStartDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '90d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        queryStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        queryStartDate = startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 1));
    }

    const queryEndDate = endDate ? new Date(endDate) : new Date();

    try {
      const pipeline = [
        {
          match: {
            eventType: { $in: ['token_transfer', 'token_mint', 'token_redemption', 'token_burn', 'token_approve'] },
            createdAt: { $gte: queryStartDate, $lte: queryEndDate },
            'metadata.organizationId': organizationId
          }
        },
        {
          group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            transactions: { $sum: 1 },
            volume: { $sum: '$metadata.value' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          project: {
            _id: 0,
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $toDate: {
                    $concat: [
                      { $toString: '$_id.year' }, '-',
                      { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }, '-',
                      { $cond: [{ $lt: ['$_id.day', 10] }, { $concat: ['0', { $toString: '$_id.day' }] }, { $toString: '$_id.day' }] }
                    ]
                  }
                }
              }
            },
            transactions: 1,
            volume: { $ifNull: [ '$volume', 0 ] },
            users: { $size: '$uniqueUsers' }
          }
        },
        {
          sort: {
            date: 1
          }
        }
      ];

      const results = await new Parse.Query('AuditEvent').aggregate(pipeline, { useMasterKey: true });

      return { success: true, data: results };

    } catch (error) {
      console.error('Error fetching token activity metrics:', error);
      throw new Error(`Failed to fetch token activity metrics: ${error.message}`);
    }
  }));

  Parse.Cloud.define('fetchUserActivityMetrics', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Error('Master key required');
    }

    const { timeRange, startDate, endDate } = request.params;
    const { organization, organizationId } = request;

    const now = new Date();
    let queryStartDate;

    switch (timeRange) {
      case '7d':
        queryStartDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '90d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        queryStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        queryStartDate = startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 1));
    }

    const queryEndDate = endDate ? new Date(endDate) : new Date();

    try {
      const pipelineActiveUsers = [
        {
          match: {
            eventType: { $in: ['user_activity', 'login', 'signup', 'organization_created'] },
            createdAt: { $gte: queryStartDate, $lte: queryEndDate },
            'metadata.organizationId': organizationId
          }
        },
        {
          group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            activeUsers: { $addToSet: '$userId' }
          }
        },
        {
          project: {
            _id: 0,
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $toDate: {
                    $concat: [
                      { $toString: '$_id.year' }, '-',
                      { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }, '-',
                      { $cond: [{ $lt: ['$_id.day', 10] }, { $concat: ['0', { $toString: '$_id.day' }] }, { $toString: '$_id.day' }] }
                    ]
                  }
                }
              }
            },
            active: { $size: '$activeUsers' }
          }
        },
        {
          sort: { date: 1 }
        }
      ];

      const newUsersQuery = new Parse.Query(Parse.User);
      newUsersQuery.greaterThanOrEqualTo('createdAt', queryStartDate);
      newUsersQuery.lessThanOrEqualTo('createdAt', queryEndDate);
      newUsersQuery.equalTo('organization', organization);
      const newUsersData = await newUsersQuery.find({ useMasterKey: true });

      const newUsersMap = newUsersData.reduce((acc, user) => {
        const date = format(user.get('createdAt'), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      
      const activeUsersResults = await new Parse.Query('AuditEvent').aggregate(pipelineActiveUsers, { useMasterKey: true });
      
      const combinedData = [];
      const activeUsersMap = activeUsersResults.reduce((acc, item) => {
        acc[item.date] = item.active;
        return acc;
      }, {});

      const allDates = [...new Set([...Object.keys(activeUsersMap), ...Object.keys(newUsersMap)])].sort();

      for (const date of allDates) {
        combinedData.push({
          date,
          active: activeUsersMap[date] || 0,
          new: newUsersMap[date] || 0
        });
      }

      return { success: true, data: combinedData };

    } catch (error) {
      console.error('Error fetching user activity metrics:', error);
      throw new Error(`Failed to fetch user activity metrics: ${error.message}`);
    }
  }));

  Parse.Cloud.define('fetchTransactionTypeMetrics', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Error('Master key required');
    }

    const { timeRange, startDate, endDate } = request.params;
    const { organizationId } = request;

    const now = new Date();
    let queryStartDate;

    switch (timeRange) {
      case '7d':
        queryStartDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '90d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        queryStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        queryStartDate = startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 1));
    }

    const queryEndDate = endDate ? new Date(endDate) : new Date();

    try {
      const pipeline = [
        {
          match: {
            eventType: { $in: ['token_transfer', 'token_mint', 'token_redemption', 'token_burn', 'token_approve'] },
            createdAt: { $gte: queryStartDate, $lte: queryEndDate },
            'metadata.organizationId': organizationId
          }
        },
        {
          group: {
            _id: '$eventType',
            value: { $sum: 1 }
          }
        },
        {
          project: {
            _id: 0,
            name: '$_id',
            value: 1
          }
        },
        {
          sort: { value: -1 }
        }
      ];

      const results = await new Parse.Query('AuditEvent').aggregate(pipeline, { useMasterKey: true });

      return { success: true, data: results };

    } catch (error) {
      console.error('Error fetching transaction type metrics:', error);
      throw new Error(`Failed to fetch transaction type metrics: ${error.message}`);
    }
  }));

  Parse.Cloud.define('fetchUserRoleMetrics', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Error('Master key required');
    }

    const { organization, organizationId } = request;

    try {
      const query = new Parse.Query(Parse.User);
      query.equalTo('organization', organization);
      query.select('isAdmin', 'roles');

      const users = await query.find({ useMasterKey: true });

      const roleCounts = {
        'Admin': 0,
        'Manager': 0,
        'User': 0,
        'Other': 0,
      };

      for (const user of users) {
        if (user.get('isAdmin')) {
          roleCounts['Admin']++;
        } else {
          roleCounts['User']++;
        }
      }

      const data = Object.keys(roleCounts).map(role => ({
        name: role,
        value: roleCounts[role]
      }));

      const filteredData = data.filter(item => item.value > 0);

      return { success: true, data: filteredData };

    } catch (error) {
      console.error('Error fetching user role metrics:', error);
      throw new Error(`Failed to fetch user role metrics: ${error.message}`);
    }
  }));

  Parse.Cloud.define('fetchAPIMetrics', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Error('Master key required');
    }

    const { timeRange, startDate, endDate } = request.params;
    const { organization } = request;

    const now = new Date();
    let queryStartDate;

    switch (timeRange) {
      case '7d':
        queryStartDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '90d':
        queryStartDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        queryStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        queryStartDate = startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 1));
    }

    const queryEndDate = endDate ? new Date(endDate) : new Date();

    try {
      const pipeline = [
        {
          match: {
            usageDate: { $gte: queryStartDate, $lte: queryEndDate },
            organization
          }
        },
        {
          group: {
            _id: {
              year: { $year: '$usageDate' },
              month: { $month: '$usageDate' },
              day: { $dayOfMonth: '$usageDate' }
            },
            reads: { $sum: '$requests' },
            writes: { $sum: '$breakdown.writes' }
          }
        },
        {
          project: {
            _id: 0,
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: {
                  $toDate: {
                    $concat: [
                      { $toString: '$_id.year' }, '-',
                      { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }, '-',
                      { $cond: [{ $lt: ['$_id.day', 10] }, { $concat: ['0', { $toString: '$_id.day' }] }, { $toString: '$_id.day' }] }
                    ]
                  }
                }
              }
            },
            reads: { $ifNull: ['$reads', 0] },
            writes: { $ifNull: ['$writes', 0] }
          }
        },
        {
          sort: { date: 1 }
        }
      ];

      const results = await new Parse.Query('AlchemyUsage').aggregate(pipeline, { useMasterKey: true });

      return { success: true, data: results };

    } catch (error) {
      console.error('Error fetching API metrics:', error);
      throw new Error(`Failed to fetch API metrics: ${error.message}`);
    }
  }));
};