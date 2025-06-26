// Automated installation cloud functions

/**
 * Check and run automated install based on environment configuration
 * Reads AUTO_INSTALL_CONFIG environment variable and performs setup if configured
 */
Parse.Cloud.define('checkAndRunAutomatedInstall', async (request) => {
  console.log('Checking for automated install configuration...');
  
  // Check if AUTO_INSTALL_CONFIG environment variable exists
  const autoInstallConfig = process.env.AUTO_INSTALL_CONFIG;
  
  if (!autoInstallConfig) {
    console.log('No AUTO_INSTALL_CONFIG found, skipping automated install');
    return { success: false, message: 'No automated install configuration found' };
  }
  
  try {
    // Parse the JSON configuration
    const config = JSON.parse(autoInstallConfig);
    console.log('Found automated install configuration, validating...');
    
    // Validate required fields
    const requiredFields = ['parentOrgName', 'adminUserEmail', 'adminUserPassword', 'adminUserFirstName', 'adminUserLastName'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in AUTO_INSTALL_CONFIG: ${missingFields.join(', ')}`);
    }
    
    // Check if platform is already set up
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const configQuery = new Parse.Query(PlatformConfig);
    const existingConfig = await configQuery.first({ useMasterKey: true });
    
    if (existingConfig && existingConfig.get('currentState') === 'OPERATIONAL') {
      console.log('Platform already set up, skipping automated install');
      return { success: false, message: 'Platform already configured' };
    }
    
    console.log('Running automated platform setup...');
    
    // First, ensure core infrastructure is set up (roles, schemas, etc.)
    console.log('Ensuring core infrastructure is set up...');
    await Parse.Cloud.run('ensureCoreInfrastructure', {}, { useMasterKey: true });
    console.log('Core infrastructure setup completed');
    
    // Initialize Smart Contract Studio schemas and data
    console.log('Initializing Smart Contract Studio...');
    await Parse.Cloud.run('initializeSmartContractStudio', {}, { useMasterKey: true });
    console.log('Smart Contract Studio initialization completed');
    
    // Set default values for optional fields
    const setupConfig = {
      parentOrgName: config.parentOrgName,
      adminUserEmail: config.adminUserEmail,
      adminUserPassword: config.adminUserPassword,
      adminUserFirstName: config.adminUserFirstName,
      adminUserLastName: config.adminUserLastName,
      defaultPlanType: config.defaultPlanType || 'enterprise'
    };
    
    // Run the complete initial platform setup
    const setupResult = await Parse.Cloud.run('completeInitialPlatformSetup', setupConfig, { useMasterKey: true });
    
    console.log('Automated platform setup completed successfully');
    return {
      success: true,
      message: 'Automated platform setup completed successfully',
      result: setupResult
    };
    
  } catch (error) {
    console.error('Error during automated install:', error);
    
    // Update platform state to indicate setup error
    try {
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const configQuery = new Parse.Query(PlatformConfig);
      let config = await configQuery.first({ useMasterKey: true });
      
      if (!config) {
        config = new PlatformConfig();
      }
      
      config.set('currentState', 'SETUP_ERROR');
      config.set('lastSetupError', error.message);
      await config.save(null, { useMasterKey: true });
    } catch (stateError) {
      console.error('Error updating platform state after automated install failure:', stateError);
    }
    
    return {
      success: false,
      message: `Automated install failed: ${error.message}`,
      error: error.message
    };
  }
});

module.exports = {};