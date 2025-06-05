/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file Token API services.
 * Handles operations related to digital tokens via Parse Cloud Functions.
 */
const tokenApi = {
  /**
   * Fetches a list of tokens based on provided parameters.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.orgId] - Organization ID to filter tokens.
   * @param {string} [params.status] - Token status to filter by (e.g., 'active', 'inactive').
   * @param {number} [params.limit] - Maximum number of tokens to return.
   * @param {number} [params.skip] - Number of tokens to skip for pagination.
   * @returns {Promise<{ data: { tokens: any[] } }>} A promise that resolves with an object containing the list of tokens.
   * @throws {Error} Throws an error if fetching tokens fails.
   */
  getTokens: async (params?: { orgId?: string; status?: string; limit?: number; skip?: number }): Promise<{ data: { tokens: any[] } }> => {
    try {
      const result = await Parse.Cloud.run('getTokens', params || {});
      
      // Transform the response to match the expected mock API structure
      return {
        data: {
          tokens: result.tokens || []
        }
      };
    } catch (error: any) {
      console.debug('[Token API] Error calling getTokens cloud function:', error);
      throw new Error(error.message || 'Failed to fetch tokens');
    }
  },

  /**
   * Creates a new token with the given data.
   * @param {object} tokenData - Data for the new token.
   * @param {string} tokenData.name - The name of the token.
   * @param {string} tokenData.symbol - The symbol of the token.
   * @param {string} tokenData.type - The type of the token (e.g., 'ERC-20', 'ERC-721').
   * @param {string} tokenData.blockchain - The blockchain on which the token will be deployed.
   * @param {number} tokenData.supply - The total supply of the token.
   * @param {string} [tokenData.description] - An optional description for the token.
   * @param {number} [tokenData.decimals] - The number of decimals for the token (if applicable).
   * @param {string} [tokenData.orgId] - The organization ID associated with the token.
   * @returns {Promise<{ data: { token: any } }>} A promise that resolves with an object containing the newly created token.
   * @throws {Error} Throws an error if token creation fails.
   */
  createToken: async (tokenData: {
    name: string;
    symbol: string;
    type: string;
    blockchain: string;
    supply: number;
    description?: string;
    decimals?: number;
    orgId?: string;
  }): Promise<{ data: { token: any } }> => {
    try {
      const result = await Parse.Cloud.run('createToken', tokenData);
      
      return {
        data: {
          token: result.token
        }
      };
    } catch (error: any) {
      console.debug('[Token API] Error calling createToken cloud function:', error);
      throw new Error(error.message || 'Failed to create token');
    }
  },

  /**
   * Retrieves details for a specific token by its ID.
   * @param {string} tokenId - The ID of the token to retrieve.
   * @returns {Promise<{ data: { token: any } }>} A promise that resolves with an object containing the token details.
   * @throws {Error} Throws an error if fetching token details fails.
   */
  getTokenDetails: async (tokenId: string): Promise<{ data: { token: any } }> => {
    try {
      const result = await Parse.Cloud.run('getTokenDetails', { tokenId });
      
      return {
        data: {
          token: result.token
        }
      };
    } catch (error: any) {
      console.debug('[Token API] Error calling getTokenDetails cloud function:', error);
      throw new Error(error.message || 'Failed to fetch token details');
    }
  },

  /**
   * Updates the status of a specific token.
   * @param {string} tokenId - The ID of the token to update.
   * @param {string} status - The new status for the token.
   * @param {object} [options] - Optional additional parameters.
   * @param {string} [options.reason] - Reason for the status update.
   * @param {string} [options.contractAddress] - Contract address associated with the status update.
   * @returns {Promise<{ data: { token: any } }>} A promise that resolves with an object containing the updated token.
   * @throws {Error} Throws an error if updating token status fails.
   */
  updateTokenStatus: async (tokenId: string, status: string, options?: {
    reason?: string;
    contractAddress?: string;
  }): Promise<{ data: { token: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateTokenStatus', {
        tokenId,
        status,
        ...options
      });
      
      return {
        data: {
          token: result.token
        }
      };
    } catch (error: any) {
      console.debug('[Token API] Error calling updateTokenStatus cloud function:', error);
      throw new Error(error.message || 'Failed to update token status');
    }
  },

  /**
   * Deletes a token by its ID.
   * @param {string} tokenId - The ID of the token to delete.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status.
   * @throws {Error} Throws an error if token deletion fails.
   */
  deleteToken: async (tokenId: string): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('deleteToken', { tokenId });
      return { data: result };
    } catch (error: any) {
      console.debug('[Token API] Error calling deleteToken cloud function:', error);
      throw new Error(error.message || 'Failed to delete token');
    }
  },
};

const mockTokenApis = {
  getTokens: () => {
    return mockResponse({
      tokens: [
        {
          id: 'token-1',
          name: 'GoldCoin',
          symbol: 'GLD',
          type: 'ERC-20',
          blockchain: 'Ethereum',
          supply: 1000000,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'token-2',
          name: 'SilverToken',
          symbol: 'SLV',
          type: 'ERC-721',
          blockchain: 'Polygon',
          supply: 50000,
          status: 'inactive',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    });
  },

  createToken: (tokenData: any) => {
    const newToken = {
      id: `token-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...tokenData,
    };
    return mockResponse({ token: newToken });
  },

  getTokenDetails: (tokenId: string) => {
    const mockTokens = [{
        id: 'token-1',
        name: 'GoldCoin',
        symbol: 'GLD',
        type: 'ERC-20',
        blockchain: 'Ethereum',
        supply: 1000000,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'token-2',
        name: 'SilverToken',
        symbol: 'SLV',
        type: 'ERC-721',
        blockchain: 'Polygon',
        supply: 50000,
        status: 'inactive',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    const token = mockTokens.find(t => t.id === tokenId);
    return mockResponse({ token: token || null });
  },

  updateTokenStatus: (tokenId: string, status: string) => {
    return mockResponse({ success: true, token: { id: tokenId, status } });
  },

  deleteToken: (tokenId: string) => {
    return mockResponse({ success: true, message: `Token ${tokenId} deleted successfully` });
  },
};

// Merge Token APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockTokenApis : tokenApi);