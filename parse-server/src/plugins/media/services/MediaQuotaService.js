/**
 * Media Quota Service
 * Handles media storage quotas and usage tracking
 */

const BaseService = require('../../../services/BaseService');

class MediaQuotaService extends BaseService {
  constructor() {
    super('MediaQuota');
    this.cache = new Map();
    this.updateJobs = new Map();
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register dependencies
    const MediaEventsService = require('./MediaEventsService');
    this.registerDependency('events', MediaEventsService);

    // Register cleanup handler
    this.registerCleanup(async () => {
      // Clear all update jobs
      for (const [_, timeout] of this.updateJobs) {
        clearTimeout(timeout);
      }
      this.updateJobs.clear();
      this.cache.clear();
    });

    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Get user quota
   * @param {string} userId User ID
   * @returns {Promise<Object>} Quota information
   */
  async getUserQuota(userId) {
    return this.executeOperation(
      async () => {
        // Check cache first
        if (this.cache.has(userId)) {
          return this.cache.get(userId);
        }

        const user = await new Parse.Query('_User').get(userId, { useMasterKey: true });

        const quota = await this.calculateQuota(user);
        this.cache.set(userId, quota);

        return quota;
      },
      'getUserQuota',
      { userId }
    );
  }

  /**
   * Calculate quota for user
   * @param {Parse.User} user User object
   * @returns {Promise<Object>} Quota information
   */
  async calculateQuota(user) {
    return this.executeOperation(
      async () => {
        // Get user's role and plan
        const roles = await user.getRoles();
        const plan = user.get('subscriptionPlan') || 'free';

        // Get base quota from plan
        const baseQuota = this.config.quotas.plans[plan] || this.config.quotas.default;

        // Add role-based quota bonuses
        let quota = { ...baseQuota };
        for (const role of roles) {
          const roleQuota = this.config.quotas.roles[role.getName()];
          if (roleQuota) {
            quota.storage += roleQuota.storage || 0;
            quota.bandwidth += roleQuota.bandwidth || 0;
            quota.files += roleQuota.files || 0;
          }
        }

        // Get current usage
        const usage = await this.calculateUsage(user);

        return {
          ...quota,
          ...usage,
          remaining: {
            storage: quota.storage - usage.storage,
            bandwidth: quota.bandwidth - usage.bandwidth,
            files: quota.files - usage.files,
          },
          exceeded: {
            storage: usage.storage > quota.storage,
            bandwidth: usage.bandwidth > quota.bandwidth,
            files: usage.files > quota.files,
          },
        };
      },
      'calculateQuota',
      { userId: user.id }
    );
  }

  /**
   * Calculate current usage
   * @param {Parse.User} user User object
   * @returns {Promise<Object>} Usage information
   */
  async calculateUsage(user) {
    return this.executeOperation(
      async () => {
        const query = new Parse.Query('CMSMedia');
        query.equalTo('owner', user);

        const pipeline = [
          {
            group: {
              objectId: null,
              storage: { $sum: '$size' },
              bandwidth: { $sum: '$bandwidth' },
              files: { $sum: 1 },
            },
          },
        ];

        const results = await query.aggregate(pipeline, { useMasterKey: true });
        const usage = results[0] || { storage: 0, bandwidth: 0, files: 0 };

        return {
          storage: usage.storage,
          bandwidth: usage.bandwidth,
          files: usage.files,
          lastCalculated: new Date(),
        };
      },
      'calculateUsage',
      { userId: user.id }
    );
  }

  /**
   * Check if operation would exceed quota
   * @param {string} userId User ID
   * @param {Object} operation Operation details
   * @returns {Promise<boolean>} Whether operation would exceed quota
   */
  async checkQuota(userId, operation) {
    return this.executeOperation(
      async () => {
        const quota = await this.getUserQuota(userId);
        const { type, size = 0 } = operation;

        switch (type) {
          case 'upload':
            return {
              allowed: quota.remaining.storage >= size && quota.remaining.files >= 1,
              quota,
            };
          case 'bandwidth':
            return {
              allowed: quota.remaining.bandwidth >= size,
              quota,
            };
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }
      },
      'checkQuota',
      { userId, operation }
    );
  }

  /**
   * Update usage tracking
   * @param {string} userId User ID
   * @param {Object} operation Operation details
   * @returns {Promise<void>}
   */
  async trackUsage(userId, operation) {
    return this.executeOperation(
      async () => {
        const { type, size = 0 } = operation;

        // Queue usage update
        if (this.updateJobs.has(userId)) {
          clearTimeout(this.updateJobs.get(userId));
        }

        this.updateJobs.set(
          userId,
          setTimeout(async () => {
            try {
              const user = await new Parse.Query('_User').get(userId, { useMasterKey: true });

              const usage = user.get('mediaUsage') || {};

              switch (type) {
                case 'upload':
                  usage.storage = (usage.storage || 0) + size;
                  usage.files = (usage.files || 0) + 1;
                  break;
                case 'delete':
                  usage.storage = Math.max(0, (usage.storage || 0) - size);
                  usage.files = Math.max(0, (usage.files || 0) - 1);
                  break;
                case 'bandwidth':
                  usage.bandwidth = (usage.bandwidth || 0) + size;
                  break;
              }

              usage.lastUpdated = new Date();
              user.set('mediaUsage', usage);
              await user.save(null, { useMasterKey: true });

              // Clear cache
              this.cache.delete(userId);

              // Check if quota is exceeded
              const quota = await this.getUserQuota(userId);
              if (quota.exceeded.storage || quota.exceeded.bandwidth || quota.exceeded.files) {
                const events = this.getDependency('events');
                events.emit('media.quota.exceeded', {
                  userId,
                  quota,
                });
              }
            } catch (error) {
              this.logger.error('Error updating usage:', {
                metadata: { userId, operation },
                stack: error.stack,
              });
            } finally {
              this.updateJobs.delete(userId);
            }
          }, this.config.performance.queue.interval)
        );
      },
      'trackUsage',
      { userId, operation }
    );
  }

  /**
   * Reset bandwidth tracking
   * @param {string} userId User ID
   * @returns {Promise<void>}
   */
  async resetBandwidth(userId) {
    return this.executeOperation(
      async () => {
        const user = await new Parse.Query('_User').get(userId, { useMasterKey: true });

        const usage = user.get('mediaUsage') || {};
        usage.bandwidth = 0;
        usage.lastReset = new Date();

        user.set('mediaUsage', usage);
        await user.save(null, { useMasterKey: true });

        // Clear cache
        this.cache.delete(userId);
      },
      'resetBandwidth',
      { userId }
    );
  }

  /**
   * Get organization quota
   * @param {string} orgId Organization ID
   * @returns {Promise<Object>} Organization quota information
   */
  async getOrganizationQuota(orgId) {
    return this.executeOperation(
      async () => {
        const org = await new Parse.Query('Organization').get(orgId, { useMasterKey: true });

        // Get all users in organization
        const userQuery = new Parse.Query('_User');
        userQuery.equalTo('organization', org);
        const users = await userQuery.find({ useMasterKey: true });

        // Calculate total usage
        const usagePromises = users.map(user => this.calculateUsage(user));
        const usages = await Promise.all(usagePromises);

        const totalUsage = usages.reduce(
          (acc, usage) => ({
            storage: acc.storage + usage.storage,
            bandwidth: acc.bandwidth + usage.bandwidth,
            files: acc.files + usage.files,
          }),
          { storage: 0, bandwidth: 0, files: 0 }
        );

        // Get organization quota limits
        const plan = org.get('subscriptionPlan') || 'business';
        const quota = this.config.quotas.organizations[plan] || this.config.quotas.defaultOrg;

        return {
          ...quota,
          ...totalUsage,
          remaining: {
            storage: quota.storage - totalUsage.storage,
            bandwidth: quota.bandwidth - totalUsage.bandwidth,
            files: quota.files - totalUsage.files,
          },
          exceeded: {
            storage: totalUsage.storage > quota.storage,
            bandwidth: totalUsage.bandwidth > quota.bandwidth,
            files: totalUsage.files > quota.files,
          },
          users: users.length,
        };
      },
      'getOrganizationQuota',
      { orgId }
    );
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.lastCalculated.getTime() > this.config.performance.cache.duration) {
          this.cache.delete(key);
        }
      }
    }, this.config.performance.cache.duration);
  }
}

module.exports = new MediaQuotaService();
