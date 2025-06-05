/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file Report API services.
 * Handles operations related to generating and fetching reports via Parse Cloud Functions.
 */
const reportApi = {
  /**
   * Generates a report of a specified type with given parameters.
   * @param {object} params - Parameters for report generation.
   * @param {'user_activity' | 'token_usage' | 'security_events' | 'organization_summary'} params.type - The type of report to generate.
   * @param {string} [params.startDate] - Start date for data inclusion in the report (ISO string).
   * @param {string} [params.endDate] - End date for data inclusion in the report (ISO string).
   * @param {any} [params.filters] - Additional filters to apply to the report's data.
   * @param {'json' | 'csv' | 'pdf'} [params.format] - The desired output format of the report.
   * @returns {Promise<{ data: { report: any; reportId: string } }>} A promise that resolves with the generated report data and its ID.
   * @throws {Error} Throws an error if report generation fails.
   */
  generateReport: async (params: {
    type: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
    startDate?: string;
    endDate?: string;
    filters?: any;
    format?: 'json' | 'csv' | 'pdf';
  }): Promise<{ data: { report: any; reportId: string } }> => {
    try {
      const result = await Parse.Cloud.run('generateReport', params);
      
      return {
        data: {
          report: result.report,
          reportId: result.reportId
        }
      };
    } catch (error: any) {
      console.debug('[Report API] Error calling generateReport cloud function:', error);
      throw new Error(error.message || 'Failed to generate report');
    }
  },

  /**
   * Fetches a list of previously generated reports.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.type] - Filter reports by type.
   * @param {number} [params.limit] - Maximum number of reports to return.
   * @param {number} [params.skip] - Number of reports to skip for pagination.
   * @returns {Promise<{ data: { reports: any[]; totalCount: number; statistics: any } }>} A promise that resolves with a list of reports, total count, and statistics.
   * @throws {Error} Throws an error if fetching reports fails.
   */
  getReports: async (params?: {
    type?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: { reports: any[]; totalCount: number; statistics: any } }> => {
    try {
      const result = await Parse.Cloud.run('getReports', params || {});
      
      return {
        data: {
          reports: result.reports || [],
          totalCount: result.totalCount || 0,
          statistics: result.statistics || {}
        }
      };
    } catch (error: any) {
      console.debug('[Report API] Error calling getReports cloud function:', error);
      throw new Error(error.message || 'Failed to fetch reports');
    }
  },
};

const mockReportApis = {
  getReportData: (reportType: string, timeRange: string) => {
    // Generate mock data based on reportType and timeRange
    const today = new Date();
    const mockAuditEvents = [
      { id: '1', date: new Date(today.setDate(today.getDate() - 1)).toISOString(), users: 50, logins: 120, tokenUsage: 300 },
      { id: '2', date: new Date(today.setDate(today.getDate() - 2)).toISOString(), users: 45, logins: 110, tokenUsage: 280 },
      { id: '3', date: new Date(today.setDate(today.getDate() - 3)).toISOString(), users: 55, logins: 130, tokenUsage: 320 },
    ];

    switch (reportType) {
      case 'token-activity':
        return mockResponse({
          labels: mockAuditEvents.map(e => new Date(e.date).toLocaleDateString()),
          data: mockAuditEvents.map(e => e.tokenUsage),
          title: 'Token Activity',
          description: 'Daily token usage over time.',
        });
      case 'user-activity':
        return mockResponse({
          labels: mockAuditEvents.map(e => new Date(e.date).toLocaleDateString()),
          data: mockAuditEvents.map(e => e.logins),
          title: 'User Activity',
          description: 'Daily user logins over time.',
        });
      default:
        return mockResponse({
          labels: [],
          data: [],
          title: 'No Data',
          description: 'No data available for this report type.',
        });
    }
  },

  exportReportData: (reportType: string, format: string) => {
    // Mock export data response
    return mockResponse({
      fileUrl: `/mock/reports/${reportType}.${format}`,
      message: `Mock ${reportType} report in ${format} format exported successfully.`,
    });
  },

  generateReport: (params: any) => {
    return mockResponse({ report: { id: `report-${Date.now()}`, ...params }, reportId: `report-${Date.now()}` });
  },

  getReports: () => {
    return mockResponse({
      reports: [
        {
          id: 'report-1',
          type: 'user_activity',
          status: 'completed',
          createdAt: new Date().toISOString(),
          format: 'pdf',
          fileUrl: '/mock/reports/user_activity.pdf',
        },
        {
          id: 'report-2',
          type: 'token_usage',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          format: 'csv',
          fileUrl: '/mock/reports/token_usage.csv',
        },
      ],
      totalCount: 2,
      statistics: {
        completed: 1,
        pending: 1,
      },
    });
  },
};

// Merge Report APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockReportApis : reportApi);