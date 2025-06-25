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

// Default export
export default apiKeysApi;