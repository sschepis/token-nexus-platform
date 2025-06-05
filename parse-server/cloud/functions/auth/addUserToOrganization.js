
module.exports = async function (request) {
  const { userId, organizationId, role = 'member' } = request.params;
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

  // Verify requesting user has admin access
  const isAdmin = await Parse.Cloud.run('checkUserRole', { userId: user.id });

  if (
    !isAdmin.isAdmin &&
    !isAdmin.organizationRoles.some(role => role.organizationId === organizationId)
  ) {
    throw new Error('Unauthorized access to organization');
  }

  // Get the user to add
  const userToAdd = await new Parse.Query(Parse.User)
    .equalTo('objectId', userId)
    .first({ useMasterKey: true });

  if (!userToAdd) {
    throw new Error('User not found');
  }

  // Get or create organization role
  const roleName = `${organizationId}_${role}`;
  let orgRole = await new Parse.Query(Parse.Role)
    .equalTo('name', roleName)
    .first({ useMasterKey: true });

  if (!orgRole) {
    // Create new role
    const acl = new Parse.ACL();

    acl.setPublicReadAccess(true);
    orgRole = new Parse.Role(roleName, acl);
    await orgRole.save(null, { useMasterKey: true });
  }

  // Add user to role
  orgRole.getUsers().add(userToAdd);
  await orgRole.save(null, { useMasterKey: true });

  // Update organization ACL to give access to the role
  const orgACL = organization.getACL() || new Parse.ACL();

  orgACL.setRoleReadAccess(roleName, true);
  if (role === 'admin') {
    orgACL.setRoleWriteAccess(roleName, true);
  }
  organization.setACL(orgACL);
  await organization.save(null, { useMasterKey: true });

  return {
    success: true,
    message: `User ${userToAdd.id} added to organization ${organizationId} with role ${role}`,
  };
};
