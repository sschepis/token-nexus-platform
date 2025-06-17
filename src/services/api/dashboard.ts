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
};

// Mock implementation for development
if (process.env.NODE_ENV === 'development') {
  const mockLayouts = [
    {
      i: 'widget-1',
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      minW: 3,
      minH: 2
    },
    {
      i: 'widget-2',
      x: 6,
      y: 0,
      w: 6,
      h: 4,
      minW: 3,
      minH: 2
    },
    {
      i: 'widget-3',
      x: 0,
      y: 4,
      w: 12,
      h: 6,
      minW: 6,
      minH: 4
    }
  ];

  const mockWidgets = [
    {
      id: 'widget-1',
      type: 'metric',
      title: 'Total Users',
      config: {
        metric: 'users.total',
        format: 'number',
        color: '#3b82f6'
      },
      data: {
        value: 1247,
        change: '+12%',
        trend: 'up'
      }
    },
    {
      id: 'widget-2',
      type: 'metric',
      title: 'Active Sessions',
      config: {
        metric: 'sessions.active',
        format: 'number',
        color: '#10b981'
      },
      data: {
        value: 89,
        change: '+5%',
        trend: 'up'
      }
    },
    {
      id: 'widget-3',
      type: 'chart',
      title: 'User Activity Over Time',
      config: {
        chartType: 'line',
        dataSource: 'analytics.user_activity',
        timeRange: '7d'
      },
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Active Users',
            data: [120, 135, 142, 158, 167, 145, 132],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }
        ]
      }
    }
  ];

  // Override with mock implementations
  Object.assign(dashboardApi, {
    async saveDashboardLayout(params: SaveDashboardParams) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate validation
      if (!params.userId || !params.orgId) {
        return {
          success: false,
          data: { success: false, message: 'Missing required parameters' },
          error: 'Validation failed'
        };
      }
      
      return {
        success: true,
        data: { 
          success: true, 
          message: 'Dashboard layout saved successfully',
          layoutId: `layout-${Date.now()}`,
          timestamp: new Date().toISOString()
        },
        error: null
      };
    },

    async getDashboardLayout(userId: string, orgId: string) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate user-specific customizations
      const userLayouts = mockLayouts.map(layout => ({
        ...layout,
        // Add some variation based on userId
        x: layout.x + (userId.length % 2),
        y: layout.y + (orgId.length % 2)
      }));
      
      return {
        success: true,
        data: {
          layouts: userLayouts,
          widgets: mockWidgets,
          metadata: {
            userId,
            orgId,
            lastModified: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        error: null
      };
    }
  });
}