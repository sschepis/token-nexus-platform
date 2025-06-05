/* global Parse */

/**
 * Get organization resource usage cloud function
 */

const logger = require('../src/utils/logger');

module.exports = () => ({
  name: 'getOrganizationResourceUsage',
  handler: async req => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate parameters
      const { organizationId } = req.params;

      if (!organizationId) {
        throw new Parse.Error(Parse.Error.INVALID_PARAMETER, 'organizationId is required');
      }

      // Verify organization exists
      const organization = await new Parse.Query('Organization').get(organizationId, {
        useMasterKey: true,
      });

      if (!organization) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Organization not found');
      }

      // Fetch resource usage
      const query = new Parse.Query('ResourceUsage');

      query.equalTo('organizationId', organizationId);
      const usage = await query.first({ useMasterKey: true });

      // Return usage data or default values
      const result = usage
        ? {
            organizationId,
            storageUsed: usage.get('storageUsed'),
            bandwidthUsed: usage.get('bandwidthUsed'),
            apiCalls: usage.get('apiCalls'),
            lastUpdated: usage.get('updatedAt'),
            quotas: {
              storage: usage.get('storageQuota') || 5 * 1024 * 1024 * 1024, // 5GB default
              bandwidth: usage.get('bandwidthQuota') || 100 * 1024 * 1024 * 1024, // 100GB default
              apiCalls: usage.get('apiCallsQuota') || 1000000, // 1M calls default
            },
            usage: {
              storage:
                (usage.get('storageUsed') / (usage.get('storageQuota') || 5 * 1024 * 1024 * 1024)) *
                100,
              bandwidth:
                (usage.get('bandwidthUsed') /
                  (usage.get('bandwidthQuota') || 100 * 1024 * 1024 * 1024)) *
                100,
              apiCalls: (usage.get('apiCalls') / (usage.get('apiCallsQuota') || 1000000)) * 100,
            },
          }
        : {
            organizationId,
            storageUsed: 0,
            bandwidthUsed: 0,
            apiCalls: 0,
            lastUpdated: new Date(),
            quotas: {
              storage: 5 * 1024 * 1024 * 1024, // 5GB default
              bandwidth: 100 * 1024 * 1024 * 1024, // 100GB default
              apiCalls: 1000000, // 1M calls default
            },
            usage: {
              storage: 0,
              bandwidth: 0,
              apiCalls: 0,
            },
          };

      logger.info('getOrganizationResourceUsage executed', {
        userId: req.user.id,
        organizationId: req.params.organizationId,
        storageUsed: result.storageUsed,
        bandwidthUsed: result.bandwidthUsed,
        apiCalls: result.apiCalls,
      });

      return result;
    } catch (error) {
      logger.error('Error in getOrganizationResourceUsage:', error);
      throw error;
    }
  },
});
