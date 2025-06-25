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

// Default export
export default oauthAppsApi;