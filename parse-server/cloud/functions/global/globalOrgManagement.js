module.exports = Parse => {
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

  const getAllOrganizations = async (request) => {
    const { user } = request;
    const { page = 1, limit = 20, searchQuery, status, sortBy = 'createdAt', sortOrder = 'desc' } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can access this function');
    }

    try {
      const Organization = Parse.Object.extend('Organization');
      const query = new Parse.Query(Organization);

      if (status && status !== 'all') {
        query.equalTo('status', status);
      }

      if (searchQuery) {
        const nameQuery = new Parse.Query(Organization);
        nameQuery.contains('name', searchQuery);
        
        const emailQuery = new Parse.Query(Organization);
        emailQuery.contains('contactEmail', searchQuery.toLowerCase());
        
        query._orQuery([nameQuery, emailQuery]);
      }

      query.include('owner');

      if (sortOrder === 'desc') {
        query.descending(sortBy);
      } else {
        query.ascending(sortBy);
      }

      query.limit(limit);
      query.skip((page - 1) * limit);

      const [organizations, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      const orgData = await Promise.all(organizations.map(async (org) => {
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('organization', org);
        roleQuery.equalTo('isActive', true);
        const userCount = await roleQuery.count({ useMasterKey: true });

        const InstalledApp = Parse.Object.extend('InstalledApp');
        const appQuery = new Parse.Query(InstalledApp);
        appQuery.equalTo('organization', org);
        appQuery.equalTo('status', 'active');
        const appCount = await appQuery.count({ useMasterKey: true });

        const OrgContract = Parse.Object.extend('OrgContract');
        const contractQuery = new Parse.Query(OrgContract);
        contractQuery.equalTo('organization', org);
        const contractCount = await contractQuery.count({ useMasterKey: true });

        return {
          id: org.id,
          name: org.get('name'),
          contactEmail: org.get('contactEmail'),
          contactPhone: org.get('contactPhone'),
          status: org.get('status'),
          planType: org.get('planType'),
          owner: org.get('owner') ? {
            id: org.get('owner').id,
            email: org.get('owner').get('email'),
            firstName: org.get('owner').get('firstName'),
            lastName: org.get('owner').get('lastName')
          } : null,
          settings: org.get('settings') || {},
          industry: org.get('industry'),
          companySize: org.get('companySize'),
          createdAt: org.get('createdAt'),
          updatedAt: org.get('updatedAt'),
          stats: {
            userCount,
            appCount,
            contractCount
          }
        };
      }));

      return {
        success: true,
        organizations: orgData,
        total,
        page, // Fix: Ensure comma is here
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get all organizations error:', error);
      throw error;
    }
  }; // Add semicolon here
 Parse.Cloud.define('getAllOrganizations', getAllOrganizations); // Moved define outside block

  const updateOrganization = withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { updates } = request.params;

    if (!updates) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Updates are required');
    }

    try {
      const allowedFields = ['name', 'contactEmail', 'contactPhone', 'status', 'planType', 'settings', 'industry', 'companySize'];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          organization.set(field, updates[field]);
        }
      });

      await organization.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'organization.updated_by_admin');
      log.set('targetType', 'Organization');
      log.set('targetId', organizationId);
      log.set('actor', user);
      log.set('details', {
        updates,
        previousStatus: organization.get('status') !== updates.status ? organization.get('status') : undefined
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Organization updated successfully',
        organization: {
          id: organization.id,
          ...updates
        }
      };

    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  }); // Add semicolon here
 Parse.Cloud.define('updateOrganization', updateOrganization); // Moved define outside block

  const toggleOrganizationStatus = withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { status, reason } = request.params;

    if (!status) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Status is required');
    }

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid status. Must be active, suspended, or inactive');
    }

    try {
      const previousStatus = organization.get('status');
      organization.set('status', status);
      
      if (status === 'suspended') {
        organization.set('suspendedAt', new Date());
        organization.set('suspensionReason', reason || 'Suspended by system administrator');
      } else if (status === 'active' && previousStatus === 'suspended') {
        organization.unset('suspendedAt');
        organization.unset('suspensionReason');
      }

      await organization.save(null, { useMasterKey: true });

      if (status === 'suspended') {
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('organization', organization);
        roleQuery.equalTo('isActive', true);
        const roles = await roleQuery.find({ useMasterKey: true });

        await Promise.all(roles.map(async (role) => {
          role.set('isActive', false);
          role.set('deactivatedAt', new Date());
          role.set('deactivationReason', 'Organization suspended');
          return role.save(null, { useMasterKey: true });
        }));
      }

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', `organization.${status === 'suspended' ? 'suspended' : 'activated'}`);
      log.set('targetType', 'Organization');
      log.set('targetId', organizationId);
      log.set('actor', user);
      log.set('details', {
        previousStatus,
        newStatus: status,
        reason
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: `Organization ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
        status
      };

    } catch (error) {
      console.error('Toggle organization status error:', error);
      throw error;
    }
  }); // Add semicolon here
 Parse.Cloud.define('toggleOrganizationStatus', toggleOrganizationStatus); // Moved define outside block

  const deleteOrganization = withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { hardDelete = false } = request.params;

    try {
      if (hardDelete) {
        await organization.destroy({ useMasterKey: true });
      } else {
        organization.set('status', 'deleted');
        organization.set('deletedAt', new Date());
        organization.set('deletedBy', user.id);
        await organization.save(null, { useMasterKey: true });
        
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('organization', organization);
        const roles = await roleQuery.find({ useMasterKey: true });

        await Promise.all(roles.map(async (role) => {
          role.set('isActive', false);
          role.set('deactivatedAt', new Date());
          role.set('deactivationReason', 'Organization deleted');
          return role.save(null, { useMasterKey: true });
        }));
      }

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', hardDelete ? 'organization.hard_deleted' : 'organization.soft_deleted');
      log.set('targetType', 'Organization');
      log.set('targetId', organizationId);
      log.set('actor', user);
      log.set('details', {
        organizationName: organization.get('name'),
        hardDelete
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: `Organization ${hardDelete ? 'permanently deleted' : 'deleted'} successfully`
      };

    } catch (error) {
      console.error('Delete organization error:', error);
      throw error;
    }
  }); // Add semicolon here
 Parse.Cloud.define('deleteOrganization', deleteOrganization); // Moved define outside block

  const getOrganizationStats = async (request) => {
    const { user } = request;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can view organization statistics');
    }

    try {
      const Organization = Parse.Object.extend('Organization');
      
      const statuses = ['active', 'suspended', 'inactive', 'deleted'];
      const statusCounts = await Promise.all(statuses.map(async (status) => {
        const query = new Parse.Query(Organization);
        query.equalTo('status', status);
        const count = await query.count({ useMasterKey: true });
        return { status, count };
      }));

      const planTypes = ['starter', 'professional', 'enterprise'];
      const planCounts = await Promise.all(planTypes.map(async (planType) => {
        const query = new Parse.Query(Organization);
        query.equalTo('planType', planType);
        query.equalTo('status', 'active');
        const count = await query.count({ useMasterKey: true });
        return { planType, count };
      }));

      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('isActive', true);
      const totalUsers = await roleQuery.count({ useMasterKey: true });

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
  }; // Add semicolon here
 Parse.Cloud.define('getOrganizationStats', getOrganizationStats); // Moved define outside block

  const createOrganizationByAdmin = async (request) => {
    const { user } = request;
    const { name, contactEmail, contactPhone, planType = 'starter', ownerEmail, ownerFirstName, ownerLastName, industry, companySize } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can create organizations');
    }

    if (!name || !contactEmail || !ownerEmail) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Organization name, contact email, and owner email are required');
    }

    try {
      const Organization = Parse.Object.extend('Organization');
      const existingQuery = new Parse.Query(Organization);
      existingQuery.equalTo('name', name);
      const existing = await existingQuery.first({ useMasterKey: true });

      if (existing) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'An organization with this name already exists');
      }

      let owner;
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('email', ownerEmail.toLowerCase());
      owner = await userQuery.first({ useMasterKey: true });

      if (!owner) {
        owner = new Parse.User();
        owner.set('username', ownerEmail.toLowerCase());
        owner.set('email', ownerEmail.toLowerCase());
        owner.set('password', Math.random().toString(36).slice(-8)); 
        owner.set('firstName', ownerFirstName || '');
        owner.set('lastName', ownerLastName || '');
        owner.set('requiresPasswordReset', true);
        
        await owner.save(null, { useMasterKey: true });
      }

      const org = new Organization();
      
      org.set('name', name);
      org.set('contactEmail', contactEmail);
      org.set('contactPhone', contactPhone || '');
      org.set('planType', planType);
      org.set('status', 'active');
      org.set('owner', owner);
      org.set('industry', industry || '');
      org.set('companySize', companySize || '');
      org.set('settings', {
        createdByAdmin: true,
        createdBy: user.id
      });

      await org.save(null, { useMasterKey: true });

      const OrgRole = Parse.Object.extend('OrgRole');
      const role = new OrgRole();
      
      role.set('user', owner);
      role.set('organization', org);
      role.set('role', 'admin');
      role.set('isActive', true);
      role.set('assignedAt', new Date());
      role.set('assignedBy', user.id);

      await role.save(null, { useMasterKey: true });

      const roleName = `org_${org.id}_admin`;
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true);
      roleACL.setPublicWriteAccess(false);
      
      const parseRole = new Parse.Role(roleName, roleACL);
      parseRole.getUsers().add(owner);
      await parseRole.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'organization.created_by_admin');
      log.set('targetType', 'Organization');
      log.set('targetId', org.id);
      log.set('actor', user);
      log.set('details', {
        organizationName: name,
        ownerEmail,
        planType
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Organization created successfully',
        organizationId: org.id,
        ownerId: owner.id
      };

    } catch (error) {
      console.error('Create organization by admin error:', error);
      throw error;
    }
  }; // Add semicolon here
 Parse.Cloud.define('createOrganizationByAdmin', createOrganizationByAdmin); // Moved define outside block
};