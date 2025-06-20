/**
 * Export audit logs in various formats (CSV, JSON, PDF)
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.format - Export format ('csv', 'json', 'pdf')
 * @param {Object} request.params.filters - Optional filters for export
 * @param {string} request.params.filters.startDate - Start date for export range
 * @param {string} request.params.filters.endDate - End date for export range
 * @param {string[]} request.params.filters.actions - Specific actions to include
 * @param {string[]} request.params.filters.userIds - Specific users to include
 * @param {string} request.params.filters.resourceType - Specific resource type
 * @param {number} request.params.maxRecords - Maximum records to export (default: 10000)
 * @returns {Object} Response with export data or download URL
 */
Parse.Cloud.define('exportAuditLogs', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate format parameter
    const validFormats = ['csv', 'json', 'pdf'];
    const format = params.format?.toLowerCase() || 'csv';
    
    if (!validFormats.includes(format)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Get user's organization and verify permissions
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User organization access not found');
    }

    // Check permissions - admin or auditor roles can export
    const userRoles = orgUser.get('roles') || [];
    const canExport = userRoles.some(role => ['admin', 'auditor', 'system_admin'].includes(role));
    
    if (!canExport) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to export audit logs');
    }

    // Build query with filters
    const auditLogQuery = new Parse.Query('AuditLog');
    auditLogQuery.equalTo('orgId', orgId);
    
    // Apply filters if provided
    const filters = params.filters || {};
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid startDate format');
      }
      auditLogQuery.greaterThanOrEqualTo('createdAt', startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid endDate format');
      }
      auditLogQuery.lessThanOrEqualTo('createdAt', endDate);
    }
    
    if (filters.actions && Array.isArray(filters.actions) && filters.actions.length > 0) {
      auditLogQuery.containedIn('action', filters.actions);
    }
    
    if (filters.userIds && Array.isArray(filters.userIds) && filters.userIds.length > 0) {
      auditLogQuery.containedIn('userId', filters.userIds);
    }
    
    if (filters.resourceType) {
      auditLogQuery.equalTo('resourceType', filters.resourceType);
    }

    // Set limits and ordering
    const maxRecords = Math.min(params.maxRecords || 10000, 50000); // Cap at 50k records
    auditLogQuery.limit(maxRecords);
    auditLogQuery.descending('createdAt');

    // Execute query
    const auditLogs = await auditLogQuery.find({ useMasterKey: true });
    
    if (auditLogs.length === 0) {
      return {
        success: true,
        message: 'No audit logs found matching the specified criteria',
        recordCount: 0,
        format: format
      };
    }

    // Get user details for better reporting
    const userIds = [...new Set(auditLogs.map(log => log.get('userId')).filter(Boolean))];
    const userDetailsQuery = new Parse.Query(Parse.User);
    userDetailsQuery.containedIn('objectId', userIds);
    userDetailsQuery.select(['firstName', 'lastName', 'email']);
    const users = await userDetailsQuery.find({ useMasterKey: true });
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = {
        name: `${user.get('firstName') || ''} ${user.get('lastName') || ''}`.trim(),
        email: user.get('email')
      };
    });

    // Process data based on format
    let exportData;
    let contentType;
    let filename;

    switch (format) {
      case 'csv':
        exportData = generateCSV(auditLogs, userMap);
        contentType = 'text/csv';
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'json':
        exportData = generateJSON(auditLogs, userMap);
        contentType = 'application/json';
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        break;
        
      case 'pdf':
        // For PDF, we'll return structured data that the frontend can use to generate PDF
        exportData = generatePDFData(auditLogs, userMap, filters);
        contentType = 'application/json'; // Return JSON data for PDF generation
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
    }

    // Create export record for audit trail
    const ExportLog = Parse.Object.extend('AuditLog');
    const exportLog = new ExportLog();
    exportLog.set('action', 'audit_logs_exported');
    exportLog.set('userId', user.id);
    exportLog.set('orgId', orgId);
    exportLog.set('resourceType', 'AuditLog');
    exportLog.set('details', {
      format: format,
      recordCount: auditLogs.length,
      filters: filters,
      exportedBy: user.id,
      exportedAt: new Date().toISOString(),
      filename: filename
    });
    await exportLog.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `Successfully exported ${auditLogs.length} audit log records`,
      data: exportData,
      metadata: {
        format: format,
        recordCount: auditLogs.length,
        contentType: contentType,
        filename: filename,
        exportedAt: new Date().toISOString(),
        filters: filters
      }
    };

  } catch (error) {
    console.error('Error in exportAuditLogs:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to export audit logs');
  }
});

/**
 * Generate CSV format data
 */
function generateCSV(auditLogs, userMap) {
  const headers = [
    'Timestamp',
    'Action',
    'User Name',
    'User Email',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'User Agent',
    'Details'
  ];
  
  const rows = auditLogs.map(log => {
    const userId = log.get('userId');
    const userInfo = userMap[userId] || { name: 'Unknown User', email: 'N/A' };
    const details = log.get('details') || {};
    
    return [
      log.get('createdAt')?.toISOString() || '',
      log.get('action') || '',
      userInfo.name || '',
      userInfo.email || '',
      log.get('resourceType') || '',
      log.get('resourceId') || '',
      details.ipAddress || '',
      details.userAgent || '',
      JSON.stringify(details).replace(/"/g, '""') // Escape quotes for CSV
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
    
  return csvContent;
}

/**
 * Generate JSON format data
 */
function generateJSON(auditLogs, userMap) {
  const jsonData = {
    exportInfo: {
      exportedAt: new Date().toISOString(),
      recordCount: auditLogs.length,
      format: 'json'
    },
    auditLogs: auditLogs.map(log => {
      const userId = log.get('userId');
      const userInfo = userMap[userId] || { name: 'Unknown User', email: 'N/A' };
      
      return {
        id: log.id,
        timestamp: log.get('createdAt')?.toISOString(),
        action: log.get('action'),
        user: {
          id: userId,
          name: userInfo.name,
          email: userInfo.email
        },
        resource: {
          type: log.get('resourceType'),
          id: log.get('resourceId')
        },
        details: log.get('details') || {},
        createdAt: log.get('createdAt')?.toISOString(),
        updatedAt: log.get('updatedAt')?.toISOString()
      };
    })
  };
  
  return JSON.stringify(jsonData, null, 2);
}

/**
 * Generate structured data for PDF generation
 */
function generatePDFData(auditLogs, userMap, filters) {
  const summary = {
    totalRecords: auditLogs.length,
    dateRange: {
      from: filters.startDate || 'All time',
      to: filters.endDate || 'Present'
    },
    filters: filters,
    generatedAt: new Date().toISOString()
  };
  
  // Action summary
  const actionCounts = {};
  auditLogs.forEach(log => {
    const action = log.get('action');
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });
  
  // User activity summary
  const userActivity = {};
  auditLogs.forEach(log => {
    const userId = log.get('userId');
    if (userId) {
      userActivity[userId] = (userActivity[userId] || 0) + 1;
    }
  });
  
  const topUsers = Object.entries(userActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([userId, count]) => ({
      userId,
      name: userMap[userId]?.name || 'Unknown User',
      email: userMap[userId]?.email || 'N/A',
      activityCount: count
    }));
  
  return {
    summary,
    actionSummary: Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([action, count]) => ({ action, count })),
    topUsers,
    auditLogs: auditLogs.slice(0, 1000).map(log => { // Limit detailed records for PDF
      const userId = log.get('userId');
      const userInfo = userMap[userId] || { name: 'Unknown User', email: 'N/A' };
      
      return {
        timestamp: log.get('createdAt')?.toISOString(),
        action: log.get('action'),
        userName: userInfo.name,
        resourceType: log.get('resourceType'),
        resourceId: log.get('resourceId'),
        details: log.get('details') || {}
      };
    })
  };
}

/**
 * Get export statistics for the organization
 * @param {Object} request - Parse Cloud Function request
 * @returns {Object} Export statistics
 */
Parse.Cloud.define('getExportStatistics', async (request) => {
  const { user } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    // Get export statistics from audit logs
    const exportQuery = new Parse.Query('AuditLog');
    exportQuery.equalTo('orgId', orgId);
    exportQuery.equalTo('action', 'audit_logs_exported');
    exportQuery.descending('createdAt');
    exportQuery.limit(100); // Last 100 exports
    
    const exports = await exportQuery.find({ useMasterKey: true });
    
    const statistics = {
      totalExports: exports.length,
      recentExports: exports.slice(0, 10).map(exp => ({
        exportedAt: exp.get('createdAt')?.toISOString(),
        exportedBy: exp.get('userId'),
        format: exp.get('details')?.format,
        recordCount: exp.get('details')?.recordCount,
        filename: exp.get('details')?.filename
      })),
      formatBreakdown: {},
      monthlyExports: {}
    };
    
    // Calculate format breakdown
    exports.forEach(exp => {
      const format = exp.get('details')?.format || 'unknown';
      statistics.formatBreakdown[format] = (statistics.formatBreakdown[format] || 0) + 1;
    });
    
    // Calculate monthly exports for the last 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toISOString().substring(0, 7); // YYYY-MM format
      statistics.monthlyExports[monthKey] = 0;
    }
    
    exports.forEach(exp => {
      const exportDate = exp.get('createdAt');
      if (exportDate) {
        const monthKey = exportDate.toISOString().substring(0, 7);
        if (statistics.monthlyExports.hasOwnProperty(monthKey)) {
          statistics.monthlyExports[monthKey]++;
        }
      }
    });
    
    return {
      success: true,
      statistics
    };

  } catch (error) {
    console.error('Error in getExportStatistics:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get export statistics');
  }
});