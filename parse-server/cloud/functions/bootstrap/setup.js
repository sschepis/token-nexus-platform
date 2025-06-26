// Cloud functions for platform setup

Parse.Cloud.define('completeInitialPlatformSetup', async (request) => {
  // Check if platform is in initial setup mode
  const PlatformConfig = Parse.Object.extend('PlatformConfig');
  const configQuery = new Parse.Query(PlatformConfig);
  let platformConfig;
  
  try {
    platformConfig = await configQuery.first({ useMasterKey: true });
  } catch (error) {
    // If we can't check platform config, assume we're in setup mode
    console.log('Could not check platform config, assuming setup mode');
  }
  
  const currentState = platformConfig?.get('currentState') || 'PRISTINE';
  const isInSetupMode = ['PRISTINE', 'CORE_ARTIFACTS_IMPORTED', 'PARENT_ORG_CREATING'].includes(currentState);
  
  // Require master key for this operation UNLESS we're in initial setup mode
  if (!request.master && !isInSetupMode) {
    throw new Error('Master key required');
  }
  
  console.log(`Platform setup called with state: ${currentState}, setup mode: ${isInSetupMode}`);

  const {
    parentOrgName,
    adminUserEmail,
    adminUserPassword,
    adminUserFirstName,
    adminUserLastName,
    planType = 'enterprise'
  } = request.params;

  // Validate required fields
  if (!parentOrgName || !adminUserEmail || !adminUserPassword) {
    throw new Error('Missing required fields');
  }

  try {
    // Step 1: Create the System Admin user
    const user = new Parse.User();
    user.set('username', adminUserEmail);
    user.set('email', adminUserEmail);
    user.set('password', adminUserPassword);
    user.set('firstName', adminUserFirstName || '');
    user.set('lastName', adminUserLastName || '');
    user.set('isSystemAdmin', true);
    
    // Save the user with master key to bypass ACL restrictions
    const savedUser = await user.save(null, { useMasterKey: true });

    // Step 2: Find or create the SystemAdmin role
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'SystemAdmin');
    let systemAdminRole = await roleQuery.first({ useMasterKey: true });
    
    if (!systemAdminRole) {
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true);
      roleACL.setPublicWriteAccess(false);
      
      systemAdminRole = new Parse.Role('SystemAdmin', roleACL);
    }
    
    // Add the new user to the SystemAdmin role
    systemAdminRole.getUsers().add(savedUser);
    await systemAdminRole.save(null, { useMasterKey: true });

    // Step 3: Create the Parent Organization
    const Organization = Parse.Object.extend('Organization');
    const parentOrg = new Organization();
    
    parentOrg.set('name', parentOrgName);
    parentOrg.set('isParentOrg', true);
    parentOrg.set('planType', planType);
    parentOrg.set('status', 'active');
    parentOrg.set('administrator', savedUser);
    parentOrg.set('createdBy', savedUser);
    
    // Set ACL for the organization
    const orgACL = new Parse.ACL();
    orgACL.setPublicReadAccess(false);
    orgACL.setPublicWriteAccess(false);
    orgACL.setReadAccess(savedUser, true);
    orgACL.setWriteAccess(savedUser, true);
    orgACL.setRoleReadAccess('SystemAdmin', true);
    orgACL.setRoleWriteAccess('SystemAdmin', true);
    parentOrg.setACL(orgACL);
    
    const savedOrg = await parentOrg.save(null, { useMasterKey: true });

    // Step 4: Create OrgRole for the parent org
    const OrgRole = Parse.Object.extend('OrgRole');
    const adminOrgRole = new OrgRole();
    
    adminOrgRole.set('organization', savedOrg);
    adminOrgRole.set('user', savedUser);
    adminOrgRole.set('role', 'admin');
    adminOrgRole.set('isActive', true);
    adminOrgRole.set('assignedBy', savedUser);
    adminOrgRole.set('assignedAt', new Date());
    
    await adminOrgRole.save(null, { useMasterKey: true });

    // Step 5: Update user with organization reference
    savedUser.set('currentOrganization', savedOrg);
    savedUser.set('organizations', [savedOrg]);
    await savedUser.save(null, { useMasterKey: true });

    // Step 6: Create initial app store categories (optional)
    const categories = ['Productivity', 'Communication', 'Analytics', 'Development', 'Security'];
    const AppCategory = Parse.Object.extend('AppCategory');
    
    for (const categoryName of categories) {
      const category = new AppCategory();
      category.set('name', categoryName);
      category.set('isActive', true);
      category.set('createdBy', savedUser);
      
      const categoryACL = new Parse.ACL();
      categoryACL.setPublicReadAccess(true);
      categoryACL.setRoleWriteAccess('SystemAdmin', true);
      category.setACL(categoryACL);
      
      await category.save(null, { useMasterKey: true });
    }

    // Step 7: Update platform state to OPERATIONAL
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    let currentPlatformConfig = await new Parse.Query(PlatformConfig).first({ useMasterKey: true });

    if (!currentPlatformConfig) {
      currentPlatformConfig = new PlatformConfig();
    }
    currentPlatformConfig.set('currentState', 'OPERATIONAL');
    await currentPlatformConfig.save(null, { useMasterKey: true });
    console.log('Platform state successfully updated to OPERATIONAL.');
    
    // VERIFICATION: Read the PlatformConfig again to ensure persistence
    const verifiedConfig = await new Parse.Query(PlatformConfig).first({ useMasterKey: true });
    if (verifiedConfig) {
      console.log(`VERIFICATION: PlatformConfig currentState after save: ${verifiedConfig.get('currentState')}`);
      console.log(`VERIFICATION: PlatformConfig objectId: ${verifiedConfig.id}`);
    } else {
      console.error('VERIFICATION: Failed to retrieve PlatformConfig after save!');
    }

    // Return success with parent org ID
    return {
      success: true,
      parentOrgId: savedOrg.id,
      userId: savedUser.id,
      message: 'Platform setup completed successfully'
    };

  } catch (error) {
    console.error('Platform setup error:', error);
    
    // Try to clean up any partially created objects
    // This is a best-effort cleanup - errors here are logged but not thrown
    try {
      // If user was created but something else failed, try to delete the user
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('email', adminUserEmail);
      const partialUser = await userQuery.first({ useMasterKey: true });
      if (partialUser && !partialUser.get('currentOrganization')) {
        await partialUser.destroy({ useMasterKey: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    throw error;
  }
});

// Helper function to seed sample app (called separately)
Parse.Cloud.define('seedSampleApp', async (request) => {
  // Require master key or system admin
  const user = request.user;
  if (!request.master && (!user || !user.get('isSystemAdmin'))) {
    throw new Error('Unauthorized');
  }

  try {
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const AppVersion = Parse.Object.extend('AppVersion');
    
    // Create a sample app definition
    const sampleApp = new AppDefinition();
    sampleApp.set('name', 'Task Manager');
    sampleApp.set('description', 'A simple task management application for teams');
    sampleApp.set('publisher', 'Platform Team');
    sampleApp.set('category', 'Productivity');
    sampleApp.set('icon', 'https://example.com/task-manager-icon.png');
    sampleApp.set('features', [
      'Create and assign tasks',
      'Set due dates and priorities',
      'Track task progress',
      'Team collaboration'
    ]);
    sampleApp.set('isActive', true);
    sampleApp.set('isFeatured', true);
    
    const appACL = new Parse.ACL();
    appACL.setPublicReadAccess(true);
    appACL.setRoleWriteAccess('SystemAdmin', true);
    sampleApp.setACL(appACL);
    
    const savedApp = await sampleApp.save(null, { useMasterKey: true });
    
    // Create initial version
    const appVersion = new AppVersion();
    appVersion.set('appDefinition', savedApp);
    appVersion.set('version', '1.0.0');
    appVersion.set('changelog', 'Initial release');
    appVersion.set('status', 'published');
    appVersion.set('bundleUrl', 'https://example.com/bundles/task-manager-v1.0.0.zip');
    appVersion.set('publishedAt', new Date());
    appVersion.set('publishedBy', user || null);
    
    await appVersion.save(null, { useMasterKey: true });
    
    // Update app with current version
    savedApp.set('currentVersion', appVersion);
    await savedApp.save(null, { useMasterKey: true });
    
    return {
      success: true,
      appId: savedApp.id,
      message: 'Sample app created successfully'
    };
    
  } catch (error) {
    console.error('Seed sample app error:', error);
    throw error;
  }
});

// Automated install function for environment-based setup
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

// Fix user organization association for existing users
Parse.Cloud.define('fixUserOrganization', async (request) => {
  console.log('Starting user organization fix...');
  
  try {
    // Find the admin user
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', 'admin@nomyx.io');
    const user = await userQuery.first({ useMasterKey: true });
    
    if (!user) {
      throw new Error('User admin@nomyx.io not found');
    }
    
    console.log(`Found user: ${user.id}`);
    console.log(`Current currentOrganization: ${JSON.stringify(user.get('currentOrganization'))}`);
    console.log(`Current currentOrganizationId: ${user.get('currentOrganizationId')}`);
    console.log(`Current orgId: ${JSON.stringify(user.get('orgId'))}`);
    
    // Find any organization in the database
    const orgQuery = new Parse.Query('Organization');
    const organizations = await orgQuery.find({ useMasterKey: true });
    
    console.log(`Found ${organizations.length} organizations`);
    
    if (organizations.length === 0) {
      // No organizations exist, create one
      console.log('No organizations found, creating default organization...');
      
      const Organization = Parse.Object.extend('Organization');
      const org = new Organization();
      org.set('name', 'Default Organization');
      org.set('isParentOrg', true);
      org.set('planType', 'enterprise');
      org.set('status', 'active');
      org.set('administrator', user);
      org.set('createdBy', user);
      
      const savedOrg = await org.save(null, { useMasterKey: true });
      console.log(`Created organization: ${savedOrg.id}`);
      
      // Set user organization associations
      user.set('currentOrganization', savedOrg);
      user.set('currentOrganizationId', savedOrg.id);
      
      // Add user to organization's users relation
      const orgUsersRelation = savedOrg.relation('users');
      orgUsersRelation.add(user);
      await savedOrg.save(null, { useMasterKey: true });
      
      await user.save(null, { useMasterKey: true });
      
      console.log('User organization association fixed with new organization');
      
      return {
        success: true,
        message: 'Created new organization and fixed user association',
        organizationId: savedOrg.id,
        userId: user.id
      };
    } else {
      // Use the first organization found
      const org = organizations[0];
      console.log(`Using existing organization: ${org.id} (${org.get('name')})`);
      
      // Set user organization associations
      user.set('currentOrganization', org);
      user.set('currentOrganizationId', org.id);
      
      // Add user to organization's users relation if not already there
      const orgUsersRelation = org.relation('users');
      orgUsersRelation.add(user);
      await org.save(null, { useMasterKey: true });
      
      await user.save(null, { useMasterKey: true });
      
      console.log('User organization association fixed with existing organization');
      
      return {
        success: true,
        message: 'Fixed user association with existing organization',
        organizationId: org.id,
        userId: user.id
      };
    }
    
  } catch (error) {
    console.error('Error fixing user organization:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fix user organization: ${error.message}`);
  }
});

// Fix admin user flags and organization setup
Parse.Cloud.define('fixAdminUserSetup', async (request) => {
  console.log('Starting admin user setup fix...');
  
  try {
    // Find the admin user
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email', 'admin@nomyx.io');
    const user = await userQuery.first({ useMasterKey: true });
    
    if (!user) {
      throw new Error('User admin@nomyx.io not found');
    }
    
    console.log(`Found user: ${user.id}`);
    
    // Ensure user has isAdmin flag set
    if (!user.get('isAdmin')) {
      user.set('isAdmin', true);
      console.log('Setting isAdmin flag to true');
    }
    
    // Remove any legacy isSystemAdmin flag to avoid confusion
    if (user.get('isSystemAdmin') !== undefined) {
      user.unset('isSystemAdmin');
      console.log('Removed legacy isSystemAdmin flag');
    }
    
    await user.save(null, { useMasterKey: true });
    console.log('User flags updated successfully');
    
    // Now ensure organization setup
    const orgQuery = new Parse.Query('Organization');
    orgQuery.equalTo('isActive', true);
    const organizations = await orgQuery.find({ useMasterKey: true });
    
    console.log(`Found ${organizations.length} active organizations`);
    
    if (organizations.length === 0) {
      // No organizations exist, create one
      console.log('No active organizations found, creating default organization...');
      
      const Organization = Parse.Object.extend('Organization');
      const org = new Organization();
      org.set('name', 'Default Organization');
      org.set('isParentOrg', true);
      org.set('planType', 'enterprise');
      org.set('status', 'active');
      org.set('isActive', true);
      org.set('administrator', user);
      org.set('createdBy', user);
      org.set('updatedBy', user);
      
      const savedOrg = await org.save(null, { useMasterKey: true });
      console.log(`Created organization: ${savedOrg.id}`);
      
      // Set user organization associations
      user.set('currentOrganization', savedOrg);
      user.set('currentOrganizationId', savedOrg.id);
      await user.save(null, { useMasterKey: true });
      
      console.log('Admin user setup completed with new organization');
      
      return {
        success: true,
        message: 'Admin user setup completed with new organization',
        organizationId: savedOrg.id,
        userId: user.id,
        isAdmin: user.get('isAdmin')
      };
    } else {
      // Use the first organization found
      const org = organizations[0];
      console.log(`Using existing organization: ${org.id} (${org.get('name')})`);
      
      // Set user organization associations if not already set
      if (!user.get('currentOrganizationId')) {
        user.set('currentOrganization', org);
        user.set('currentOrganizationId', org.id);
        await user.save(null, { useMasterKey: true });
        console.log('Updated user organization association');
      }
      
      return {
        success: true,
        message: 'Admin user setup completed with existing organization',
        organizationId: org.id,
        userId: user.id,
        isAdmin: user.get('isAdmin')
      };
    }
    
  } catch (error) {
    console.error('Error fixing admin user setup:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fix admin user setup: ${error.message}`);
  }
});

module.exports = {};
// Smart Contract Studio initialization
Parse.Cloud.define('initializeSmartContractStudio', async (request) => {
  // Require master key
  if (!request.master) {
    throw new Error('Master key required');
  }

  try {
    // Import the Smart Contract Studio schema functions
    const { initializeSmartContractStudioSchemas, seedFacetRegistry } = require('../schemas/smartContractStudio');
    
    console.log('Initializing Smart Contract Studio schemas...');
    await initializeSmartContractStudioSchemas();
    
    console.log('Seeding facet registry...');
    await seedFacetRegistry();
    
    console.log('Smart Contract Studio initialization completed successfully');
    
    return {
      success: true,
      message: 'Smart Contract Studio initialized successfully'
    };
    
  } catch (error) {
    console.error('Smart Contract Studio initialization error:', error);
    throw error;
  }
});