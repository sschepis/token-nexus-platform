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

module.exports = {};