import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class PageBuilderPageController implements PageController {
  pageId = 'page-builder';
  pageName = 'Page Builder';
  description = 'Visual page builder for creating custom application pages';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'page-builder',
    pageName: 'Page Builder',
    state: {},
    props: {},
    metadata: {
      category: 'development',
      tags: ['pages', 'builder', 'visual', 'components'],
      permissions: ['pages:read', 'pages:write', 'components:read']
    }
  };
  metadata = {
    category: 'development',
    tags: ['pages', 'builder', 'visual', 'components'],
    permissions: ['pages:read', 'pages:write', 'components:read'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Pages Action
    this.actions.set('fetchPages', {
      id: 'fetchPages',
      name: 'Fetch Pages',
      description: 'Get all custom pages with their configurations',
      category: 'data',
      permissions: ['pages:read'],
      parameters: [
        { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive pages' },
        { name: 'searchTerm', type: 'string', required: false, description: 'Search term for page names' },
        { name: 'category', type: 'string', required: false, description: 'Filter by page category' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { includeInactive = false, searchTerm, category } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch pages',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'fetchPages',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('CustomPage');
          query.equalTo('organizationId', orgId);

          if (!includeInactive) {
            query.equalTo('isActive', true);
          }

          if (searchTerm) {
            query.contains('name', searchTerm.toString());
          }

          if (category) {
            query.equalTo('category', category);
          }

          const pages = await query.find();
          const pageData = pages.map(page => page.toJSON());

          return {
            success: true,
            data: { pages: pageData },
            message: `Found ${pageData.length} pages`,
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
    });

    // Create Page Action
    this.actions.set('createPage', {
      id: 'createPage',
      name: 'Create Page',
      description: 'Create a new custom page with layout and components',
      category: 'data',
      permissions: ['pages:write'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Page name' },
        { name: 'path', type: 'string', required: true, description: 'Page URL path' },
        { name: 'title', type: 'string', required: false, description: 'Page title' },
        { name: 'description', type: 'string', required: false, description: 'Page description' },
        { name: 'layout', type: 'object', required: false, description: 'Page layout configuration' },
        { name: 'components', type: 'array', required: false, description: 'Page components' },
        { name: 'category', type: 'string', required: false, description: 'Page category' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { name, path, title, description, layout = {}, components = [], category = 'custom' } = params;
          const orgId = context.user.organizationId || context.organization?.id;

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

          const CustomPage = Parse.Object.extend('CustomPage');
          const page = new CustomPage();

          page.set('name', name);
          page.set('path', path);
          page.set('title', title || name);
          page.set('description', description || '');
          page.set('layout', layout);
          page.set('components', components);
          page.set('category', category);
          page.set('organizationId', orgId);
          page.set('createdBy', context.user.userId);
          page.set('isActive', true);

          const savedPage = await page.save();

          return {
            success: true,
            data: { page: savedPage.toJSON() },
            message: `Page "${name}" created successfully`,
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
    });

    // Update Page Action
    this.actions.set('updatePage', {
      id: 'updatePage',
      name: 'Update Page',
      description: 'Update an existing page configuration',
      category: 'data',
      permissions: ['pages:write'],
      parameters: [
        { name: 'pageId', type: 'string', required: true, description: 'Page ID to update' },
        { name: 'name', type: 'string', required: false, description: 'Page name' },
        { name: 'title', type: 'string', required: false, description: 'Page title' },
        { name: 'description', type: 'string', required: false, description: 'Page description' },
        { name: 'layout', type: 'object', required: false, description: 'Page layout configuration' },
        { name: 'components', type: 'array', required: false, description: 'Page components' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Page active status' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, ...updateData } = params;
          const orgId = context.user.organizationId || context.organization?.id;

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

          const query = new Parse.Query('CustomPage');
          query.equalTo('objectId', pageId);
          query.equalTo('organizationId', orgId);

          const page = await query.first();
          if (!page) {
            return {
              success: false,
              error: 'Page not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updatePage',
                userId: context.user.userId
              }
            };
          }

          // Update fields
          Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
              page.set(key, value);
            }
          });

          page.set('updatedBy', context.user.userId);
          const savedPage = await page.save();

          return {
            success: true,
            data: { page: savedPage.toJSON() },
            message: 'Page updated successfully',
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
    });

    // Delete Page Action
    this.actions.set('deletePage', {
      id: 'deletePage',
      name: 'Delete Page',
      description: 'Delete a custom page',
      category: 'data',
      permissions: ['pages:write'],
      parameters: [
        { name: 'pageId', type: 'string', required: true, description: 'Page ID to delete' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, confirmDelete } = params;

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

          const orgId = context.user.organizationId || context.organization?.id;
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

          const query = new Parse.Query('CustomPage');
          query.equalTo('objectId', pageId);
          query.equalTo('organizationId', orgId);

          const page = await query.first();
          if (!page) {
            return {
              success: false,
              error: 'Page not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deletePage',
                userId: context.user.userId
              }
            };
          }

          await page.destroy();

          return {
            success: true,
            data: { deletedPageId: pageId },
            message: 'Page deleted successfully',
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
    });

    // Preview Page Action
    this.actions.set('previewPage', {
      id: 'previewPage',
      name: 'Preview Page',
      description: 'Generate a preview of a page with its current configuration',
      category: 'ui',
      permissions: ['pages:read'],
      parameters: [
        { name: 'pageId', type: 'string', required: true, description: 'Page ID to preview' },
        { name: 'viewMode', type: 'string', required: false, description: 'Preview mode (desktop, tablet, mobile)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { pageId, viewMode = 'desktop' } = params;
          const orgId = context.user.organizationId || context.organization?.id;

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

          const query = new Parse.Query('CustomPage');
          query.equalTo('objectId', pageId);
          query.equalTo('organizationId', orgId);

          const page = await query.first();
          if (!page) {
            return {
              success: false,
              error: 'Page not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'previewPage',
                userId: context.user.userId
              }
            };
          }

          const pageData = page.toJSON();
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
    });
  }
}

// Export singleton instance
export const pageBuilderPageController = new PageBuilderPageController();