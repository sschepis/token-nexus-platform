import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { resetOrganizationTheme } from '../../../store/slices/themeSlice'; // Import the thunk

export function registerResetToDefaultThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'resetToDefaultTheme',
      name: 'Reset to Default Theme',
      description: 'Reset the organization\'s theme to the system default',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [],
      metadata: {
        tags: ['theme', 'reset', 'default'],
        examples: [{
          params: {},
          description: 'Reset to the default system theme'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      const userId = context.user.userId;
      
      if (!orgId || !userId) {
        throw new Error('Organization and user context required to reset theme');
      }

      try {
        // Dispatch the resetOrganizationTheme thunk from themeSlice
        const resetTheme = await store.dispatch(resetOrganizationTheme()).unwrap();

        // The thunk's fulfilled action will have already updated the Redux state.
        return {
          success: true,
          data: resetTheme
        };
      } catch (error) {
        console.error('[ThemePageController][resetToDefaultThemeAction] Error resetting to default theme via thunk:', error);
        throw error;
      }
    }
  );
}