/* global Parse */

/**
 * Delete organization cloud function
 */

const logger = require('../src/utils/logger');

module.exports = middlewares => async req => {
  try {
    // Apply auth middleware
    await middlewares.auth(req);

    // Apply admin middleware
    await middlewares.admin(req);

    // Validate parameters
    const paramSchema = {
      organizationId: { type: 'string', required: true },
    };

    await middlewares.validateParams(paramSchema)(req);

    const { organizationId } = req.params;

    // Get organization
    const organization = await new Parse.Query('Organization').get(organizationId, {
      useMasterKey: true,
    });

    if (!organization) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Organization not found');
    }

    // Start deletion in a transaction
    await Parse.Object.saveAll(
      [
        // Delete organization
        organization.destroy({ useMasterKey: true }),

        // Delete associated resource usage
        new Parse.Query('ResourceUsage')
          .equalTo('organizationId', organizationId)
          .first({ useMasterKey: true })
          .then(usage => usage?.destroy({ useMasterKey: true })),

        // Delete organization-specific roles
        new Parse.Query(Parse.Role)
          .equalTo('name', `${organizationId}_admin`)
          .first({ useMasterKey: true })
          .then(role => role?.destroy({ useMasterKey: true })),

        // Delete organization members
        new Parse.Query('_User')
          .equalTo('organizations', organization)
          .find({ useMasterKey: true })
          .then(users =>
            Parse.Object.saveAll(
              users.map(user => {
                user.remove('organizations', organization);

                return user.save(null, { useMasterKey: true });
              })
            )
          ),
      ],
      { useMasterKey: true }
    );

    const result = {
      success: true,
      message: 'Organization and associated data deleted successfully',
    };

    logger.info('deleteOrganization executed', {
      userId: req.user?.id,
      organizationId: req.params.organizationId,
      success: result.success,
    });

    return result;
  } catch (error) {
    logger.error('Error in deleteOrganization:', error);
    throw error;
  }
};
