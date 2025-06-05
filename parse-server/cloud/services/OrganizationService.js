const { performance } = require('perf_hooks');

module.exports = function(Parse) {
  return class OrganizationService {
    static async getVisitorStats(organizationId) {
      try {
        const query = new Parse.Query('VisitorStats')
          .equalTo('organizationId', organizationId)
          .descending('createdAt')
          .limit(30);

        const stats = await query.find();
        const total = stats.reduce((sum, stat) => sum + stat.get('count'), 0);
        const prevTotal = stats.slice(15).reduce((sum, stat) => sum + stat.get('count'), 0);
        const currentTotal = stats.slice(0, 15).reduce((sum, stat) => sum + stat.get('count'), 0);
        const trend = ((currentTotal - prevTotal) / prevTotal) * 100;

        return {
          total,
          trend,
          timeSeriesData: stats.map(stat => ({
            date: stat.get('createdAt').toISOString().split('T')[0],
            value: stat.get('count'),
          })),
        };
      } catch (error) {
        console.error('Error getting visitor stats:', error);
        throw error;
      }
    }

    static async getAPIStats(organizationId) {
      try {
        const query = new Parse.Query('APIStats')
          .equalTo('organizationId', organizationId)
          .descending('createdAt')
          .limit(30);

        const stats = await query.find();
        const total = stats.reduce((sum, stat) => sum + stat.get('requests'), 0);
        const prevTotal = stats.slice(15).reduce((sum, stat) => sum + stat.get('requests'), 0);
        const currentTotal = stats.slice(0, 15).reduce((sum, stat) => sum + stat.get('requests'), 0);
        const trend = ((currentTotal - prevTotal) / prevTotal) * 100;

        // Calculate average response time
        const avgResponseTime =
          stats.reduce((sum, stat) => sum + stat.get('avgResponseTime'), 0) / stats.length;
        const prevAvgTime =
          stats.slice(15).reduce((sum, stat) => sum + stat.get('avgResponseTime'), 0) / 15;
        const currentAvgTime =
          stats.slice(0, 15).reduce((sum, stat) => sum + stat.get('avgResponseTime'), 0) / 15;
        const performanceTrend = ((prevAvgTime - currentAvgTime) / prevAvgTime) * 100;

        return {
          total,
          trend,
          timeSeriesData: stats.map(stat => ({
            date: stat.get('createdAt').toISOString().split('T')[0],
            value: stat.get('requests'),
          })),
          avgResponseTime,
          uptime: 99.99, // TODO: Calculate actual uptime
          performanceTrend,
        };
      } catch (error) {
        console.error('Error getting API stats:', error);
        throw error;
      }
    }

    static async getStorageStats(organizationId) {
      try {
        const query = new Parse.Query('StorageStats')
          .equalTo('organizationId', organizationId)
          .descending('createdAt')
          .first();

        const stats = await query;

        if (!stats) {
          return {
            used: 0,
            total: 1024, // 1GB default
            trend: 0,
          };
        }

        const prevStats = await new Parse.Query('StorageStats')
          .equalTo('organizationId', organizationId)
          .lessThan('createdAt', stats.get('createdAt'))
          .first();

        const trend = prevStats
          ? ((stats.get('used') - prevStats.get('used')) / prevStats.get('used')) * 100
          : 0;

        return {
          used: stats.get('used'),
          total: stats.get('total'),
          trend,
        };
      } catch (error) {
        console.error('Error getting storage stats:', error);
        throw error;
      }
    }

    static async checkDatabaseHealth(organizationId) {
      try {
        const startTime = performance.now();

        await new Parse.Query('Organization').get(organizationId);
        const endTime = performance.now();
        const queryTime = endTime - startTime;

        return queryTime < 500 ? 'healthy' : queryTime < 1000 ? 'warning' : 'error';
      } catch (error) {
        console.error('Error checking database health:', error);
        return 'error';
      }
    }

    static async checkStorageHealth(organizationId) {
      try {
        const stats = await this.getStorageStats(organizationId);
        const usagePercent = (stats.used / stats.total) * 100;

        return usagePercent < 80 ? 'healthy' : usagePercent < 90 ? 'warning' : 'error';
      } catch (error) {
        console.error('Error checking storage health:', error);
        return 'error';
      }
    }

    static async checkAPIHealth(organizationId) {
      try {
        const stats = await this.getAPIStats(organizationId);

        return stats.avgResponseTime < 200
          ? 'healthy'
          : stats.avgResponseTime < 500
          ? 'warning'
          : 'error';
      } catch (error) {
        console.error('Error checking API health:', error);
        return 'error';
      }
    }

    static async checkCacheHealth(organizationId) {
      try {
        const startTime = performance.now();
        const cacheKey = `org_${organizationId}_health`;

        await Parse.Cache.get(cacheKey);
        const endTime = performance.now();
        const cacheTime = endTime - startTime;

        return cacheTime < 100 ? 'healthy' : cacheTime < 200 ? 'warning' : 'error';
      } catch (error) {
        console.error('Error checking cache health:', error);
        return 'error';
      }
    }

    static async getHealthMessages(organizationId) {
      try {
        const messages = [];
        const stats = await Promise.all([
          this.getStorageStats(organizationId),
          this.getAPIStats(organizationId),
        ]);

        const [storage, api] = stats;

        if (storage.used / storage.total > 0.8) {
          messages.push('Storage usage is approaching limit');
        }

        if (api.avgResponseTime > 200) {
          messages.push('API response times are higher than normal');
        }

        return messages;
      } catch (error) {
        console.error('Error getting health messages:', error);
        return ['Unable to retrieve health messages'];
      }
    }

    static async checkIntegrationStatus(integration) {
      try {
        const lastSync = await integration.get('lastSyncDate');
        const now = new Date();
        const timeSinceSync = now.getTime() - lastSync.getTime();
        const syncThreshold = integration.get('syncInterval') || 24 * 60 * 60 * 1000; // Default 24h

        let status = 'active';
        let message = 'Integration is working normally';

        if (timeSinceSync > syncThreshold) {
          status = 'warning';
          message = 'Integration sync is overdue';
        }

        if (integration.get('errorCount', 0) > 5) {
          status = 'error';
          message = 'Integration has encountered multiple errors';
        }

        if (!integration.get('isEnabled')) {
          status = 'inactive';
          message = 'Integration is disabled';
        }

        return {
          status,
          lastSync: lastSync.toISOString(),
          message,
        };
      } catch (error) {
        console.error('Error checking integration status:', error);
        return {
          status: 'error',
          lastSync: null,
          message: 'Unable to check integration status',
        };
      }
    }

    static async logActivity(organizationId, type, description, user) {
      try {
        const ActivityLog = Parse.Object.extend('ActivityLog');
        const activity = new ActivityLog();

        activity.set('organizationId', organizationId);
        activity.set('type', type);
        activity.set('description', description);
        activity.set('userId', user.id);
        activity.set('userName', user.get('email'));

        // Set ACL for the activity log
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setRoleReadAccess('admin', true);
        acl.setReadAccess(user, true);
        activity.setACL(acl);

        await activity.save();
      } catch (error) {
        console.error('Error logging activity:', error);
        throw error;
      }
    }
  };
};
