/**
 * Generate various types of reports
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.reportType - Type of report ('user_activity', 'token_usage', 'security_events', 'organization_summary')
 * @param {string} request.params.orgId - Organization ID (optional, uses current org if not provided)
 * @param {string} request.params.startDate - Start date for report (ISO string)
 * @param {string} request.params.endDate - End date for report (ISO string)
 * @param {string} request.params.format - Report format ('json', 'csv') (optional, default 'json')
 * @param {Object} request.params.filters - Additional filters specific to report type (optional)
 * @returns {Object} Response with generated report data
 */
Parse.Cloud.define('generateReport', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.reportType) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: reportType');
    }

    if (!params.startDate || !params.endDate) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: startDate and endDate');
    }

    // Validate date format
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid date format. Use ISO string format.');
    }

    if (startDate >= endDate) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Start date must be before end date');
    }

    // Get organization context
    let orgId = params.orgId;
    if (!orgId) {
      const userQuery = new Parse.Query(Parse.User);
      const currentUser = await userQuery.get(user.id, { useMasterKey: true });
      orgId = currentUser.get('currentOrgId');
      
      if (!orgId) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No current organization set for user');
      }
    }

    // Verify user has access to this organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this organization');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const hasReportPermission = userRoles.some(role => 
      ['org_admin', 'reports_viewer', 'security_admin'].includes(role)
    );
    
    if (!hasReportPermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to generate reports');
    }

    let reportData;
    
    // Generate report based on type
    switch (params.reportType) {
      case 'user_activity':
        reportData = await generateUserActivityReport(orgId, startDate, endDate, params.filters);
        break;
      case 'token_usage':
        reportData = await generateTokenUsageReport(orgId, startDate, endDate, params.filters);
        break;
      case 'security_events':
        reportData = await generateSecurityEventsReport(orgId, startDate, endDate, params.filters);
        break;
      case 'organization_summary':
        reportData = await generateOrganizationSummaryReport(orgId, startDate, endDate, params.filters);
        break;
      default:
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid report type');
    }

    // Create report record for tracking
    const Report = Parse.Object.extend('Report');
    const report = new Report();
    report.set('type', params.reportType);
    report.set('orgId', orgId);
    report.set('generatedBy', user.id);
    report.set('startDate', startDate);
    report.set('endDate', endDate);
    report.set('format', params.format || 'json');
    report.set('filters', params.filters || {});
    report.set('recordCount', reportData.summary.totalRecords);
    report.set('status', 'completed');
    
    // Set ACL
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${orgId}_admins`, true);
    acl.setRoleReadAccess(`org_${orgId}_reports_viewers`, true);
    acl.setReadAccess(user.id, true);
    report.setACL(acl);
    
    const savedReport = await report.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'report_generated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Report');
    auditLog.set('resourceId', savedReport.id);
    auditLog.set('details', {
      reportType: params.reportType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      recordCount: reportData.summary.totalRecords
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      reportId: savedReport.id,
      reportType: params.reportType,
      generatedAt: new Date().toISOString(),
      summary: reportData.summary,
      data: reportData.data,
      metadata: {
        orgId: orgId,
        generatedBy: user.id,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        filters: params.filters || {}
      }
    };

  } catch (error) {
    console.error('Error in generateReport:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to generate report');
  }
});

/**
 * Generate user activity report
 */
async function generateUserActivityReport(orgId, startDate, endDate, filters) {
  const auditQuery = new Parse.Query('AuditLog');
  auditQuery.equalTo('orgId', orgId);
  auditQuery.greaterThanOrEqualTo('createdAt', startDate);
  auditQuery.lessThanOrEqualTo('createdAt', endDate);
  auditQuery.containedIn('action', ['user_login', 'user_logout', 'user_created', 'user_updated', 'user_deleted']);
  auditQuery.include('userId');
  auditQuery.limit(10000);
  
  const events = await auditQuery.find({ useMasterKey: true });
  
  const userStats = {};
  const dailyActivity = {};
  
  events.forEach(event => {
    const userId = event.get('userId');
    const date = event.get('createdAt').toISOString().split('T')[0];
    const action = event.get('action');
    
    // User stats
    if (!userStats[userId]) {
      userStats[userId] = { logins: 0, actions: 0, lastActivity: null };
    }
    
    if (action === 'user_login') {
      userStats[userId].logins++;
    }
    userStats[userId].actions++;
    userStats[userId].lastActivity = event.get('createdAt').toISOString();
    
    // Daily activity
    if (!dailyActivity[date]) {
      dailyActivity[date] = { logins: 0, totalActions: 0 };
    }
    
    if (action === 'user_login') {
      dailyActivity[date].logins++;
    }
    dailyActivity[date].totalActions++;
  });
  
  return {
    summary: {
      totalRecords: events.length,
      uniqueUsers: Object.keys(userStats).length,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    },
    data: {
      userStats,
      dailyActivity,
      events: events.map(e => ({
        id: e.id,
        action: e.get('action'),
        userId: e.get('userId'),
        timestamp: e.get('createdAt').toISOString(),
        details: e.get('details')
      }))
    }
  };
}

/**
 * Generate token usage report
 */
async function generateTokenUsageReport(orgId, startDate, endDate, filters) {
  const tokenQuery = new Parse.Query('Token');
  tokenQuery.equalTo('orgId', orgId);
  tokenQuery.greaterThanOrEqualTo('createdAt', startDate);
  tokenQuery.lessThanOrEqualTo('createdAt', endDate);
  
  const tokens = await tokenQuery.find({ useMasterKey: true });
  
  const auditQuery = new Parse.Query('AuditLog');
  auditQuery.equalTo('orgId', orgId);
  auditQuery.equalTo('resourceType', 'Token');
  auditQuery.greaterThanOrEqualTo('createdAt', startDate);
  auditQuery.lessThanOrEqualTo('createdAt', endDate);
  
  const tokenEvents = await auditQuery.find({ useMasterKey: true });
  
  const tokenStats = {
    created: 0,
    confirmed: 0,
    suspended: 0,
    byType: {},
    byBlockchain: {}
  };
  
  tokens.forEach(token => {
    const type = token.get('type');
    const blockchain = token.get('blockchain');
    const status = token.get('status');
    
    if (status === 'confirmed') tokenStats.confirmed++;
    if (status === 'suspended') tokenStats.suspended++;
    
    tokenStats.byType[type] = (tokenStats.byType[type] || 0) + 1;
    tokenStats.byBlockchain[blockchain] = (tokenStats.byBlockchain[blockchain] || 0) + 1;
  });
  
  tokenStats.created = tokens.length;
  
  return {
    summary: {
      totalRecords: tokens.length + tokenEvents.length,
      tokensCreated: tokenStats.created,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    },
    data: {
      tokenStats,
      tokens: tokens.map(t => ({
        id: t.id,
        name: t.get('name'),
        symbol: t.get('symbol'),
        type: t.get('type'),
        blockchain: t.get('blockchain'),
        status: t.get('status'),
        createdAt: t.get('createdAt').toISOString()
      })),
      events: tokenEvents.map(e => ({
        id: e.id,
        action: e.get('action'),
        resourceId: e.get('resourceId'),
        timestamp: e.get('createdAt').toISOString(),
        details: e.get('details')
      }))
    }
  };
}

/**
 * Generate security events report
 */
async function generateSecurityEventsReport(orgId, startDate, endDate, filters) {
  const auditQuery = new Parse.Query('AuditLog');
  auditQuery.equalTo('orgId', orgId);
  auditQuery.greaterThanOrEqualTo('createdAt', startDate);
  auditQuery.lessThanOrEqualTo('createdAt', endDate);
  auditQuery.containedIn('action', [
    'user_login', 'user_logout', 'failed_login', 'password_changed',
    'mfa_enabled', 'mfa_disabled', 'suspicious_activity', 'unauthorized_access'
  ]);
  auditQuery.include('userId');
  
  const events = await auditQuery.find({ useMasterKey: true });
  
  const securityStats = {
    logins: 0,
    failedLogins: 0,
    passwordChanges: 0,
    mfaEvents: 0,
    suspiciousActivity: 0
  };
  
  events.forEach(event => {
    const action = event.get('action');
    switch (action) {
      case 'user_login': securityStats.logins++; break;
      case 'failed_login': securityStats.failedLogins++; break;
      case 'password_changed': securityStats.passwordChanges++; break;
      case 'mfa_enabled':
      case 'mfa_disabled': securityStats.mfaEvents++; break;
      case 'suspicious_activity': securityStats.suspiciousActivity++; break;
    }
  });
  
  return {
    summary: {
      totalRecords: events.length,
      securityEvents: securityStats,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    },
    data: {
      securityStats,
      events: events.map(e => ({
        id: e.id,
        action: e.get('action'),
        userId: e.get('userId'),
        timestamp: e.get('createdAt').toISOString(),
        ipAddress: e.get('ipAddress'),
        details: e.get('details')
      }))
    }
  };
}

/**
 * Generate organization summary report
 */
async function generateOrganizationSummaryReport(orgId, startDate, endDate, filters) {
  // Get organization details
  const orgQuery = new Parse.Query('Organization');
  const organization = await orgQuery.get(orgId, { useMasterKey: true });
  
  // Get user count
  const userQuery = new Parse.Query('OrgUser');
  userQuery.equalTo('orgId', orgId);
  userQuery.equalTo('isActive', true);
  const userCount = await userQuery.count({ useMasterKey: true });
  
  // Get token count
  const tokenQuery = new Parse.Query('Token');
  tokenQuery.equalTo('orgId', orgId);
  const tokenCount = await tokenQuery.count({ useMasterKey: true });
  
  // Get activity in date range
  const auditQuery = new Parse.Query('AuditLog');
  auditQuery.equalTo('orgId', orgId);
  auditQuery.greaterThanOrEqualTo('createdAt', startDate);
  auditQuery.lessThanOrEqualTo('createdAt', endDate);
  const activityCount = await auditQuery.count({ useMasterKey: true });
  
  return {
    summary: {
      totalRecords: activityCount,
      organizationId: orgId,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    },
    data: {
      organization: {
        id: organization.id,
        name: organization.get('name'),
        plan: organization.get('plan'),
        createdAt: organization.get('createdAt').toISOString()
      },
      metrics: {
        activeUsers: userCount,
        totalTokens: tokenCount,
        activityEvents: activityCount
      }
    }
  };
}