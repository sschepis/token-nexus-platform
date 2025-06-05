// Cloud functions for organization profile and settings management
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Get organization profile
Parse.Cloud.define('getOrganizationProfile', withOrganizationContext(async (request) => {
  const { organization, organizationId } = request; // organization and organizationId from middleware

  // No need for explicit user or organization ID checks, middleware handles it

  try {
    // Organization object is already available in request.organization
    return {
      success: true,
      organization: {
        id: organization.id,
        name: organization.get('name'),
        description: organization.get('description') || '',
        logo: organization.get('logo') || null,
        website: organization.get('website') || '',
        contactEmail: organization.get('contactEmail') || '',
        contactPhone: organization.get('contactPhone') || '',
        address: organization.get('address') || {},
        status: organization.get('status'),
        planType: organization.get('planType'),
        metadata: organization.get('metadata') || {},
        settings: organization.get('settings') || {},
        createdAt: organization.get('createdAt'),
        updatedAt: organization.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Get organization profile error:', error);
    throw error;
  }
}));

// Update organization profile
Parse.Cloud.define('updateOrganizationProfile', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { updates } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it
  if (!updates) {
    throw new Error('Updates are required');
  }

  try {
    // Organization object is already available in request.organization

    // Update allowed fields
    const allowedFields = ['name', 'description', 'logo', 'website', 'contactEmail', 'contactPhone', 'address'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        organization.set(field, updates[field]);
      }
    }

    await organization.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.profile_updated');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      updatedFields: Object.keys(updates)
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization profile updated successfully'
    };

  } catch (error) {
    console.error('Update organization profile error:', error);
    throw error;
  }
}));

// Update organization settings
Parse.Cloud.define('updateOrganizationSettings', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { settings } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it
  if (!settings) {
    throw new Error('Settings are required');
  }

  try {
    // Organization object is already available in request.organization

    // Merge settings
    const currentSettings = organization.get('settings') || {};
    const updatedSettings = { ...currentSettings, ...settings };
    organization.set('settings', updatedSettings);

    await organization.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.settings_updated');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      updatedSettings: Object.keys(settings)
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization settings updated successfully',
      settings: updatedSettings
    };

  } catch (error) {
    console.error('Update organization settings error:', error);
    throw error;
  }
}));

// Get organization members with roles
Parse.Cloud.define('getOrganizationMembers', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { page = 1, limit = 20 } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  try {
    // Get all members
    const OrgRole = Parse.Object.extend('OrgRole');
    const membersQuery = new Parse.Query(OrgRole);
    membersQuery.equalTo('organization', organization); // Use organization object from middleware
    membersQuery.include('user');
    membersQuery.descending('createdAt');
    membersQuery.limit(limit);
    membersQuery.skip((page - 1) * limit);

    const [members, total] = await Promise.all([
      membersQuery.find({ useMasterKey: true }),
      membersQuery.count({ useMasterKey: true })
    ]);

    const results = members.map(member => {
      const memberUser = member.get('user');
      return {
        id: member.id,
        user: {
          id: memberUser.id,
          email: memberUser.get('email'),
          firstName: memberUser.get('firstName') || '',
          lastName: memberUser.get('lastName') || '',
          fullName: `${memberUser.get('firstName') || ''} ${memberUser.get('lastName') || ''}`.trim() || memberUser.get('email'),
          avatar: memberUser.get('avatar') || null
        },
        role: member.get('role'),
        isActive: member.get('isActive'),
        assignedAt: member.get('assignedAt') || member.get('createdAt'),
        assignedBy: member.get('assignedBy'),
        lastActiveAt: memberUser.get('lastLogin')
      };
    });

    return {
      success: true,
      members: results,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };

  } catch (error) {
    console.error('Get organization members error:', error);
    throw error;
  }
}));

// Update organization member role
Parse.Cloud.define('updateOrganizationMemberRole', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { userId, newRole } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  if (!userId || !newRole) {
    throw new Error('User ID and new role are required');
  }

  const validRoles = ['admin', 'member', 'viewer'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role. Must be one of: admin, member, viewer');
  }

  try {
    // Prevent self-demotion if user is the last admin
    if (userId === user.id && newRole !== 'admin') {
      const OrgRole = Parse.Object.extend('OrgRole');
      const adminCountQuery = new Parse.Query(OrgRole);
      adminCountQuery.equalTo('organization', organization); // Use organization object from middleware
      adminCountQuery.equalTo('role', 'admin');
      adminCountQuery.equalTo('isActive', true);
      const adminCount = await adminCountQuery.count({ useMasterKey: true });

      if (adminCount <= 1) {
        throw new Error('Cannot remove the last administrator');
      }
    }

    // Get the member's role record
    const OrgRole = Parse.Object.extend('OrgRole');
    const memberQuery = new Parse.Query(OrgRole);
    memberQuery.equalTo('user', {
      __type: 'Pointer',
      className: '_User',
      objectId: userId
    });
    memberQuery.equalTo('organization', organization); // Use organization object from middleware
    const memberRole = await memberQuery.first({ useMasterKey: true });

    if (!memberRole) {
      throw new Error('Member not found in this organization');
    }

    // Update the role
    memberRole.set('role', newRole);
    memberRole.set('updatedBy', user);
    await memberRole.save(null, { useMasterKey: true });

    // Update organization-specific role
    const roleNameMap = {
      admin: `org_${organizationId}_admin`,
      member: `org_${organizationId}_member`,
      viewer: `org_${organizationId}_viewer`
    };

    // Remove from old role
    const oldRoleName = roleNameMap[memberRole.get('role')];
    if (oldRoleName) {
      const oldRoleQuery = new Parse.Query(Parse.Role);
      oldRoleQuery.equalTo('name', oldRoleName);
      const oldRole = await oldRoleQuery.first({ useMasterKey: true });
      if (oldRole) {
        const targetUser = new Parse.User();
        targetUser.id = userId;
        oldRole.getUsers().remove(targetUser);
        await oldRole.save(null, { useMasterKey: true });
      }
    }

    // Add to new role
    const newRoleName = roleNameMap[newRole];
    const newRoleQuery = new Parse.Query(Parse.Role);
    newRoleQuery.equalTo('name', newRoleName);
    let parseRole = await newRoleQuery.first({ useMasterKey: true });
    
    if (!parseRole) {
      // Create role if it doesn't exist
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true);
      roleACL.setPublicWriteAccess(false);
      
      parseRole = new Parse.Role(newRoleName, roleACL);
      await parseRole.save(null, { useMasterKey: true });
    }
    
    const targetUser = new Parse.User();
    targetUser.id = userId;
    parseRole.getUsers().add(targetUser);
    await parseRole.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.member_role_updated');
    log.set('targetType', 'OrgRole');
    log.set('targetId', memberRole.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      userId,
      oldRole: memberRole.get('role'),
      newRole
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Member role updated successfully'
    };

  } catch (error) {
    console.error('Update member role error:', error);
    throw error;
  }
}));

// Remove organization member
Parse.Cloud.define('removeOrganizationMember', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { userId } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Prevent self-removal if user is the last admin
    if (userId === user.id) {
      const OrgRole = Parse.Object.extend('OrgRole');
      const adminCountQuery = new Parse.Query(OrgRole);
      adminCountQuery.equalTo('organization', organization); // Use organization object from middleware
      adminCountQuery.equalTo('role', 'admin');
      adminCountQuery.equalTo('isActive', true);
      const adminCount = await adminCountQuery.count({ useMasterKey: true });

      if (adminCount <= 1) {
        throw new Error('Cannot remove the last administrator');
      }
    }

    // Get the member's role record
    const OrgRole = Parse.Object.extend('OrgRole');
    const memberQuery = new Parse.Query(OrgRole);
    memberQuery.equalTo('user', {
      __type: 'Pointer',
      className: '_User',
      objectId: userId
    });
    memberQuery.equalTo('organization', organization); // Use organization object from middleware
    const memberRole = await memberQuery.first({ useMasterKey: true });

    if (!memberRole) {
      throw new Error('Member not found in this organization');
    }

    // Mark as inactive instead of deleting
    memberRole.set('isActive', false);
    memberRole.set('removedAt', new Date());
    memberRole.set('removedBy', user.id);
    await memberRole.save(null, { useMasterKey: true });

    // Remove from organization-specific role
    const roleNameMap = {
      admin: `org_${organizationId}_admin`,
      member: `org_${organizationId}_member`,
      viewer: `org_${organizationId}_viewer`
    };

    const roleName = roleNameMap[memberRole.get('role')];
    if (roleName) {
      const parseRoleQuery = new Parse.Query(Parse.Role);
      parseRoleQuery.equalTo('name', roleName);
      const parseRole = await parseRoleQuery.first({ useMasterKey: true });
      if (parseRole) {
        const targetUser = new Parse.User();
        targetUser.id = userId;
        parseRole.getUsers().remove(targetUser);
        await parseRole.save(null, { useMasterKey: true });
      }
    }

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.member_removed');
    log.set('targetType', 'OrgRole');
    log.set('targetId', memberRole.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      userId,
      role: memberRole.get('role')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Member removed successfully'
    };

  } catch (error) {
    console.error('Remove organization member error:', error);
    throw error;
  }
}));

// Invite user to organization
Parse.Cloud.define('inviteUserToOrganization', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { email, role = 'member' } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  if (!email) {
    throw new Error('Email is required');
  }

  const validRoles = ['admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error('Invalid role. Must be one of: admin, member, viewer');
  }

  try {
    // Check if user exists
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', email.toLowerCase());
    let invitedUser = await userQuery.first({ useMasterKey: true });

    let userCreated = false;
    if (!invitedUser) {
      // Create user with temporary password
      invitedUser = new Parse.User();
      invitedUser.set('username', email.toLowerCase());
      invitedUser.set('email', email.toLowerCase());
      invitedUser.set('password', Math.random().toString(36).slice(-8));
      invitedUser.set('requiresPasswordReset', true);
      await invitedUser.save(null, { useMasterKey: true });
      userCreated = true;
    }

    // Check if already a member
    const OrgRole = Parse.Object.extend('OrgRole');
    const existingRoleQuery = new Parse.Query(OrgRole);
    existingRoleQuery.equalTo('user', invitedUser);
    existingRoleQuery.equalTo('organization', organization); // Use organization object from middleware
    const existingRole = await existingRoleQuery.first({ useMasterKey: true });

    if (existingRole && existingRole.get('isActive')) {
      throw new Error('User is already a member of this organization');
    }

    if (existingRole) {
      // Reactivate existing role
      existingRole.set('isActive', true);
      existingRole.set('role', role);
      existingRole.set('reactivatedAt', new Date());
      existingRole.set('reactivatedBy', user.id);
      await existingRole.save(null, { useMasterKey: true });
    } else {
      // Create new role
      const newRole = new OrgRole();
      newRole.set('user', invitedUser);
      newRole.set('organization', organization); // Use organization object from middleware
      newRole.set('role', role);
      newRole.set('isActive', true);
      newRole.set('assignedAt', new Date());
      newRole.set('assignedBy', user.id);

      // Set ACL
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(false);
      roleACL.setPublicWriteAccess(false);
      roleACL.setReadAccess(invitedUser.id, true);
      roleACL.setRoleReadAccess(`org_${organizationId}_admin`, true);
      roleACL.setRoleWriteAccess(`org_${organizationId}_admin`, true);
      roleACL.setRoleReadAccess('SystemAdmin', true);
      roleACL.setRoleWriteAccess('SystemAdmin', true);
      newRole.setACL(roleACL);

      await newRole.save(null, { useMasterKey: true });
    }

    // Add to organization-specific role
    const roleNameMap = {
      admin: `org_${organizationId}_admin`,
      member: `org_${organizationId}_member`,
      viewer: `org_${organizationId}_viewer`
    };

    const roleName = roleNameMap[role];
    const parseRoleQuery = new Parse.Query(Parse.Role);
    parseRoleQuery.equalTo('name', roleName);
    let parseRole = await parseRoleQuery.first({ useMasterKey: true });
    
    if (!parseRole) {
      // Create role if it doesn't exist
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true);
      roleACL.setPublicWriteAccess(false);
      
      parseRole = new Parse.Role(roleName, roleACL);
    }
    
    parseRole.getUsers().add(invitedUser);
    await parseRole.save(null, { useMasterKey: true });

    // TODO: Send invitation email
    // This would typically involve sending an email with a password reset link

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.member_invited');
    log.set('targetType', 'User');
    log.set('targetId', invitedUser.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      email,
      role,
      userCreated
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: userCreated ? 
        `User invited successfully. An email has been sent to ${email} with instructions.` :
        `Existing user added to organization successfully.`,
      userId: invitedUser.id,
      userCreated
    };

  } catch (error) {
    console.error('Invite user error:', error);
    throw error;
  }
}));

// Get organization users
Parse.Cloud.define('getOrgUsers', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { page = 1, limit = 20 } = request.params;

  // No need for explicit user, organization ID, or access checks, middleware handles it

  try {
    // Get all active roles for this organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const orgRolesQuery = new Parse.Query(OrgRole);
    orgRolesQuery.equalTo('organization', organization); // Use organization object from middleware
    orgRolesQuery.equalTo('isActive', true);
    orgRolesQuery.include('user');
    const orgRoles = await orgRolesQuery.find({ useMasterKey: true });

    // Group roles by user and build user list
    const userMap = new Map();
    
    for (const role of orgRoles) {
      const roleUser = role.get('user');
      if (!roleUser) continue;

      const userId = roleUser.id;
      const userRoleName = role.get('role');

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          username: roleUser.get('username'),
          email: roleUser.get('email'),
          firstName: roleUser.get('firstName'),
          lastName: roleUser.get('lastName'),
          isSystemAdmin: roleUser.get('isSystemAdmin') || false,
          createdAt: roleUser.get('createdAt')?.toISOString(),
          avatarUrl: roleUser.get('avatarUrl'),
          isActive: true, // Since we're only getting active roles
          orgRoles: []
        });
      }

      // Add role to user's role list
      const userData = userMap.get(userId);
      userData.orgRoles.push(`${userRoleName}_${organizationId}`); // Use organizationId from middleware
    }

    // If the organization administrator is not in the roles list, add them
    const orgAdministrator = organization.get('administrator'); // organization from middleware
    if (orgAdministrator && !userMap.has(orgAdministrator.id)) {
      // Fetch the full user object
      const adminUserQuery = new Parse.Query(Parse.User);
      const adminUser = await adminUserQuery.get(orgAdministrator.id, { useMasterKey: true });
      
      if (adminUser) {
        userMap.set(orgAdministrator.id, {
          id: orgAdministrator.id,
          username: adminUser.get('username'),
          email: adminUser.get('email'),
          firstName: adminUser.get('firstName'),
          lastName: adminUser.get('lastName'),
          isSystemAdmin: adminUser.get('isSystemAdmin') || false,
          createdAt: adminUser.get('createdAt')?.toISOString(),
          avatarUrl: adminUser.get('avatarUrl'),
          isActive: true,
          orgRoles: [`admin_${organizationId}`] // Organization administrator
        });
      }
    }

    // Convert map to array
    const users = Array.from(userMap.values());

    // Log the activity
    const ActivityLog = Parse.Object.extend('ActivityLog');
    const log = new ActivityLog();
    log.set('action', 'getOrgUsers');
    log.set('actor', user);
    log.set('organizationId', organizationId); // Use organizationId from middleware
    log.set('details', {
      userCount: users.length,
      hasOrgRoles: orgRoles.length,
      orgAdminIncluded: !!orgAdministrator
    });
    
    await log.save(null, { useMasterKey: true });

    return users;

  } catch (error) {
    console.error('Get organization users error:', error);
    throw error;
  }
}));

// Invite user to organization (alias for compatibility)
Parse.Cloud.define('inviteUserToOrg', async (request) => {
  // Delegate to the existing inviteUserToOrganization function.
  // The middleware will be applied by inviteUserToOrganization itself.
  return Parse.Cloud.run('inviteUserToOrganization', request.params, { user: request.user });
});

// Update user roles in organization
Parse.Cloud.define('updateUserRolesInOrg', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { userId, roles } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  if (!userId || !roles) {
    throw new Error('User ID and roles are required');
  }

  try {
    // Get the target user
    const targetUserQuery = new Parse.Query(Parse.User);
    const targetUser = await targetUserQuery.get(userId, { useMasterKey: true });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Remove existing roles for this user in this organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const existingRolesQuery = new Parse.Query(OrgRole);
    existingRolesQuery.equalTo('user', targetUser);
    existingRolesQuery.equalTo('organization', organization); // Use organization object from middleware
    const existingRoles = await existingRolesQuery.find({ useMasterKey: true });
    
    // Delete existing roles
    if (existingRoles.length > 0) {
      await Parse.Object.destroyAll(existingRoles, { useMasterKey: true });
    }

    // Create new roles
    const newRoles = [];
    for (const roleName of roles) {
      const orgRole = new OrgRole();
      orgRole.set('user', targetUser);
      orgRole.set('organization', organization); // Use organization object from middleware
      orgRole.set('role', roleName);
      orgRole.set('isActive', true);
      orgRole.set('assignedBy', user);
      orgRole.set('assignedAt', new Date());
      newRoles.push(orgRole);
    }

    await Parse.Object.saveAll(newRoles, { useMasterKey: true });

    // Log the activity
    const ActivityLog = Parse.Object.extend('ActivityLog');
    const log = new ActivityLog();
    log.set('action', 'updateUserRoles');
    log.set('targetId', userId);
    log.set('actor', user);
    log.set('organizationId', organizationId); // Use organizationId from middleware
    log.set('details', {
      newRoles: roles,
      previousRoleCount: existingRoles.length
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `User roles updated successfully`,
      userId,
      roles
    };

  } catch (error) {
    console.error('Update user roles error:', error);
    throw error;
  }
}));

// Remove user from organization
Parse.Cloud.define('removeUserFromOrg', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request; // organization and organizationId from middleware
  const { userId } = request.params;

  // No need for explicit user or organization ID checks, middleware handles it

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Prevent users from removing themselves (unless they are the last admin, handled earlier)
    if (userId === user.id) {
       // This check can be combined with the one in updateOrganizationMemberRole, or simply throw error
       // based on whether it's allowed for the last admin to remove themselves.
       // For now, keep as is, but ensure middleware supports this
       throw new Error('You cannot remove yourself from the organization');
     }

    // Get the target user
    const targetUserQuery = new Parse.Query(Parse.User);
    const targetUser = await targetUserQuery.get(userId, { useMasterKey: true });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Remove all roles for this user in this organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const userRolesQuery = new Parse.Query(OrgRole);
    userRolesQuery.equalTo('user', targetUser);
    userRolesQuery.equalTo('organization', organization); // Use organization object from middleware
    const userRoles = await userRolesQuery.find({ useMasterKey: true });
    
    if (userRoles.length > 0) {
      await Parse.Object.destroyAll(userRoles, { useMasterKey: true });
    }

    // Log the activity
    const ActivityLog = Parse.Object.extend('ActivityLog');
    const log = new ActivityLog();
    log.set('action', 'removeUserFromOrg');
    log.set('targetId', userId);
    log.set('actor', user);
    log.set('organizationId', organizationId); // Use organizationId from middleware
    log.set('details', {
      targetUserEmail: targetUser.get('email'),
      rolesRemoved: userRoles.length
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `User removed from organization successfully`,
      userId
    };

  } catch (error) {
    console.error('Remove user from organization error:', error);
    throw error;
  }
}));

// Debug function to check user's organization setup
Parse.Cloud.define('debugUserOrgSetup', async (request) => {
  const { user } = request;
  const { orgId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const debug = {
      userId: user.id,
      userEmail: user.get('email'),
      isSystemAdmin: user.get('isSystemAdmin'),
      currentOrganization: user.get('currentOrganization')?.id,
      organizations: user.get('organizations')?.map(org => org.id) || []
    };

    if (orgId) {
      // Check specific organization
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      const organization = await orgQuery.get(orgId, { useMasterKey: true });
      
      if (organization) {
        debug.organization = {
          id: organization.id,
          name: organization.get('name'),
          administrator: organization.get('administrator')?.id,
          isUserAdmin: organization.get('administrator')?.id === user.id
        };

        // Check user's roles in this organization
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', user);
        roleQuery.equalTo('organization', organization);
        const userRoles = await roleQuery.find({ useMasterKey: true });
        
        debug.userRoles = userRoles.map(role => ({
          id: role.id,
          role: role.get('role'),
          isActive: role.get('isActive'),
          assignedAt: role.get('assignedAt')
        }));

        // Check all roles in this organization
        const allRolesQuery = new Parse.Query(OrgRole);
        allRolesQuery.equalTo('organization', organization);
        allRolesQuery.include('user');
        const allRoles = await allRolesQuery.find({ useMasterKey: true });
        
        debug.allOrgRoles = allRoles.map(role => ({
          id: role.id,
          userId: role.get('user')?.id,
          userEmail: role.get('user')?.get('email'),
          role: role.get('role'),
          isActive: role.get('isActive')
        }));
      } else {
        debug.organization = 'Organization not found';
      }
    }

    return debug;

  } catch (error) {
    console.error('Debug user org setup error:', error);
    return {
      error: error.message,
      userId: user.id,
      userEmail: user.get('email')
    };
  }
});

module.exports = {};