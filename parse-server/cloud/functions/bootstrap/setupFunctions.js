const { errorResponse } = require('../../utils/errorFormatter');

/**
 * Cloud function to set up the initial organization and admin user
 * This function runs on the server side with master key access
 */
Parse.Cloud.define('setupInitialOrganizationAndAdmin', async (request) => {
  // Allow this function to be called during initial setup
  try {
    // Check platform state - create PlatformConfig if it doesn't exist
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const query = new Parse.Query(PlatformConfig);
    let platformConfig = await query.first({ useMasterKey: true });
    
    if (!platformConfig) {
      console.log('PlatformConfig not found, creating with PARENT_ORG_CREATING state...');
      platformConfig = new PlatformConfig();
      platformConfig.set('currentState', 'PARENT_ORG_CREATING');
      platformConfig.set('createdAt', new Date());
      await platformConfig.save(null, { useMasterKey: true });
    }
    
    const currentState = platformConfig.get('currentState');
    if (currentState !== 'CORE_ARTIFACTS_IMPORTED' && currentState !== 'PARENT_ORG_CREATING') {
      throw new Error(`Operation not allowed in current system state: ${currentState}`);
    }
    
    // Extract params
    const {
      parentOrgName,
      adminUserEmail,
      adminUserPassword,
      adminUserFirstName,
      adminUserLastName,
      defaultPlanType = 'enterprise',
    } = request.params;
    
    // Validate required parameters
    if (!parentOrgName || !adminUserEmail || !adminUserPassword) {
      throw new Error('Missing required fields: parentOrgName, adminUserEmail, adminUserPassword');
    }
    
    // Update platform state to indicate we're creating the parent org
    platformConfig.set('currentState', 'PARENT_ORG_CREATING');
    await platformConfig.save(null, { useMasterKey: true });
    
    try {
      // 1. Create the admin user
      const adminUser = new Parse.User();
      adminUser.set('username', adminUserEmail);
      adminUser.set('email', adminUserEmail);
      adminUser.set('password', adminUserPassword);
      
      if (adminUserFirstName) adminUser.set('firstName', adminUserFirstName);
      if (adminUserLastName) adminUser.set('lastName', adminUserLastName);
      
      // Set as system admin
      adminUser.set('isAdmin', true);
      
      // Save user with master key to bypass email verification
      await adminUser.save(null, { useMasterKey: true });
      
      // 2. Create parent organization
      const Organization = Parse.Object.extend('Organization');
      const parentOrg = new Organization();
      parentOrg.set('name', parentOrgName);
      parentOrg.set('isParentOrg', true);
      parentOrg.set('planType', defaultPlanType);
      parentOrg.set('status', 'active');
      parentOrg.set('createdBy', adminUser);
      
      await parentOrg.save(null, { useMasterKey: true });
      
      // 3. Link user to organization with role
      const OrgMembership = Parse.Object.extend('OrgMembership');
      const membership = new OrgMembership();
      membership.set('user', adminUser);
      membership.set('organization', parentOrg);
      membership.set('role', 'owner');
      
      await membership.save(null, { useMasterKey: true });
      
      // 4. Update platform config
      platformConfig.set('parentOrgId', parentOrg.id);
      platformConfig.set('currentState', 'PARENT_ORG_CREATED');
      platformConfig.set('lastSetupError', null);
      platformConfig.set('setupCompletedAt', new Date());
      
      await platformConfig.save(null, { useMasterKey: true });
      
      // Return success with relevant IDs
      return {
        success: true,
        message: 'Platform setup completed successfully',
        parentOrgId: parentOrg.id,
        adminUserId: adminUser.id
      };
    } catch (error) {
      // Revert platform state on error
      platformConfig.set('lastSetupError', `Setup failed: ${error.message}`);
      platformConfig.set('currentState', 'CORE_ARTIFACTS_IMPORTED');
      await platformConfig.save(null, { useMasterKey: true });
      
      // Re-throw to be caught by outer handler
      throw error;
    }
  } catch (error) {
    return errorResponse(error, 'setupInitialOrganizationAndAdmin');
  }
});

/**
 * Cloud function to check platform status
 * This function runs on the server side with master key access
 */
Parse.Cloud.define('checkPlatformStatus', async () => {
  try {
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const query = new Parse.Query(PlatformConfig);
    const platformConfig = await query.first({ useMasterKey: true });
    
    if (!platformConfig) {
      return { status: 'PRISTINE' };
    }
    
    return {
      status: platformConfig.get('currentState') || 'PRISTINE',
      message: `Platform is in ${platformConfig.get('currentState') || 'PRISTINE'} state`,
      coreContractsImportedForNetwork: platformConfig.get('coreContractsImportedForNetwork'),
      parentOrgId: platformConfig.get('parentOrgId'),
    };
  } catch (error) {
    return errorResponse(error, 'checkPlatformStatus');
  }
});