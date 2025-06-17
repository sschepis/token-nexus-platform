const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');
const createLogger = require('../../utils/logger'); // Assuming a utility for logging

const logger = createLogger('OrgUsersCloudFunction');

Parse.Cloud.define('getOrgUsers', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;

  logger.info(`getOrgUsers called by user ${user.id} for organization ${organizationId}`);

  if (!user) {
    logger.warn('getOrgUsers: User not authenticated.');
    throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated.');
  }

  if (!organization) {
    logger.warn(`getOrgUsers: Organization not found for ID ${organizationId}.`);
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Organization not found.');
  }

  try {
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('organization', organization);
    roleQuery.equalTo('isActive', true);
    roleQuery.include('user'); // Important: Include the full User object
    roleQuery.descending('createdAt');

    logger.debug(`getOrgUsers: Querying OrgRole for organization ${organization.id}`);
    const orgRoles = await roleQuery.find({ useMasterKey: true });
    logger.debug(`getOrgUsers: Found ${orgRoles.length} OrgRole entries.`);

    // Group roles by user
    const usersMap = new Map();

    for (const orgRole of orgRoles) {
      const memberUser = orgRole.get('user');
      if (!memberUser) {
        logger.warn(`OrgRole ${orgRole.id} has no associated user.`);
        continue;
      }

      const userId = memberUser.id;

      let userEntry = usersMap.get(userId);
      if (!userEntry) {
        // Fetch full User object to get all required fields, as OrgRole only links to it
        const userQuery = new Parse.Query(Parse.User);
        let fullUser;
        try {
          fullUser = await userQuery.get(userId, { useMasterKey: true });
          logger.debug(`Fetched full user object for ${userId}`);
        } catch (fetchError) {
          logger.error(`Failed to fetch full user object for ${userId}: ${fetchError.message}`);
          continue; // Skip this user if details cannot be fetched
        }

        userEntry = {
          id: fullUser.id,
          username: fullUser.get('username'),
          email: fullUser.get('email'),
          firstName: fullUser.get('firstName') || '',
          lastName: fullUser.get('lastName') || '',
          orgRoles: [], // This will be populated below
          isSystemAdmin: fullUser.get('isSystemAdmin') || false,
          createdAt: fullUser.createdAt.toISOString(),
          lastLoginAt: fullUser.get('lastLogin') ? fullUser.get('lastLogin').toISOString() : undefined,
          avatarUrl: fullUser.get('avatarUrl') || undefined,
          kycStatus: fullUser.get('kycStatus') || undefined,
          isActive: fullUser.get('isActive') !== undefined ? fullUser.get('isActive') : true, // Assuming default active
        };
        usersMap.set(userId, userEntry);
      }
      userEntry.orgRoles.push(orgRole.get('role'));
    }

    const users = Array.from(usersMap.values());
    logger.info(`getOrgUsers: Returning ${users.length} unique users.`);

    return {
      success: true,
      users: users,
      total: users.length
    };

  } catch (error) {
    logger.error(`Error in getOrgUsers cloud function for org ${organizationId}: ${error.message}`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to retrieve organization users: ${error.message}`);
  }
}));