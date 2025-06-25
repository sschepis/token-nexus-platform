import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext } from './types/ActionTypes';
import { store } from '../store/store';
import {
  loadOrganizationTheme,
  saveOrganizationTheme,
  resetOrganizationTheme,
  validateTheme,
  loadThemeTemplates,
  applyThemeTemplate,
  getAvailableThemes,
  createCustomTheme,
  updateThemeCustomization,
  deleteCustomTheme,
  applyTheme,
  setCurrentTheme,
  updateCurrentTheme,
  setPreviewTheme,
  clearPreview
} from '../store/slices/themeSlice';

/**
 * Theme Page Controller
 * 
 * Manages theme-related operations following PAGES.md conventions.
 * Provides standardized actions for theme management, customization,
 * and organization-wide theme application.
 */
export class ThemePageController extends BasePageController {
  constructor() {
    try {
      super({
        pageId: 'theme',
        pageName: 'Theme Management',
        description: 'Customize your organization\'s visual appearance and branding with comprehensive theme management tools',
        category: 'customization',
        tags: ['theme', 'styling', 'appearance', 'customization', 'branding', 'ui'],
        permissions: ['theme:read', 'theme:write', 'theme:manage', 'system:admin'],
        version: '2.0.0'
      });
      console.log('[ThemePageController] Constructor completed successfully');
      console.log('[ThemePageController] Actions registered:', Array.from(this.actions.keys()));
    } catch (error) {
      console.error('[ThemePageController] Constructor failed:', error);
      throw error;
    }
  }

  protected initializeActions(): void {
    try {
      console.log('[ThemePageController] Starting action initialization...');
      this.registerGetCurrentThemeAction();
      console.log('[ThemePageController] ✓ getCurrentTheme action registered');
      this.registerGetAvailableThemesAction();
      console.log('[ThemePageController] ✓ getAvailableThemes action registered');
      this.registerApplyThemeAction();
      console.log('[ThemePageController] ✓ applyTheme action registered');
      this.registerCreateCustomThemeAction();
      console.log('[ThemePageController] ✓ createCustomTheme action registered');
      this.registerUpdateThemeCustomizationAction();
      console.log('[ThemePageController] ✓ updateThemeCustomization action registered');
      this.registerDeleteCustomThemeAction();
      console.log('[ThemePageController] ✓ deleteCustomTheme action registered');
      this.registerResetToDefaultThemeAction();
      console.log('[ThemePageController] ✓ resetToDefaultTheme action registered');
      this.registerRefreshThemesAction();
      console.log('[ThemePageController] ✓ refreshThemes action registered');
      this.registerPreviewThemeAction();
      console.log('[ThemePageController] ✓ previewTheme action registered');
      console.log('[ThemePageController] All actions initialized successfully. Total actions:', this.actions.size);
    } catch (error) {
      console.error('[ThemePageController] Action initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Current Theme Action
   * Retrieves the currently active theme configuration for the organization
   */
  private registerGetCurrentThemeAction(): void {
    this.registerAction(
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
          throw new Error('Organization context required to get current theme');
        }

        try {
          const result = await store.dispatch(loadOrganizationTheme(orgId));
          
          if (loadOrganizationTheme.fulfilled.match(result)) {
            return {
              success: true,
              data: result.payload
            };
          } else {
            // Return minimal default theme to prevent infinite loops
            const defaultTheme = {
              id: 'default',
              name: 'Default Theme',
              version: '1.0.0',
              organizationId: orgId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              colors: { primary: '#007bff' },
              typography: { fontFamily: 'system-ui' },
              spacing: { md: '1rem' },
              borderRadius: { md: '0.375rem' },
              shadows: { md: '0 4px 6px rgba(0,0,0,0.1)' },
              components: {},
              branding: { companyName: '' },
              layout: { containerMaxWidth: '1200px' },
              animations: { duration: { normal: '300ms' } },
              isDefault: true
            } as unknown as any;
            
            return {
              success: true,
              data: defaultTheme,
              isDefault: true,
              warning: 'Using default theme due to loading error'
            };
          }
        } catch (error) {
          // Return minimal default theme on any error to prevent cascading failures
          const defaultTheme = {
            id: 'default',
            name: 'Default Theme',
            version: '1.0.0',
            organizationId: orgId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            colors: { primary: '#007bff' },
            typography: { fontFamily: 'system-ui' },
            spacing: { md: '1rem' },
            borderRadius: { md: '0.375rem' },
            shadows: { md: '0 4px 6px rgba(0,0,0,0.1)' },
            components: {},
            branding: { companyName: '' },
            layout: { containerMaxWidth: '1200px' },
            animations: { duration: { normal: '300ms' } },
            isDefault: true
          } as unknown as any;
          
          return {
            success: true,
            data: defaultTheme,
            isDefault: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );
  }

  /**
   * Get Available Themes Action
   * Retrieves all available theme templates and custom themes for the organization
   */
  private registerGetAvailableThemesAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(getAvailableThemes({
          orgId,
          includeCustom: params.includeCustom as boolean,
          category: params.category as string
        }));
        
        if (getAvailableThemes.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to load available themes');
        }
      }
    );
  }

  /**
   * Apply Theme Action
   * Applies a selected theme (built-in or custom) to the organization
   */
  private registerApplyThemeAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(applyTheme({
          orgId,
          userId,
          themeId: params.themeId as string,
          themeName: params.themeName as string,
          customizations: params.customizations as Record<string, unknown>
        }));
        
        if (applyTheme.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to apply theme');
        }
      }
    );
  }

  /**
   * Create Custom Theme Action
   * Creates a new custom theme template for the organization
   */
  private registerCreateCustomThemeAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(createCustomTheme({
          orgId,
          userId,
          themeData: params as any
        }));
        
        if (createCustomTheme.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to create custom theme');
        }
      }
    );
  }

  /**
   * Update Theme Customization Action
   * Updates specific customizations of the currently active theme
   */
  private registerUpdateThemeCustomizationAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(updateThemeCustomization({
          orgId,
          userId,
          customizations: params.customizations as Record<string, unknown>,
          merge: params.merge as boolean
        }));
        
        if (updateThemeCustomization.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to update theme customization');
        }
      }
    );
  }

  /**
   * Delete Custom Theme Action
   * Deletes a custom theme template
   */
  private registerDeleteCustomThemeAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(deleteCustomTheme({ themeTemplateId }));
        
        if (deleteCustomTheme.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to delete custom theme');
        }
      }
    );
  }

  /**
   * Reset to Default Theme Action
   * Resets the organization's theme to the system default
   */
  private registerResetToDefaultThemeAction(): void {
    this.registerAction(
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

        const result = await store.dispatch(resetOrganizationTheme());
        
        if (resetOrganizationTheme.fulfilled.match(result)) {
          return {
            success: true,
            data: result.payload
          };
        } else {
          throw new Error(result.payload as string || 'Failed to reset to default theme');
        }
      }
    );
  }

  /**
   * Refresh Themes Action
   * Refreshes theme data from the server
   */
  private registerRefreshThemesAction(): void {
    this.registerAction(
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

        // Refresh both current theme and available themes
        const [currentResult, availableResult] = await Promise.all([
          store.dispatch(loadOrganizationTheme(orgId)),
          store.dispatch(getAvailableThemes({ orgId, includeCustom: true }))
        ]);
        
        if (loadOrganizationTheme.fulfilled.match(currentResult) &&
            getAvailableThemes.fulfilled.match(availableResult)) {
          return {
            success: true,
            data: {
              currentTheme: currentResult.payload,
              availableThemes: availableResult.payload
            }
          };
        } else {
          throw new Error('Failed to refresh theme data');
        }
      }
    );
  }

  /**
   * Preview Theme Action
   * Previews a theme without applying it permanently
   */
  private registerPreviewThemeAction(): void {
    this.registerAction(
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
        // Create a preview theme object
        let previewTheme = null;
        
        if (params.themeName) {
          // For built-in themes, load from available themes
          const orgId = context.organization?.id;
          if (orgId) {
            const templatesResult = await store.dispatch(getAvailableThemes({ orgId, includeCustom: false }));
            if (getAvailableThemes.fulfilled.match(templatesResult)) {
              const template = templatesResult.payload.find((t: any) => t.name === params.themeName);
              if (template) {
                previewTheme = template;
              }
            }
          }
        } else if (params.themeId) {
          // For custom themes, load from available themes
          const orgId = context.organization?.id;
          if (orgId) {
            const templatesResult = await store.dispatch(getAvailableThemes({ orgId, includeCustom: true }));
            if (getAvailableThemes.fulfilled.match(templatesResult)) {
              const template = templatesResult.payload.find((t: any) => t.id === params.themeId);
              if (template) {
                previewTheme = template;
              }
            }
          }
        }
        
        // Apply any customizations
        if (params.customizations && previewTheme) {
          previewTheme = {
            ...previewTheme,
            ...(params.customizations as Record<string, unknown>)
          };
        }
        
        // Set preview theme in Redux
        if (previewTheme) {
          store.dispatch(setPreviewTheme(previewTheme as any));
        }
        
        return {
          success: true,
          data: {
            previewActive: !!previewTheme,
            themeId: params.themeId,
            themeName: params.themeName,
            customizations: params.customizations
          }
        };
      }
    );
  }
}

export const themePageController = new ThemePageController();