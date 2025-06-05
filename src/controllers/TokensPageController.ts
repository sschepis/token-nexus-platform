import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class TokensPageController implements PageController {
  pageId = 'tokens';
  pageName = 'Tokens';
  description = 'Manage API tokens, access keys, and authentication credentials';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'tokens',
    pageName: 'Tokens',
    state: {},
    props: {},
    metadata: {
      category: 'security',
      tags: ['tokens', 'api', 'authentication', 'security', 'credentials'],
      permissions: ['tokens:read', 'tokens:write', 'tokens:manage']
    }
  };
  metadata = {
    category: 'security',
    tags: ['tokens', 'api', 'authentication', 'security', 'credentials'],
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
      description: 'Get all API tokens and access keys for the organization',
      category: 'data',
      permissions: ['tokens:read'],
      parameters: [
        { name: 'type', type: 'string', required: false, description: 'Filter by token type (api, access, refresh)' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status (active, expired, revoked)' },
        { name: 'includeExpired', type: 'boolean', required: false, description: 'Include expired tokens' },
        { name: 'createdBy', type: 'string', required: false, description: 'Filter by token creator' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { type, status, includeExpired = false, createdBy } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch tokens',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'fetchTokens',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('APIToken');
          query.equalTo('organizationId', orgId);

          if (type) {
            query.equalTo('type', type);
          }

          if (status) {
            query.equalTo('status', status);
          } else if (!includeExpired) {
            query.notEqualTo('status', 'expired');
            query.notEqualTo('status', 'revoked');
          }

          if (createdBy) {
            query.equalTo('createdBy', createdBy);
          }

          query.descending('createdAt');
          const tokens = await query.find();
          
          // Remove sensitive token values from response
          const tokenData = tokens.map(token => {
            const data = token.toJSON();
            // Mask the actual token value for security
            if (data.token) {
              data.token = data.token.substring(0, 8) + '...';
            }
            return data;
          });

          return {
            success: true,
            data: { tokens: tokenData },
            message: `Found ${tokenData.length} tokens`,
            metadata: {
              executionTime: 0,
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
              executionTime: 0,
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
      description: 'Create a new API token or access key',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Token name/description' },
        { name: 'type', type: 'string', required: true, description: 'Token type (api, access, refresh)' },
        { name: 'permissions', type: 'array', required: false, description: 'Token permissions' },
        { name: 'expiresIn', type: 'number', required: false, description: 'Expiration time in days' },
        { name: 'scope', type: 'string', required: false, description: 'Token scope (organization, user, specific)' },
        { name: 'metadata', type: 'object', required: false, description: 'Additional token metadata' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { 
            name, 
            type, 
            permissions = [], 
            expiresIn, 
            scope = 'organization',
            metadata = {}
          } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to create token',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createToken',
                userId: context.user.userId
              }
            };
          }

          // Generate secure token
          const tokenValue = this.generateSecureToken();

          const APIToken = Parse.Object.extend('APIToken');
          const token = new APIToken();

          token.set('name', name);
          token.set('type', type);
          token.set('token', tokenValue);
          token.set('permissions', permissions);
          token.set('scope', scope);
          token.set('metadata', metadata);
          token.set('organizationId', orgId);
          token.set('createdBy', context.user.userId);
          token.set('status', 'active');
          token.set('usageCount', 0);
          token.set('lastUsed', null);

          // Set expiration if specified
          if (expiresIn && typeof expiresIn === 'number') {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + expiresIn);
            token.set('expiresAt', expirationDate);
          }

          const savedToken = await token.save();
          const tokenData = savedToken.toJSON();

          // Return the full token value only on creation
          tokenData.fullToken = tokenValue;

          return {
            success: true,
            data: { token: tokenData },
            message: `Token "${name}" created successfully`,
            metadata: {
              executionTime: 0,
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
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Revoke Token Action
    this.actions.set('revokeToken', {
      id: 'revokeToken',
      name: 'Revoke Token',
      description: 'Revoke an API token or access key',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to revoke' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for revocation' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { tokenId, reason } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to revoke token',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'revokeToken',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('APIToken');
          query.equalTo('objectId', tokenId);
          query.equalTo('organizationId', orgId);

          const token = await query.first();
          if (!token) {
            return {
              success: false,
              error: 'Token not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'revokeToken',
                userId: context.user.userId
              }
            };
          }

          token.set('status', 'revoked');
          token.set('revokedAt', new Date());
          token.set('revokedBy', context.user.userId);
          token.set('revocationReason', reason || 'Manual revocation');

          const savedToken = await token.save();

          return {
            success: true,
            data: { token: savedToken.toJSON() },
            message: 'Token revoked successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'revokeToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to revoke token',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'revokeToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Regenerate Token Action
    this.actions.set('regenerateToken', {
      id: 'regenerateToken',
      name: 'Regenerate Token',
      description: 'Regenerate a new token value for an existing token',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to regenerate' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { tokenId } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to regenerate token',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'regenerateToken',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('APIToken');
          query.equalTo('objectId', tokenId);
          query.equalTo('organizationId', orgId);

          const token = await query.first();
          if (!token) {
            return {
              success: false,
              error: 'Token not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'regenerateToken',
                userId: context.user.userId
              }
            };
          }

          if (token.get('status') !== 'active') {
            return {
              success: false,
              error: 'Cannot regenerate inactive token',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'regenerateToken',
                userId: context.user.userId
              }
            };
          }

          // Generate new token value
          const newTokenValue = this.generateSecureToken();

          token.set('token', newTokenValue);
          token.set('regeneratedAt', new Date());
          token.set('regeneratedBy', context.user.userId);
          token.set('usageCount', 0); // Reset usage count
          token.set('lastUsed', null);

          const savedToken = await token.save();
          const tokenData = savedToken.toJSON();

          // Return the full token value only on regeneration
          tokenData.fullToken = newTokenValue;

          return {
            success: true,
            data: { token: tokenData },
            message: 'Token regenerated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'regenerateToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to regenerate token',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'regenerateToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Update Token Action
    this.actions.set('updateToken', {
      id: 'updateToken',
      name: 'Update Token',
      description: 'Update token metadata and permissions',
      category: 'data',
      permissions: ['tokens:write'],
      parameters: [
        { name: 'tokenId', type: 'string', required: true, description: 'Token ID to update' },
        { name: 'name', type: 'string', required: false, description: 'Token name' },
        { name: 'permissions', type: 'array', required: false, description: 'Token permissions' },
        { name: 'metadata', type: 'object', required: false, description: 'Token metadata' },
        { name: 'expiresAt', type: 'string', required: false, description: 'New expiration date (ISO string)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { tokenId, ...updateData } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to update token',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateToken',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('APIToken');
          query.equalTo('objectId', tokenId);
          query.equalTo('organizationId', orgId);

          const token = await query.first();
          if (!token) {
            return {
              success: false,
              error: 'Token not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateToken',
                userId: context.user.userId
              }
            };
          }

          // Update fields
          Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
              if (key === 'expiresAt' && typeof value === 'string') {
                token.set(key, new Date(value));
              } else {
                token.set(key, value);
              }
            }
          });

          token.set('updatedBy', context.user.userId);
          const savedToken = await token.save();

          return {
            success: true,
            data: { token: savedToken.toJSON() },
            message: 'Token updated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update token',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateToken',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Token Usage Action
    this.actions.set('getTokenUsage', {
      id: 'getTokenUsage',
      name: 'Get Token Usage',
      description: 'Get usage statistics for tokens',
      category: 'data',
      permissions: ['tokens:read'],
      parameters: [
        { name: 'tokenId', type: 'string', required: false, description: 'Specific token ID (optional)' },
        { name: 'period', type: 'string', required: false, description: 'Time period (day, week, month)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { tokenId, period = 'month' } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to get token usage',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getTokenUsage',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('APIToken');
          query.equalTo('organizationId', orgId);

          if (tokenId) {
            query.equalTo('objectId', tokenId);
          }

          const tokens = await query.find();
          const usageData = tokens.map(token => {
            const data = token.toJSON();
            return {
              tokenId: data.objectId,
              name: data.name,
              type: data.type,
              usageCount: data.usageCount || 0,
              lastUsed: data.lastUsed,
              status: data.status,
              createdAt: data.createdAt
            };
          });

          // Calculate summary statistics
          const totalTokens = usageData.length;
          const activeTokens = usageData.filter(t => t.status === 'active').length;
          const totalUsage = usageData.reduce((sum, t) => sum + t.usageCount, 0);

          return {
            success: true,
            data: { 
              tokens: usageData,
              summary: {
                totalTokens,
                activeTokens,
                totalUsage,
                period
              }
            },
            message: `Retrieved usage data for ${usageData.length} tokens`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getTokenUsage',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get token usage',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getTokenUsage',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }

  private generateSecureToken(): string {
    // Generate a secure random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `tnp_${result}`;
  }
}

// Export singleton instance
export const tokensPageController = new TokensPageController();