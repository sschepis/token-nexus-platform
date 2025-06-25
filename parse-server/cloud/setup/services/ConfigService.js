/**
 * Config Service - Handles platform configuration management
 */

class ConfigService {
  /**
   * Ensure platform configuration exists
   * @returns {Promise<Object>} Results of config operations
   */
  static async ensurePlatformConfig() {
    try {
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const query = new Parse.Query(PlatformConfig);
      let config = await query.first({ useMasterKey: true });
      
      if (!config) {
        console.log('PlatformConfig object not found, creating with PRISTINE state...');
        config = new PlatformConfig();
        config.set('currentState', 'PRISTINE');
        config.set('platformVersion', '1.0.0');
        config.set('coreFactoryAddresses', {});
        
        // Set ACL to allow only SystemAdmin role
        const configACL = new Parse.ACL();
        configACL.setRoleReadAccess('SystemAdmin', true);
        configACL.setRoleWriteAccess('SystemAdmin', true);
        config.setACL(configACL);
        
        await config.save(null, { useMasterKey: true });
        return { status: 'created', objectId: config.id };
      } else {
        return { 
          status: 'existed', 
          objectId: config.id, 
          currentState: config.get('currentState') 
        };
      }
    } catch (error) {
      console.error('Error ensuring PlatformConfig object:', error);
      return { status: 'failed', error: error.message };
    }
  }
  
  /**
   * Get platform configuration
   * @returns {Promise<Parse.Object|null>} Platform config object
   */
  static async getPlatformConfig() {
    try {
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const query = new Parse.Query(PlatformConfig);
      return await query.first({ useMasterKey: true });
    } catch (error) {
      console.error('Error getting platform config:', error);
      return null;
    }
  }
  
  /**
   * Update platform configuration
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  static async updatePlatformConfig(updates) {
    try {
      const config = await this.getPlatformConfig();
      if (!config) {
        throw new Error('Platform config not found');
      }
      
      for (const [key, value] of Object.entries(updates)) {
        config.set(key, value);
      }
      
      await config.save(null, { useMasterKey: true });
      return true;
    } catch (error) {
      console.error('Error updating platform config:', error);
      return false;
    }
  }
  
  /**
   * Get current platform state
   * @returns {Promise<string|null>} Current state
   */
  static async getCurrentState() {
    try {
      const config = await this.getPlatformConfig();
      return config ? config.get('currentState') : null;
    } catch (error) {
      console.error('Error getting current state:', error);
      return null;
    }
  }
}

module.exports = ConfigService;