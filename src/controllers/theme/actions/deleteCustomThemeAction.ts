import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { deleteCustomTheme } from '../../../store/slices/themeSlice'; // Import the thunk

export function registerDeleteCustomThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'deleteCustomTheme',
      name: 'Delete Custom Theme',
      description: 'Delete a custom theme template',
      category: 'data',
      permissions: ['theme:manage'],
      parameters: [
        { name: 'themeTemplateId', type: 'string', required: true, description: 'ID of the theme template to delete' }
      ],
      metadata: {
        tags: ['theme', 'delete', 'custom'],
        examples: [{
          params: { themeTemplateId: 'theme123' },
          description: 'Delete a custom theme template'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const themeTemplateId = params.themeTemplateId as string;
      
      if (!themeTemplateId) {
        throw new Error('Theme template ID is required to delete custom theme');
      }

      try {
        // Dispatch the deleteCustomTheme thunk from themeSlice
        const result = await store.dispatch(deleteCustomTheme({ themeTemplateId })).unwrap();

        // The thunk's fulfilled action will have already updated the Redux state.
        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('[ThemePageController][deleteCustomThemeAction] Error deleting custom theme via thunk:', error);
        throw error;
      }
    }
  );
}