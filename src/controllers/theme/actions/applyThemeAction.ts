import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { applyTheme } from '../../../store/slices/themeSlice'; // Import the thunk

export function registerApplyThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'applyTheme',
      name: 'Apply Theme',
      description: 'Apply a theme to the organization',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [
        { name: 'themeId', type: 'string', required: false, description: 'Theme template ID for custom themes' },
        { name: 'themeName', type: 'string', required: false, description: 'Built-in theme name' },
        { name: 'customizations', type: 'object', required: false, description: 'Additional theme customizations' }
      ],
      metadata: {
        tags: ['theme', 'apply', 'activate'],
        examples: [{
          params: { themeName: 'dark' },
          description: 'Apply the built-in dark theme'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      const userId = context.user.userId;
      
      if (!orgId || !userId) {
        throw new Error('Organization and user context required to apply theme');
      }

      try {
        // Dispatch the applyTheme thunk from themeSlice
        const appliedTheme = await store.dispatch(applyTheme({
          orgId,
          userId,
          themeId: params.themeId as string,
          themeName: params.themeName as string,
          customizations: params.customizations as Record<string, unknown>
        })).unwrap();

        // The thunk's fulfilled action will have already updated the Redux state.
        return {
          success: true,
          data: appliedTheme
        };
      } catch (error) {
        console.error('[ThemePageController][applyThemeAction] Error applying theme via thunk:', error);
        throw error;
      }
    }
  );
}