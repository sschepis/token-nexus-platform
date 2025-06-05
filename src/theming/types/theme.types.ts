/**
 * Comprehensive theme types for the Organization Theming System
 * Supports CSS variables, typography, spacing, components, and branding
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  input: string;
  ring: string;
  popover?: string; // Added popover color
  'popover-foreground'?: string; // Added popover foreground color
  destructive: string;
  warning: string;
  success: string;
  info: string;
  // Extended color palette
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export interface ThemeTypography {
  fontFamily: string;
  headingFont?: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
  };
  weights: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeights: {
    tight: string;
    normal: string;
    relaxed: string;
    loose: string;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

export interface ComponentTheme {
  variants: Record<string, Record<string, string>>;
  defaultProps?: Record<string, string | number | boolean>;
  customCSS?: string;
  baseStyles?: Record<string, string>;
}

export interface ThemeComponents {
  button: ComponentTheme;
  card: ComponentTheme;
  input: ComponentTheme;
  sidebar: ComponentTheme;
  navbar: ComponentTheme;
  modal: ComponentTheme;
  dropdown: ComponentTheme;
  table: ComponentTheme;
  badge: ComponentTheme;
  alert: ComponentTheme;
  tooltip: ComponentTheme;
  tabs: ComponentTheme;
}

export interface ThemeBranding {
  logo: string;
  logoLight?: string;
  logoDark?: string;
  favicon: string;
  appIcon: string;
  customCSS?: string;
  emailLogo?: string;
  watermark?: string;
  brandName?: string;
  tagline?: string;
}

export interface ThemeLayout {
  sidebarWidth: string;
  headerHeight: string;
  containerMaxWidth: string;
  contentPadding: string;
  gridGap: string;
  cardPadding: string;
  formSpacing: string;
}

export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };
  transitions: {
    all: string;
    colors: string;
    opacity: string;
    transform: string;
  };
}

export interface OrganizationTheme {
  id: string;
  name: string;
  version: string;
  description?: string;
  isTemplate?: boolean;
  templateId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  components: ThemeComponents;
  branding: ThemeBranding;
  layout: ThemeLayout;
  animations: ThemeAnimations;
  customProperties?: Record<string, string>;
  darkMode?: Partial<OrganizationTheme>;
}

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'corporate' | 'modern' | 'minimal' | 'creative' | 'professional';
  preview: string;
  theme: Omit<OrganizationTheme, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;
  tags: string[];
  popularity: number;
  isPublic: boolean;
}

export interface ThemeValidationResult {
  isValid: boolean;
  errors: ThemeValidationError[];
  warnings: ThemeValidationWarning[];
  accessibilityScore: number;
  performanceScore: number;
}

export interface ThemeValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ThemeValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  code: string;
}

export interface ThemeContextValue {
  currentTheme: OrganizationTheme | null;
  isLoading: boolean;
  error: string | null;
  setTheme: (theme: OrganizationTheme) => void;
  updateTheme: (updates: Partial<OrganizationTheme>) => void;
  resetTheme: () => void;
  validateTheme: (theme: OrganizationTheme) => ThemeValidationResult;
  generateCSS: (theme: OrganizationTheme) => string;
  previewTheme: (theme: OrganizationTheme) => void;
  applyTheme: (theme: OrganizationTheme) => Promise<void>;
}

export interface CSSVariableMap {
  [key: string]: string;
}

export interface ThemeEngineConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enableValidation: boolean;
  enableAccessibilityCheck: boolean;
  enablePerformanceMonitoring: boolean;
  fallbackTheme: OrganizationTheme;
}

export interface ThemeMetrics {
  loadTime: number;
  cssSize: number;
  variableCount: number;
  accessibilityScore: number;
  contrastRatios: Record<string, number>;
  performanceImpact: number;
}

export interface ThemePreset {
  name: string;
  description: string;
  colors: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  components?: Partial<ThemeComponents>;
}

// Utility types for theme operations
export type ThemeProperty = keyof OrganizationTheme;
export type ColorProperty = keyof ThemeColors;
export type TypographyProperty = keyof ThemeTypography;
export type ComponentProperty = keyof ThemeComponents;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ThemeUpdate = DeepPartial<OrganizationTheme>;

// Theme inheritance types
export interface ThemeInheritance {
  platformDefaults: OrganizationTheme;
  templateBase?: OrganizationTheme;
  organizationOverrides: ThemeUpdate;
  resolved: OrganizationTheme;
}

// Theme editor types
export interface ThemeEditorState {
  activeTab: 'colors' | 'typography' | 'components' | 'branding' | 'layout';
  selectedComponent?: keyof ThemeComponents;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  isDirty: boolean;
  history: OrganizationTheme[];
  historyIndex: number;
}

export interface ThemeEditorAction {
  type: 'UPDATE_THEME' | 'SET_ACTIVE_TAB' | 'SET_PREVIEW_MODE' | 'UNDO' | 'REDO' | 'RESET';
  payload?: unknown;
}