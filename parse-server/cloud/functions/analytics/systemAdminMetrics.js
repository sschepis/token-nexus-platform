const createLogger = require('../../utils/logger');

const logger = createLogger('SystemAdminMetrics');

/**
 * Get system-wide metrics for system administrators
 * This function requires system admin privileges
 */
Parse.Cloud.define('getSystemMetrics', async (request) => {
  const { user } = request;

  logger.info(`getSystemMetrics called by user ${user ? user.id : 'unknown'}`);

  // Verify user is authenticated
  if (!user) {
    logger.warn('getSystemMetrics: User not authenticated.');
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated.');
  }

  // Verify user is system admin
  const isSystemAdmin = user.get('isSystemAdmin') || user.get('isAdmin');
  if (!isSystemAdmin) {
    logger.warn(`getSystemMetrics: User ${user.id} is not a system admin.`);
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'System admin privileges required.');
  }

  try {
    // Get total organizations
    const Organization = Parse.Object.extend('Organization');
    const orgQuery = new Parse.Query(Organization);
    const totalOrganizations = await orgQuery.count({ useMasterKey: true });

    // Get total users across all organizations
    const userQuery = new Parse.Query(Parse.User);
    const totalUsers = await userQuery.count({ useMasterKey: true });

    // Get active deployments
    let activeDeployments = 0;
    try {
      const Deployment = Parse.Object.extend('Deployment');
      const deploymentQuery = new Parse.Query(Deployment);
      deploymentQuery.equalTo('status', 'active');
      activeDeployments = await deploymentQuery.count({ useMasterKey: true });
    } catch (error) {
      logger.warn('getSystemMetrics: Deployment table might not exist, using placeholder');
      activeDeployments = 0;
    }

    // Calculate platform health based on various factors
    let healthStatus = 'healthy';
    
    // Simple health check logic
    if (totalUsers === 0) {
      healthStatus = 'warning';
    }
    
    // Get system uptime (simplified - in production you'd get this from system metrics)
    const uptime = process.uptime();
    const uptimeString = formatUptime(uptime);

    // Mock system resources (in production, you'd get these from system monitoring)
    const systemResources = {
      cpu: Math.floor(Math.random() * 30) + 20, // 20-50% CPU usage
      memory: Math.floor(Math.random() * 40) + 30, // 30-70% memory usage
      storage: Math.floor(Math.random() * 20) + 40, // 40-60% storage usage
    };

    // Adjust health status based on resource usage
    if (systemResources.cpu > 80 || systemResources.memory > 85 || systemResources.storage > 90) {
      healthStatus = 'critical';
    } else if (systemResources.cpu > 60 || systemResources.memory > 70 || systemResources.storage > 80) {
      healthStatus = 'warning';
    }

    const metrics = {
      platformHealth: {
        status: healthStatus,
        uptime: uptimeString,
        lastCheck: new Date(),
      },
      totalOrganizations,
      totalUsers,
      activeDeployments,
      systemResources,
    };

    logger.info(`getSystemMetrics: Successfully retrieved metrics for system admin ${user.id}`);
    
    return {
      success: true,
      metrics
    };

  } catch (error) {
    logger.error(`Error in getSystemMetrics cloud function: ${error.message}`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to retrieve system metrics: ${error.message}`);
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}