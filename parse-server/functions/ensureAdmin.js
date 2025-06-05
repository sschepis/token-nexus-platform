/* global Parse */

/**
 * Ensure admin role cloud function
 */

const logger = require('../src/utils/logger');

module.exports = () => ({
  name: 'ensureAdmin',
  handler: async req => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Check if user has admin role
      const adminRole = await new Parse.Query(Parse.Role)
        .equalTo('name', 'admin')
        .first({ useMasterKey: true });

      if (!adminRole) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Admin role not found');
      }

      // Check if user is in admin role
      const userQuery = adminRole.getUsers().query();

      userQuery.equalTo('objectId', req.user.id);
      const isAdmin = await userQuery.first({ useMasterKey: true });

      if (!isAdmin) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User is not an admin');
      }

      const result = { success: true };

      logger.info('ensureAdmin executed', {
        userId: req.user.id,
        success: result.success,
      });

      return result;
    } catch (error) {
      logger.error('Error in ensureAdmin:', error);
      throw error;
    }
  },
});
