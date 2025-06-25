import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Refactored Dashboard API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface DashboardLayout {
  userId: string;
  orgId: string;
  layouts: any[];
  widgets: any[];
}

export interface SaveDashboardParams {
  userId: string;
  orgId: string;
  layouts: any[];
  widgets: any[];
}

export interface DashboardLayoutData {
  layouts: any[];
  widgets: any[];
}

export interface SaveDashboardResponse {
  success: boolean;
  message: string;
}

export interface ChartDataParams {
  organizationId: string;
  chartType: string;
  period: string;
}

export interface MetricsParams {
  organizationId: string;
}

export interface ActivityParams {
  organizationId: string;
  limit?: number;
}

export const dashboardApi = {
  /**
   * Saves a user's dashboard layout and widget configuration.
   */
  async saveDashboardLayout(params: SaveDashboardParams) {
    const response = await callCloudFunction<SaveDashboardResponse>(
      'saveDashboardLayout',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to save dashboard layout'
      }
    );
    
    // Transform the response to match the expected format
    return {
      success: response.success,
      data: response.data || { success: false, message: 'Unknown error' },
      error: response.error
    };
  },

  /**
   * Retrieves a user's dashboard layout and widget configuration.
   */
  async getDashboardLayout(userId: string, orgId: string) {
    const response = await callCloudFunction<DashboardLayoutData>(
      'getDashboardLayout',
      { userId, orgId },
      {
        errorMessage: 'Failed to get dashboard layout'
      }
    );
    
    // Transform the response to match the expected format
    return {
      success: response.success,
      data: response.data || { layouts: [], widgets: [] },
      error: response.error
    };
  },

  /**
   * Gets chart data for dashboard widgets.
   */
  async getDashboardChartData(params: ChartDataParams) {
    return await callCloudFunction<any[]>(
      'getDashboardChartData',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to get chart data'
      }
    );
  },

  /**
   * Gets dashboard metrics.
   */
  async getDashboardMetrics(params: MetricsParams) {
    return await callCloudFunction<any>(
      'getDashboardMetrics',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to get dashboard metrics'
      }
    );
  },

  /**
   * Gets dashboard activity feed.
   */
  async getDashboardActivity(params: ActivityParams) {
    return await callCloudFunction<any[]>(
      'getDashboardActivity',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to get dashboard activity'
      }
    );
  },
};

// Mock implementation for development