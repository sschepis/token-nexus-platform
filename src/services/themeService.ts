// src/services/themeService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { ThemeConfig } from './theme/types/ThemeTypes';
import { getDefaultTheme, getBuiltInThemes } from './theme/data/BuiltInThemes';

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
        return { theme: getDefaultTheme(), isDefault: true };
      }
      return { theme: themeConfig.toJSON(), isDefault: false };
    } catch (error) {
      console.error('[ThemeService] Error getting current theme:', error);
      // Fallback to default theme on error
      return { theme: getDefaultTheme(), isDefault: true };
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
      let themes = getBuiltInThemes();

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
        const customTheme = await query.first();
        if (!customTheme) throw new Error('Custom theme not found');
        themeData = customTheme.toJSON();
      } else if (themeName) {
        const builtInTheme = getBuiltInThemes().find(theme => theme.name === themeName);
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
        const builtInThemes = getBuiltInThemes();
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
      return getDefaultTheme();
    } catch (error) {
      console.error('[ThemeService] Error resetting to default theme:', error);
      throw error;
    }
  }
}

export const themeService = new ThemeService();