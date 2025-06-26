import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { createCustomTheme } from '../../../store/slices/themeSlice'; // Import the thunk

export function registerCreateCustomThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'createCustomTheme',
      name: 'Create Custom Theme',
      description: 'Create a new custom theme template',
      category: 'data',
      permissions: ['theme:manage'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Theme name' },
        { name: 'description', type: 'string', required: false, description: 'Theme description' },
        { name: 'baseTheme', type: 'string', required: false, description: 'Base theme to extend from' },
        { name: 'colors', type: 'object', required: true, description: 'Color palette configuration' },
        { name: 'typography', type: 'object', required: false, description: 'Typography configuration' },
        { name: 'spacing', type: 'object', required: false, description: 'Spacing configuration' },
        { name: 'components', type: 'object', required: false, description: 'Component styling configuration' },
        { name: 'category', type: 'string', required: false, description: 'Theme category' }
      ],
      metadata: {
        tags: ['theme', 'create', 'custom'],
        examples: [{
          params: { 
            name: 'Corporate Blue',
            colors: { primary: '#0066cc', secondary: '#f0f8ff' }
          },
          description: 'Create a custom corporate theme'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      const userId = context.user.userId;
      
      if (!orgId || !userId) {
        throw new Error('Organization and user context required to create custom theme');
      }

      try {
        // Dispatch the createCustomTheme thunk from themeSlice
        const newTheme = await store.dispatch(createCustomTheme({
          orgId,
          userId,
          themeData: params // Pass all theme data from params
        })).unwrap();

        // The thunk's fulfilled action will have already updated the Redux state.
        return {
          success: true,
          data: newTheme
        };
      } catch (error) {
        console.error('[ThemePageController][createCustomThemeAction] Error creating custom theme via thunk:', error);
        throw error;
      }
    }
  );
}