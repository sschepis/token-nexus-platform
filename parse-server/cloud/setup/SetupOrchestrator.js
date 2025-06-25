/**
 * Setup Orchestrator - Coordinates all setup operations
 */

const SchemaService = require('./services/SchemaService');
const RoleService = require('./services/RoleService');
const ConfigService = require('./services/ConfigService');
const setupSchemas = require('./schemas');
const canonicalSchemas = require('../../src/schemas');

class SetupOrchestrator {
  /**
   * Run complete infrastructure setup
   * @returns {Promise<Object>} Complete setup results
   */
  static async ensureCoreInfrastructure() {
    console.log('Starting core infrastructure setup...');
    
    const results = {
      schemas: [],
      roles: [],
      platformConfig: null,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 1. Ensure schemas (both setup-specific and canonical)
      console.log('Setting up schemas...');
      const allSchemas = [...setupSchemas, ...canonicalSchemas];
      const schemaResults = await SchemaService.ensureSchemas(allSchemas);
      results.schemas = schemaResults.schemas;
      
      // 2. Ensure system roles
      console.log('Setting up system roles...');
      const roleResults = await RoleService.ensureSystemRoles();
      results.roles = roleResults.roles;
      
      // 3. Ensure platform configuration
      console.log('Setting up platform configuration...');
      results.platformConfig = await ConfigService.ensurePlatformConfig();
      
      console.log('Core infrastructure setup completed successfully');
      return results;
      
    } catch (error) {
      console.error('Error during core infrastructure setup:', error);
      results.error = error.message;
      return results;
    }
  }
  
  /**
   * Get setup status
   * @returns {Promise<Object>} Current setup status
   */
  static async getSetupStatus() {
    try {
      const platformConfig = await ConfigService.getPlatformConfig();
      const currentState = platformConfig ? platformConfig.get('currentState') : 'UNKNOWN';
      
      return {
        currentState,
        platformVersion: platformConfig ? platformConfig.get('platformVersion') : null,
        setupCompletedAt: platformConfig ? platformConfig.get('setupCompletedAt') : null,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting setup status:', error);
      return {
        currentState: 'ERROR',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
  
  /**
   * Validate setup integrity
   * @returns {Promise<Object>} Validation results
   */
  static async validateSetup() {
    const validation = {
      schemas: { valid: true, missing: [] },
      roles: { valid: true, missing: [] },
      config: { valid: true, issues: [] }
    };
    
    try {
      // Check schemas
      const allSchemas = [...setupSchemas, ...canonicalSchemas];
      for (const schemaDef of allSchemas) {
        try {
          const schema = new Parse.Schema(schemaDef.className);
          await schema.get({ useMasterKey: true });
        } catch (error) {
          validation.schemas.valid = false;
          validation.schemas.missing.push(schemaDef.className);
        }
      }
      
      // Check roles
      const systemRoles = ['SystemAdmin'];
      for (const roleName of systemRoles) {
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', roleName);
        const role = await roleQuery.first({ useMasterKey: true });
        if (!role) {
          validation.roles.valid = false;
          validation.roles.missing.push(roleName);
        }
      }
      
      // Check config
      const platformConfig = await ConfigService.getPlatformConfig();
      if (!platformConfig) {
        validation.config.valid = false;
        validation.config.issues.push('PlatformConfig object not found');
      }
      
    } catch (error) {
      console.error('Error during setup validation:', error);
      validation.error = error.message;
    }
    
    return validation;
  }
}

module.exports = SetupOrchestrator;