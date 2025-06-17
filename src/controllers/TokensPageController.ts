import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';
import { apiService } from '../services/api';

export type TokenStatus = 'pending' | 'confirmed' | 'failed';
export type TokenType = 'ERC3643' | 'Stellar' | 'ERC20' | 'ERC721';

export interface BlockchainToken {
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

export class TokensPageController implements PageController {
  pageId = 'tokens';
  pageName = 'Tokens';
  description = 'Manage blockchain tokens, digital assets, and tokenized securities';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'tokens',
    pageName: 'Tokens',
    state: {},
    props: {},
    metadata: {
      category: 'blockchain',
      tags: ['tokens', 'blockchain', 'assets', 'securities', 'digital'],
      permissions: ['tokens:read', 'tokens:write', 'tokens:manage']
    }
  };
  metadata = {
    category: 'blockchain',
    tags: ['tokens', 'blockchain', 'assets', 'securities', 'digital'],
    permissions: ['tokens:read', 'tokens:write', 'tokens:manage'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Tokens Action
    this.actions.set('fetchTokens', {
      id: 'fetchTokens',
      name: 'Fetch Tokens',
      description: 'Get all blockchain tokens for the organization',
      category: 'data',
      permissions: ['tokens:read'],
      parameters: [
        { name: 'type', type: 'string', required: false, description: 'Filter by token type (ERC3643, Stellar, ERC20, ERC721)' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, confirmed, failed)' },
        { name: 'blockchain', type: 'string', required: false, description: 'Filter by blockchain' },
        { name: 'search', type: 'string', required: false, description: 'Search by name or symbol' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          
          // Use the existing API service that the Redux slice uses
          const response = await apiService.getTokens(params);
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: `Found ${response.data?.tokens?.length || 0} tokens`,
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'fetchTokens',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch tokens',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'fetchTokens',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Create Token Action
    this.actions.set('createToken', {
      id: 'createToken',
      name: 'Create Token',
      description: 'Create a new blockchain token',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Token name' },
        { name: 'symbol', type: 'string', required: true, description: 'Token symbol' },
        { name: 'type', type: 'string', required: true, description: 'Token type (ERC3643, Stellar, ERC20, ERC721)' },
        { name: 'blockchain', type: 'string', required: true, description: 'Blockchain network' },
        { name: 'supply', type: 'number', required: true, description: 'Token supply' },
        { name: 'description', type: 'string', required: false, description: 'Token description' },
        { name: 'decimals', type: 'number', required: false, description: 'Token decimals' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          
          // Use the existing API service that the Redux slice uses
          const response = await apiService.createToken(params);
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: `Token "${params.name}" created successfully`,
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'createToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create token',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'createToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Token Action
    this.actions.set('deleteToken', {
      id: 'deleteToken',
      name: 'Delete Token',
      description: 'Delete a blockchain token',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to delete' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          const { tokenId } = params;
          
          // Use the existing API service that the Redux slice uses
          const response = await apiService.deleteToken(tokenId as string);
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: 'Token deleted successfully',
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'deleteToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete token',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'deleteToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Token Details Action
    this.actions.set('getTokenDetails', {
      id: 'getTokenDetails',
      name: 'Get Token Details',
      description: 'Get detailed information about a specific token',
      category: 'data',
      permissions: ['tokens:read'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to fetch details for' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          const { tokenId } = params;
          
          // Use the existing API service that the Redux slice uses
          const response = await apiService.getTokenDetails(tokenId as string);
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: 'Token details retrieved successfully',
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'getTokenDetails',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch token details',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'getTokenDetails',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Update Token Status Action
    this.actions.set('updateTokenStatus', {
      id: 'updateTokenStatus',
      name: 'Update Token Status',
      description: 'Update the status of a blockchain token',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to update' },
        { name: 'status', type: 'string', required: true, description: 'New status (pending, confirmed, failed)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for status change' },
        { name: 'contractAddress', type: 'string', required: false, description: 'Contract address if confirmed' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          const { tokenId, status, reason, contractAddress } = params;
          
          // Use the existing API service that the Redux slice uses
          const response = await apiService.updateTokenStatus(
            tokenId as string, 
            status as TokenStatus, 
            { reason: reason as string, contractAddress: contractAddress as string }
          );
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: `Token status updated to ${status}`,
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'updateTokenStatus',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update token status',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'updateTokenStatus',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Refresh Tokens Action
    this.actions.set('refreshTokens', {
      id: 'refreshTokens',
      name: 'Refresh Tokens',
      description: 'Refresh the tokens list from the server',
      category: 'data',
      permissions: ['tokens:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const startTime = Date.now();
          
          // Use the existing API service to refresh tokens
          const response = await apiService.getTokens({});
          
          const executionTime = Date.now() - startTime;

          return {
            success: true,
            data: response.data,
            message: `Refreshed ${response.data?.tokens?.length || 0} tokens`,
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'refreshTokens',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh tokens',
            metadata: {
              executionTime: Date.now(),
              timestamp: new Date(),
              actionId: 'refreshTokens',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const tokensPageController = new TokensPageController();