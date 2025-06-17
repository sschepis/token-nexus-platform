import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored tokens API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface TokenData {
  name: string;
  symbol: string;
  type: string;
  blockchain: string;
  supply: number;
  description?: string;
  decimals?: number;
  orgId?: string;
}

export interface TokenParams {
  orgId?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export interface TokenStatusUpdate {
  reason?: string;
  contractAddress?: string;
}

export const tokensApi = {
  /**
   * Fetch tokens with filters
   */
  async getTokens(params: TokenParams = {}) {
    return callCloudFunctionForArray('getTokens', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch tokens'
    });
  },

  /**
   * Create a new token
   */
  async createToken(tokenData: TokenData) {
    return callCloudFunction('createToken', tokenData as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create token'
    });
  },

  /**
   * Get token details by ID
   */
  async getTokenDetails(tokenId: string) {
    return callCloudFunction('getTokenDetails', { tokenId }, {
      errorMessage: 'Failed to fetch token details'
    });
  },

  /**
   * Update token status
   */
  async updateTokenStatus(tokenId: string, status: string, options: TokenStatusUpdate = {}) {
    return callCloudFunction('updateTokenStatus', {
      tokenId,
      status,
      ...options
    }, {
      errorMessage: 'Failed to update token status'
    });
  },

  /**
   * Delete token
   */
  async deleteToken(tokenId: string) {
    return callCloudFunction('deleteToken', { tokenId }, {
      errorMessage: 'Failed to delete token'
    });
  },

  /**
   * Batch operations for tokens
   */
  async batchUpdateTokens(updates: Array<{ tokenId: string; status: string; options?: TokenStatusUpdate }>) {
    const operations = updates.map(({ tokenId, status, options = {} }) => 
      () => this.updateTokenStatus(tokenId, status, options)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch delete tokens
   */
  async batchDeleteTokens(tokenIds: string[]) {
    const operations = tokenIds.map(tokenId => 
      () => this.deleteToken(tokenId)
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
  getTokens,
  createToken,
  getTokenDetails,
  updateTokenStatus,
  deleteToken,
  batchUpdateTokens,
  batchDeleteTokens
} = tokensApi;

// Default export
export default tokensApi;