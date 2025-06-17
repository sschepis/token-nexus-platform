import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored API Keys API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface CreateApiKeyParams {
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyParams {
  name?: string;
  permissions?: string[];
  expiresAt?: string;
  isActive?: boolean;
}

export interface ApiKeyFilters {
  limit?: number;
  skip?: number;
}

export const apiKeysApi = {
  /**
   * Creates a new API key
   */
  async createApiKey(params: CreateApiKeyParams) {
    return callCloudFunction('createApiKey', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create API Key'
    });
  },

  /**
   * Fetches a list of API keys
   */
  async getApiKeys(params: ApiKeyFilters = {}) {
    return callCloudFunction('getApiKeys', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch API Keys'
    });
  },

  /**
   * Updates an existing API key
   */
  async updateApiKey(apiKeyId: string, params: UpdateApiKeyParams) {
    return callCloudFunction('updateApiKey', { apiKeyId, ...params }, {
      errorMessage: 'Failed to update API Key'
    });
  },

  /**
   * Deletes an API key
   */
  async deleteApiKey(apiKeyId: string) {
    return callCloudFunction('deleteApiKey', { apiKeyId }, {
      errorMessage: 'Failed to delete API Key'
    });
  },

  /**
   * Retrieves usage data for API keys
   */
  async getApiKeyUsage(apiKeyId?: string) {
    const params = apiKeyId ? { query: { apiKeyId } } : {};
    return callCloudFunction('getApiKeyUsage', params, {
      errorMessage: 'Failed to fetch API Key Usage'
    });
  },

  /**
   * Batch delete multiple API keys
   */
  async batchDeleteApiKeys(apiKeyIds: string[]) {
    const operations = apiKeyIds.map(apiKeyId => 
      () => this.deleteApiKey(apiKeyId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple API keys
   */
  async batchUpdateApiKeys(updates: Array<{ apiKeyId: string; params: UpdateApiKeyParams }>) {
    const operations = updates.map(({ apiKeyId, params }) => 
      () => this.updateApiKey(apiKeyId, params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch get usage for multiple API keys
   */
  async batchGetApiKeyUsage(apiKeyIds: string[]) {
    const operations = apiKeyIds.map(apiKeyId => 
      () => this.getApiKeyUsage(apiKeyId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementations for development
const mockApiKeysApis = {
  createApiKey: (params: CreateApiKeyParams) => {
    const newKey = {
      id: `ak-${Math.floor(Math.random() * 1000)}`,
      key: `key-${Math.floor(Math.random() * 1000)}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...params,
    };
    return Promise.resolve({
      success: true,
      data: { apiKey: newKey }
    });
  },

  getApiKeys: (params?: ApiKeyFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        apiKeys: [
          {
            id: 'ak-1',
            name: 'Admin Key',
            key: 'dummy-admin-key-***',
            permissions: ['admin', 'token:read', 'token:write'],
            isActive: true,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            lastUsed: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'ak-2',
            name: 'Read Only Key',
            key: 'dummy-readonly-key-***',
            permissions: ['token:read', 'user:read'],
            isActive: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            lastUsed: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'ak-3',
            name: 'Expired Key',
            key: 'dummy-expired-key-***',
            permissions: ['token:read'],
            isActive: false,
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            expiresAt: new Date(Date.now() - 86400000).toISOString(),
            lastUsed: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        totalCount: 3,
      }
    });
  },

  updateApiKey: (apiKeyId: string, params: UpdateApiKeyParams) => {
    return Promise.resolve({
      success: true,
      data: { apiKey: { id: apiKeyId, ...params, updatedAt: new Date().toISOString() } }
    });
  },

  deleteApiKey: (apiKeyId: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `API Key ${apiKeyId} deleted successfully` }
    });
  },

  getApiKeyUsage: (apiKeyId?: string) => {
    if (apiKeyId) {
      return Promise.resolve({
        success: true,
        data: { 
          usage: { 
            calls: 1250, 
            errors: 15, 
            successRate: 0.988,
            lastCall: new Date(Date.now() - 3600000).toISOString()
          }, 
          statistics: { 
            last24hrs: {
              calls: 150,
              errors: 2,
              avgResponseTime: 245
            },
            last7days: {
              calls: 1250,
              errors: 15,
              avgResponseTime: 230
            }
          } 
        }
      });
    }
    return Promise.resolve({
      success: true,
      data: { 
        usage: { 
          totalCalls: 15000, 
          totalErrors: 150,
          totalKeys: 3,
          activeKeys: 2
        }, 
        statistics: { 
          last7days: {
            totalCalls: 5000,
            totalErrors: 50,
            avgResponseTime: 235,
            topKeys: [
              { id: 'ak-1', calls: 3000 },
              { id: 'ak-2', calls: 2000 }
            ]
          }
        } 
      }
    });
  },

  batchDeleteApiKeys: (apiKeyIds: string[]) => {
    return Promise.resolve({
      results: apiKeyIds.map(() => ({ success: true })),
      successCount: apiKeyIds.length,
      errorCount: 0
    });
  },

  batchUpdateApiKeys: (updates: Array<{ apiKeyId: string; params: UpdateApiKeyParams }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchGetApiKeyUsage: (apiKeyIds: string[]) => {
    return Promise.resolve({
      results: apiKeyIds.map(() => ({ success: true })),
      successCount: apiKeyIds.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  createApiKey,
  getApiKeys,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage,
  batchDeleteApiKeys,
  batchUpdateApiKeys,
  batchGetApiKeyUsage
} = apiKeysApi;

// Use mock or real API based on environment
const finalApiKeysApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockApiKeysApis : apiKeysApi;

// Default export
export default finalApiKeysApi;