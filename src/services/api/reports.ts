import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Refactored Reports API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export type ReportType = 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
export type ReportFormat = 'json' | 'csv' | 'pdf';

export interface GenerateReportParams {
  type: ReportType;
  startDate?: string;
  endDate?: string;
  filters?: any;
  format?: ReportFormat;
}

export interface GetReportsParams {
  type?: string;
  limit?: number;
  skip?: number;
}

export interface ReportData {
  report: any;
  reportId: string;
}

export interface ReportsListData {
  reports: any[];
  totalCount: number;
  statistics: any;
}

export const reportsApi = {
  /**
   * Generates a report of a specified type with given parameters.
   */
  async generateReport(params: GenerateReportParams) {
    const response = await callCloudFunction<ReportData>(
      'generateReport',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to generate report'
      }
    );
    
    // Transform the response to match the expected format
    return {
      success: response.success,
      data: {
        report: response.data?.report,
        reportId: response.data?.reportId
      },
      error: response.error
    };
  },

  /**
   * Fetches a list of previously generated reports.
   */
  async getReports(params: GetReportsParams = {}) {
    const response = await callCloudFunction<ReportsListData>(
      'getReports',
      params as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch reports'
      }
    );
    
    // Transform the response to match the expected format
    return {
      success: response.success,
      data: {
        reports: response.data?.reports || [],
        totalCount: response.data?.totalCount || 0,
        statistics: response.data?.statistics || {}
      },
      error: response.error
    };
  },
};

// Mock implementation for development