/* global Parse */

const OrganizationService = require('../../services/OrganizationService')(Parse);

const listOrganizations = async request => {
  try {
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    const query = new Parse.Query('Organization');

    query.include('members');
    query.include('settings');
    query.include('quotas');

    // If not admin, only show organizations user has access to
    if (!roleCheck.isAdmin && !roleCheck.isSystemAdmin) {
      const accessibleOrgIds = roleCheck.organizationRoles.map(role => role.organizationId);

      query.containedIn('objectId', accessibleOrgIds);
    }

    const organizations = await query.find({ useMasterKey: true });

    return organizations.map(org => ({
      id: org.id,
      name: org.get('name'),
      description: org.get('description'),
      settings: org.get('settings'),
      quotas: org.get('quotas'),
      members: org.get('members'),
      status: org.get('status'),
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));
  } catch (error) {
    console.error('Error listing organizations:', error);
    throw error;
  }
};

const getOrganization = async request => {
  const { organizationId } = request.params;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    // Verify access to this organization
    if (
      !roleCheck.isAdmin &&
      !roleCheck.isSystemAdmin &&
      !roleCheck.organizationRoles.some(role => role.organizationId === organizationId)
    ) {
      throw new Error('Unauthorized access to organization');
    }

    const query = new Parse.Query('Organization');

    query.include('members');
    query.include('settings');
    query.include('quotas');
    const organization = await query.get(organizationId, { useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    return {
      id: organization.id,
      name: organization.get('name'),
      description: organization.get('description'),
      settings: organization.get('settings') || {
        enableNotifications: false,
        enableTwoFactorAuth: false,
        allowExternalIntegrations: false,
        auditLogging: false,
      },
      quotas: organization.get('quotas') || {
        maxStorageGB: 10,
        maxRequestsPerMinute: 1000,
        maxConcurrentConnections: 100,
        maxQueryTimeout: 30,
      },
      members: organization.get('members') || [],
      status: organization.get('status') || 'Active',
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  } catch (error) {
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    throw error;
  }
};

const updateOrganization = async request => {
  const { organizationId, name, description, settings, quotas } = request.params;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    // Verify admin access to this organization
    if (
      !roleCheck.isAdmin &&
      !roleCheck.isSystemAdmin &&
      !roleCheck.organizationRoles.some(
        role => role.organizationId === organizationId && role.role === 'admin'
      )
    ) {
      throw new Error('Unauthorized access to organization');
    }

    const query = new Parse.Query('Organization');
    const organization = await query.get(organizationId, { useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    organization.set('name', name);
    organization.set('description', description);
    organization.set('settings', settings);
    organization.set('quotas', quotas);

    await organization.save(null, { useMasterKey: true });

    return {
      id: organization.id,
      name: organization.get('name'),
      description: organization.get('description'),
      settings: organization.get('settings'),
      quotas: organization.get('quotas'),
      members: organization.get('members') || [],
      status: organization.get('status'),
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  } catch (error) {
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    throw error;
  }
};

const addOrganizationMember = async request => {
  const { organizationId, email, role } = request.params;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !email || !role) {
    throw new Error('Organization ID, email, and role are required');
  }

  try {
    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    // Verify admin access to this organization
    if (
      !roleCheck.isAdmin &&
      !roleCheck.isSystemAdmin &&
      !roleCheck.organizationRoles.some(
        role => role.organizationId === organizationId && role.role === 'admin'
      )
    ) {
      throw new Error('Unauthorized access to organization');
    }

    const query = new Parse.Query('Organization');
    const organization = await query.get(organizationId, { useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Find or create user
    const userQuery = new Parse.Query(Parse.User);

    userQuery.equalTo('email', email);
    let newUser = await userQuery.first({ useMasterKey: true });

    if (!newUser) {
      newUser = new Parse.User();
      newUser.set('username', email);
      newUser.set('email', email);
      newUser.set('password', Math.random().toString(36).slice(-8));
      await newUser.signUp(null, { useMasterKey: true });
    }

    // Add user to organization's members
    const members = organization.get('members') || [];

    // Check if user is already a member
    const existingMember = members.find(m => m.id === newUser.id);

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    members.push({
      id: newUser.id,
      email: newUser.get('email'),
      role,
      joinedAt: new Date(),
    });
    organization.set('members', members);

    // Create organization-specific role if it doesn't exist
    const roleQuery = new Parse.Query(Parse.Role);

    roleQuery.equalTo('name', `${organizationId}_${role}`);
    let orgRole = await roleQuery.first({ useMasterKey: true });

    if (!orgRole) {
      const roleACL = new Parse.ACL();

      roleACL.setPublicReadAccess(true);
      orgRole = new Parse.Role(`${organizationId}_${role}`, roleACL);
      await orgRole.save(null, { useMasterKey: true });
    }

    // Add user to role
    orgRole.getUsers().add(newUser);
    await orgRole.save(null, { useMasterKey: true });

    // Save organization
    await organization.save(null, { useMasterKey: true });

    return {
      id: newUser.id,
      email: newUser.get('email'),
      role,
      joinedAt: new Date(),
    };
  } catch (error) {
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    throw error;
  }
};

const removeOrganizationMember = async request => {
  const { organizationId, memberId } = request.params;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !memberId) {
    throw new Error('Organization ID and member ID are required');
  }

  try {
    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    // Verify admin access to this organization
    if (
      !roleCheck.isAdmin &&
      !roleCheck.isSystemAdmin &&
      !roleCheck.organizationRoles.some(
        role => role.organizationId === organizationId && role.role === 'admin'
      )
    ) {
      throw new Error('Unauthorized access to organization');
    }

    const query = new Parse.Query('Organization');
    const organization = await query.get(organizationId, { useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Remove member from organization's members array
    const members = organization.get('members') || [];
    const updatedMembers = members.filter(member => member.id !== memberId);

    if (members.length === updatedMembers.length) {
      throw new Error('Member not found in organization');
    }

    organization.set('members', updatedMembers);

    // Remove user from organization roles
    const roleQuery = new Parse.Query(Parse.Role);

    roleQuery.startsWith('name', organizationId);
    const roles = await roleQuery.find({ useMasterKey: true });

    const userQuery = new Parse.Query(Parse.User);
    const memberUser = await userQuery.get(memberId, { useMasterKey: true });

    if (memberUser) {
      for (const role of roles) {
        role.getUsers().remove(memberUser);
        await role.save(null, { useMasterKey: true });
      }
    }

    // Save organization
    await organization.save(null, { useMasterKey: true });

    return { success: true };
  } catch (error) {
    if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    throw error;
  }
};

const updateOrganizationSettings = async request => {
  const { organizationId, settings } = request.params;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Check user roles
    const roleCheck = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    if (!roleCheck.success) {
      throw new Error('Failed to verify user roles');
    }

    // Verify admin access to this organization
    if (
      !roleCheck.isAdmin &&
      !roleCheck.isSystemAdmin &&
      !roleCheck.organizationRoles.some(
        role => role.organizationId === organizationId && role.role === 'admin'
      )
    ) {
      throw new Error('Unauthorized access to organization');
    }

    // Get organization
    const organization = await new Parse.Query('Organization')
      .equalTo('objectId', organizationId)
      .first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Update settings
    organization.set('settings', {
      ...organization.get('settings'),
      ...settings,
    });

    await organization.save(null, { useMasterKey: true });

    // Log the change
    await OrganizationService.logActivity(
      organizationId,
      'settings_update',
      `Settings updated by ${user.get('email')}`,
      user
    );

    return organization;
  } catch (error) {
    console.error('Error updating organization settings:', error);
    throw error;
  }
};

module.exports = {
  listOrganizations,
  getOrganization,
  updateOrganization,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationSettings,
};
