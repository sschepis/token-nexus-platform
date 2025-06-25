import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Security actions for the Page Builder controller
 * Adapted to work with BasePageController's registerAction pattern
 */
export class SecurityActions {
  /**
   * Create the generate token action configuration and executor
   */
  static createGenerateTokenAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'generateToken',
        name: 'Generate Access Token',
        description: 'Generate an access token for a page',
        category: 'external',
        permissions: ['pages:write', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID to generate token for' },
          { name: 'expiresIn', type: 'string', required: false, description: 'Token expiration time (default: 24h)' }
        ],
        metadata: {
          tags: ['pages', 'security', 'token'],
          examples: [
            {
              params: { pageId: 'page123', expiresIn: '24h' },
              description: 'Generate a 24-hour access token for a page'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, expiresIn = '24h' } = params;

          const response = await callCloudFunction('generatePageAccessToken', {
            pageId: pageId as string,
            expiresIn: expiresIn as string
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to generate token');
          }

          return {
            success: true,
            data: {
              token: (response as any).token,
              expiresIn: (response as any).expiresIn
            },
            message: (response as any).message || 'Access token generated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'generateToken',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate token',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'generateToken',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }
}