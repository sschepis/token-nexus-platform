/**
 * Token Nexus Platform - Theming System
 * 
 * A comprehensive theming system that allows organizations to customize
 * their admin dashboard and end-user pages with full branding control.
 * 
 * Features:
 * - Complete theme customization (colors, typography, components, layout)
 * - Pre-built theme templates (Corporate, Modern, Minimal)
 * - Real-time theme preview and validation
 * - WCAG accessibility compliance checking
 * - CSS variable generation and optimization
 * - Theme inheritance (Platform → Template → Organization)
 * - React Context integration
 * - Redux state management
 * - Performance optimization and caching
 */

// === CORE COMPONENTS ===
export {
  // Main theme management interface
  ThemeManagement,
  
  // Theme editor components
  ThemeEditor,
  ColorEditor,
  
  // Theme template gallery
  ThemeTemplateGallery,
  
  // React Context provider and hooks
  ThemeProvider,
  useTheme,
  useThemeVariables,
  useThemeColors,
  useThemeTypography,
  useThemeSpacing,
  useIsPreviewMode,
  withTheme,
  ThemeDebugInfo
} from './components';

// === TYPES ===
export type {
  // Core theme types
  OrganizationTheme,
  ThemeTemplate,
  ThemeUpdate,
  ThemeValidationResult,
  ThemeContextValue,
  
  // Theme structure types
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ComponentTheme,
  ThemeInheritance,
  
  // Utility types
  CSSVariableMap,
  DeepPartial
} from './types/theme.types';

// === THEME ENGINE ===
export {
  // Core theme engine
  getThemeEngine,
  
  // Theme resolution utilities
  ThemeResolver,
  
  // CSS variable generation
  CSSVariableGenerator
} from './components';

// === UTILITIES ===
export {
  // Theme validation
  ThemeValidator,
  
  // CSS generation utilities
  CSSGenerator,
  generateThemeCSS,
  generateCSSVariables,
  minifyCSS,
  validateCSS
} from './components';

// === THEME TEMPLATES ===
export {
  // Template collections
  themeTemplates,
  themeTemplatesList,
  
  // Template utilities
  getThemeTemplate,
  getThemeTemplatesByCategory,
  getThemeTemplatesByTags,
  getPopularThemeTemplates,
  searchThemeTemplates,
  
  // Individual templates
  corporateTheme,
  modernTheme,
  minimalTheme
} from './components';

// === REDUX INTEGRATION ===
export {
  // Theme slice actions
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
  validateTheme as validateThemeAsync,
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
} from './components';

// === USAGE EXAMPLES ===

/**
 * Basic Usage Example:
 * 
 * ```tsx
 * import { ThemeProvider, ThemeManagement } from '@/theming';
 * 
 * function App() {
 *   return (
 *     <ThemeProvider enableCaching enableValidation>
 *       <ThemeManagement organizationId="org-123" />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */

/**
 * Using Theme Context:
 * 
 * ```tsx
 * import { useTheme, useThemeColors } from '@/theming';
 * 
 * function MyComponent() {
 *   const { currentTheme, setTheme } = useTheme();
 *   const colors = useThemeColors();
 *   
 *   return (
 *     <div style={{ color: colors?.primary }}>
 *       Current theme: {currentTheme?.name}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Applying a Theme Template:
 * 
 * ```tsx
 * import { useDispatch } from 'react-redux';
 * import { applyThemeTemplate, corporateTheme } from '@/theming';
 * 
 * function TemplateSelector() {
 *   const dispatch = useDispatch();
 *   
 *   const handleApplyTemplate = () => {
 *     dispatch(applyThemeTemplate({
 *       templateId: corporateTheme.id,
 *       organizationId: 'org-123'
 *     }));
 *   };
 *   
 *   return (
 *     <button onClick={handleApplyTemplate}>
 *       Apply Corporate Theme
 *     </button>
 *   );
 * }
 * ```
 */

/**
 * Custom Theme Validation:
 * 
 * ```tsx
 * import { ThemeValidator } from '@/theming';
 * 
 * function validateCustomTheme(theme) {
 *   const result = ThemeValidator.validateTheme(theme);
 *   
 *   if (!result.isValid) {
 *     console.error('Theme validation failed:', result.errors);
 *   }
 *   
 *   return result;
 * }
 * ```
 */

/**
 * Generating CSS from Theme:
 * 
 * ```tsx
 * import { CSSGenerator } from '@/theming';
 * 
 * function generateThemeCSS(theme) {
 *   const css = CSSGenerator.generateThemeCSS(theme);
 *   const minified = CSSGenerator.minifyCSS(css);
 *   
 *   return minified;
 * }
 * ```
 */

// === VERSION INFO ===
export const THEMING_SYSTEM_VERSION = '1.0.0';
export const THEMING_SYSTEM_NAME = 'Token Nexus Theming System';

// === CONSTANTS ===
export const THEME_CONSTANTS = {
  // CSS variable prefixes
  CSS_VAR_PREFIX: '--theme',
  COMPONENT_PREFIX: '--component',
  
  // Default cache timeout (5 minutes)
  DEFAULT_CACHE_TIMEOUT: 300000,
  
  // Maximum theme history size
  MAX_HISTORY_SIZE: 20,
  
  // Supported theme categories
  THEME_CATEGORIES: ['corporate', 'modern', 'minimal', 'custom'] as const,
  
  // WCAG compliance levels
  WCAG_LEVELS: ['AA', 'AAA'] as const,
  
  // Minimum contrast ratios
  MIN_CONTRAST_RATIOS: {
    normal: 4.5,
    large: 3.0,
    AAA_normal: 7.0,
    AAA_large: 4.5
  }
} as const;

// === DEFAULT EXPORT ===
// Note: Use named exports for better tree-shaking and TypeScript support
// Example: import { ThemeManagement, ThemeProvider } from '@/theming';