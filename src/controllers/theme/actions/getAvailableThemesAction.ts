import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store'; // Import Redux store
import { getAvailableThemes } from '../../../store/slices/themeSlice'; // Import the thunk
import { OrganizationTheme } from '../../../theming/types/theme.types';

export function registerGetAvailableThemesAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'getAvailableThemes',
      name: 'Get Available Themes',
      description: 'Retrieve all available theme templates and custom themes',
      category: 'data',
      permissions: ['theme:read'],
      parameters: [
        { name: 'includeCustom', type: 'boolean', required: false, description: 'Include custom organization themes' },
        { name: 'category', type: 'string', required: false, description: 'Filter themes by category' }
      ],
      metadata: {
        tags: ['theme', 'templates', 'available'],
        examples: [{
          params: { includeCustom: true },
          description: 'Get all themes including custom ones'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required to get available themes');
      }

      try {
        // Dispatch the getAvailableThemes thunk from themeSlice
        // The thunk itself encapsulates the Parse.Cloud.run call and error handling
        const availableThemes = await store.dispatch(getAvailableThemes({
          orgId,
          includeCustom: params.includeCustom as boolean,
          category: params.category as string
        })).unwrap();
        
        // The thunk's fulfilled action will have already updated the Redux state.
        // We just need to return the data for the action result.
        return { success: true, data: availableThemes as OrganizationTheme[] };
      } catch (error) {
        console.error('[ThemePageController][getAvailableThemesAction] Error getting available themes via thunk:', error);
        // Rethrow the error from the thunk, as the `unwrap()` call will propagate it
        throw error;
      }
    }
  );
}