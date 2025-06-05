/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file OAuth Applications API services.
 * Handles operations related to OAuth applications via Parse Cloud Functions.
 */
export const oauthAppsApi = {
  /**
   * Creates a new OAuth application.
   * @param {object} params - Parameters for the new OAuth application.
   * @param {string} params.name - The name of the OAuth application.
   * @param {string[]} params.redirectUris - An array of valid redirect URIs for the application.
   * @param {string} [params.description] - A description for the OAuth application.
   * @returns {Promise<{ data: { oauthApp: any } }>} A promise that resolves with an object containing the newly created OAuth application.
   * @throws {Error} Throws an error if OAuth application creation fails.
   */
  createOAuthApp: async (params: {
    name: string;
    redirectUris: string[];
    description?: string;
  }): Promise<{ data: { oauthApp: any } }> => {
    try {
      const result = await Parse.Cloud.run('createOAuthApp', params);
      
      return {
        data: {
          oauthApp: result.oauthApp
        }
      };
    } catch (error: any) {
      console.debug('[OAuth Apps API] Error calling createOAuthApp cloud function:', error);
      throw new Error(error.message || 'Failed to create OAuth App');
    }
  },

  /**
   * Fetches a list of OAuth applications.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {number} [params.limit] - Maximum number of OAuth applications to return.
   * @param {number} [params.skip] - Number of OAuth applications to skip for pagination.
   * @returns {Promise<{ data: { oauthApps: any[]; totalCount: number } }>} A promise that resolves with an object containing the list of OAuth applications and total count.
   * @throws {Error} Throws an error if fetching OAuth applications fails.
   */
  getOAuthApps: async (params?: {
    limit?: number;
    skip?: number;
  }): Promise<{ data: { oauthApps: any[]; totalCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('getOAuthApps', params || {});
      
      return {
        data: {
          oauthApps: result.oauthApps || [],
          totalCount: result.totalCount || 0
        }
      };
    } catch (error: any) {
      console.debug('[OAuth Apps API] Error calling getOAuthApps cloud function:', error);
      throw new Error(error.message || 'Failed to fetch OAuth Apps');
    }
  },

  /**
   * Updates an existing OAuth application.
   * @param {string} oauthAppId - The ID of the OAuth application to update.
   * @param {object} params - Parameters to update for the OAuth application.
   * @param {string} [params.name] - New name for the OAuth application.
   * @param {string[]} [params.redirectUris] - New array of redirect URIs.
   * @param {string} [params.description] - New description for the OAuth application.
   * @returns {Promise<{ data: { oauthApp: any } }>} A promise that resolves with an object containing the updated OAuth application.
   * @throws {Error} Throws an error if updating the OAuth application fails.
   */
  updateOAuthApp: async (oauthAppId: string, params: {
    name?: string;
    redirectUris?: string[];
    description?: string;
  }): Promise<{ data: { oauthApp: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateOAuthApp', { oauthAppId, ...params });
      
      return {
        data: {
          oauthApp: result.oauthApp
        }
      };
    } catch (error: any) {
      console.debug('[OAuth Apps API] Error calling updateOAuthApp cloud function:', error);
      throw new Error(error.message || 'Failed to update OAuth App');
    }
  },

  /**
   * Regenerates the client secret for an OAuth application.
   * @param {string} oauthAppId - The ID of the OAuth application to regenerate the secret for.
   * @returns {Promise<{ data: { clientSecret: string; message: string } }>} A promise that resolves with the new client secret and a message.
   * @throws {Error} Throws an error if regenerating the OAuth secret fails.
   */
  regenerateOAuthSecret: async (oauthAppId: string): Promise<{ data: { clientSecret: string; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('regenerateOAuthSecret', { oauthAppId });
      
      return {
        data: {
          clientSecret: result.clientSecret,
          message: result.message
        }
      };
    } catch (error: any) {
      console.debug('[OAuth Apps API] Error calling regenerateOAuthSecret cloud function:', error);
      throw new Error(error.message || 'Failed to regenerate OAuth secret');
    }
  },

  /**
   * Deletes an OAuth application.
   * @param {string} oauthAppId - The ID of the OAuth application to delete.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status.
   * @throws {Error} Throws an error if deleting the OAuth application fails.
   */
  deleteOAuthApp: async (oauthAppId: string): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('deleteOAuthApp', { oauthAppId });
      
      return {
        data: {
          success: result.success,
          message: result.message
        }
      };
    } catch (error: any) {
      console.debug('[OAuth Apps API] Error calling deleteOAuthApp cloud function:', error);
      throw new Error(error.message || 'Failed to delete OAuth App');
    }
  },
};

export const mockOauthAppsApis = {
  createOAuthApp: (params: any) => {
    const newApp = {
      id: `oa-${Math.floor(Math.random() * 1000)}`,
      clientId: `client-${Math.floor(Math.random() * 1000)}`,
      clientSecret: `secret-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...params,
    };
    return mockResponse({ oauthApp: newApp });
  },

  getOAuthApps: () => {
    return mockResponse({
      oauthApps: [
        {
          id: 'oa-1',
          name: 'My OAuth App',
          clientId: 'client-123',
          redirectUris: ['https://app.example.com/oauth/callback'],
          description: 'App for testing OAuth flows.',
          createdAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    });
  },

  updateOAuthApp: (oauthAppId: string, params: any) => {
    return mockResponse({ oauthApp: { id: oauthAppId, ...params } });
  },

  regenerateOAuthSecret: (oauthAppId: string) => {
    return mockResponse({ clientSecret: `new-secret-${Math.floor(Math.random() * 1000)}`, message: 'OAuth secret regenerated.' });
  },

  deleteOAuthApp: (oauthAppId: string) => {
    return mockResponse({ success: true, message: `OAuth App ${oauthAppId} deleted successfully` });
  },
};

// Merge OAuth Apps APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockOauthAppsApis : oauthAppsApi);