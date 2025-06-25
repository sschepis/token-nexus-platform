module.exports = Parse => {
  const checkUserRole = async request => { // Integrated from roles/index.js
    try {
      const { user } = request; // Expect authenticated user object
      const { userId } = request.params; // Optional userId param if checking other users

      const targetUser = user || (userId ? await new Parse.Query(Parse.User).get(userId, { useMasterKey: true }) : null);

      if (!targetUser) {
        throw new Error('User not found or not authenticated');
      }

      // Check for isAdmin flag or SystemAdmin role
      const isAdmin =
        targetUser.get('isSystemAdmin') === true ||
        (await new Parse.Query(Parse.Role)
          .equalTo('name', 'SystemAdmin')
          .equalTo('users', targetUser)
          .count({ useMasterKey: true }) > 0);

      let organizationRoles = [];
      if (isAdmin) {
        // System admin gets admin access to all organizations
        const orgQuery = new Parse.Query('Organization');
        const organizations = await orgQuery.find({ useMasterKey: true });
        organizationRoles = organizations.map(org => ({
          organizationId: org.id,
          organizationName: org.get('name'),
          organizationSubdomain: org.get('subdomain'),
          isParentOrg: org.get('isParentOrg'),
          role: 'admin', // System admins get admin access to all orgs
          isActive: true
        }));
      } else {
        // For non-admin users, get their specific organization roles
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('users', targetUser);
        roleQuery.include('organization'); // Include organization object
        const userRoles = await roleQuery.find({ useMasterKey: true });

        organizationRoles = userRoles
          .map(role => {
            const organization = role.get('organization');
            const roleName = role.get('name');
            // Filter roles that don't belong to a specific organization or are generic system roles
            if (organization && roleName.startsWith(`org_${organization.id}_`)) {
              return {
                organizationId: organization.id,
                organizationName: organization.get('name'),
                organizationSubdomain: organization.get('subdomain'),
                role: roleName.replace(`org_${organization.id}_`, ''), // Extract role name (e.g., 'admin', 'member')
                isActive: role.get('isActive') // Assuming isActive is a property on OrgRole
              };
            }
            return null;
          })
          .filter(role => role !== null); // Only include valid organization roles
      }

      return {
        success: true,
        isAdmin, // This is a system-wide admin flag
        organizationRoles, // Roles specific to organizations
        user: { // Return basic user info for context
          id: targetUser.id,
          email: targetUser.get('email'),
          username: targetUser.get('username'),
          isSystemAdmin: targetUser.get('isSystemAdmin')
        }
      };
    } catch (error) {
      console.error('Error checking user role:', error);
      throw error; // Re-throw the error
    }
  };

  const getRoles = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }

    const query = new Parse.Query(Parse.Role);
    const roles = await query.find({ useMasterKey: true });

    return roles.map(role => ({
      id: role.id,
      name: role.getName(),
      users: role.getUsers().query().count({ useMasterKey: true }),
      roles: role.getRoles().query().count({ useMasterKey: true }),
      acl: role.getACL(),
    }));
  };

  const getPermissions = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }

    const query = new Parse.Query('Permission');
    const permissions = await query.find({ useMasterKey: true });

    return permissions.map(permission => ({
      id: permission.id,
      name: permission.get('name'),
      description: permission.get('description'),
    }));
  };

  const getUsers = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }

    const query = new Parse.Query(Parse.User);
    const users = await query.find({ useMasterKey: true });

    return users.map(user => ({
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
    }));
  };

  const addRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { role } = request.params;

    const newRole = new Parse.Role(role.name, new Parse.ACL());
    // ACL for new roles might need more granular defaults
    newRole.getACL().setPublicReadAccess(false); // Default to private
    newRole.getACL().setRoleWriteAccess('SystemAdmin', true); // System admins can always modify roles

    await newRole.save(null, { useMasterKey: true });

    return { id: newRole.id };
  };

  const updateRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { id, updates } = request.params;

    const query = new Parse.Query(Parse.Role);
    const role = await query.get(id, { useMasterKey: true });

    if (updates.name) {
      role.setName(updates.name);
    }

    if (updates.users) {
      const users = await Promise.all(
        updates.users.map(userId => new Parse.Query(Parse.User).get(userId, { useMasterKey: true }))
      );
      role.getUsers().add(users);
    }

    if (updates.roles) {
      const roles = await Promise.all(
        updates.roles.map(roleId => new Parse.Query(Parse.Role).get(roleId, { useMasterKey: true }))
      );
      role.getRoles().add(roles);
    }

    await role.save(null, { useMasterKey: true });
  };

  const deleteRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { id } = request.params;

    const query = new Parse.Query(Parse.Role);
    const role = await query.get(id, { useMasterKey: true });

    if (role.getName() === 'SystemAdmin' || role.getName() === 'admin') { // Prevent deletion of critical roles
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Cannot delete system-critical roles.');
    }

    await role.destroy({ useMasterKey: true });
  };

  // This function is generally not used for direct role hierarchy management in Parse.
  // Roles are typically assigned directly to users or other roles.
  // Keeping it for backward compatibility, but noting its limited utility.
  const moveRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { roleId, newParentId } = request.params;

    const query = new Parse.Query(Parse.Role);
    const role = await query.get(roleId, { useMasterKey: true });

    if (newParentId) {
      const parentRole = await query.get(newParentId, { useMasterKey: true });
      parentRole.getRoles().add(role);

      await parentRole.save(null, { useMasterKey: true });
    }
  };

  const assignRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { userId, roleId } = request.params;

    const [user, role] = await Promise.all([
      new Parse.Query(Parse.User).get(userId, { useMasterKey: true }),
      new Parse.Query(Parse.Role).get(roleId, { useMasterKey: true }),
    ]);

    role.getUsers().add(user);
    await role.save(null, { useMasterKey: true });
  };

  const removeRole = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { userId, roleId } = request.params;

    const [user, role] = await Promise.all([
      new Parse.Query(Parse.User).get(userId, { useMasterKey: true }),
      new Parse.Query(Parse.Role).get(roleId, { useMasterKey: true }),
    ]);

    role.getUsers().remove(user);
    await role.save(null, { useMasterKey: true });
  };

  const searchUsers = async request => {
    const userRoleInfo = await checkUserRole({ user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Administrator access required');
    }
    const { query: searchQuery } = request.params;

    const query = new Parse.Query(Parse.User);

    query.matches('username', new RegExp(searchQuery, 'i'));
    const users = await query.find({ useMasterKey: true });

    return users.map(user => ({
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
    }));
  };

  // Register Cloud Functions
  Parse.Cloud.define('getRoles', getRoles);
  Parse.Cloud.define('getPermissions', getPermissions);
  Parse.Cloud.define('getUsers', getUsers);
  Parse.Cloud.define('addRole', addRole);
  Parse.Cloud.define('updateRole', updateRole);
  Parse.Cloud.define('deleteRole', deleteRole);
  Parse.Cloud.define('moveRole', moveRole);
  Parse.Cloud.define('assignRole', assignRole);
  Parse.Cloud.define('removeRole', removeRole);
  Parse.Cloud.define('searchUsers', searchUsers);
  Parse.Cloud.define('checkUserRole', checkUserRole); // Register checkUserRole as a cloud function

  // Get user roles for permission service
  const getUserRoles = async request => {
    const { userId } = request.params;
    const { user } = request;

    if (!user) {
      throw new Error('Authentication required');
    }

    try {
      // Get target user
      const targetUser = userId ?
        await new Parse.Query(Parse.User).get(userId, { useMasterKey: true }) :
        user;

      if (!targetUser) {
        throw new Error('User not found');
      }

      // Fetch user's roles
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('users', targetUser);
      const userRoles = await roleQuery.find({ useMasterKey: true });

      // Convert Parse roles to the format expected by permission service
      const roles = userRoles.map(role => ({
        getName: () => role.getName(),
        get: (field) => role.get(field),
        id: role.id
      }));

      return {
        success: true,
        roles: roles
      };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw new Error('Failed to fetch user roles');
    }
  };

  Parse.Cloud.define('getUserRoles', getUserRoles);
};
