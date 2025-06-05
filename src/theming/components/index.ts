/**
 * Theming Components Index
 * Exports all theming-related components for easy importing
 */

// Theme Editor Components
export { ThemeEditor } from './ThemeEditor/ThemeEditor';
export { ColorEditor } from './ThemeEditor/ColorEditor';

// Theme Template Gallery
export { ThemeTemplateGallery } from './ThemeTemplateGallery/ThemeTemplateGallery';

// Theme Management
export { ThemeManagement } from './ThemeManagement/ThemeManagement';

// Theme Context Provider
export { ThemeProvider, useTheme, useThemeVariables, useThemeColors, useThemeTypography, useThemeSpacing, useIsPreviewMode, withTheme, ThemeDebugInfo } from '../providers/ThemeContext';

// Re-export types for convenience
export type { 
  OrganizationTheme, 
  ThemeTemplate, 
  ThemeUpdate, 
  ThemeValidationResult,
  ThemeContextValue,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ComponentTheme,
  ThemeInheritance,
  CSSVariableMap
} from '../types/theme.types';

// Re-export utilities
export { ThemeValidator } from '../utils/themeValidation';
export { CSSGenerator, generateThemeCSS, generateCSSVariables, minifyCSS, validateCSS } from '../utils/cssGeneration';

// Re-export engine
export { getThemeEngine } from '../engine/ThemeEngine';
export { ThemeResolver } from '../engine/ThemeResolver';
export { CSSVariableGenerator } from '../engine/CSSVariableGenerator';

// Re-export templates
export { 
  themeTemplates, 
  themeTemplatesList, 
  getThemeTemplate, 
  getThemeTemplatesByCategory, 
  getThemeTemplatesByTags, 
  getPopularThemeTemplates, 
  searchThemeTemplates,
  corporateTheme,
  modernTheme,
  minimalTheme
} from '../templates';

// Re-export Redux slice
export {
  // Actions
  setCurrentTheme,
  updateCurrentTheme,
  setPreviewTheme,
  clearPreview,
  undoTheme,
  redoTheme,
  setEditorActiveTab,
  setSelectedComponent,
  setEditorDirty,
  toggleAutoSave,
  resetThemeState,
  setValidationResult,
  clearThemeError,
  // Async thunks
  loadOrganizationTheme,
  saveOrganizationTheme,
  applyThemeTemplate,
  validateTheme,
  loadThemeTemplates,
  // Selectors
  selectCurrentTheme,
  selectThemeLoading,
  selectThemeError,
  selectThemeTemplates,
  selectPreviewTheme,
  selectIsPreviewMode,
  selectValidationResult,
  selectEditorState,
  selectCanUndo,
  selectCanRedo
} from '../../store/slices/themeSlice';