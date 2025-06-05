// src/services/themeService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';

/**
 * @typedef {object} ThemeService
 * @property {function(string): Promise<any>} getThemeConfiguration - Fetches a specific theme configuration by ID or name.
 * @property {function(string): Promise<{ theme: any; isDefault: boolean }>} getCurrentTheme - Gets the currently active theme for an organization.
 * @property {function(boolean, string): Promise<any[]>} getAvailableThemes - Gets all available theme templates (built-in and custom).
 * @property {function(string, string, Record<string, unknown>, Record<string, unknown>): Promise<any>} applyTheme - Applies a selected theme to an organization.
 * @property {function(string, string, string, any): Promise<any>} createCustomTheme - Creates a new custom theme template.
 * @property {function(string, string, Record<string, unknown>, boolean): Promise<any>} updateThemeCustomization - Updates active theme's customizations.
 * @property {function(string): Promise<void>} deleteCustomTheme - Deletes a custom theme template.
 * @property {function(string): Promise<any>} resetToDefaultTheme - Resets an organization's theme to the default.
 * @property {function(): any} getDefaultTheme - Returns the hardcoded default theme.
 * @property {function(): any[]} getBuiltInThemes - Returns a list of hardcoded built-in theme templates.
 */

// Define internal interface for theme data extracted from Parse or built-in
interface ThemeConfig {
  id?: string;
  name: string;
  description: string;
  category: string;
  colors: any;
  typography: any;
  spacing: any;
  components: any;
  isCustom?: boolean;
  isActive?: boolean;
  // Add other properties as needed from ThemeConfiguration or ThemeTemplate Parse objects
}

export class ThemeService {
  /**
   * Fetches the active theme configuration for an organization.
   * If no active theme is found, returns the default theme.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<{ theme: any; isDefault: boolean }>} The theme configuration.
   * @tsdoc
   */
  async getCurrentTheme(orgId: string): Promise<{ theme: any; isDefault: boolean }> {
    try {
      const query = new Parse.Query('ThemeConfiguration');
      query.equalTo('organizationId', orgId);
      query.equalTo('isActive', true);
      const themeConfig = await query.first();

      if (!themeConfig) {
        return { theme: this.getDefaultTheme(), isDefault: true };
      }
      return { theme: themeConfig.toJSON(), isDefault: false };
    } catch (error) {
      console.error('[ThemeService] Error getting current theme:', error);
      // Fallback to default theme on error
      return { theme: this.getDefaultTheme(), isDefault: true };
    }
  }

  /**
   * Fetches all available theme templates (built-in and custom for an organization).
   * @param {string} orgId - The ID of the organization.
   * @param {boolean} includeCustom - Whether to include custom themes.
   * @param {string} [category] - Filter by theme category.
   * @returns {Promise<any[]>} An array of available themes.
   * @tsdoc
   */
  async getAvailableThemes(orgId: string, includeCustom: boolean = true, category?: string): Promise<any[]> {
    try {
      let themes = this.getBuiltInThemes();

      if (includeCustom && orgId) {
        const query = new Parse.Query('ThemeTemplate');
        query.equalTo('organizationId', orgId);
        if (category) {
          query.equalTo('category', category);
        }
        const customThemes = await query.find();
        const customThemeData = customThemes.map(theme => ({
          ...theme.toJSON(),
          isCustom: true
        }));
        themes = [...themes, ...customThemeData as any[]];
      }

      if (category) {
        themes = themes.filter(theme => theme.category === category);
      }
      return themes;
    } catch (error) {
      console.error('[ThemeService] Error getting available themes:', error);
      return [];
    }
  }

  /**
   * Applies a selected theme to the organization.
   * This deactivates the current theme and creates a new active theme configuration.
   * @param {string} orgId - The ID of the organization.
   * @param {string} userId - The ID of the user applying the theme.
   * @param {string} [themeId] - The ID of a custom theme template to apply.
   * @param {string} [themeName] - The name of a built-in theme to apply.
   * @param {Record<string, unknown>} [customizations] - Optional customizations to apply on top of the base theme.
   * @returns {Promise<any>} The saved theme configuration.
   * @tsdoc
   */
  async applyTheme(
    orgId: string,
    userId: string,
    themeId?: string,
    themeName?: string,
    customizations: Record<string, unknown> = {}
  ): Promise<any> {
    try {
      let themeData: any;

      if (themeId) {
        const query = new Parse.Query('ThemeTemplate');
        query.equalTo('objectId', themeId);
        // query.equalTo('organizationId', orgId); // Should custom themes be globally available or only to their org? Assuming org-specific for now.
        const customTheme = await query.first();
        if (!customTheme) throw new Error('Custom theme not found');
        themeData = customTheme.toJSON();
      } else if (themeName) {
        const builtInTheme = this.getBuiltInThemes().find(theme => theme.name === themeName);
        if (!builtInTheme) throw new Error('Built-in theme not found');
        themeData = builtInTheme;
      } else {
        throw new Error('Either themeId or themeName must be provided');
      }

      // Deactivate current active theme for this organization
      const currentQuery = new Parse.Query('ThemeConfiguration');
      currentQuery.equalTo('organizationId', orgId);
      currentQuery.equalTo('isActive', true);
      const currentTheme = await currentQuery.first();
      if (currentTheme) {
        currentTheme.set('isActive', false);
        await currentTheme.save();
      }

      // Create new theme configuration
      const ThemeConfiguration = Parse.Object.extend('ThemeConfiguration');
      const newThemeConfig = new ThemeConfiguration();

      newThemeConfig.set('organizationId', orgId);
      newThemeConfig.set('name', themeData.name);
      newThemeConfig.set('description', themeData.description);
      newThemeConfig.set('colors', { ...(themeData as any).colors, ...(customizations as any).colors });
      newThemeConfig.set('typography', { ...(themeData as any).typography, ...(customizations as any).typography });
      newThemeConfig.set('spacing', { ...(themeData as any).spacing, ...(customizations as any).spacing });
      newThemeConfig.set('components', { ...(themeData as any).components, ...(customizations as any).components });
      newThemeConfig.set('customizations', customizations);
      newThemeConfig.set('appliedBy', userId);
      newThemeConfig.set('isActive', true);

      const savedThemeConfig = await newThemeConfig.save();
      return savedThemeConfig.toJSON();
    } catch (error) {
      console.error('[ThemeService] Error applying theme:', error);
      throw error;
    }
  }

  /**
   * Creates a new custom theme template for an organization.
   * @param {string} orgId - The ID of the organization.
   * @param {string} createdByUserId - The ID of the user creating the theme.
   * @param {object} params - Theme creation parameters.
   * @param {string} params.name - The name of the custom theme.
   * @param {string} [params.description] - Description of the custom theme.
   * @param {string} [params.baseTheme] - Name of a built-in theme to base this custom theme on.
   * @param {any} params.colors - Color configuration.
   * @param {any} [params.typography] - Typography configuration.
   * @param {any} [params.spacing] - Spacing configuration.
   * @param {any} [params.components] - Component styling configuration.
   * @param {string} [params.category] - Theme category.
   * @returns {Promise<any>} The saved custom theme template.
   * @tsdoc
   */
  async createCustomTheme(
    orgId: string,
    createdByUserId: string,
    params: {
      name: string;
      description?: string;
      baseTheme?: string;
      colors: any;
      typography?: any;
      spacing?: any;
      components?: any;
      category?: string;
    }
  ): Promise<any> {
    try {
      const { 
        name, 
        description, 
        baseTheme, 
        colors, 
        typography = {}, 
        spacing = {}, 
        components = {},
        category = 'custom'
      } = params;

      let baseThemeData: any = {};
      if (baseTheme) {
        const builtInThemes = this.getBuiltInThemes();
        const base = builtInThemes.find(theme => theme.name === baseTheme);
        if (base) {
          baseThemeData = base;
        }
      }

      const ThemeTemplate = Parse.Object.extend('ThemeTemplate');
      const themeTemplate = new ThemeTemplate();

      themeTemplate.set('name', name);
      themeTemplate.set('description', description || '');
      themeTemplate.set('category', category);
      themeTemplate.set('baseTheme', baseTheme || '');
      themeTemplate.set('colors', Object.assign({}, baseThemeData.colors || {}, colors));
      themeTemplate.set('typography', Object.assign({}, baseThemeData.typography || {}, typography));
      themeTemplate.set('spacing', Object.assign({}, baseThemeData.spacing || {}, spacing));
      themeTemplate.set('components', Object.assign({}, baseThemeData.components || {}, components));
      themeTemplate.set('organizationId', orgId);
      themeTemplate.set('createdBy', createdByUserId);
      themeTemplate.set('isActive', true); // Custom themes are typically active upon creation in template list

      const savedTheme = await themeTemplate.save();
      return savedTheme.toJSON();
    } catch (error) {
      console.error('[ThemeService] Error creating custom theme:', error);
      throw error;
    }
  }

  /**
   * Updates specific customizations of the currently active theme.
   * This does NOT change the base theme, only overrides/merges properties.
   * @param {string} orgId - The ID of the organization.
   * @param {string} userId - The ID of the user updating the theme.
   * @param {Record<string, unknown>} customizations - New customizations to apply.
   * @param {boolean} merge - If true, merge with existing customizations; otherwise, replace.
   * @returns {Promise<any>} The updated theme configuration.
   * @tsdoc
   */
  async updateThemeCustomization(
    orgId: string,
    userId: string,
    customizations: Record<string, unknown>,
    merge: boolean = true
  ): Promise<any> {
    try {
      const query = new Parse.Query('ThemeConfiguration');
      query.equalTo('organizationId', orgId);
      query.equalTo('isActive', true);
      const currentTheme = await query.first();

      if (!currentTheme) {
        throw new Error('No active theme found to customize');
      }

      const customizationsObj = customizations as Record<string, any>;

      if (merge) {
        const existingCustomizations = currentTheme.get('customizations') || {};
        const mergedCustomizations = { ...existingCustomizations, ...customizationsObj };
        currentTheme.set('customizations', mergedCustomizations);

        if (customizationsObj.colors) {
          const existingColors = currentTheme.get('colors') || {};
          currentTheme.set('colors', { ...existingColors, ...customizationsObj.colors });
        }
        if (customizationsObj.typography) {
          const existingTypography = currentTheme.get('typography') || {};
          currentTheme.set('typography', { ...existingTypography, ...customizationsObj.typography });
        }
        if (customizationsObj.spacing) {
          const existingSpacing = currentTheme.get('spacing') || {};
          currentTheme.set('spacing', { ...existingSpacing, ...customizationsObj.spacing });
        }
        if (customizationsObj.components) {
          const existingComponents = currentTheme.get('components') || {};
          currentTheme.set('components', { ...existingComponents, ...customizationsObj.components });
        }
      } else {
        currentTheme.set('customizations', customizationsObj);
        // When replacing, ensure full theme properties are updated or reset based on new customizations
        // For simplicity, this assumes `customizationsObj` directly maps to theme property structure
        currentTheme.set('colors', customizationsObj.colors || {});
        currentTheme.set('typography', customizationsObj.typography || {});
        currentTheme.set('spacing', customizationsObj.spacing || {});
        currentTheme.set('components', customizationsObj.components || {});
      }

      currentTheme.set('updatedBy', userId);
      const savedTheme = await currentTheme.save();
      return savedTheme.toJSON();
    } catch (error) {
      console.error('[ThemeService] Error updating theme customization:', error);
      throw error;
    }
  }

  /**
   * Deletes a custom theme template by its ID.
   * @param {string} themeTemplateId - The ID of the custom theme template to delete.
   * @returns {Promise<void>}
   * @tsdoc
   */
  async deleteCustomTheme(themeTemplateId: string): Promise<void> {
    try {
      const query = new Parse.Query('ThemeTemplate');
      const themeTemplate = await query.get(themeTemplateId);
      await themeTemplate.destroy();
    } catch (error) {
      console.error('[ThemeService] Error deleting custom theme:', error);
      throw error;
    }
  }
  
  /**
   * Resets an organization's active theme to the default system theme.
   * This deactivates any existing custom theme configuration.
   * @param {string} orgId - The ID of the organization.
   * @param {string} userId - The ID of the user performing the reset.
   * @returns {Promise<any>} The default theme configuration.
   * @tsdoc
   */
  async resetToDefaultTheme(orgId: string, userId: string): Promise<any> {
    try {
      // Deactivate current active theme
      const currentQuery = new Parse.Query('ThemeConfiguration');
      currentQuery.equalTo('organizationId', orgId);
      currentQuery.equalTo('isActive', true);
      const currentTheme = await currentQuery.first();
      
      if (currentTheme) {
        currentTheme.set('isActive', false);
        await currentTheme.save();
      }

      // No new theme configuration is created, as it reverts to implicit default
      return this.getDefaultTheme();
    } catch (error) {
      console.error('[ThemeService] Error resetting to default theme:', error);
      throw error;
    }
  }

  /**
   * Returns the hardcoded default theme structure.
   * @returns {any} The default theme object.
   * @tsdoc
   */
  private getDefaultTheme(): any {
    return {
      name: 'Default',
      description: 'Default Token Nexus theme',
      category: 'built-in',
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem'
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700'
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      components: {
        button: {
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem'
        },
        card: {
          borderRadius: '0.5rem',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        },
        input: {
          borderRadius: '0.375rem',
          borderWidth: '1px'
        }
      }
    };
  }

  /**
   * Returns a list of hardcoded built-in theme templates.
   * @returns {any[]} An array of built-in theme objects.
   * @tsdoc
   */
  private getBuiltInThemes(): any[] {
    const builtInThemes = [
      {
        id: 'theme_minimal',
        name: 'Minimal',
        description: 'A clean and simple theme.',
        category: 'minimal',
        colors: {
          primary: '#3B82F6', // blue-500
          secondary: '#6B7280', // gray-500
          background: '#F9FAFB', // gray-50
          text: '#1F2937', // gray-900
          border: '#D1D5DB' // gray-300
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          headingSize: '2.25rem',
          bodySize: '1rem'
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem'
        },
        components: { /* specific component styles */ },
        isBuiltIn: true
      },
      {
        id: 'theme_modern',
        name: 'Modern',
        description: 'A sleek and contemporary theme.',
        category: 'modern',
        colors: {
          primary: '#8B5CF6', // violet-500
          secondary: '#4B5563', // gray-700
          background: '#FFFFFF', // white
          text: '#111827', // gray-900
          border: '#E5E7EB' // gray-200
        },
        typography: {
          fontFamily: 'Roboto, sans-serif',
          headingSize: '2.5rem',
          bodySize: '1.05rem'
        },
        spacing: {
          sm: '0.75rem',
          md: '1.25rem',
          lg: '1.75rem'
        },
        components: { /* specific component styles */ },
        isBuiltIn: true
      },
      {
        id: 'theme_corporate',
        name: 'Corporate',
        description: 'A professional and business-oriented theme.',
        category: 'corporate',
        colors: {
          primary: '#007BFF', // brand blue
          secondary: '#6C757D', // mute gray
          background: '#F8F9FA', // light gray
          text: '#343A40', // dark gray
          border: '#DEE2E6' // very light gray
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          headingSize: '2rem',
          bodySize: '0.95rem'
        },
        spacing: {
          sm: '0.625rem',
          md: '1.125rem',
          lg: '1.625rem'
        },
        components: { /* specific component styles */ },
        isBuiltIn: true
      },
       {
        id: 'theme_dark',
        name: 'Dark Mode (Experimental)',
        description: 'A theme with dark background and light text.',
        category: 'experimental',
        colors: {
          primary: '#3B82F6', // blue-500
          secondary: '#6B7280', // gray-500
          background: '#1F2937', // gray-900
          text: '#F9FAFB', // gray-50
          border: '#4B5563' // gray-700
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          headingSize: '2.25rem',
          bodySize: '1rem'
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem'
        },
        components: { /* specific component styles */ },
        isBuiltIn: true
      }
    ];
    return builtInThemes;
  }
}

export const themeService = new ThemeService();