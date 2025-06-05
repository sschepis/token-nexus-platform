const Parse = require('parse/node');

/**
 * Save user dashboard layout and widgets.
 * @param {Object} request - The Parse Cloud Function request object.
 * @param {Object} request.params - The parameters passed to the function.
 * @param {string} request.params.userId - The ID of the user whose dashboard is being saved.
 * @param {string} request.params.orgId - The ID of the organization the dashboard belongs to.
 * @param {Array<Object>} request.params.layouts - The layout configuration of the dashboard widgets.
 * @param {Array<Object>} request.params.widgets - The configuration of the dashboard widgets.
 */
Parse.Cloud.define('saveDashboardLayout', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated.');
  }

  const { userId, orgId, layouts, widgets } = params;

  if (user.id !== userId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Cannot save dashboard for another user.');
  }

  // Ensure layouts and widgets are arrays
  if (!Array.isArray(layouts) || !Array.isArray(widgets)) {
    throw new Parse.Error(Parse.Error.INVALID_JSON, 'Layouts and widgets must be arrays.');
  }

  // Check if the user belongs to the specified organization
  const OrgUser = Parse.Object.extend('OrgUser');
  const orgUserQuery = new Parse.Query(OrgUser);
  orgUserQuery.equalTo('userId', userId);
  orgUserQuery.equalTo('orgId', orgId);
  orgUserQuery.equalTo('isActive', true);
  const orgUser = await orgUserQuery.first({ useMasterKey: true });

  if (!orgUser) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User is not an active member of this organization.');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    let dashboardConfig = await new Parse.Query(DashboardConfig)
      .equalTo('userId', userId)
      .equalTo('orgId', orgId)
      .first({ useMasterKey: true });

    if (!dashboardConfig) {
      dashboardConfig = new DashboardConfig();
      dashboardConfig.set('userId', userId);
      dashboardConfig.set('orgId', orgId);
    }

    dashboardConfig.set('layouts', layouts);
    dashboardConfig.set('widgets', widgets);
    
    await dashboardConfig.save(null, { useMasterKey: true });

    // Audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'dashboard_layout_saved');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Dashboard');
    auditLog.set('resourceId', dashboardConfig.id);
    auditLog.set('details', {
      layoutsCount: layouts.length,
      widgetsCount: widgets.length,
    });
    await auditLog.save(null, { useMasterKey: true });

    return { success: true, message: 'Dashboard layout saved successfully.' };
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to save dashboard layout.');
  }
});

/**
 * Retrieve user dashboard layout and widgets.
 * @param {Object} request - The Parse Cloud Function request object.
 * @param {Object} request.params - The parameters passed to the function.
 * @param {string} request.params.userId - The ID of the user whose dashboard is being retrieved.
 * @param {string} request.params.orgId - The ID of the organization the dashboard belongs to.
 */
Parse.Cloud.define('getDashboardLayout', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated.');
  }

  const { userId, orgId } = params;

  if (user.id !== userId) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Cannot retrieve dashboard for another user.');
  }

  // Check if the user belongs to the specified organization
  const OrgUser = Parse.Object.extend('OrgUser');
  const orgUserQuery = new Parse.Query(OrgUser);
  orgUserQuery.equalTo('userId', userId);
  orgUserQuery.equalTo('orgId', orgId);
  orgUserQuery.equalTo('isActive', true);
  const orgUser = await orgUserQuery.first({ useMasterKey: true });

  if (!orgUser) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User is not an active member of this organization.');
  }

  try {
    const DashboardConfig = Parse.Object.extend('DashboardConfig');
    const dashboardConfig = await new Parse.Query(DashboardConfig)
      .equalTo('userId', userId)
      .equalTo('orgId', orgId)
      .first({ useMasterKey: true });

    if (!dashboardConfig) {
      return { success: true, layouts: [], widgets: [], message: 'No dashboard configuration found for this user/organization.' };
    }

    // Audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'dashboard_layout_retrieved');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Dashboard');
    auditLog.set('resourceId', dashboardConfig.id);
    auditLog.set('details', {
      layoutsCount: dashboardConfig.get('layouts')?.length || 0,
      widgetsCount: dashboardConfig.get('widgets')?.length || 0,
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      layouts: dashboardConfig.get('layouts') || [],
      widgets: dashboardConfig.get('widgets') || [],
    };
  } catch (error) {
    console.error('Error retrieving dashboard layout:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve dashboard layout.');
  }
});