const Parse = require('parse/node');

/**
 * Get previously generated reports with filtering and pagination
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.orgId - Organization ID (optional, uses current org if not provided)
 * @param {string} request.params.reportType - Filter by report type (optional)
 * @param {string} request.params.status - Filter by status (optional)
 * @param {string} request.params.generatedBy - Filter by user who generated the report (optional)
 * @param {string} request.params.startDate - Filter reports generated after this date (optional)
 * @param {string} request.params.endDate - Filter reports generated before this date (optional)
 * @param {number} request.params.limit - Limit number of results (optional, default 20)
 * @param {number} request.params.skip - Skip number of results (optional, default 0)
 * @returns {Object} Response with reports array
 */
Parse.Cloud.define('getReports', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
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
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to view reports');
    }

    // Query reports for the organization
    const reportQuery = new Parse.Query('Report');
    reportQuery.equalTo('orgId', orgId);
    
    // Apply filters
    if (params.reportType) {
      reportQuery.equalTo('type', params.reportType);
    }
    
    if (params.status) {
      reportQuery.equalTo('status', params.status);
    }
    
    if (params.generatedBy) {
      reportQuery.equalTo('generatedBy', params.generatedBy);
    }
    
    // Apply date range filters for when reports were generated
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      if (!isNaN(startDate.getTime())) {
        reportQuery.greaterThanOrEqualTo('createdAt', startDate);
      }
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      if (!isNaN(endDate.getTime())) {
        reportQuery.lessThanOrEqualTo('createdAt', endDate);
      }
    }
    
    // Apply pagination
    const limit = Math.min(params.limit || 20, 100); // Max 100 reports per request
    const skip = params.skip || 0;
    reportQuery.limit(limit);
    reportQuery.skip(skip);
    
    // Order by creation date (newest first)
    reportQuery.descending('createdAt');
    
    // Include user information
    reportQuery.include('generatedBy');

    const reports = await reportQuery.find({ sessionToken: user.getSessionToken() });

    // Get total count for pagination
    const countQuery = new Parse.Query('Report');
    countQuery.equalTo('orgId', orgId);
    
    // Apply same filters for count
    if (params.reportType) {
      countQuery.equalTo('type', params.reportType);
    }
    if (params.status) {
      countQuery.equalTo('status', params.status);
    }
    if (params.generatedBy) {
      countQuery.equalTo('generatedBy', params.generatedBy);
    }
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      if (!isNaN(startDate.getTime())) {
        countQuery.greaterThanOrEqualTo('createdAt', startDate);
      }
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      if (!isNaN(endDate.getTime())) {
        countQuery.lessThanOrEqualTo('createdAt', endDate);
      }
    }
    
    const totalCount = await countQuery.count({ sessionToken: user.getSessionToken() });

    // Format response
    const formattedReports = reports.map(report => {
      const generatedByUser = report.get('generatedBy');
      return {
        id: report.id,
        type: report.get('type'),
        status: report.get('status'),
        recordCount: report.get('recordCount'),
        format: report.get('format'),
        startDate: report.get('startDate')?.toISOString(),
        endDate: report.get('endDate')?.toISOString(),
        filters: report.get('filters'),
        generatedBy: {
          id: generatedByUser?.id,
          firstName: generatedByUser?.get('firstName'),
          lastName: generatedByUser?.get('lastName'),
          email: generatedByUser?.get('email')
        },
        createdAt: report.get('createdAt')?.toISOString(),
        updatedAt: report.get('updatedAt')?.toISOString(),
        orgId: report.get('orgId')
      };
    });

    // Get report type statistics
    const typeStatsQuery = new Parse.Query('Report');
    typeStatsQuery.equalTo('orgId', orgId);
    typeStatsQuery.equalTo('status', 'completed');
    
    const allReports = await typeStatsQuery.find({ sessionToken: user.getSessionToken() });
    const typeStats = {};
    
    allReports.forEach(report => {
      const type = report.get('type');
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    return {
      success: true,
      reports: formattedReports,
      total: totalCount,
      limit: limit,
      skip: skip,
      hasMore: (skip + formattedReports.length) < totalCount,
      statistics: {
        totalReports: allReports.length,
        typeBreakdown: typeStats,
        recentReports: formattedReports.slice(0, 5) // Last 5 reports
      }
    };

  } catch (error) {
    console.error('Error in getReports:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch reports');
  }
});

/**
 * Get a specific report by ID with full data
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.reportId - Report ID
 * @returns {Object} Response with full report data
 */
Parse.Cloud.define('getReportById', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.reportId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: reportId');
    }

    // Query the report
    const reportQuery = new Parse.Query('Report');
    reportQuery.include('generatedBy');
    
    const report = await reportQuery.get(params.reportId, { sessionToken: user.getSessionToken() });
    
    if (!report) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Report not found');
    }

    const reportOrgId = report.get('orgId');
    
    // Verify user has access to this report's organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', reportOrgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this report');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const hasReportPermission = userRoles.some(role => 
      ['org_admin', 'reports_viewer', 'security_admin'].includes(role)
    );
    
    if (!hasReportPermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to view this report');
    }

    // Format full report response
    const generatedByUser = report.get('generatedBy');
    const formattedReport = {
      id: report.id,
      type: report.get('type'),
      status: report.get('status'),
      recordCount: report.get('recordCount'),
      format: report.get('format'),
      startDate: report.get('startDate')?.toISOString(),
      endDate: report.get('endDate')?.toISOString(),
      filters: report.get('filters'),
      data: report.get('data'), // Full report data
      summary: report.get('summary'),
      generatedBy: {
        id: generatedByUser?.id,
        firstName: generatedByUser?.get('firstName'),
        lastName: generatedByUser?.get('lastName'),
        email: generatedByUser?.get('email')
      },
      createdAt: report.get('createdAt')?.toISOString(),
      updatedAt: report.get('updatedAt')?.toISOString(),
      orgId: report.get('orgId')
    };

    // Create audit log for report access
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'report_accessed');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', reportOrgId);
    auditLog.set('resourceType', 'Report');
    auditLog.set('resourceId', report.id);
    auditLog.set('details', {
      reportType: report.get('type'),
      accessedAt: new Date().toISOString()
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      report: formattedReport
    };

  } catch (error) {
    console.error('Error in getReportById:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch report');
  }
});