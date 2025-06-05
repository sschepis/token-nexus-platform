import { PageController } from './types/pageController';
import { ActionDefinition } from './types/actionDefinitions';
import { ActionContext, PageContext } from './types/actionContexts';
import { ActionResult } from './types/actionResults';
import { themeService } from '../services/themeService'; // Import the new theme service
import Parse from 'parse'; // Keep Parse import as it's still used for queries in some actions

export class ThemePageController implements PageController {
  pageId = 'theme';
  pageName = 'Theme';
  description = 'Manage application themes, styling, and visual customization';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'theme',
    pageName: 'Theme',
    state: {},
    props: {},
    metadata: {
      category: 'customization',
      tags: ['theme', 'styling', 'appearance', 'customization', 'branding'],
      permissions: ['theme:read', 'theme:write', 'theme:manage']
    }
  };
  metadata = {
    category: 'customization',
    tags: ['theme', 'styling', 'appearance', 'customization', 'branding'],
    permissions: ['theme:read', 'theme:write', 'theme:manage'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    /**
     * Get Current Theme Action
     * Get the currently active theme configuration for the organization.
     */
    this.actions.set('getCurrentTheme', {
      id: 'getCurrentTheme',
      name: 'Get Current Theme',
      description: 'Get the currently active theme configuration',
      category: 'data',
      permissions: ['theme:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return { success: false, error: 'Organization ID is required to get current theme' };
          }
          const { theme, isDefault } = await themeService.getCurrentTheme(orgId);
          return { success: true, data: { theme, isDefault }, message: 'Current theme retrieved successfully' };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to get current theme' };
        }
      }
    });

    /**
     * Get Available Themes Action
     * Get all available theme templates and custom themes for the organization.
     */
    this.actions.set('getAvailableThemes', {
      id: 'getAvailableThemes',
      name: 'Get Available Themes',
      description: 'Get all available theme templates and custom themes',
      category: 'data',
      permissions: ['theme:read'],
      parameters: [
        { name: 'includeCustom', type: 'boolean', required: false, description: 'Include custom organization themes' },
        { name: 'category', type: 'string', required: false, description: 'Filter by theme category' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { includeCustom = true, category } = params;
          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return { success: false, error: 'Organization ID is required to get available themes' };
          }
          const themes = await themeService.getAvailableThemes(orgId, includeCustom as boolean, category as string);
          // Recalculate counts based on returned themes, as service might filter
          const builtInCount = themes.filter(t => (t as any).isBuiltIn).length;
          const customCount = themes.length - builtInCount;
          return {
            success: true,
            data: { themes, totalCount: themes.length, builtInCount, customCount },
            message: `Found ${themes.length} available themes`
          };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to get available themes' };
        }
      }
    });

    /**
     * Apply Theme Action
     * Apply a selected theme (built-in or custom) to the organization.
     */
    this.actions.set('applyTheme', {
      id: 'applyTheme',
      name: 'Apply Theme',
      description: 'Apply a theme to the organization',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [
        { name: 'themeId', type: 'string', required: false, description: 'Theme template ID (for custom themes)' },
        { name: 'themeName', type: 'string', required: false, description: 'Built-in theme name' },
        { name: 'customizations', type: 'object', required: false, description: 'Theme customizations to apply' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { themeId, themeName, customizations } = params;
          const orgId = context.user.organizationId || context.organization?.id;
          const userId = context.user.userId;

          if (!orgId || !userId) {
            return { success: false, error: 'Organization ID and User ID are required to apply theme' };
          }
          const themeConfig = await themeService.applyTheme(orgId, userId, themeId as string, themeName as string, customizations as Record<string, unknown>);
          return { success: true, data: { themeConfiguration: themeConfig }, message: `Theme "${themeConfig.name}" applied successfully` };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to apply theme' };
        }
      }
    });

    /**
     * Create Custom Theme Action
     * Create a new custom theme template for an organization.
     */
    this.actions.set('createCustomTheme', {
      id: 'createCustomTheme',
      name: 'Create Custom Theme',
      description: 'Create a new custom theme template',
      category: 'data',
      permissions: ['theme:write'],
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
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = context.user.organizationId || context.organization?.id;
          const userId = context.user.userId;
          if (!orgId || !userId) {
            return { success: false, error: 'Organization ID and User ID are required to create custom theme' };
          }
          const theme = await themeService.createCustomTheme(orgId, userId, params as any); // params directly maps to service method structure
          return { success: true, data: { theme }, message: `Custom theme "${theme.name}" created successfully` };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to create custom theme' };
        }
      }
    });

    /**
     * Update Theme Customization Action
     * Update specific theme customizations of the currently active theme for the organization.
     */
    this.actions.set('updateThemeCustomization', {
      id: 'updateThemeCustomization',
      name: 'Update Theme Customization',
      description: 'Update specific theme customizations without changing the base theme',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [
        { name: 'customizations', type: 'object', required: true, description: 'Theme customizations to update' },
        { name: 'merge', type: 'boolean', required: false, description: 'Merge with existing customizations' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { customizations, merge = true } = params;
          const orgId = context.user.organizationId || context.organization?.id;
          const userId = context.user.userId;

          if (!orgId || !userId) {
            return { success: false, error: 'Organization ID and User ID are required to update theme customization' };
          }
          const updatedTheme = await themeService.updateThemeCustomization(orgId, userId, customizations as Record<string, unknown>, merge as boolean);
          return { success: true, data: { theme: updatedTheme }, message: 'Theme customizations updated successfully' };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to update theme customization' };
        }
      }
    });

    /**
     * Delete Custom Theme Action
     * Deletes an existing custom theme template.
     */
    this.actions.set('deleteCustomTheme', {
      id: 'deleteCustomTheme',
      name: 'Delete Custom Theme',
      description: 'Delete a custom theme template',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [
        { name: 'themeTemplateId', type: 'string', required: true, description: 'ID of the theme template to delete' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { themeTemplateId } = params;
          if (!themeTemplateId) {
            return { success: false, error: 'Theme template ID is required to delete custom theme' };
          }
          await themeService.deleteCustomTheme(themeTemplateId as string);
          return { success: true, message: 'Custom theme deleted successfully' };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to delete custom theme' };
        }
      }
    });

    /**
     * Reset to Default Theme Action
     * Resets the organization's theme configuration to the system default.
     */
    this.actions.set('resetToDefaultTheme', {
      id: 'resetToDefaultTheme',
      name: 'Reset to Default Theme',
      description: 'Resets the current theme to the system default configuration',
      category: 'data',
      permissions: ['theme:write'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const orgId = context.user.organizationId || context.organization?.id;
          const userId = context.user.userId;
          if (!orgId || !userId) {
            return { success: false, error: 'Organization ID and User ID are required to reset theme' };
          }
          const defaultTheme = await themeService.resetToDefaultTheme(orgId, userId);
          return { success: true, data: { theme: defaultTheme }, message: 'Theme reset to default successfully' };
        } catch (error) {
          return { success: false, error: (error as Error).message || 'Failed to reset theme to default' };
        }
      }
    });
  }
}

export const themePageController = new ThemePageController();