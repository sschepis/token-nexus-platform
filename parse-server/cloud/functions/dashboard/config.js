// Dashboard Configuration Management
// Handles dashboard layout and widget configuration

const {
  withOrganizationContext,
  createOrgPointer,
  handleDashboardError,
  createSuccessResponse
} = require('./utils');

/**
 * Get dashboard configuration for a user
 */
Parse.Cloud.define('getDashboardConfig', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { organizationId } = params; // Now guaranteed to exist

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    const query = new Parse.Query(DashboardConfig);
    
    query.equalTo('user', user);
    query.equalTo('organization', createOrgPointer(organizationId));
    
    let config = await query.first({ useMasterKey: true });
    
    if (!config) {
      // Create default configuration
      config = new DashboardConfig();
      config.set('user', user);
      config.set('organization', createOrgPointer(organizationId));
      config.set('layouts', {
        lg: [],
        md: [],
        sm: [],
        xs: []
      });
      config.set('widgets', []);
      config.set('isDefault', true);
      
      // Set ACL
      const acl = new Parse.ACL(user);
      acl.setPublicReadAccess(false);
      acl.setPublicWriteAccess(false);
      config.setACL(acl);
      
      await config.save(null, { useMasterKey: true });
    }

    return createSuccessResponse({
      config: {
        id: config.id,
        layouts: config.get('layouts'),
        widgets: config.get('widgets'),
        isDefault: config.get('isDefault'),
        updatedAt: config.get('updatedAt')
      }
    });

  } catch (error) {
    throw handleDashboardError(error, 'getDashboardConfig');
  }
});

/**
 * Save dashboard configuration
 */
Parse.Cloud.define('saveDashboardConfig', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { organizationId, layouts, widgets } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !layouts || !widgets) {
    throw new Error('Organization ID, layouts, and widgets are required');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    const query = new Parse.Query(DashboardConfig);
    
    query.equalTo('user', user);
    query.equalTo('organization', createOrgPointer(organizationId));
    
    let config = await query.first({ useMasterKey: true });
    
    if (!config) {
      config = new DashboardConfig();
      config.set('user', user);
      config.set('organization', createOrgPointer(organizationId));
      
      // Set ACL
      const acl = new Parse.ACL(user);
      acl.setPublicReadAccess(false);
      acl.setPublicWriteAccess(false);
      config.setACL(acl);
    }

    config.set('layouts', layouts);
    config.set('widgets', widgets);
    config.set('isDefault', false);
    
    await config.save(null, { useMasterKey: true });

    return createSuccessResponse({
      message: 'Dashboard configuration saved successfully',
      configId: config.id
    });

  } catch (error) {
    throw handleDashboardError(error, 'saveDashboardConfig');
  }
});

/**
 * Get dashboard layout (for compatibility with existing frontend)
 */
Parse.Cloud.define('getDashboardLayout', async (request) => {
  const { user } = request;
  // Fix: Access params from request.params, with proper fallback
  const params = request.params || {};
  const { userId, orgId } = params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // For now, return a simple default layout
    // This can be expanded to return actual saved layouts
    return createSuccessResponse({
      layouts: [],
      widgets: [],
      message: 'Default dashboard layout'
    });

  } catch (error) {
    console.error('Error retrieving dashboard layout:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve dashboard layout.');
  }
});

