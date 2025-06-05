/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file API Keys API services.
 * Handles operations related to API keys via Parse Cloud Functions.
 */
export const apiKeysApi = {
  /**
   * Creates a new API key.
   * @param {object} params - Parameters for the new API key.
   * @param {string} params.name - The name of the API key.
   * @param {string[]} params.permissions - An array of permissions granted to this API key.
   * @param {string} [params.expiresAt] - An optional ISO date string when the API key expires.
   * @returns {Promise<{ data: { apiKey: any } }>} A promise that resolves with an object containing the newly created API key.
   * @throws {Error} Throws an error if API key creation fails.
   */
  createApiKey: async (params: {
    name: string;
    permissions: string[];
    expiresAt?: string;
  }): Promise<{ data: { apiKey: any } }> => {
    try {
      const result = await Parse.Cloud.run('createApiKey', params);
      
      return {
        data: {
          apiKey: result.apiKey
        }
      };
    } catch (error: any) {
      console.debug('[API Keys API] Error calling createApiKey cloud function:', error);
      throw new Error(error.message || 'Failed to create API Key');
    }
  },

  /**
   * Fetches a list of API keys.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {number} [params.limit] - Maximum number of API keys to return.
   * @param {number} [params.skip] - Number of API keys to skip for pagination.
   * @returns {Promise<{ data: { apiKeys: any[]; totalCount: number } }>} A promise that resolves with an object containing the list of API keys and total count.
   * @throws {Error} Throws an error if fetching API keys fails.
   */
  getApiKeys: async (params?: {
    limit?: number;
    skip?: number;
  }): Promise<{ data: { apiKeys: any[]; totalCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('getApiKeys', params || {});
      
      return {
        data: {
          apiKeys: result.apiKeys || [],
          totalCount: result.totalCount || 0
        }
      };
    } catch (error: any) {
      console.debug('[API Keys API] Error calling getApiKeys cloud function:', error);
      throw new Error(error.message || 'Failed to fetch API Keys');
    }
  },

  /**
   * Updates an existing API key.
   * @param {string} apiKeyId - The ID of the API key to update.
   * @param {object} params - Parameters to update for the API key.
   * @param {string} [params.name] - New name for the API key.
   * @param {string[]} [params.permissions] - New array of permissions.
   * @param {string} [params.expiresAt] - New expiration date for the API key (ISO date string).
   * @param {boolean} [params.isActive] - New active status for the API key.
   * @returns {Promise<{ data: { apiKey: any } }>} A promise that resolves with an object containing the updated API key.
   * @throws {Error} Throws an error if updating the API key fails.
   */
  updateApiKey: async (apiKeyId: string, params: {
    name?: string;
    permissions?: string[];
    expiresAt?: string;
    isActive?: boolean;
  }): Promise<{ data: { apiKey: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateApiKey', { apiKeyId, ...params });
      
      return {
        data: {
          apiKey: result.apiKey
        }
      };
    } catch (error: any) {
      console.debug('[API Keys API] Error calling updateApiKey cloud function:', error);
      throw new Error(error.message || 'Failed to update API Key');
    }
  },

  /**
   * Deletes an API key.
   * @param {string} apiKeyId - The ID of the API key to delete.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status.
   * @throws {Error} Throws an error if deleting the API key fails.
   */
  deleteApiKey: async (apiKeyId: string): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('deleteApiKey', { apiKeyId });
      
      return {
        data: {
          success: result.success,
          message: result.message
        }
      };
    } catch (error: any) {
      console.debug('[API Keys API] Error calling deleteApiKey cloud function:', error);
      throw new Error(error.message || 'Failed to delete API Key');
    }
  },

  /**
   * Retrieves usage data for API keys.
   * @param {string} [apiKeyId] - Optional. The ID of a specific API key to get usage for. If not provided, overall usage is returned.
   * @returns {Promise<{ data: { usage?: any; statistics?: any } }>} A promise that resolves with usage data and statistics.
   * @throws {Error} Throws an error if fetching API key usage fails.
   */
  getApiKeyUsage: async (apiKeyId?: string): Promise<{ data: { usage?: any; statistics?: any } }> => {
    try {
      // For a specific API key
      if (apiKeyId) {
        const result = await Parse.Cloud.run('getApiKeyUsage', { query: { apiKeyId } });
        return { data: { usage: result.usage, statistics: result.statistics } };
      }
      // For overall API key usage (if API supports it)
      const result = await Parse.Cloud.run('getApiKeyUsage');
      return { data: { usage: result.usage || [], statistics: result.statistics || {} } };
    } catch (error: any) {
      console.debug('[API Keys API] Error calling getApiKeyUsage cloud function:', error);
      throw new Error(error.message || 'Failed to fetch API Key Usage');
    }
  },
};

export const mockApiKeysApis = {
  createApiKey: (params: any) => {
    const newKey = {
      id: `ak-${Math.floor(Math.random() * 1000)}`,
      key: `key-${Math.floor(Math.random() * 1000)}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...params,
    };
    return mockResponse({ apiKey: newKey });
  },

  getApiKeys: () => {
    return mockResponse({
      apiKeys: [
        {
          id: 'ak-1',
          name: 'Admin Key',
          key: 'dummy-admin-key',
          permissions: ['admin', 'token:read', 'token:write'],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    });
  },

  updateApiKey: (apiKeyId: string, params: any) => {
    return mockResponse({ apiKey: { id: apiKeyId, ...params } });
  },

  deleteApiKey: (apiKeyId: string) => {
    return mockResponse({ success: true, message: `API Key ${apiKeyId} deleted successfully` });
  },

  getApiKeyUsage: (apiKeyId?: string) => {
    if (apiKeyId) {
      return mockResponse({ usage: { calls: 100, errors: 5 }, statistics: { last24hrs: '...' } });
    }
    return mockResponse({ usage: { totalCalls: 5000, totalErrors: 50 }, statistics: { last7days: '...' } });
  },
};

// Merge API Keys API into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockApiKeysApis : apiKeysApi);