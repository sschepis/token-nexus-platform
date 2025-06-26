import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext } from './types/ActionTypes';
import { store } from '../store/store';
import { registerGetCurrentThemeAction } from './theme/actions/getCurrentThemeAction';
import { registerGetAvailableThemesAction } from './theme/actions/getAvailableThemesAction';
import { registerApplyThemeAction } from './theme/actions/applyThemeAction';
import { registerCreateCustomThemeAction } from './theme/actions/createCustomThemeAction';
import { registerUpdateThemeCustomizationAction } from './theme/actions/updateThemeCustomizationAction';
import { registerDeleteCustomThemeAction } from './theme/actions/deleteCustomThemeAction';
import { registerResetToDefaultThemeAction } from './theme/actions/resetToDefaultThemeAction';
import { registerRefreshThemesAction } from './theme/actions/refreshThemesAction';
import { registerPreviewThemeAction } from './theme/actions/previewThemeAction'; // Import the new action file for previewTheme
import {
  loadOrganizationTheme, // Still needed if RefreshThemesAction dispatches it with data
  saveOrganizationTheme, // Potentially removed if all save logic is via cloud functions
  resetOrganizationTheme, // Still needed if ResetToDefaultThemeAction dispatches it
  validateTheme, // Utility, might still be needed if client-side validation occurs
  loadThemeTemplates, // Potentially removed
  applyThemeTemplate, // Potentially removed
  getAvailableThemes, // Still needed if RefreshThemesAction dispatches it or if other places use it to get available themes.
  createCustomTheme, // Still needed if CreateCustomThemeAction dispatches it
  updateThemeCustomization, // Still needed if UpdateThemeCustomizationAction dispatches it
  deleteCustomTheme, // Still needed if DeleteCustomThemeAction dispatches it
  applyTheme, // Still needed if ApplyThemeAction dispatches it
  setCurrentTheme, // Internal Redux state update, likely still needed
  updateCurrentTheme, // Internal Redux state update, likely still needed
  setPreviewTheme, // Still needed if PreviewThemeAction dispatches it
  clearPreview // Potentially removed
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
      registerGetCurrentThemeAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ getCurrentTheme action registered');
      registerGetAvailableThemesAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ getAvailableThemes action registered');
      registerApplyThemeAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ applyTheme action registered');
      registerCreateCustomThemeAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ createCustomTheme action registered');
      registerUpdateThemeCustomizationAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ updateThemeCustomization action registered');
      registerDeleteCustomThemeAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ deleteCustomTheme action registered');
      registerResetToDefaultThemeAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ resetToDefaultTheme action registered');
      registerRefreshThemesAction(this.registerAction.bind(this));
      console.log('[ThemePageController] ✓ refreshThemes action registered');
      registerPreviewThemeAction(this.registerAction.bind(this)); // Register the external previewTheme action
      console.log('[ThemePageController] ✓ previewTheme action registered');
      console.log('[ThemePageController] All actions initialized successfully. Total actions:', this.actions.size);
    } catch (error) {
      console.error('[ThemePageController] Action initialization failed:', error);
      throw error;
    }
  }
 
  // All private methods that were extracted have been removed from this file.
  // The content of:
  // - registerGetAvailableThemesAction
  // - registerApplyThemeAction
  // - registerCreateCustomThemeAction
  // - registerUpdateThemeCustomizationAction
  // - registerDeleteCustomThemeAction
  // - registerResetToDefaultThemeAction
  // - registerRefreshThemesAction
  // - registerPreviewThemeAction
  // were previously here, but are now in their own respective files under src/controllers/theme/actions/.
}