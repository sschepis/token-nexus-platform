import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Page CRUD actions for the Page Builder controller
 * Adapted to work with BasePageController's registerAction pattern
 */
export class PageActions {
  /**
   * Create the fetch pages action configuration and executor
   */
  static createFetchPagesAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'fetchPages',
        name: 'Fetch Organization Pages',
        description: 'Retrieve all pages for the current organization with optional filtering',
        category: 'data',
        permissions: ['pages:read', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive pages' },
          { name: 'searchTerm', type: 'string', required: false, description: 'Search term for page names' },
          { name: 'category', type: 'string', required: false, description: 'Filter by page category' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID for filtering' }
        ],
        metadata: {
          tags: ['pages', 'crud', 'organization'],
          examples: [
            {
              params: { includeInactive: false },
              description: 'Get all active pages for the current organization'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { includeInactive = false, searchTerm, category, organizationId } = params;
          const orgId = organizationId || context.user.organizationId || context.organization?.id;

          const response = await callCloudFunction('getCustomPages', {
            organizationId: orgId,
            includeInactive: includeInactive as boolean,
            searchTerm: searchTerm as string,
            category: category as string
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch pages');
          }

          const pages = (response as any).pages || [];

          return {
            success: true,
            data: { pages },
            message: `Found ${pages.length} pages`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchPages',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch pages',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchPages',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }

  /**
   * Create the create page action configuration and executor
   */
  static createCreatePageAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'createPage',
        name: 'Create Page',
        description: 'Create a new custom page with layout and components',
        category: 'data',
        permissions: ['pages:write', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Page name' },
          { name: 'path', type: 'string', required: true, description: 'Page URL path' },
          { name: 'title', type: 'string', required: false, description: 'Page title' },
          { name: 'description', type: 'string', required: false, description: 'Page description' },
          { name: 'layout', type: 'object', required: false, description: 'Page layout configuration' },
          { name: 'components', type: 'array', required: false, description: 'Page components' },
          { name: 'category', type: 'string', required: false, description: 'Page category' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID' }
        ],
        metadata: {
          tags: ['pages', 'crud', 'create'],
          examples: [
            {
              params: { name: 'My Page', path: '/my-page', title: 'My Custom Page' },
              description: 'Create a basic page with name and path'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { name, path, title, description, layout = {}, components = [], category = 'custom', organizationId } = params;
          const orgId = organizationId || context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to create page',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createPage',
                userId: context.user.userId
              }
            };
          }

          const response = await callCloudFunction('createCustomPage', {
            name: name as string,
            path: path as string,
            title: title as string,
            description: description as string,
            layout: layout as object,
            components: components as any[],
            category: category as string,
            organizationId: orgId
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to create page');
          }

          const newPage = (response as any).page;

          return {
            success: true,
            data: { page: newPage },
            message: response.message || `Page "${name}" created successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createPage',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create page',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createPage',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }

  /**
   * Create the update page action configuration and executor
   */
  static createUpdatePageAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'updatePage',
        name: 'Update Page',
        description: 'Update an existing page configuration',
        category: 'data',
        permissions: ['pages:write', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID to update' },
          { name: 'name', type: 'string', required: false, description: 'Page name' },
          { name: 'title', type: 'string', required: false, description: 'Page title' },
          { name: 'description', type: 'string', required: false, description: 'Page description' },
          { name: 'layout', type: 'object', required: false, description: 'Page layout configuration' },
          { name: 'components', type: 'array', required: false, description: 'Page components' },
          { name: 'isActive', type: 'boolean', required: false, description: 'Page active status' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID' }
        ],
        metadata: {
          tags: ['pages', 'crud', 'update'],
          examples: [
            {
              params: { pageId: 'page123', title: 'Updated Title' },
              description: 'Update the title of an existing page'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, organizationId, ...updateData } = params;
          const orgId = organizationId || context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to update page',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updatePage',
                userId: context.user.userId
              }
            };
          }

          const response = await callCloudFunction('updateCustomPage', {
            pageId: pageId as string,
            organizationId: orgId,
            ...updateData
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to update page');
          }

          const updatedPage = (response as any).page;

          return {
            success: true,
            data: { page: updatedPage },
            message: response.message || 'Page updated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updatePage',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update page',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updatePage',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }

  /**
   * Create the delete page action configuration and executor
   */
  static createDeletePageAction(): { config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult> } {
    return {
      config: {
        id: 'deletePage',
        name: 'Delete Page',
        description: 'Delete a custom page',
        category: 'data',
        permissions: ['pages:write', 'org_admin'],
        requiresOrganization: true,
        parameters: [
          { name: 'pageId', type: 'string', required: true, description: 'Page ID to delete' },
          { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' },
          { name: 'organizationId', type: 'string', required: false, description: 'Organization ID' }
        ],
        metadata: {
          tags: ['pages', 'crud', 'delete'],
          examples: [
            {
              params: { pageId: 'page123', confirmDelete: true },
              description: 'Delete a page with confirmation'
            }
          ]
        }
      },
      executor: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, confirmDelete, organizationId } = params;

          if (!confirmDelete) {
            return {
              success: false,
              error: 'Delete confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deletePage',
                userId: context.user.userId
              }
            };
          }

          const orgId = organizationId || context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to delete page',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deletePage',
                userId: context.user.userId
              }
            };
          }

          const response = await callCloudFunction('deleteCustomPage', {
            pageId: pageId as string,
            organizationId: orgId,
            confirmDelete: confirmDelete as boolean
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to delete page');
          }

          return {
            success: true,
            data: { deletedPageId: pageId },
            message: response.message || 'Page deleted successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deletePage',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete page',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deletePage',
              userId: context.user.userId
            }
          };
        }
      }
    };
  }
}