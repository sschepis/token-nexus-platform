const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

Parse.Cloud.define('getOrgUsers', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organization) {
    throw new Error('Organization not found through middleware');
  }

  try {
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('organization', organization);
    roleQuery.equalTo('isActive', true); // Only active members
    roleQuery.include('user'); // Include the User object
    roleQuery.descending('createdAt'); // Order by when they joined

    const roles = await roleQuery.find({ useMasterKey: true });

    const users = roles.map(role => {
      const memberUser = role.get('user');
      return {
        id: memberUser.id,
        email: memberUser.get('email'),
        firstName: memberUser.get('firstName') || '',
        lastName: memberUser.get('lastName') || '',
        role: role.get('role'),
        isActive: role.get('isActive'),
        joinedAt: role.get('assignedAt')
      };
    });

    return {
      success: true,
      users: users,
      total: users.length
    };

  } catch (error) {
    console.error('Error in getOrgUsers cloud function:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
  }
}));