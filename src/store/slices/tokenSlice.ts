import { createCRUDSlice } from '../utils/createCRUDSlice';
import { apiService } from '../../services/api';

export type TokenStatus = 'pending' | 'confirmed' | 'failed';
export type TokenType = 'ERC3643' | 'Stellar' | 'ERC20' | 'ERC721';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  type: TokenType;
  blockchain: string;
  supply: number;
  status: TokenStatus;
  createdAt: string;
  createdBy: string;
  contractAddress?: string;
  orgId?: string;
}

export interface Transaction {
  id: string;
  tokenId: string;
  from: string;
  to: string;
  amount: number;
  status: TokenStatus;
  timestamp: string;
}

export interface CreateTokenParams {
  name: string;
  symbol: string;
  type: TokenType;
  blockchain: string;
  supply: number;
  description?: string;
  decimals?: number;
  orgId?: string;
}

export interface UpdateTokenParams {
  name?: string;
  symbol?: string;
  status?: TokenStatus;
  contractAddress?: string;
  reason?: string;
}

// Custom API adapter to handle the specific token API structure
const customTokenApiAdapter = {
  getAll: (params?: any) => apiService.getTokens(params),
  getById: (id: string) => apiService.getTokenDetails(id),
  create: (params: CreateTokenParams) => apiService.createToken(params),
  update: (id: string, params: UpdateTokenParams) => {
    // Handle the specific updateTokenStatus API signature
    if (params.status) {
      return apiService.updateTokenStatus(id, params.status, {
        reason: params.reason,
        contractAddress: params.contractAddress,
      });
    }
    // For other updates, we'd need a general update method
    throw new Error('General token updates not yet implemented');
  },
  delete: (id: string) => apiService.deleteToken(id),
};

// Create the CRUD slice using our factory
const tokenCRUD = createCRUDSlice<Token, CreateTokenParams, UpdateTokenParams>({
  name: 'token',
  apiService: customTokenApiAdapter,
  initialState: {
    // Add custom state for transactions
    transactions: [] as Transaction[],
    isLoadingTokenDetails: false,
    isUpdatingTokenStatus: false,
  },
  responseMapping: {
    items: 'tokens',
    item: 'token',
  },
  errorMessages: {
    fetch: 'Failed to fetch tokens',
    create: 'Failed to create token',
    update: 'Failed to update token status',
    delete: 'Failed to delete token',
    getById: 'Failed to fetch token details',
  },
});

// Export the slice
export const tokenSlice = tokenCRUD.slice;

// Export actions with backward-compatible names
export const fetchTokens = tokenCRUD.actions.fetchItems;
export const createToken = tokenCRUD.actions.createItem;
export const deleteToken = tokenCRUD.actions.deleteItem;
export const getTokenDetails = tokenCRUD.actions.fetchItemById;
export const updateTokenStatus = tokenCRUD.actions.updateItem;

// Export standard CRUD actions
export const {
  clearError: clearTokenErrors,
  setFilters,
  resetFilters,
  clearSelectedItem,
} = tokenCRUD.actions;

// Export selectors with token-specific names
export const tokenSelectors = {
  selectTokens: tokenCRUD.selectors.selectItems,
  selectSelectedToken: tokenCRUD.selectors.selectSelectedItem,
  selectIsLoadingTokens: tokenCRUD.selectors.selectIsLoading,
  selectIsCreatingToken: tokenCRUD.selectors.selectIsCreating,
  selectIsUpdatingToken: tokenCRUD.selectors.selectIsUpdating,
  selectIsDeletingToken: tokenCRUD.selectors.selectIsDeleting,
  selectTokenError: tokenCRUD.selectors.selectError,
  selectTokenTotalCount: tokenCRUD.selectors.selectTotalCount,
  selectTokenHasMore: tokenCRUD.selectors.selectHasMore,
  selectTokenFilters: tokenCRUD.selectors.selectFilters,
  // Custom selectors for transactions
  selectTransactions: (state: any) => state.token.transactions,
};

// For backward compatibility, create simple action creators for the custom functionality
export const fetchTransactionsSuccess = tokenSlice.actions.clearError; // Placeholder
export const updateTokenStatusSync = tokenSlice.actions.clearError; // Placeholder

export default tokenSlice.reducer;
