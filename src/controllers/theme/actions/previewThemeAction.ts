import { ActionConfig } from '../../base/BasePageController';
import { ActionContext } from '../../types/ActionTypes';
import { store } from '../../../store/store';
import { getAvailableThemes, setPreviewTheme } from '../../../store/slices/themeSlice'; // Import the thunk and action
import { OrganizationTheme } from '../../../theming/types/theme.types';

export function registerPreviewThemeAction(registerAction: (config: ActionConfig, executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>) => void): void {
  registerAction(
    {
      id: 'previewTheme',
      name: 'Preview Theme',
      description: 'Preview a theme without applying it permanently',
      category: 'ui',
      permissions: ['theme:read'],
      parameters: [
        { name: 'themeId', type: 'string', required: false, description: 'Theme template ID for custom themes' },
        { name: 'themeName', type: 'string', required: false, description: 'Built-in theme name' },
        { name: 'customizations', type: 'object', required: false, description: 'Theme customizations to preview' }
      ],
      metadata: {
        tags: ['theme', 'preview', 'temporary'],
        examples: [{
          params: { themeName: 'dark' },
          description: 'Preview the dark theme'
        }]
      }
    },
    async (params: Record<string, unknown>, context: ActionContext) => {
      let previewTheme: OrganizationTheme | null = null;
      const orgId = context.organization?.id;

      if (!orgId) {
        throw new Error('Organization context is required for previewing themes.');
      }

      try {
        // Dispatch the getAvailableThemes thunk to fetch themes
        const availableThemes: OrganizationTheme[] = await store.dispatch(getAvailableThemes({
          orgId,
          includeCustom: true // Always include custom to find by ID if needed
        })).unwrap();

        if (!Array.isArray(availableThemes)) {
          throw new Error('Failed to fetch available themes for preview.');
        }

        if (params.themeName) {
          // Find built-in theme by name
          previewTheme = availableThemes.find((t: OrganizationTheme) => t.name === params.themeName && t.organizationId === 'system') || null;
        } else if (params.themeId) {
          // Find custom theme by ID
          previewTheme = availableThemes.find((t: OrganizationTheme) => t.id === params.themeId && t.organizationId === orgId) || null;
        }

        // Apply any customizations
        if (params.customizations && previewTheme) {
          previewTheme = {
            ...previewTheme,
            ...(params.customizations as Partial<OrganizationTheme>)
          };
        }
        
        // Set preview theme in Redux using the dedicated action
        if (previewTheme) {
          store.dispatch(setPreviewTheme(previewTheme));
        }
        
        return {
          success: true,
          data: previewTheme
        };
      } catch (error) {
        console.error('[ThemePageController][previewThemeAction] Error previewing theme via thunk:', error);
        throw error;
      }
    }
  );
}