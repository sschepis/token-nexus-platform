/**
 * Role Service - Handles role creation and management
 */

class RoleService {
  /**
   * Ensure system roles exist
   * @returns {Promise<Object>} Results of role operations
   */
  static async ensureSystemRoles() {
    const results = { roles: [] };
    const systemRoles = ['SystemAdmin'];
    
    for (const roleName of systemRoles) {
      try {
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', roleName);
        let role = await roleQuery.first({ useMasterKey: true });
        
        if (!role) {
          console.log(`Creating system role: ${roleName}`);
          const roleACL = new Parse.ACL();
          roleACL.setPublicReadAccess(true);
          role = new Parse.Role(roleName, roleACL);
          await role.save(null, { useMasterKey: true });
          results.roles.push({ name: roleName, status: 'created' });
        } else {
          results.roles.push({ name: roleName, status: 'existed' });
        }
      } catch (error) {
        console.error(`Error ensuring role ${roleName}:`, error);
        results.roles.push({ 
          name: roleName, 
          status: 'failed', 
          error: error.message 
        });
      }
    }
    
    return results;
  }
  
  /**
   * Add user to role
   * @param {string} roleName - Name of the role
   * @param {Parse.User} user - User to add to role
   * @returns {Promise<boolean>} Success status
   */
  static async addUserToRole(roleName, user) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', roleName);
      const role = await roleQuery.first({ useMasterKey: true });
      
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }
      
      role.getUsers().add(user);
      await role.save(null, { useMasterKey: true });
      return true;
    } catch (error) {
      console.error(`Error adding user to role ${roleName}:`, error);
      return false;
    }
  }
  
  /**
   * Check if user has role
   * @param {string} roleName - Name of the role
   * @param {Parse.User} user - User to check
   * @returns {Promise<boolean>} Whether user has the role
   */
  static async userHasRole(roleName, user) {
    try {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', roleName);
      roleQuery.equalTo('users', user);
      const role = await roleQuery.first({ useMasterKey: true });
      return !!role;
    } catch (error) {
      console.error(`Error checking user role ${roleName}:`, error);
      return false;
    }
  }
}

module.exports = RoleService;