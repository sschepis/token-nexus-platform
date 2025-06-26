import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { loadOrganizationTheme, getAvailableThemes } from '../../../store/slices/themeSlice'; // Import the thunks

export function registerRefreshThemesAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'refreshThemes',
      name: 'Refresh Themes',
      description: 'Refresh theme data from the server',
      category: 'data',
      permissions: ['theme:read'],
      parameters: [
        { name: 'organizationId', type: 'string', required: false, description: 'Organization ID to refresh themes for' }
      ],
      metadata: {
        tags: ['theme', 'refresh', 'reload'],
        examples: [{
          params: {},
          description: 'Refresh all theme data'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = (params.organizationId as string) || context.organization?.id;
      
      if (!orgId) {
        throw new Error('Organization context required to refresh themes');
      }

      try {
        // Dispatch the thunks to load current and available themes
        const [currentTheme, availableThemes] = await Promise.all([
          store.dispatch(loadOrganizationTheme(orgId)).unwrap(),
          store.dispatch(getAvailableThemes({ orgId, includeCustom: true })).unwrap()
        ]);
        
        // Both thunks will have updated the Redux state upon fulfillment.
        return {
            success: true,
            data: {
                currentTheme: currentTheme,
                availableThemes: availableThemes
            }
        };

      } catch (error) {
        console.error('[ThemePageController][refreshThemesAction] Error refreshing themes via thunks:', error);
        throw error;
      }
    }
  );
}