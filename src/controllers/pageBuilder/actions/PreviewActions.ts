import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Preview actions for the Page Builder controller
 * Adapted to work with BasePageController's registerAction pattern
 */
export class PreviewActions {
  /**
   * Create the preview page action configuration and executor
   */
  static createPreviewPageAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'previewPage',
        name: 'Preview Page',
        description: 'Generate a preview of a page with its current configuration',
        category: 'ui',
        permissions: ['pages:read', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID to preview' },
          { name: 'viewMode', type: 'string', required: false, description: 'Preview mode (desktop, tablet, mobile)' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID' }
        ],
        metadata: {
          tags: ['pages', 'preview', 'ui'],
          examples: [
            {
              params: { pageId: 'page123', viewMode: 'desktop' },
              description: 'Preview a page in desktop mode'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, viewMode = 'desktop', organizationId } = params;
          const orgId = organizationId || context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to preview page',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'previewPage',
                userId: context.user.userId
              }
            };
          }

          const response = await callCloudFunction('getCustomPageById', {
            pageId: pageId as string,
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to get page');
          }

          const pageData = (response as any).page;
          const previewUrl = `/page-builder/preview/${pageId}?mode=${viewMode}`;

          return {
            success: true,
            data: { 
              page: pageData,
              previewUrl,
              viewMode
            },
            message: 'Page preview generated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'previewPage',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate page preview',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'previewPage',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }
}