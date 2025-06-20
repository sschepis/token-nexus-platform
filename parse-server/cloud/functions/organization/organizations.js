// Cloud functions for organization management

const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Create organization (System Admin only)
Parse.Cloud.define('createOrganization', async (request) => {
  const { user } = request;
  const { name, ownerEmail, planType = 'starter' } = request.params;

  if (!user || !user.get('isAdmin')) {
    throw new Error('Only system administrators can create organizations');
  }

  if (!name || !ownerEmail) {
    throw new Error('Organization name and owner email are required');
  }

  try {
    // First, check if user with email exists
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', ownerEmail);
    let owner = await userQuery.first({ useMasterKey: true });

    // If user doesn't exist, create a new user
    if (!owner) {
      owner = new Parse.User();
      owner.set('username', ownerEmail);
      owner.set('email', ownerEmail);
      owner.set('password', Math.random().toString(36).slice(-8)); // Temporary password
      owner.set('requiresPasswordReset', true);
      await owner.save(null, { useMasterKey: true });
    }

    // Create the organization
    const Organization = Parse.Object.extend('Organization');
    const org = new Organization();
    
    org.set('name', name);
    org.set('planType', planType);
    org.set('status', 'active');
    org.set('administrator', owner);
    org.set('createdBy', user);
    org.set('memberCount', 1);
    org.set('metadata', {
      createdBySystemAdmin: true,
      createdAt: new Date().toISOString()
    });

    // Set ACL
    const orgACL = new Parse.ACL();
    orgACL.setPublicReadAccess(false);
    orgACL.setPublicWriteAccess(false);
    orgACL.setReadAccess(owner, true);
    orgACL.setWriteAccess(owner, true);
    orgACL.setRoleReadAccess('SystemAdmin', true);
    orgACL.setRoleWriteAccess('SystemAdmin', true);
    org.setACL(orgACL);

    const savedOrg = await org.save(null, { useMasterKey: true });

    // Create OrgRole for the owner
    const OrgRole = Parse.Object.extend('OrgRole');
    const adminRole = new OrgRole();
    
    adminRole.set('organization', savedOrg);
    adminRole.set('user', owner);
    adminRole.set('role', 'admin');
    adminRole.set('isActive', true);
    adminRole.set('assignedBy', user);
    adminRole.set('assignedAt', new Date());
    
    await adminRole.save(null, { useMasterKey: true });

    // Update owner with organization reference
    owner.set('currentOrganization', savedOrg);
    owner.addUnique('organizations', savedOrg);
    await owner.save(null, { useMasterKey: true });

    return {
      success: true,
      organizationId: savedOrg.id,
      ownerId: owner.id,
      message: 'Organization created successfully'
    };

  } catch (error) {
    console.error('Create organization error:', error);
    throw error;
  }
});

// Suspend organization
Parse.Cloud.define('suspendOrganization', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request;
  const { reason } = request.params; // orgId is now taken from middleware

  if (!user || !user.get('isAdmin')) {
    throw new Error('Only system administrators can suspend organizations');
  }

  // organization and organizationId are guaranteed by the middleware
  // No need for 'if (!orgId) throw new Error(...)'

  try {
    // organization object already fetched and validated by the middleware
    if (!organization) { // Should not happen if middleware functions correctly
      throw new Error('Organization not found through middleware');
    }

    if (organization.get('status') === 'suspended') {
      throw new Error('Organization is already suspended');
    }

    // Update organization status
    organization.set('status', 'suspended');
    organization.set('suspendedAt', new Date());
    organization.set('suspendedBy', user);
    organization.set('suspensionReason', reason || 'No reason provided');
    await organization.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.suspended');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('details', {
      organizationName: organization.get('name'),
      reason: reason || 'No reason provided'
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization suspended successfully'
    };

  } catch (error) {
    console.error('Suspend organization error:', error);
    throw error;
  }
}));

// Activate organization
Parse.Cloud.define('activateOrganization', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request;
  // orgId is now taken from middleware

  if (!user || !user.get('isAdmin')) {
    throw new Error('Only system administrators can activate organizations');
  }

  try {
    // organization object already fetched and validated by the middleware
    if (!organization) { // Should not happen if middleware functions correctly
      throw new Error('Organization not found through middleware');
    }

    if (organization.get('status') === 'active') {
      throw new Error('Organization is already active');
    }

    // Update organization status
    organization.set('status', 'active');
    organization.set('activatedAt', new Date());
    organization.set('activatedBy', user);
    organization.unset('suspendedAt');
    organization.unset('suspendedBy');
    organization.unset('suspensionReason');
    await organization.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.activated');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('details', {
      organizationName: organization.get('name')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization activated successfully'
    };

  } catch (error) {
    console.error('Activate organization error:', error);
    throw error;
  }
}));

// List organizations for admin
Parse.Cloud.define('listOrganizationsForAdmin', async (request) => {
  const { user } = request;
  const { 
    filterParams = {}, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = request.params;

  if (!user || (!user.get('isAdmin') && !user.get('isSystemAdmin'))) {
    throw new Error('Only system administrators can list all organizations');
  }

  try {
    const Organization = Parse.Object.extend('Organization');
    const query = new Parse.Query(Organization);

    // Apply filters
    if (filterParams.status) {
      query.equalTo('status', filterParams.status);
    }
    
    if (filterParams.planType) {
      query.equalTo('planType', filterParams.planType);
    }
    
    if (filterParams.search) {
      query.matches('name', filterParams.search, 'i');
    }

    // Include related data
    query.include('administrator');
    
    // Apply sorting
    if (sortOrder === 'asc') {
      query.ascending(sortBy);
    } else {
      query.descending(sortBy);
    }

    // Apply pagination
    query.limit(limit);
    query.skip((page - 1) * limit);

    const organizations = await query.find({ useMasterKey: true });
    const count = await query.count({ useMasterKey: true });

    // Get member counts for each organization
    const orgIds = organizations.map(org => org.id);
    const OrgRole = Parse.Object.extend('OrgRole');
    const memberQuery = new Parse.Query(OrgRole);
    memberQuery.containedIn('organization', organizations);
    memberQuery.equalTo('isActive', true);
    memberQuery.select(['organization']);
    
    const memberRoles = await memberQuery.find({ useMasterKey: true });
    
    // Count members per org
    const memberCounts = {};
    memberRoles.forEach(role => {
      const orgId = role.get('organization').id;
      memberCounts[orgId] = (memberCounts[orgId] || 0) + 1;
    });

    const results = organizations.map(org => {
      const admin = org.get('administrator');
      
      return {
        id: org.id,
        name: org.get('name'),
        contactEmail: org.get('contactEmail') || org.get('email') || '',
        contactPhone: org.get('contactPhone') || org.get('phone'),
        status: org.get('status'),
        planType: org.get('planType'),
        owner: admin ? {
          id: admin.id,
          email: admin.get('email'),
          firstName: admin.get('firstName') || '',
          lastName: admin.get('lastName') || ''
        } : null,
        settings: org.get('settings') || {},
        industry: org.get('industry'),
        companySize: org.get('companySize'),
        createdAt: org.get('createdAt'),
        updatedAt: org.get('updatedAt'),
        stats: {
          userCount: memberCounts[org.id] || 0,
          appCount: 0, // TODO: Implement app count query
          contractCount: 0 // TODO: Implement contract count query
        }
      };
    });

    return {
      success: true,
      data: {
        organizations: results,
        totalPages: Math.ceil(count / limit)
      },
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };

  } catch (error) {
    console.error('List organizations error:', error);
    throw error;
  }
});

// Get organization details for admin
Parse.Cloud.define('getOrganizationDetailsAdmin', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request;
  // orgId handled by middleware

  if (!user || (!user.get('isAdmin') && !user.get('isSystemAdmin'))) {
    throw new Error('Only system administrators can view organization details');
  }

  try {
    // organization object already fetched and validated by the middleware
    if (!organization) { // Should not happen if middleware functions correctly
      throw new Error('Organization not found through middleware');
    }

    // Get member list
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('organization', organization); // Changed org to organization
    roleQuery.include('user');
    roleQuery.descending('createdAt');
    const roles = await roleQuery.find({ useMasterKey: true });

    const members = roles.map(role => ({
      id: role.get('user').id,
      email: role.get('user').get('email'),
      name: `${role.get('user').get('firstName') || ''} ${role.get('user').get('lastName') || ''}`.trim(),
      role: role.get('role'),
      isActive: role.get('isActive'),
      joinedAt: role.get('assignedAt')
    }));

    // Get app installations
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const appQuery = new Parse.Query(OrgAppInstallation);
    appQuery.equalTo('organization', organization); // Changed org to organization
    appQuery.include('appDefinition');
    appQuery.include('installedVersion');
    const installations = await appQuery.find({ useMasterKey: true });

    const apps = installations.map(inst => ({
      id: inst.id,
      appName: inst.get('appDefinition')?.get('name'),
      version: inst.get('installedVersion')?.get('version'),
      status: inst.get('status'),
      installedAt: inst.get('installationDate')
    }));

    const admin = organization.get('administrator'); // Changed org to organization
    const createdBy = organization.get('createdBy'); // Changed org to organization

    return {
      success: true,
      organization: {
        id: organization.id, // Changed org to organization
        name: organization.get('name'), // Changed org to organization
        status: organization.get('status'), // Changed org to organization
        planType: organization.get('planType'), // Changed org to organization
        administrator: admin ? {
          id: admin.id,
          email: admin.get('email'),
          name: `${admin.get('firstName') || ''} ${admin.get('lastName') || ''}`.trim()
        } : null,
        createdBy: createdBy ? {
          id: createdBy.id,
          email: createdBy.get('email'),
          name: `${createdBy.get('firstName') || ''} ${createdBy.get('lastName') || ''}`.trim()
        } : null,
        createdAt: organization.get('createdAt'), // Changed org to organization
        suspendedAt: organization.get('suspendedAt'), // Changed org to organization
        suspendedBy: organization.get('suspendedBy'), // Changed org to organization
        suspensionReason: organization.get('suspensionReason'), // Changed org to organization
        metadata: organization.get('metadata'), // Changed org to organization
        members: members,
        installedApps: apps
      }
    };

  } catch (error) {
    console.error('Get organization details error:', error);
    throw error;
  }
}));

// Update organization plan
Parse.Cloud.define('updateOrganizationPlan', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request;
  const { planType } = request.params; // orgId is now handled by middleware

  if (!user || !user.get('isAdmin')) {
    throw new Error('Only system administrators can update organization plans');
  }

  if (!planType) { // No need to check for organizationId as middleware handles it
    throw new Error('Plan type is required');
  }

  const validPlans = ['starter', 'professional', 'enterprise'];
  if (!validPlans.includes(planType)) {
    throw new Error('Invalid plan type');
  }

  try {
    // organization object already fetched and validated by the middleware
    if (!organization) { // Should not happen if middleware functions correctly
      throw new Error('Organization not found through middleware');
    }

    const oldPlan = organization.get('planType');
    organization.set('planType', planType);
    organization.set('planUpdatedAt', new Date());
    organization.set('planUpdatedBy', user);
    await organization.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.plan_updated');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('details', {
      organizationName: organization.get('name'),
      oldPlan: oldPlan,
      newPlan: planType
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization plan updated successfully'
    };

  } catch (error) {
    console.error('Update organization plan error:', error);
    throw error;
  }
}));

// Get user details with organizations
Parse.Cloud.define('getUserDetails', async (request) => {
  const { user } = request;
  const { userId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  const targetUserId = userId || user.id;

  // Check if user can access this info
  if (targetUserId !== user.id && !user.get('isAdmin')) {
    throw new Error('Permission denied to access user details');
  }

  try {
    const targetUser = await new Parse.Query(Parse.User).get(targetUserId, { useMasterKey: true });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Get user's organization roles
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', targetUser);
    roleQuery.equalTo('isActive', true);
    roleQuery.include('organization');
    
    const orgRoles = await roleQuery.find({ useMasterKey: true });
    
    const organizations = orgRoles.map(role => {
      const org = role.get('organization');
      return {
        id: org.id,
        name: org.get('name'),
        role: role.get('role'),
        status: org.get('status'),
        planType: org.get('planType')
      };
    });

    // Get current organization if set
    let currentOrganization = null;
    
    // First try currentOrganizationId (preferred)
    const currentOrgId = targetUser.get('currentOrganizationId');
    if (currentOrgId) {
      // Find the organization in the user's organizations
      const matchingOrg = organizations.find(org => org.id === currentOrgId);
      if (matchingOrg) {
        currentOrganization = matchingOrg;
      }
    }
    
    // Fallback to currentOrganization pointer for backward compatibility
    if (!currentOrganization) {
      const currentOrgPointer = targetUser.get('currentOrganization');
      if (currentOrgPointer) {
        try {
          const currentOrg = await currentOrgPointer.fetch({ useMasterKey: true });
          currentOrganization = {
            id: currentOrg.id,
            name: currentOrg.get('name'),
            status: currentOrg.get('status'),
            planType: currentOrg.get('planType')
          };
        } catch (error) {
          console.warn('Failed to fetch current organization:', error);
        }
      }
    }

    // If no current organization is set but user has organizations, set the first one as current
    if (!currentOrganization && organizations.length > 0) {
      currentOrganization = {
        id: organizations[0].id,
        name: organizations[0].name,
        status: organizations[0].status,
        planType: organizations[0].planType
      };
    }

    return {
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.get('email'),
        firstName: targetUser.get('firstName'),
        lastName: targetUser.get('lastName'),
        isActive: targetUser.get('isActive'),
        isSystemAdmin: targetUser.get('isAdmin'),
        createdAt: targetUser.get('createdAt'),
        lastLogin: targetUser.get('lastLogin'),
        currentOrganizationId: currentOrganization?.id || null
      },
      organizations: organizations,
      currentOrganization: currentOrganization
    };

  } catch (error) {
    console.error('Get user details error:', error);
    throw error;
  }
});

// Get organization statistics for admin
Parse.Cloud.define('getOrganizationStats', async (request) => {
  const { user } = request;

  if (!user || !user.get('isAdmin')) {
    throw new Error('Only system administrators can view organization statistics');
  }

  try {
    const Organization = Parse.Object.extend('Organization');
    
    // Get status counts
    const statuses = ['active', 'suspended', 'inactive', 'deleted'];
    const statusCounts = await Promise.all(statuses.map(async (status) => {
      const query = new Parse.Query(Organization);
      query.equalTo('status', status);
      const count = await query.count({ useMasterKey: true });
      return { status, count };
    }));

    // Get plan type counts
    const planTypes = ['starter', 'professional', 'enterprise'];
    const planCounts = await Promise.all(planTypes.map(async (planType) => {
      const query = new Parse.Query(Organization);
      query.equalTo('planType', planType);
      query.equalTo('status', 'active');
      const count = await query.count({ useMasterKey: true });
      return { planType, count };
    }));

    // Get total users count
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('isActive', true);
    const totalUsers = await roleQuery.count({ useMasterKey: true });

    // Get new organizations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newOrgQuery = new Parse.Query(Organization);
    newOrgQuery.greaterThanOrEqualTo('createdAt', startOfMonth);
    const newOrgsThisMonth = await newOrgQuery.count({ useMasterKey: true });

    return {
      success: true,
      stats: {
        statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
        planCounts: Object.fromEntries(planCounts.map(p => [p.planType, p.count])),
        totalOrganizations: statusCounts.reduce((sum, s) => sum + s.count, 0),
        totalActiveOrganizations: statusCounts.find(s => s.status === 'active')?.count || 0,
        totalUsers,
        newOrgsThisMonth
      }
    };

  } catch (error) {
    console.error('Get organization stats error:', error);
    throw error;
  }
});


module.exports = {};