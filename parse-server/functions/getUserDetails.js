/**
 * Get user details cloud function
 */

const Parse = require('parse/node');

// Function metadata
module.exports.version = '1.0.0';
module.exports.description =
  'Get detailed user information including organizations and resource usage';
module.exports.requireUser = true;
module.exports.metadata = {
  group: 'user',
  params: {
    userId: { type: 'string', required: true },
  },
};

// Optional pre-handler hook
// eslint-disable-next-line require-await
module.exports.beforeHandler = async request => {
  const { userId } = request.params;

  if (!userId) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID is required');
  }
};

// Main handler
module.exports.handler = async request => {
  const { userId } = request.params;

  // Get user
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });

  if (!user) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
  }

  // Get user's organizations
  const organizations = await new Parse.Query('Organization')
    .equalTo('createdBy', user)
    .find({ useMasterKey: true });

  // Get resource usage for first organization
  const resourceUsage = organizations[0]
    ? await new Parse.Query('ResourceUsage')
        .equalTo('organizationId', organizations[0].id)
        .first({ useMasterKey: true })
    : null;

  return {
    user: {
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
      role: user.get('role'),
      createdAt: user.get('createdAt'),
    },
    organizations: organizations.map(org => ({
      id: org.id,
      name: org.get('name'),
      plan: org.get('plan'),
      status: org.get('status'),
    })),
    resourceUsage: resourceUsage
      ? {
          storageUsed: Math.round(resourceUsage.get('storageUsed') / 1024 / 1024),
          apiCalls: resourceUsage.get('apiCalls'),
        }
      : null,
  };
};

// Optional post-handler hook
// eslint-disable-next-line require-await
module.exports.afterHandler = async request => {
  // Log function execution
  const logger = require('../src/utils/logger');

  logger.info('getUserDetails executed', {
    userId: request.params.userId,
    executedBy: request.user?.id,
  });
};
