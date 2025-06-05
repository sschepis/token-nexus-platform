/* eslint-disable require-await */
/**
 * Common Cloud Function Middlewares
 */

const logger = require('../utils/logger');

const createMiddlewares = Parse => ({
  // Authentication middleware
  auth: async req => {
    if (!req.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be logged in');
    }

    return req;
  },

  // Admin check middleware
  admin: async req => {
    // Check if admin role exists
    const adminRole = await new Parse.Query(Parse.Role)
      .equalTo('name', 'admin')
      .first({ useMasterKey: true });

    if (!adminRole) {
      logger.error('Admin role not found');
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin role not found');
    }

    // Check if user is in admin role
    const userQuery = adminRole.getUsers().query();

    userQuery.equalTo('objectId', req.user.id);
    const isAdmin = await userQuery.first({ useMasterKey: true });

    if (!isAdmin) {
      logger.error('User is not an admin:', req.user.id);
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User must be an admin');
    }

    logger.info('User confirmed as admin:', req.user.id);

    return req;
  },

  // Master key check middleware
  masterKey: async req => {
    if (!req.master) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required');
    }

    return req;
  },

  // Logging middleware
  logging: async req => {
    const functionName = req.functionName || 'unknown';

    logger.info(`Executing cloud function: ${functionName}`, {
      user: req.user?.id,
      master: req.master,
      params: req.params,
    });

    return req;
  },

  // Error handling middleware
  errorHandling: async req => {
    try {
      return await req;
    } catch (error) {
      logger.error(`Error in cloud function ${req.functionName}:`, error);
      throw error;
    }
  },

  // Parameter validation middleware factory
  validateParams: schema => async req => {
    const missingParams = [];
    const invalidParams = [];

    Object.entries(schema).forEach(([param, config]) => {
      if (config.required && !req.params[param]) {
        missingParams.push(param);
      } else if (req.params[param] !== undefined) {
        // Type validation
        if (config.type && typeof req.params[param] !== config.type) {
          invalidParams.push(`${param} must be of type ${config.type}`);
        }

        // Enum validation
        if (config.enum && !config.enum.includes(req.params[param])) {
          invalidParams.push(`${param} must be one of: ${config.enum.join(', ')}`);
        }

        // Custom validation
        if (config.validate && !config.validate(req.params[param])) {
          invalidParams.push(`${param} failed validation: ${config.message || 'invalid value'}`);
        }
      }
    });

    if (missingParams.length > 0) {
      throw new Parse.Error(
        Parse.Error.INVALID_PARAMS,
        `Missing required parameters: ${missingParams.join(', ')}`
      );
    }

    if (invalidParams.length > 0) {
      throw new Parse.Error(
        Parse.Error.INVALID_PARAMS,
        `Invalid parameters: ${invalidParams.join('; ')}`
      );
    }

    return req;
  },
});

module.exports = createMiddlewares;
