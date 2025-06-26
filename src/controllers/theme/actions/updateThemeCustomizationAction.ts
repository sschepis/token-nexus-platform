import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { updateThemeCustomization } from '../../../store/slices/themeSlice'; // Import the thunk

export function registerUpdateThemeCustomizationAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'updateThemeCustomization',
      name: 'Update Theme Customization',
      description: 'Update specific theme customizations without changing the base theme',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [
        { name: 'customizations', type: 'object', required: true, description: 'Theme customizations to apply' },
        { name: 'merge', type: 'boolean', required: false, description: 'Whether to merge with existing customizations' }
      ],
      metadata: {
        tags: ['theme', 'update', 'customize'],
        examples: [{
          params: { 
            customizations: { colors: { primary: '#ff6600' } },
            merge: true
          },
          description: 'Update primary color while keeping other customizations'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      const orgId = context.organization?.id;
      const userId = context.user.userId;
      
      if (!orgId || !userId) {
        throw new Error('Organization and user context required to update theme customization');
      }

      try {
        // Dispatch the updateThemeCustomization thunk from themeSlice
        const updatedTheme = await store.dispatch(updateThemeCustomization({
          orgId,
          userId,
          customizations: params.customizations as Record<string, unknown>,
          merge: params.merge as boolean
        })).unwrap();

        // The thunk's fulfilled action will have already updated the Redux state.
        return {
          success: true,
          data: updatedTheme
        };
      } catch (error) {
        console.error('[ThemePageController][updateThemeCustomizationAction] Error updating theme customization via thunk:', error);
        throw error;
      }
    }
  );
}