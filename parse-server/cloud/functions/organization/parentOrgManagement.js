// Cloud functions for Parent Organization Management
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Get parent organization
Parse.Cloud.define('getParentOrganization', async (request) => {
  const { user } = request;

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    // Check if parent org exists
    const Organization = Parse.Object.extend('Organization');
    const parentQuery = new Parse.Query(Organization);
    parentQuery.equalTo('isParentOrg', true);
    const parentOrg = await parentQuery.first({ useMasterKey: true });

    if (parentOrg) {
      return {
        success: true,
        parentOrg: {
          objectId: parentOrg.id,
          name: parentOrg.get('name'),
          contactEmail: parentOrg.get('contactEmail'),
          contactPhone: parentOrg.get('contactPhone'),
          isParentOrg: true,
          status: parentOrg.get('status'),
          settings: parentOrg.get('settings'),
          createdAt: parentOrg.get('createdAt'),
          updatedAt: parentOrg.get('updatedAt')
        }
      };
    } else {
      return {
        success: true,
        parentOrg: null
      };
    }
  } catch (error) {
    console.error('Error fetching parent organization:', error);
    throw new Error('Failed to fetch parent organization');
  }
});

// Initialize platform with parent organization
Parse.Cloud.define('initializeParentOrganization', async (request) => {
  const { user } = request;
  const { name, contactEmail, contactPhone, adminEmail, adminFirstName, adminLastName } = request.params;

  if (!user || user.get('isSystemAdmin') !== true) { // Explicit check for system admin as this is a system-level function
    throw new Error('Only system administrators can initialize the parent organization');
  }

  try {
    // Check if parent org already exists
    const Organization = Parse.Object.extend('Organization');
    const parentQuery = new Parse.Query(Organization);
    parentQuery.equalTo('isParentOrg', true);
    const existingParent = await parentQuery.first({ useMasterKey: true });

    if (existingParent) {
      throw new Error('Parent organization already exists');
    }

    // Create parent organization
    const parentOrg = new Organization();
    parentOrg.set('name', name);
    parentOrg.set('contactEmail', contactEmail);
    parentOrg.set('contactPhone', contactPhone || '');
    parentOrg.set('isParentOrg', true);
    parentOrg.set('status', 'active');
    parentOrg.set('planType', 'enterprise');
    parentOrg.set('settings', {
      allowChildOrgs: true,
      maxChildOrgs: -1, // unlimited
      features: {
        marketingCMS: true,
        signupManagement: true,
        orgLifecycleManagement: true,
        advancedAnalytics: true
      }
    });

    await parentOrg.save(null, { useMasterKey: true });

    // Create or update admin user
    let adminUser;
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', adminEmail.toLowerCase());
    adminUser = await userQuery.first({ useMasterKey: true });

    if (!adminUser) {
      adminUser = new Parse.User();
      adminUser.set('username', adminEmail.toLowerCase());
      adminUser.set('email', adminEmail.toLowerCase());
      adminUser.set('password', Math.random().toString(36).slice(-12)); // Temp password
      adminUser.set('firstName', adminFirstName);
      adminUser.set('lastName', adminLastName);
      adminUser.set('requiresPasswordReset', true);
      adminUser.set('isSystemAdmin', true);
      
      await adminUser.save(null, { useMasterKey: true });
    }

    // Set as parent org owner
    parentOrg.set('owner', adminUser);
    await parentOrg.save(null, { useMasterKey: true });

    // Create admin role for parent org
    const OrgRole = Parse.Object.extend('OrgRole');
    const adminRole = new OrgRole();
    
    adminRole.set('user', adminUser);
    adminRole.set('organization', parentOrg);
    adminRole.set('role', 'admin');
    adminRole.set('isActive', true);
    adminRole.set('assignedAt', new Date());
    adminRole.set('assignedBy', user.id);

    await adminRole.save(null, { useMasterKey: true });

    // Create Parse role
    const roleName = `org_${parentOrg.id}_admin`;
    const roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true);
    roleACL.setPublicWriteAccess(false);
    
    const parseRole = new Parse.Role(roleName, roleACL);
    parseRole.getUsers().add(adminUser);
    await parseRole.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'parent_org.initialized');
    log.set('targetType', 'Organization');
    log.set('targetId', parentOrg.id);
    log.set('actor', user);
    log.set('details', {
      organizationName: name,
      adminEmail
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Parent organization initialized successfully',
      organizationId: parentOrg.id,
      adminUserId: adminUser.id
    };

  } catch (error) {
    console.error('Initialize parent org error:', error);
    throw error;
  }
});

// Create child organization
Parse.Cloud.define('createChildOrganization', async (request) => {
  const { user } = request;
  const { 
    name, 
    contactEmail, 
    contactPhone, 
    planType = 'starter',
    ownerEmail,
    ownerFirstName,
    ownerLastName,
    industry,
    companySize,
    parentOrgId
  } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Verify user has access to parent org
    const Organization = Parse.Object.extend('Organization');
    let parentOrg;
    
    if (parentOrgId) {
      const parentQuery = new Parse.Query(Organization);
      parentOrg = await parentQuery.get(parentOrgId, { useMasterKey: true });
      
      if (!parentOrg) {
        throw new Error('Parent organization not found');
      }
    } else {
      // Get default parent org
      const parentQuery = new Parse.Query(Organization);
      parentQuery.equalTo('isParentOrg', true);
      parentOrg = await parentQuery.first({ useMasterKey: true });
      
      if (!parentOrg) {
        throw new Error('No parent organization found');
      }
    }

    // Check permissions
    const hasAccess = user.get('isSystemAdmin') || await checkOrgAccess(user, parentOrg, 'admin');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to create child organizations');
    }

    // Check child org limits
    const settings = parentOrg.get('settings') || {};
    if (settings.maxChildOrgs && settings.maxChildOrgs > 0) {
      const childQuery = new Parse.Query(Organization);
      childQuery.equalTo('parentOrg', parentOrg);
      const childCount = await childQuery.count({ useMasterKey: true });
      
      if (childCount >= settings.maxChildOrgs) {
        throw new Error(`Maximum child organizations limit (${settings.maxChildOrgs}) reached`);
      }
    }

    // Create owner user if doesn't exist
    let owner;
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', ownerEmail.toLowerCase());
    owner = await userQuery.first({ useMasterKey: true });

    if (!owner) {
      owner = new Parse.User();
      owner.set('username', ownerEmail.toLowerCase());
      owner.set('email', ownerEmail.toLowerCase());
      owner.set('password', Math.random().toString(36).slice(-8)); // Temp password
      owner.set('firstName', ownerFirstName || '');
      owner.set('lastName', ownerLastName || '');
      owner.set('requiresPasswordReset', true);
      
      await owner.save(null, { useMasterKey: true });
    }

    // Create child organization
    const childOrg = new Organization();
    
    childOrg.set('name', name);
    childOrg.set('contactEmail', contactEmail);
    childOrg.set('contactPhone', contactPhone || '');
    childOrg.set('planType', planType);
    childOrg.set('status', 'active');
    childOrg.set('owner', owner);
    childOrg.set('parentOrg', parentOrg);
    childOrg.set('industry', industry || '');
    childOrg.set('companySize', companySize || '');
    childOrg.set('settings', {
      createdBy: user.id,
      createdFrom: 'parent_org'
    });

    await childOrg.save(null, { useMasterKey: true });

    // Create owner role
    const OrgRole = Parse.Object.extend('OrgRole');
    const ownerRole = new OrgRole();
    
    ownerRole.set('user', owner);
    ownerRole.set('organization', childOrg);
    ownerRole.set('role', 'admin');
    ownerRole.set('isActive', true);
    ownerRole.set('assignedAt', new Date());
    ownerRole.set('assignedBy', user.id);

    await ownerRole.save(null, { useMasterKey: true });

    // Create Parse role
    const roleName = `org_${childOrg.id}_admin`;
    const roleACL = new Parse.ACL();
    roleACL.setPublicReadAccess(true);
    roleACL.setPublicWriteAccess(false);
    
    const parseRole = new Parse.Role(roleName, roleACL);
    parseRole.getUsers().add(owner);
    await parseRole.save(null, { useMasterKey: true });

    // TODO: Send welcome email

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'child_org.created');
    log.set('targetType', 'Organization');
    log.set('targetId', childOrg.id);
    log.set('actor', user);
    log.set('organizationId', parentOrg.id);
    log.set('details', {
      childOrgName: name,
      ownerEmail,
      planType
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Child organization created successfully',
      organizationId: childOrg.id,
      ownerId: owner.id
    };

  } catch (error) {
    console.error('Create child org error:', error);
    throw error;
  }
});

// Get child organizations
Parse.Cloud.define('getChildOrganizations', async (request) => {
  const { user } = request;
  const { parentOrgId, page = 1, limit = 20, status, searchQuery } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const Organization = Parse.Object.extend('Organization');
    let parentOrg;
    
    if (parentOrgId) {
      const parentQuery = new Parse.Query(Organization);
      parentOrg = await parentQuery.get(parentOrgId, { useMasterKey: true });
    } else {
      // Get default parent org
      const parentQuery = new Parse.Query(Organization);
      parentQuery.equalTo('isParentOrg', true);
      parentOrg = await parentQuery.first({ useMasterKey: true });
    }

    if (!parentOrg) {
      throw new Error('Parent organization not found');
    }

    // Check permissions
    const hasAccess = user.get('isSystemAdmin') || await checkOrgAccess(user, parentOrg, 'member');
    if (!hasAccess) {
      throw new Error('Insufficient permissions to view child organizations');
    }

    // Query child organizations
    const childQuery = new Parse.Query(Organization);
    childQuery.equalTo('parentOrg', parentOrg);
    
    if (status) {
      childQuery.equalTo('status', status);
    }

    if (searchQuery) {
      const nameQuery = new Parse.Query(Organization);
      nameQuery.contains('name', searchQuery);
      
      const emailQuery = new Parse.Query(Organization);
      emailQuery.contains('contactEmail', searchQuery.toLowerCase());
      
      childQuery._orQuery([nameQuery, emailQuery]);
    }

    childQuery.include('owner');
    childQuery.descending('createdAt');
    childQuery.limit(limit);
    childQuery.skip((page - 1) * limit);

    const [children, total] = await Promise.all([
      childQuery.find({ useMasterKey: true }),
      childQuery.count({ useMasterKey: true })
    ]);

    // Get additional stats for each child org
    const childData = await Promise.all(children.map(async (child) => {
      // Get user count
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('organization', child);
      roleQuery.equalTo('isActive', true);
      const userCount = await roleQuery.count({ useMasterKey: true });

      return {
        id: child.id,
        name: child.get('name'),
        contactEmail: child.get('contactEmail'),
        contactPhone: child.get('contactPhone'),
        status: child.get('status'),
        planType: child.get('planType'),
        owner: child.get('owner') ? {
          id: child.get('owner').id,
          email: child.get('owner').get('email'),
          firstName: child.get('owner').get('firstName'),
          lastName: child.get('owner').get('lastName')
        } : null,
        industry: child.get('industry'),
        companySize: child.get('companySize'),
        createdAt: child.get('createdAt'),
        updatedAt: child.get('updatedAt'),
        stats: {
          userCount
        }
      };
    }));

    return {
      success: true,
      parentOrg: {
        id: parentOrg.id,
        name: parentOrg.get('name')
      },
      children: childData,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };

  } catch (error) {
    console.error('Get child orgs error:', error);
    throw error;
  }
});

// Transfer organization ownership
Parse.Cloud.define('transferOrganizationOwnership', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { newOwnerEmail } = request.params;

  if (!newOwnerEmail) {
    throw new Error('New owner email is required');
  }

  try {
    // organization and organizationId are provided by the middleware
    // No need to fetch organization again, it's in `request.organization`

    // Find new owner
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', newOwnerEmail.toLowerCase());
    const newOwner = await userQuery.first({ useMasterKey: true });

    if (!newOwner) {
      throw new Error('New owner user not found');
    }

    const oldOwner = organization.get('owner');

    // Update organization
    organization.set('owner', newOwner);
    await organization.save(null, { useMasterKey: true });

    // Ensure new owner has admin role
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', newOwner);
    roleQuery.equalTo('organization', organization);
    let newOwnerRole = await roleQuery.first({ useMasterKey: true });

    if (!newOwnerRole) {
      newOwnerRole = new OrgRole();
      newOwnerRole.set('user', newOwner);
      newOwnerRole.set('organization', organization);
    }

    newOwnerRole.set('role', 'admin');
    newOwnerRole.set('isActive', true);
    newOwnerRole.set('assignedAt', new Date());
    newOwnerRole.set('assignedBy', user.id);
    
    await newOwnerRole.save(null, { useMasterKey: true });

    // Add to admin Parse role
    const roleName = `org_${organization.id}_admin`;
    const roleQuery2 = new Parse.Query(Parse.Role);
    roleQuery2.equalTo('name', roleName);
    const parseRole = await roleQuery2.first({ useMasterKey: true });

    if (parseRole) {
      parseRole.getUsers().add(newOwner);
      await parseRole.save(null, { useMasterKey: true });
    }

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'organization.ownership_transferred');
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('details', {
      oldOwnerEmail: oldOwner ? oldOwner.get('email') : null,
      newOwnerEmail: newOwner.get('email')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Organization ownership transferred successfully'
    };

  } catch (error) {
    console.error('Transfer ownership error:', error);
    throw error;
  }
}));

// Organization lifecycle management
Parse.Cloud.define('updateOrganizationLifecycle', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { action, reason } = request.params;

  const validActions = ['activate', 'suspend', 'archive', 'reactivate'];
  if (!validActions.includes(action)) {
    throw new Error('Invalid lifecycle action');
  }

  try {
    // organization and organizationId are provided by the middleware
    // No need to fetch organization again, it's in `request.organization`

    const previousStatus = organization.get('status');
    let newStatus;

    switch (action) {
      case 'activate':
        newStatus = 'active';
        break;
      case 'suspend':
        newStatus = 'suspended';
        organization.set('suspendedAt', new Date());
        organization.set('suspensionReason', reason || 'Suspended by parent organization');
        break;
      case 'archive':
        newStatus = 'archived';
        organization.set('archivedAt', new Date());
        organization.set('archiveReason', reason || 'Archived by parent organization');
        break;
      case 'reactivate':
        newStatus = 'active';
        organization.unset('suspendedAt');
        organization.unset('suspensionReason');
        organization.unset('archivedAt');
        organization.unset('archiveReason');
        break;
    }

    organization.set('status', newStatus);
    await organization.save(null, { useMasterKey: true });

    // Handle user access based on status
    if (['suspended', 'archived'].includes(newStatus)) {
      // Deactivate all org roles
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('organization', organization);
      roleQuery.equalTo('isActive', true);
      const roles = await roleQuery.find({ useMasterKey: true });

      await Promise.all(roles.map(async (role) => {
        role.set('isActive', false);
        role.set('deactivatedAt', new Date());
        role.set('deactivationReason', `Organization ${newStatus}`);
        return role.save(null, { useMasterKey: true });
      }));
    } else if (newStatus === 'active' && previousStatus !== 'active') {
      // Reactivate roles for active users
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('organization', organization);
      roleQuery.equalTo('deactivationReason', `Organization ${previousStatus}`);
      const roles = await roleQuery.find({ useMasterKey: true });

      await Promise.all(roles.map(async (role) => {
        role.set('isActive', true);
        role.unset('deactivatedAt');
        role.unset('deactivationReason');
        return role.save(null, { useMasterKey: true });
      }));
    }

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', `organization.lifecycle.${action}`);
    log.set('targetType', 'Organization');
    log.set('targetId', organizationId);
    log.set('actor', user);
    log.set('organizationId', organizationId); // Use organizationId from middleware
    log.set('details', {
      previousStatus,
      newStatus,
      reason
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `Organization ${action} successful`,
      status: newStatus
    };

  } catch (error) {
    console.error('Update lifecycle error:', error);
    throw error;
  }
}));

// Helper function to check org access
async function checkOrgAccess(user, organization, requiredRole = 'member') {
  if (!user || !organization) return false;

  const OrgRole = Parse.Object.extend('OrgRole');
  const roleQuery = new Parse.Query(OrgRole);
  roleQuery.equalTo('user', user);
  roleQuery.equalTo('organization', organization);
  roleQuery.equalTo('isActive', true);
  
  const userRole = await roleQuery.first({ useMasterKey: true });
  if (!userRole) return false;

  const roleHierarchy = ['member', 'admin'];
  const userRoleIndex = roleHierarchy.indexOf(userRole.get('role'));
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}

module.exports = {};