/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file Dashboard API services.
 * Handles operations related to user dashboard layouts and widgets via Parse Cloud Functions.
 */
const dashboardApi = {
  /**
   * Saves a user's dashboard layout and widget configuration.
   * @param {object} params - Parameters for saving the dashboard layout.
   * @param {string} params.userId - The ID of the user whose dashboard is being saved.
   * @param {string} params.orgId - The ID of the organization the dashboard belongs to.
   * @param {any[]} params.layouts - An array representing the layout structure of the dashboard.
   * @param {any[]} params.widgets - An array representing the configuration of widgets on the dashboard.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status and message.
   * @throws {Error} Throws an error if saving the dashboard layout fails.
   */
  saveDashboardLayout: async (params: { userId: string; orgId: string; layouts: any[]; widgets: any[]; }): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('saveDashboardLayout', params);
      return { data: result };
    } catch (error: any) {
      console.debug('[Dashboard API] Error calling saveDashboardLayout cloud function:', error);
      throw new Error(error.message || 'Failed to save dashboard layout');
    }
  },

  /**
   * Retrieves a user's dashboard layout and widget configuration.
   * @param {string} userId - The ID of the user whose dashboard layout is to be retrieved.
   * @param {string} orgId - The ID of the organization the dashboard belongs to.
   * @returns {Promise<{ data: { layouts: any[]; widgets: any[] } }>} A promise that resolves with an object containing the dashboard layouts and widgets.
   * @throws {Error} Throws an error if retrieving the dashboard layout fails.
   */
  getDashboardLayout: async (userId: string, orgId: string): Promise<{ data: { layouts: any[]; widgets: any[] } }> => {
    try {
      const result = await Parse.Cloud.run('getDashboardLayout', { userId, orgId });
      return { data: result };
    } catch (error: any) {
      console.debug('[Dashboard API] Error calling getDashboardLayout cloud function:', error);
      throw new Error(error.message || 'Failed to get dashboard layout');
    }
  },
};

const mockDashboardApis = {
  saveDashboardLayout: (params: any) => {
    return mockResponse({ success: true, message: 'Dashboard layout saved successfully (mock)' });
  },

  getDashboardLayout: (userId: string, orgId: string) => {
    return mockResponse({ layouts: [], widgets: [] }); // Return empty for mock
  },
};

// Merge Dashboard APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockDashboardApis : dashboardApi);