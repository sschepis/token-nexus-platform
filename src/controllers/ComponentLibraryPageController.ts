import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class ComponentLibraryPageController implements PageController {
  pageId = 'component-library';
  pageName = 'Component Library';
  description = 'Manage and organize reusable UI components';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'component-library',
    pageName: 'Component Library',
    state: {},
    props: {},
    metadata: {
      category: 'development',
      tags: ['components', 'ui', 'library', 'reusable'],
      permissions: ['components:read', 'components:write']
    }
  };
  metadata = {
    category: 'development',
    tags: ['components', 'ui', 'library', 'reusable'],
    permissions: ['components:read', 'components:write'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Components Action
    this.actions.set('fetchComponents', {
      id: 'fetchComponents',
      name: 'Fetch Components',
      description: 'Get all available UI components from the library',
      category: 'data',
      permissions: ['components:read'],
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by component category' },
        { name: 'searchTerm', type: 'string', required: false, description: 'Search term for component names' },
        { name: 'includePrivate', type: 'boolean', required: false, description: 'Include private components' },
        { name: 'tags', type: 'array', required: false, description: 'Filter by component tags' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { category, searchTerm, includePrivate = false, tags } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to fetch components',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'fetchComponents',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('UIComponent');
          query.equalTo('organizationId', orgId);

          if (!includePrivate) {
            query.equalTo('isPublic', true);
          }

          if (category) {
            query.equalTo('category', category);
          }

          if (searchTerm) {
            query.contains('name', searchTerm.toString());
          }

          if (tags && Array.isArray(tags)) {
            query.containsAll('tags', tags);
          }

          const components = await query.find();
          const componentData = components.map(component => component.toJSON());

          return {
            success: true,
            data: { components: componentData },
            message: `Found ${componentData.length} components`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchComponents',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch components',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchComponents',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Create Component Action
    this.actions.set('createComponent', {
      id: 'createComponent',
      name: 'Create Component',
      description: 'Create a new reusable UI component',
      category: 'data',
      permissions: ['components:write'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Component name' },
        { name: 'description', type: 'string', required: false, description: 'Component description' },
        { name: 'category', type: 'string', required: true, description: 'Component category' },
        { name: 'code', type: 'string', required: true, description: 'Component code (React/JSX)' },
        { name: 'props', type: 'object', required: false, description: 'Component props schema' },
        { name: 'tags', type: 'array', required: false, description: 'Component tags' },
        { name: 'isPublic', type: 'boolean', required: false, description: 'Make component public' },
        { name: 'preview', type: 'string', required: false, description: 'Component preview image URL' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { 
            name, 
            description, 
            category, 
            code, 
            props = {}, 
            tags = [], 
            isPublic = false,
            preview 
          } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to create component',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createComponent',
                userId: context.user.userId
              }
            };
          }

          const UIComponent = Parse.Object.extend('UIComponent');
          const component = new UIComponent();

          component.set('name', name);
          component.set('description', description || '');
          component.set('category', category);
          component.set('code', code);
          component.set('props', props);
          component.set('tags', tags);
          component.set('isPublic', isPublic);
          component.set('preview', preview || '');
          component.set('organizationId', orgId);
          component.set('createdBy', context.user.userId);
          component.set('version', '1.0.0');
          component.set('isActive', true);

          const savedComponent = await component.save();

          return {
            success: true,
            data: { component: savedComponent.toJSON() },
            message: `Component "${name}" created successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createComponent',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create component',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createComponent',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Update Component Action
    this.actions.set('updateComponent', {
      id: 'updateComponent',
      name: 'Update Component',
      description: 'Update an existing UI component',
      category: 'data',
      permissions: ['components:write'],
      parameters: [
        { name: 'componentId', type: 'string', required: true, description: 'Component ID to update' },
        { name: 'name', type: 'string', required: false, description: 'Component name' },
        { name: 'description', type: 'string', required: false, description: 'Component description' },
        { name: 'code', type: 'string', required: false, description: 'Component code (React/JSX)' },
        { name: 'props', type: 'object', required: false, description: 'Component props schema' },
        { name: 'tags', type: 'array', required: false, description: 'Component tags' },
        { name: 'isPublic', type: 'boolean', required: false, description: 'Make component public' },
        { name: 'preview', type: 'string', required: false, description: 'Component preview image URL' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { componentId, ...updateData } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to update component',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateComponent',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('UIComponent');
          query.equalTo('objectId', componentId);
          query.equalTo('organizationId', orgId);

          const component = await query.first();
          if (!component) {
            return {
              success: false,
              error: 'Component not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateComponent',
                userId: context.user.userId
              }
            };
          }

          // Update fields
          Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
              component.set(key, value);
            }
          });

          component.set('updatedBy', context.user.userId);
          const savedComponent = await component.save();

          return {
            success: true,
            data: { component: savedComponent.toJSON() },
            message: 'Component updated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateComponent',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update component',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateComponent',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Component Action
    this.actions.set('deleteComponent', {
      id: 'deleteComponent',
      name: 'Delete Component',
      description: 'Delete a UI component from the library',
      category: 'data',
      permissions: ['components:write'],
      parameters: [
        { name: 'componentId', type: 'string', required: true, description: 'Component ID to delete' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { componentId, confirmDelete } = params;

          if (!confirmDelete) {
            return {
              success: false,
              error: 'Delete confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteComponent',
                userId: context.user.userId
              }
            };
          }

          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to delete component',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteComponent',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('UIComponent');
          query.equalTo('objectId', componentId);
          query.equalTo('organizationId', orgId);

          const component = await query.first();
          if (!component) {
            return {
              success: false,
              error: 'Component not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteComponent',
                userId: context.user.userId
              }
            };
          }

          await component.destroy();

          return {
            success: true,
            data: { deletedComponentId: componentId },
            message: 'Component deleted successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteComponent',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete component',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteComponent',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Preview Component Action
    this.actions.set('previewComponent', {
      id: 'previewComponent',
      name: 'Preview Component',
      description: 'Generate a live preview of a component with sample props',
      category: 'ui',
      permissions: ['components:read'],
      parameters: [
        { name: 'componentId', type: 'string', required: true, description: 'Component ID to preview' },
        { name: 'sampleProps', type: 'object', required: false, description: 'Sample props for preview' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { componentId, sampleProps = {} } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to preview component',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'previewComponent',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('UIComponent');
          query.equalTo('objectId', componentId);
          query.equalTo('organizationId', orgId);

          const component = await query.first();
          if (!component) {
            return {
              success: false,
              error: 'Component not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'previewComponent',
                userId: context.user.userId
              }
            };
          }

          const componentData = component.toJSON();
          const previewUrl = `/component-library/preview/${componentId}`;

          return {
            success: true,
            data: { 
              component: componentData,
              previewUrl,
              sampleProps
            },
            message: 'Component preview generated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'previewComponent',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate component preview',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'previewComponent',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Component Categories Action
    this.actions.set('getComponentCategories', {
      id: 'getComponentCategories',
      name: 'Get Component Categories',
      description: 'Get all available component categories',
      category: 'data',
      permissions: ['components:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to get categories',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'getComponentCategories',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('UIComponent');
          query.equalTo('organizationId', orgId);
          query.select('category');

          const components = await query.find();
          const categorySet = new Set(components.map(c => c.get('category')).filter(Boolean));
          const categories = Array.from(categorySet);

          return {
            success: true,
            data: { categories },
            message: `Found ${categories.length} categories`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getComponentCategories',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get component categories',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getComponentCategories',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const componentLibraryPageController = new ComponentLibraryPageController();