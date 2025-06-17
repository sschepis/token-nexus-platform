/**
 * User Management Cloud Functions
 * These functions provide secure access to user data without exposing direct _User table queries to the client
 */

const logger = require('../utils/logger');

/**
 * Get user count for an organization
 * This replaces direct _User table queries from the client
 */
Parse.Cloud.define('getUserCount', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const { organizationId } = params;
    
    // Validate organization access
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check if user has access to this organization
    const userOrgId = user.get('organizationId');
    if (userOrgId !== organizationId && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to access organization data');
    }

    // Query user count for the organization
    const query = new Parse.Query(Parse.User);
    query.equalTo('organizationId', organizationId);
    const count = await query.count({ useMasterKey: true });

    logger.info(`getUserCount: Retrieved count ${count} for organization ${organizationId}`);

    return {
      success: true,
      count: count
    };
  } catch (error) {
    logger.error('Error in getUserCount:', error);
    throw new Error(`Failed to get user count: ${error.message}`);
  }
});

/**
 * Get user details by ID
 * This replaces direct _User table queries from the client
 */
Parse.Cloud.define('getUserDetails', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const { userId, organizationId } = params;
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Users can always get their own details
    if (userId === user.id) {
      logger.info(`getUserDetails: User ${userId} retrieving own details`);
      return {
        success: true,
        user: {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
          firstName: user.get('firstName'),
          lastName: user.get('lastName'),
          roles: user.get('roles') || [],
          permissions: user.get('permissions') || [],
          organizationId: user.get('organizationId'),
          isActive: user.get('isActive'),
          lastLogin: user.get('lastLogin')
        }
      };
    }

    // For other users, check permissions
    const userOrgId = user.get('organizationId');
    if (organizationId && userOrgId !== organizationId && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to access user data');
    }

    // Query the target user
    const userQuery = new Parse.Query(Parse.User);
    const targetUser = await userQuery.get(userId, { useMasterKey: true });

    // Additional permission check - users can only see users in their org unless admin
    if (!user.get('isAdmin') && targetUser.get('organizationId') !== userOrgId) {
      throw new Error('Insufficient permissions to access user data');
    }

    logger.info(`getUserDetails: User ${user.id} retrieving details for user ${userId}`);

    return {
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.get('username'),
        email: targetUser.get('email'),
        firstName: targetUser.get('firstName'),
        lastName: targetUser.get('lastName'),
        roles: targetUser.get('roles') || [],
        permissions: targetUser.get('permissions') || [],
        organizationId: targetUser.get('organizationId'),
        isActive: targetUser.get('isActive'),
        lastLogin: targetUser.get('lastLogin')
      }
    };
  } catch (error) {
    logger.error('Error in getUserDetails:', error);
    throw new Error(`Failed to get user details: ${error.message}`);
  }
});

/**
 * Get organization users with pagination
 * This replaces direct _User table queries from the client
 */
Parse.Cloud.define('getOrganizationUsers', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const { organizationId, limit = 50, skip = 0, includeInactive = false } = params;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check permissions
    const userOrgId = user.get('organizationId');
    if (userOrgId !== organizationId && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to access organization users');
    }

    // Query users in the organization
    const query = new Parse.Query(Parse.User);
    query.equalTo('organizationId', organizationId);
    
    if (!includeInactive) {
      query.notEqualTo('isActive', false);
    }
    
    query.limit(Math.min(limit, 100)); // Cap at 100 for performance
    query.skip(skip);
    query.ascending('username');

    const users = await query.find({ useMasterKey: true });
    const totalCount = await query.count({ useMasterKey: true });

    const userData = users.map(u => ({
      id: u.id,
      username: u.get('username'),
      email: u.get('email'),
      firstName: u.get('firstName'),
      lastName: u.get('lastName'),
      roles: u.get('roles') || [],
      isActive: u.get('isActive'),
      lastLogin: u.get('lastLogin'),
      createdAt: u.get('createdAt')
    }));

    logger.info(`getOrganizationUsers: Retrieved ${users.length} users for organization ${organizationId}`);

    return {
      success: true,
      users: userData,
      total: totalCount,
      hasMore: (skip + users.length) < totalCount
    };
  } catch (error) {
    logger.error('Error in getOrganizationUsers:', error);
    throw new Error(`Failed to get organization users: ${error.message}`);
  }
});

/**
 * Get user statistics for dashboard
 * This replaces direct _User table queries from the client
 */
Parse.Cloud.define('getUserStats', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const { organizationId } = params;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check permissions
    const userOrgId = user.get('organizationId');
    if (userOrgId !== organizationId && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to access organization statistics');
    }

    // Get various user statistics
    const baseQuery = new Parse.Query(Parse.User);
    baseQuery.equalTo('organizationId', organizationId);

    // Total users
    const totalUsers = await baseQuery.count({ useMasterKey: true });

    // Active users (logged in within last 30 days)
    const activeQuery = new Parse.Query(Parse.User);
    activeQuery.equalTo('organizationId', organizationId);
    activeQuery.greaterThan('lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const activeUsers = await activeQuery.count({ useMasterKey: true });

    // New users (created within last 7 days)
    const newQuery = new Parse.Query(Parse.User);
    newQuery.equalTo('organizationId', organizationId);
    newQuery.greaterThan('createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const newUsers = await newQuery.count({ useMasterKey: true });

    logger.info(`getUserStats: Retrieved stats for organization ${organizationId} - Total: ${totalUsers}, Active: ${activeUsers}, New: ${newUsers}`);

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsers,
        inactiveUsers: totalUsers - activeUsers
      }
    };
  } catch (error) {
    logger.error('Error in getUserStats:', error);
    throw new Error(`Failed to get user statistics: ${error.message}`);
  }
});

module.exports = {
  // Cloud functions are automatically registered when this file is required
};