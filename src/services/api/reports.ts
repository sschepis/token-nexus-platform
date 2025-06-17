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
if (process.env.NODE_ENV === 'development') {
  const mockReports = [
    {
      id: 'report-1',
      type: 'user_activity',
      status: 'completed',
      createdAt: new Date().toISOString(),
      format: 'pdf',
      fileUrl: '/mock/reports/user_activity.pdf',
      title: 'User Activity Report',
      description: 'Daily user activity and login statistics'
    },
    {
      id: 'report-2',
      type: 'token_usage',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      format: 'csv',
      fileUrl: '/mock/reports/token_usage.csv',
      title: 'Token Usage Report',
      description: 'Token consumption and API usage metrics'
    },
    {
      id: 'report-3',
      type: 'security_events',
      status: 'completed',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      format: 'json',
      fileUrl: '/mock/reports/security_events.json',
      title: 'Security Events Report',
      description: 'Security incidents and audit trail'
    }
  ];

  const generateMockReportData = (type: ReportType) => {
    const today = new Date();
    const mockData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      switch (type) {
        case 'user_activity':
          mockData.push({
            date: date.toISOString(),
            activeUsers: Math.floor(Math.random() * 100) + 50,
            logins: Math.floor(Math.random() * 200) + 100,
            sessions: Math.floor(Math.random() * 300) + 150
          });
          break;
        case 'token_usage':
          mockData.push({
            date: date.toISOString(),
            tokensUsed: Math.floor(Math.random() * 1000) + 500,
            apiCalls: Math.floor(Math.random() * 2000) + 1000,
            cost: (Math.random() * 50 + 25).toFixed(2)
          });
          break;
        case 'security_events':
          mockData.push({
            date: date.toISOString(),
            failedLogins: Math.floor(Math.random() * 10),
            suspiciousActivity: Math.floor(Math.random() * 5),
            blockedRequests: Math.floor(Math.random() * 20)
          });
          break;
        default:
          mockData.push({
            date: date.toISOString(),
            value: Math.floor(Math.random() * 100)
          });
      }
    }
    
    return mockData.reverse();
  };

  // Override with mock implementations
  Object.assign(reportsApi, {
    async generateReport(params: GenerateReportParams) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const reportId = `report-${Date.now()}`;
      const reportData = generateMockReportData(params.type);
      
      return {
        success: true,
        data: {
          report: {
            id: reportId,
            type: params.type,
            format: params.format || 'json',
            data: reportData,
            metadata: {
              generatedAt: new Date().toISOString(),
              startDate: params.startDate,
              endDate: params.endDate,
              filters: params.filters,
              recordCount: reportData.length
            }
          },
          reportId
        },
        error: null
      };
    },

    async getReports(params: GetReportsParams = {}) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      let filteredReports = mockReports;
      if (params.type) {
        filteredReports = mockReports.filter(report => report.type === params.type);
      }
      
      const skip = params.skip || 0;
      const limit = params.limit || 10;
      const paginatedReports = filteredReports.slice(skip, skip + limit);
      
      return {
        success: true,
        data: {
          reports: paginatedReports,
          totalCount: filteredReports.length,
          statistics: {
            completed: mockReports.filter(r => r.status === 'completed').length,
            pending: mockReports.filter(r => r.status === 'pending').length,
            failed: mockReports.filter(r => r.status === 'failed').length,
            totalSize: '2.4 MB',
            lastGenerated: mockReports[0]?.createdAt
          }
        },
        error: null
      };
    }
  });
}