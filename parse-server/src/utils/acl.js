/**
 * Access Control Utility
 * Handles role-based access control and permissions
 */

const config = require('../config');
const logger = require('./logger');

class ACLManager {
  /**
   * Default roles and their permissions
   */
  static DEFAULT_ROLES = {
    admin: {
      name: 'cms-admin',
      permissions: ['*'], // All permissions
    },
    editor: {
      name: 'cms-editor',
      permissions: [
        'content:create',
        'content:read',
        'content:update',
        'content:publish',
        'media:create',
        'media:read',
        'media:update',
        'template:read',
        'template:use',
      ],
    },
    author: {
      name: 'cms-author',
      permissions: [
        'content:create',
        'content:read',
        'content:update',
        'media:create',
        'media:read',
        'template:read',
        'template:use',
      ],
    },
    viewer: {
      name: 'cms-viewer',
      permissions: ['content:read', 'media:read', 'template:read'],
    },
  };

  /**
   * Create ACL for an object
   * @param {Parse.User} owner - Object owner
   * @param {Object} options - ACL options
   * @returns {Parse.ACL} ACL object
   */
  static createACL(owner, options = {}) {
    const acl = new Parse.ACL(owner);

    // Set public read access if specified
    if (options.publicRead) {
      acl.setPublicReadAccess(true);
    }

    // Set role-based access
    if (options.roles) {
      options.roles.forEach(role => {
        if (options.readOnly) {
          acl.setRoleReadAccess(role, true);
        } else {
          acl.setRoleReadAccess(role, true);
          acl.setRoleWriteAccess(role, true);
        }
      });
    }

    // Always give admin role full access
    acl.setRoleReadAccess(this.DEFAULT_ROLES.admin.name, true);
    acl.setRoleWriteAccess(this.DEFAULT_ROLES.admin.name, true);

    return acl;
  }

  /**
   * Check if user has required permission
   * @param {Parse.User} user - User to check
   * @param {string} permission - Required permission
   * @returns {Promise<boolean>} Permission check result
   */
  static async hasPermission(user, permission) {
    try {
      if (!user) return false;

      // Admin role has all permissions
      if (await this.hasRole(user, this.DEFAULT_ROLES.admin.name)) {
        return true;
      }

      // Check user roles and their permissions
      const roles = await this.getUserRoles(user);
      for (const role of roles) {
        const rolePermissions = await this.getRolePermissions(role);
        if (rolePermissions.includes('*') || rolePermissions.includes(permission)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error(error, { context: 'permission check' });
      return false;
    }
  }

  /**
   * Check if user has required role
   * @param {Parse.User} user - User to check
   * @param {string} roleName - Role name
   * @returns {Promise<boolean>} Role check result
   */
  static async hasRole(user, roleName) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', roleName);
      roleQuery.equalTo('users', user);

      return (await roleQuery.count({ useMasterKey: true })) > 0;
    } catch (error) {
      logger.error(error, { context: 'role check' });
      return false;
    }
  }

  /**
   * Get user's roles
   * @param {Parse.User} user - User to get roles for
   * @returns {Promise<Array>} User's roles
   */
  static async getUserRoles(user) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('users', user);

      return await roleQuery.find({ useMasterKey: true });
    } catch (error) {
      logger.error(error, { context: 'get user roles' });
      return [];
    }
  }

  /**
   * Get role's permissions
   * @param {Parse.Role} role - Role to get permissions for
   * @returns {Promise<Array>} Role's permissions
   */
  static async getRolePermissions(role) {
    try {
      // Check default roles first
      const defaultRole = Object.values(this.DEFAULT_ROLES).find(r => r.name === role.get('name'));

      if (defaultRole) {
        return defaultRole.permissions;
      }

      // Check custom role permissions
      const permissions = role.get('permissions') || [];
      return permissions;
    } catch (error) {
      logger.error(error, { context: 'get role permissions' });
      return [];
    }
  }

  /**
   * Initialize default roles
   * @returns {Promise<void>}
   */
  static async initializeRoles() {
    try {
      for (const [, roleConfig] of Object.entries(this.DEFAULT_ROLES)) {
        await this.ensureRole(roleConfig.name, roleConfig.permissions);
      }
    } catch (error) {
      logger.error(error, { context: 'initialize roles' });
      throw error;
    }
  }

  /**
   * Ensure role exists
   * @param {string} name - Role name
   * @param {Array} permissions - Role permissions
   * @returns {Promise<Parse.Role>} Role object
   */
  static async ensureRole(name, permissions) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', name);

      let role = await roleQuery.first({ useMasterKey: true });

      if (!role) {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);

        role = new Parse.Role(name, acl);
        role.set('permissions', permissions);
        await role.save(null, { useMasterKey: true });
      }

      return role;
    } catch (error) {
      logger.error(error, { context: 'ensure role' });
      throw error;
    }
  }

  /**
   * Assign role to user
   * @param {Parse.User} user - User to assign role to
   * @param {string} roleName - Role name
   * @returns {Promise<void>}
   */
  static async assignRole(user, roleName) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', roleName);

      const role = await roleQuery.first({ useMasterKey: true });
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      role.getUsers().add(user);
      await role.save(null, { useMasterKey: true });
    } catch (error) {
      logger.error(error, { context: 'assign role' });
      throw error;
    }
  }

  /**
   * Remove role from user
   * @param {Parse.User} user - User to remove role from
   * @param {string} roleName - Role name
   * @returns {Promise<void>}
   */
  static async removeRole(user, roleName) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', roleName);

      const role = await roleQuery.first({ useMasterKey: true });
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      role.getUsers().remove(user);
      await role.save(null, { useMasterKey: true });
    } catch (error) {
      logger.error(error, { context: 'remove role' });
      throw error;
    }
  }
}

module.exports = ACLManager;
