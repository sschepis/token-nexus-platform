module.exports = Parse => {
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware'); // Corrected path, now inside the wrapper

  // Get all users with detailed info
  Parse.Cloud.define('getAllUsers', withOrganizationContext(async (request) => {
    const { user, organizationId } = request;
    const { page = 1, limit = 20, searchQuery, status, sortBy = 'createdAt', sortOrder = 'desc' } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can access this function');
    }

    try {
      const query = new Parse.Query(Parse.User);

      if (searchQuery) {
        const emailQuery = new Parse.Query(Parse.User);
        emailQuery.contains('email', searchQuery.toLowerCase());
        
        const firstNameQuery = new Parse.Query(Parse.User);
        firstNameQuery.contains('firstName', searchQuery);
        
        const lastNameQuery = new Parse.Query(Parse.User);
        lastNameQuery.contains('lastName', searchQuery);
        
        query._orQuery([emailQuery, firstNameQuery, lastNameQuery]);
      }

      if (status === 'active') {
        query.notEqualTo('isInactive', true);
      } else if (status === 'inactive') {
        query.equalTo('isInactive', true);
      }

      if (sortOrder === 'desc') {
        query.descending(sortBy);
      } else {
        query.ascending(sortBy);
      }

      query.limit(limit);
      query.skip((page - 1) * limit);

      const [users, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      const userData = await Promise.all(users.map(async (user) => {
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', user);
        roleQuery.include('organization');
        
        if (organizationId || request.params.organizationId) {
          const targetOrgId = organizationId || request.params.organizationId;
          roleQuery.equalTo('organization', {
            __type: 'Pointer',
            className: 'Organization',
            objectId: targetOrgId
          });
        }
        
        const orgRoles = await roleQuery.find({ useMasterKey: true });

        const Token = Parse.Object.extend('Token');
        const tokenQuery = new Parse.Query(Token);
        tokenQuery.equalTo('creator', user);
        const tokenCount = await tokenQuery.count({ useMasterKey: true });

        const sessionQuery = new Parse.Query(Parse.Session);
        sessionQuery.equalTo('user', user);
        sessionQuery.descending('createdAt');
        sessionQuery.limit(1);
        const lastSession = await sessionQuery.first({ useMasterKey: true });

        return {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
          firstName: user.get('firstName'),
          lastName: user.get('lastName'),
          isSystemAdmin: user.get('isSystemAdmin') || false,
          isInactive: user.get('isInactive') || false,
          emailVerified: user.get('emailVerified') || false,
          createdAt: user.get('createdAt'),
          updatedAt: user.get('updatedAt'),
          lastLogin: lastSession ? lastSession.get('createdAt') : null,
          organizations: orgRoles.map(role => ({
            id: role.get('organization').id,
            name: role.get('organization').get('name'),
            role: role.get('role'),
            isActive: role.get('isActive'),
            assignedAt: role.get('assignedAt')
          })),
          stats: {
            tokenCount,
            organizationCount: orgRoles.length
          }
        };
      }));

      return {
        success: true,
        users: userData,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }));

  // Update user details
  Parse.Cloud.define('updateUserByAdmin', async (request) => {
    const { user } = request;
    const { userId, updates } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can update users');
    }

    if (!userId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID is required');
    }

    try {
      const query = new Parse.Query(Parse.User);
      const targetUser = await query.get(userId, { useMasterKey: true });

      if (!targetUser) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
      }

      const allowedFields = ['firstName', 'lastName', 'email', 'isInactive', 'isSystemAdmin'];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          targetUser.set(field, updates[field]);
        }
      });

      if (updates.email && updates.email !== targetUser.get('email')) {
        targetUser.set('username', updates.email.toLowerCase());
        targetUser.set('emailVerified', false);
      }

      await targetUser.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'user.updated_by_admin');
      log.set('targetType', 'User');
      log.set('targetId', userId);
      log.set('actor', user);
      log.set('details', {
        updates,
        previousEmail: targetUser.get('email') !== updates.email ? targetUser.get('email') : undefined
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'User updated successfully',
        user: {
          id: targetUser.id,
          ...updates
        }
      };

    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  });

  // Reset user password
  Parse.Cloud.define('resetUserPasswordByAdmin', async (request) => {
    const { user } = request;
    const { userId, newPassword, requireReset = true } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can reset user passwords');
    }

    if (!userId || !newPassword) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Password must be at least 8 characters long');
    }

    try {
      const query = new Parse.Query(Parse.User);
      const targetUser = await query.get(userId, { useMasterKey: true });

      if (!targetUser) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
      }

      targetUser.set('password', newPassword);
      if (requireReset) {
        targetUser.set('requiresPasswordReset', true);
      }

      await targetUser.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'user.password_reset_by_admin');
      log.set('targetType', 'User');
      log.set('targetId', userId);
      log.set('actor', user);
      log.set('details', {
        requireReset,
        userEmail: targetUser.get('email')
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  });

  // Deactivate or activate user
  Parse.Cloud.define('toggleUserStatus', async (request) => {
    const { user } = request;
    const { userId, isActive, reason } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can change user status');
    }

    if (!userId || isActive === undefined) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID and status are required');
    }

    try {
      const query = new Parse.Query(Parse.User);
      const targetUser = await query.get(userId, { useMasterKey: true });

      if (!targetUser) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
      }

      targetUser.set('isInactive', !isActive);
      if (!isActive) {
        targetUser.set('deactivatedAt', new Date());
        targetUser.set('deactivationReason', reason || 'Deactivated by system administrator');
      } else {
        targetUser.unset('deactivatedAt');
        targetUser.unset('deactivationReason');
      }

      await targetUser.save(null, { useMasterKey: true });

      if (!isActive) {
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', targetUser);
        roleQuery.equalTo('isActive', true);
        const roles = await roleQuery.find({ useMasterKey: true });

        await Promise.all(roles.map(async (role) => {
          role.set('isActive', false);
          role.set('deactivatedAt', new Date());
          role.set('deactivationReason', 'User deactivated');
          return role.save(null, { useMasterKey: true });
        }));
      }

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', isActive ? 'user.activated' : 'user.deactivated');
      log.set('targetType', 'User');
      log.set('targetId', userId);
      log.set('actor', user);
      log.set('details', {
        userEmail: targetUser.get('email'),
        reason
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      };

    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  });

  // Delete user
  Parse.Cloud.define('deleteUserByAdmin', async (request) => {
    const { user } = request;
    const { userId, hardDelete = false } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can delete users');
    }

    if (!userId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID is required');
    }

    try {
      const query = new Parse.Query(Parse.User);
      const targetUser = await query.get(userId, { useMasterKey: true });

      if (!targetUser) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
      }

      const userEmail = targetUser.get('email');

      if (hardDelete) {
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', targetUser);
        const roles = await roleQuery.find({ useMasterKey: true });
        await Parse.Object.destroyAll(roles, { useMasterKey: true });

        const Token = Parse.Object.extend('Token');
        const tokenQuery = new Parse.Query(Token);
        tokenQuery.equalTo('creator', targetUser);
        const tokens = await tokenQuery.find({ useMasterKey: true });
        await Parse.Object.destroyAll(tokens, { useMasterKey: true });

        await targetUser.destroy({ useMasterKey: true });
      } else {
        targetUser.set('isInactive', true);
        targetUser.set('deletedAt', new Date());
        targetUser.set('deletedBy', user.id);
        
        const randomId = Math.random().toString(36).substring(7);
        targetUser.set('username', `deleted_user_${randomId}`);
        targetUser.set('email', `deleted_${randomId}@deleted.local`);
        targetUser.set('firstName', 'Deleted');
        targetUser.set('lastName', 'User');
        
        await targetUser.save(null, { useMasterKey: true });

        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', targetUser);
        const roles = await roleQuery.find({ useMasterKey: true });

        await Promise.all(roles.map(async (role) => {
          role.set('isActive', false);
          role.set('deactivatedAt', new Date());
          role.set('deactivationReason', 'User deleted');
          return role.save(null, { useMasterKey: true });
        }));
      }

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', hardDelete ? 'user.hard_deleted' : 'user.soft_deleted');
      log.set('targetType', 'User');
      log.set('targetId', userId);
      log.set('actor', user);
      log.set('details', {
        userEmail,
        hardDelete
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: `User ${hardDelete ? 'permanently deleted' : 'deleted'} successfully`
      };

    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  });

  // Get user statistics
  Parse.Cloud.define('getUserStats', async (request) => {
    const { user } = request;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can view user statistics');
    }

    try {
      const totalQuery = new Parse.Query(Parse.User);
      const totalUsers = await totalQuery.count({ useMasterKey: true });

      const activeQuery = new Parse.Query(Parse.User);
      activeQuery.notEqualTo('isInactive', true);
      const activeUsers = await activeQuery.count({ useMasterKey: true });

      const adminQuery = new Parse.Query(Parse.User);
      adminQuery.equalTo('isSystemAdmin', true);
      const systemAdmins = await adminQuery.count({ useMasterKey: true });

      const verifiedQuery = new Parse.Query(Parse.User);
      verifiedQuery.equalTo('emailVerified', true);
      const verifiedEmails = await verifiedQuery.count({ useMasterKey: true });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newUserQuery = new Parse.Query(Parse.User);
      newUserQuery.greaterThanOrEqualTo('createdAt', startOfMonth);
      const newUsersThisMonth = await newUserQuery.count({ useMasterKey: true });

      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('isActive', true);
      roleQuery.distinct('user', { useMasterKey: true });
      const usersWithOrgs = await roleQuery.aggregate([
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ], { useMasterKey: true });

      const orgDistribution = {
        noOrg: 0,
        oneOrg: 0,
        multipleOrgs: 0
      };

      const usersWithOrgsCount = usersWithOrgs.length;
      orgDistribution.noOrg = totalUsers - usersWithOrgsCount;
      
      usersWithOrgs.forEach(item => {
        if (item.count === 1) {
          orgDistribution.oneOrg++;
        } else {
          orgDistribution.multipleOrgs++;
        }
      });

      return {
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          systemAdmins,
          verifiedEmails,
          unverifiedEmails: totalUsers - verifiedEmails,
          newUsersThisMonth,
          orgDistribution
        }
      };

    } catch (error) {
      console.error('Get user statistics error:', error);
      throw error;
    }
  });

  // Get user count for an organization
  Parse.Cloud.define('getUserCount', withOrganizationContext(async (request) => {
    const { user, organizationId } = request;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User must be authenticated');
    }

    try {
      const { organizationId: paramOrgId } = request.params;
      
      // Use organizationId from middleware or params
      const targetOrgId = organizationId || paramOrgId;
      
      if (!targetOrgId) {
        throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Organization ID is required');
      }

      // Check if user has access to this organization
      const userOrgId = user.get('organizationId');
      if (userOrgId !== targetOrgId && !user.get('isAdmin') && !user.get('isSystemAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to access organization data');
      }

      // Query user count for the organization
      const query = new Parse.Query(Parse.User);
      query.equalTo('organizationId', targetOrgId);
      const count = await query.count({ useMasterKey: true });

      console.log(`getUserCount: Retrieved count ${count} for organization ${targetOrgId}`);

      return {
        success: true,
        count: count
      };
    } catch (error) {
      console.error('Error in getUserCount:', error);
      throw error;
    }
  }));

  // Get user details by ID
  Parse.Cloud.define('getUserDetails', async (request) => {
    const { user } = request;
    const { userId, organizationId } = request.params;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User must be authenticated');
    }

    try {
      // If no userId provided, return current user's details
      const targetUserId = userId || user.id;
      
      // Users can always get their own details
      if (targetUserId === user.id) {
        console.log(`getUserDetails: User ${targetUserId} retrieving own details`);
        
        // Get user's organizations
        const OrgRole = Parse.Object.extend('OrgRole');
        const roleQuery = new Parse.Query(OrgRole);
        roleQuery.equalTo('user', user);
        roleQuery.equalTo('isActive', true);
        roleQuery.include('organization');
        const orgRoles = await roleQuery.find({ useMasterKey: true });

        const organizations = orgRoles.map(role => ({
          id: role.get('organization').id,
          name: role.get('organization').get('name'),
          role: role.get('role'),
          isActive: role.get('isActive'),
          assignedAt: role.get('assignedAt')
        }));

        const currentOrganization = organizations.length > 0 ? organizations[0] : null;

        return {
          success: true,
          user: {
            id: user.id,
            username: user.get('username'),
            email: user.get('email'),
            firstName: user.get('firstName'),
            lastName: user.get('lastName'),
            roles: user.get('roles') || [],
            permissions: user.get('permissions') || [],
            organizationId: user.get('organizationId'),
            isActive: user.get('isActive'),
            lastLogin: user.get('lastLogin')
          },
          organizations,
          currentOrganization
        };
      }

      // For other users, check permissions
      const userOrgId = user.get('organizationId');
      if (organizationId && userOrgId !== organizationId && !user.get('isAdmin') && !user.get('isSystemAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to access user data');
      }

      // Query the target user
      const userQuery = new Parse.Query(Parse.User);
      const targetUser = await userQuery.get(targetUserId, { useMasterKey: true });

      // Additional permission check - users can only see users in their org unless admin
      if (!user.get('isAdmin') && !user.get('isSystemAdmin') && targetUser.get('organizationId') !== userOrgId) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to access user data');
      }

      console.log(`getUserDetails: User ${user.id} retrieving details for user ${targetUserId}`);

      return {
        success: true,
        user: {
          id: targetUser.id,
          username: targetUser.get('username'),
          email: targetUser.get('email'),
          firstName: targetUser.get('firstName'),
          lastName: targetUser.get('lastName'),
          roles: targetUser.get('roles') || [],
          permissions: targetUser.get('permissions') || [],
          organizationId: targetUser.get('organizationId'),
          isActive: targetUser.get('isActive'),
          lastLogin: targetUser.get('lastLogin')
        }
      };
    } catch (error) {
      console.error('Error in getUserDetails:', error);
      throw error;
    }
  });

  // Create new user (by system admin)
  Parse.Cloud.define('createUserByAdmin', async (request) => {
    const { user } = request;
    const { email, password, firstName, lastName, isSystemAdmin = false, organizationId } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can create new users');
    }

    if (!email || !password) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Email and password are required');
    }

    try {
      const newUser = new Parse.User();
      newUser.set('username', email.toLowerCase());
      newUser.set('email', email.toLowerCase());
      newUser.set('password', password);
      if (firstName) newUser.set('firstName', firstName);
      if (lastName) newUser.set('lastName', lastName);
      newUser.set('isSystemAdmin', isSystemAdmin);
      newUser.set('emailVerified', false); // New users need email verification

      await newUser.signUp(null, { useMasterKey: true });

      if (organizationId) {
        const Organization = Parse.Object.extend('Organization');
        const organization = await new Parse.Query(Organization).get(organizationId, { useMasterKey: true });
        if (!organization) {
          throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Organization not found');
        }

        const OrgRole = Parse.Object.extend('OrgRole');
        const orgRole = new OrgRole();
        orgRole.set('user', newUser);
        orgRole.set('organization', organization);
        orgRole.set('role', 'member'); // Default to member role
        orgRole.set('isActive', true);
        await orgRole.save(null, { useMasterKey: true });
      }

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      log.set('action', 'user.created_by_admin');
      log.set('targetType', 'User');
      log.set('targetId', newUser.id);
      log.set('actor', user);
      log.set('details', { email, isSystemAdmin, organizationId });
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'User created successfully',
        userId: newUser.id
      };
    } catch (error) {
      console.error('Create user by admin error:', error);
      throw error;
    }
  });

  // Impersonate user (for support purposes)
  Parse.Cloud.define('impersonateUser', async (request) => {
    const { user } = request;
    const { userId } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can impersonate users');
    }

    if (!userId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'User ID is required');
    }

    try {
      const targetUser = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
      if (!targetUser) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Target user not found');
      }

      const sessionToken = await Parse.Cloud.run('loginAs', { userId: targetUser.id }, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      log.set('action', 'user.impersonated');
      log.set('targetType', 'User');
      log.set('targetId', targetUser.id);
      log.set('actor', user);
      log.set('details', { impersonatedBy: user.id, impersonatedUserEmail: targetUser.get('email') });
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: `Successfully impersonated user ${targetUser.get('email')}`,
        sessionToken
      };
    } catch (error) {
      console.error('Impersonate user error:', error);
      throw error;
    }
  });

  const updateOnboarding = user => {
    const walletId = user.get('walletId');
    const privateWallet = user.get('walletPreference') === 'PRIVATE';
    const managedWallet = user.get('walletPreference') === 'MANAGED';

    if (
      user.get('firstName') &&
      user.get('lastName') &&
      user.get('email') &&
      user.get('emailVerified') &&
      user.get('termsAccepted') &&
      user.get('personaInquiryId') &&
      user.get('walletAddress') &&
      ((walletId && managedWallet) || privateWallet)
    ) {
      user.set('onboarded', true);
    } else {
      user.set('onboarded', false);
    }
  };
};