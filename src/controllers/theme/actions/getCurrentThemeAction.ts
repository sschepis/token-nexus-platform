import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store'; // Import Redux store
import { loadOrganizationTheme } from '../../../store/slices/themeSlice'; // Import the thunk
import { OrganizationTheme } from '../../../theming/types/theme.types'; // Import OrganizationTheme for typing

export function registerGetCurrentThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'getCurrentTheme',
      name: 'Get Current Theme',
      description: 'Retrieve the currently active theme configuration for the organization',
      category: 'data',
      permissions: ['theme:read'],
      parameters: [],
      metadata: {
        tags: ['theme', 'current', 'active'],
        examples: [{
          params: {},
          description: 'Get the current active theme'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      if (!orgId) {
        // If no organization context, return an error or a default state managed by the thunk
        // The loadOrganizationTheme thunk should handle returning a default theme if organizationId is missing or no theme is found.
        throw new Error('Organization context required to get current theme');
      }

      try {
        // Dispatch the loadOrganizationTheme thunk from themeSlice
        // The thunk itself encapsulates the Parse.Cloud.run call and error handling
        const currentTheme = await store.dispatch(loadOrganizationTheme(orgId)).unwrap();
        
        // The thunk's fulfilled action will have already updated the Redux state.
        // We just need to return the data for the action result.
        return { success: true, data: currentTheme, isDefault: currentTheme.id === 'default' };
      } catch (error) {
        console.error('[ThemePageController][getCurrentThemeAction] Error getting current theme via thunk:', error);
        // Rethrow the error from the thunk, as the `unwrap()` call will propagate it
        throw error;
      }
    }
  );
}