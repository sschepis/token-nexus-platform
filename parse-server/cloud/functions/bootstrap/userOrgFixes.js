// User and organization fix utilities

/**
 * Fix user organization association for existing users
 * Creates default organization if none exists and associates user with it
 */
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
      org.set('isActive', true);
      org.set('administrator', user);
      org.set('createdBy', user);
      org.set('updatedBy', user);
      
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

/**
 * Fix admin user flags and organization setup
 * Ensures admin user has proper isAdmin flag and organization association
 */
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