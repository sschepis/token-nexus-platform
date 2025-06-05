/* global Parse */

const { withOrganizationContext } = require('../../src/cloud/middleware/organizationContextMiddleware');

// Set current organization for user session
Parse.Cloud.define('setCurrentOrganization', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId } = request.params; // organizationId now guaranteed

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware
    
    // Get the organization details
    const orgQuery = new Parse.Query('Organization');
    const organization = await orgQuery.get(organizationId, { useMasterKey: true });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Update user's current organization
    user.set('currentOrganization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    
    await user.save(null, { useMasterKey: true });
    
    return {
      success: true,
      orgId: organizationId,
      orgName: organization.get('name'),
      orgDescription: organization.get('description'),
      orgSubdomain: organization.get('subdomain'),
      message: `Successfully switched to organization: ${organization.get('name')}`
    };
  } catch (error) {
    console.error('Error setting current organization:', error);
    throw new Error(`Failed to set current organization: ${error.message}`);
  }
});

// Get current organization context
Parse.Cloud.define('getCurrentOrganization', async (request) => {
  const { user } = request;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const currentOrg = user.get('currentOrganization');
    
    if (!currentOrg) {
      // Get user's first organization
      const userOrgQuery = new Parse.Query('UserOrganization');
      userOrgQuery.equalTo('user', user);
      userOrgQuery.include('organization');
      userOrgQuery.limit(1);
      
      const userOrg = await userOrgQuery.first({ useMasterKey: true });
      
      if (userOrg) {
        const org = userOrg.get('organization');
        return {
          success: true,
          organizationId: org.id,
          organizationName: org.get('name'),
          organizationDescription: org.get('description'),
          organizationSubdomain: org.get('subdomain')
        };
      } else {
        return {
          success: false,
          message: 'User is not associated with any organization'
        };
      }
    }
    
    // Get current organization details
    const orgQuery = new Parse.Query('Organization');
    const organization = await orgQuery.get(currentOrg.id, { useMasterKey: true });
    
    return {
      success: true,
      organizationId: organization.id,
      organizationName: organization.get('name'),
      organizationDescription: organization.get('description'),
      organizationSubdomain: organization.get('subdomain')
    };
  } catch (error) {
    console.error('Error getting current organization:', error);
    throw new Error(`Failed to get current organization: ${error.message}`);
  }
});