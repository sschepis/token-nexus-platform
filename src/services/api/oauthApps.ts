import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored OAuth Apps API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface CreateOAuthAppParams {
  name: string;
  redirectUris: string[];
  description?: string;
}

export interface UpdateOAuthAppParams {
  name?: string;
  redirectUris?: string[];
  description?: string;
}

export interface OAuthAppFilters {
  limit?: number;
  skip?: number;
}

export const oauthAppsApi = {
  /**
   * Creates a new OAuth application
   */
  async createOAuthApp(params: CreateOAuthAppParams) {
    return callCloudFunction('createOAuthApp', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create OAuth App'
    });
  },

  /**
   * Fetches a list of OAuth applications
   */
  async getOAuthApps(params: OAuthAppFilters = {}) {
    return callCloudFunction('getOAuthApps', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch OAuth Apps'
    });
  },

  /**
   * Updates an existing OAuth application
   */
  async updateOAuthApp(oauthAppId: string, params: UpdateOAuthAppParams) {
    return callCloudFunction('updateOAuthApp', { oauthAppId, ...params }, {
      errorMessage: 'Failed to update OAuth App'
    });
  },

  /**
   * Regenerates the client secret for an OAuth application
   */
  async regenerateOAuthSecret(oauthAppId: string) {
    return callCloudFunction('regenerateOAuthSecret', { oauthAppId }, {
      errorMessage: 'Failed to regenerate OAuth secret'
    });
  },

  /**
   * Deletes an OAuth application
   */
  async deleteOAuthApp(oauthAppId: string) {
    return callCloudFunction('deleteOAuthApp', { oauthAppId }, {
      errorMessage: 'Failed to delete OAuth App'
    });
  },

  /**
   * Batch delete multiple OAuth applications
   */
  async batchDeleteOAuthApps(oauthAppIds: string[]) {
    const operations = oauthAppIds.map(oauthAppId => 
      () => this.deleteOAuthApp(oauthAppId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple OAuth applications
   */
  async batchUpdateOAuthApps(updates: Array<{ oauthAppId: string; params: UpdateOAuthAppParams }>) {
    const operations = updates.map(({ oauthAppId, params }) => 
      () => this.updateOAuthApp(oauthAppId, params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch regenerate secrets for multiple OAuth applications
   */
  async batchRegenerateOAuthSecrets(oauthAppIds: string[]) {
    const operations = oauthAppIds.map(oauthAppId => 
      () => this.regenerateOAuthSecret(oauthAppId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementations for development
const mockOauthAppsApis = {
  createOAuthApp: (params: CreateOAuthAppParams) => {
    const newApp = {
      id: `oa-${Math.floor(Math.random() * 1000)}`,
      clientId: `client-${Math.floor(Math.random() * 1000)}`,
      clientSecret: `secret-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...params,
    };
    return Promise.resolve({
      success: true,
      data: { oauthApp: newApp }
    });
  },

  getOAuthApps: (params?: OAuthAppFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        oauthApps: [
          {
            id: 'oa-1',
            name: 'My OAuth App',
            clientId: 'client-123',
            redirectUris: ['https://app.example.com/oauth/callback'],
            description: 'App for testing OAuth flows.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'oa-2',
            name: 'Mobile App OAuth',
            clientId: 'client-456',
            redirectUris: ['https://mobile.example.com/oauth/callback', 'https://mobile.example.com/oauth/redirect'],
            description: 'OAuth app for mobile application.',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
        totalCount: 2,
      }
    });
  },

  updateOAuthApp: (oauthAppId: string, params: UpdateOAuthAppParams) => {
    return Promise.resolve({
      success: true,
      data: { oauthApp: { id: oauthAppId, ...params, updatedAt: new Date().toISOString() } }
    });
  },

  regenerateOAuthSecret: (oauthAppId: string) => {
    return Promise.resolve({
      success: true,
      data: { 
        clientSecret: `new-secret-${Math.floor(Math.random() * 1000)}`, 
        message: 'OAuth secret regenerated successfully.',
        regeneratedAt: new Date().toISOString()
      }
    });
  },

  deleteOAuthApp: (oauthAppId: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `OAuth App ${oauthAppId} deleted successfully` }
    });
  },

  batchDeleteOAuthApps: (oauthAppIds: string[]) => {
    return Promise.resolve({
      results: oauthAppIds.map(() => ({ success: true })),
      successCount: oauthAppIds.length,
      errorCount: 0
    });
  },

  batchUpdateOAuthApps: (updates: Array<{ oauthAppId: string; params: UpdateOAuthAppParams }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchRegenerateOAuthSecrets: (oauthAppIds: string[]) => {
    return Promise.resolve({
      results: oauthAppIds.map(() => ({ success: true })),
      successCount: oauthAppIds.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  createOAuthApp,
  getOAuthApps,
  updateOAuthApp,
  regenerateOAuthSecret,
  deleteOAuthApp,
  batchDeleteOAuthApps,
  batchUpdateOAuthApps,
  batchRegenerateOAuthSecrets
} = oauthAppsApi;

// Use mock or real API based on environment
const finalOAuthAppsApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockOauthAppsApis : oauthAppsApi;

// Default export
export default finalOAuthAppsApi;