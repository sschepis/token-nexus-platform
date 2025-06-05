const OrganizationService = require('../../services/OrganizationService');

// Get organization analytics data
const getOrganizationAnalytics = async request => {
  try {
    const { organizationId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get organization and verify access
    const organization = await new Parse.Query('Organization')
      .equalTo('objectId', organizationId)
      .first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get analytics data from various sources
    const [visitorStats, apiStats, storageStats] = await Promise.all([
      OrganizationService.getVisitorStats(organizationId),
      OrganizationService.getAPIStats(organizationId),
      OrganizationService.getStorageStats(organizationId),
    ]);

    // Get recent activity
    const recentActivity = await new Parse.Query('ActivityLog')
      .equalTo('organizationId', organizationId)
      .descending('createdAt')
      .limit(10)
      .find({ useMasterKey: true });

    return {
      visitors: {
        total: visitorStats.total,
        trend: visitorStats.trend,
        data: visitorStats.timeSeriesData,
      },
      apiRequests: {
        total: apiStats.total,
        trend: apiStats.trend,
        data: apiStats.timeSeriesData,
      },
      storage: {
        used: storageStats.used,
        total: storageStats.total,
        trend: storageStats.trend,
      },
      performance: {
        avgResponseTime: apiStats.avgResponseTime,
        uptime: apiStats.uptime,
        trend: apiStats.performanceTrend,
      },
      recentActivity: recentActivity.map(activity => ({
        time: activity.get('createdAt').toISOString(),
        type: activity.get('type'),
        description: activity.get('description'),
      })),
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Get organization health status
const getOrganizationHealth = async request => {
  try {
    const { organizationId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get health status from various services
    const [dbHealth, storageHealth, apiHealth, cacheHealth] = await Promise.all([
      OrganizationService.checkDatabaseHealth(organizationId),
      OrganizationService.checkStorageHealth(organizationId),
      OrganizationService.checkAPIHealth(organizationId),
      OrganizationService.checkCacheHealth(organizationId),
    ]);

    // Determine overall status
    const statuses = [dbHealth, storageHealth, apiHealth, cacheHealth];
    let overallStatus = 'healthy';

    if (statuses.some(s => s === 'error')) {
      overallStatus = 'error';
    } else if (statuses.some(s => s === 'warning')) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      checks: {
        database: dbHealth,
        storage: storageHealth,
        api: apiHealth,
        cache: cacheHealth,
      },
      messages: await OrganizationService.getHealthMessages(organizationId),
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Get organization integrations status
const getOrganizationIntegrations = async request => {
  try {
    const { organizationId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get all integrations for the organization
    const integrations = await new Parse.Query('Integration')
      .equalTo('organizationId', organizationId)
      .find({ useMasterKey: true });

    // Check status of each integration
    const integrationStatuses = await Promise.all(
      integrations.map(async integration => {
        const status = await OrganizationService.checkIntegrationStatus(integration);

        return {
          name: integration.get('name'),
          status: status.status,
          lastSync: status.lastSync,
          message: status.message,
        };
      })
    );

    return integrationStatuses;
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Get organization audit log
const getOrganizationAuditLog = async request => {
  try {
    const { organizationId, limit = 5 } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const auditLog = await new Parse.Query('AuditLog')
      .equalTo('organizationId', organizationId)
      .descending('createdAt')
      .limit(limit)
      .find({ useMasterKey: true });

    return auditLog.map(entry => ({
      timestamp: entry.get('createdAt').toISOString(),
      action: entry.get('action'),
      user: entry.get('userName'),
      details: entry.get('details'),
    }));
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
};

// Update organization settings
const updateOrganizationSettings = async request => {
  try {
    const { organizationId, settings } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get organization and verify access
    const organization = await new Parse.Query('Organization')
      .equalTo('objectId', organizationId)
      .first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Update settings
    organization.set('settings', {
      ...organization.get('settings'),
      ...settings,
    });

    await organization.save(null, { useMasterKey: true });

    // Log the change
    await OrganizationService.logActivity(
      organizationId,
      'settings_update',
      `Settings updated by ${user.get('email')}`,
      user
    );

    return organization;
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
};

module.exports = {
  getOrganizationAnalytics,
  getOrganizationHealth,
  getOrganizationIntegrations,
  getOrganizationAuditLog,
  updateOrganizationSettings,
};
