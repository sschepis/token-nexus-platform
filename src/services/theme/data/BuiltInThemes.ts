import {
  OrganizationTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBranding,
  ComponentTheme,
  ThemeLayout,
  ThemeAnimations,
  ThemeBorderRadius,
  ThemeShadows,
  ThemeComponents
} from '../../../theming/types/theme.types';

// --- Default Theme Partials for ensuring full object structure ---
const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#8b5cf6',
  background: '#ffffff',
  surface: '#f8fafc',
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    muted: '#94a3b8'
  },
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#3b82f6',
  destructive: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  neutral: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
    500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617'
  }
};

const DEFAULT_THEME_TYPOGRAPHY: ThemeTypography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFont: 'Inter, system-ui, sans-serif',
  sizes: {
    xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
    '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem'
  },
  weights: {
    light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800
  },
  lineHeights: {
    tight: '1.25', normal: '1.5', relaxed: '1.75', loose: '2'
  },
  letterSpacing: {
    tight: '-0.02em', normal: '0', wide: '0.02em'
  }
};

const DEFAULT_THEME_SPACING: ThemeSpacing = {
  xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem',
  '2xl': '3rem', '3xl': '4rem', '4xl': '5rem', '5xl': '6rem', '6xl': '7rem'
};

const DEFAULT_THEME_BORDERRADIUS: ThemeBorderRadius = {
  none: '0px', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem',
  '2xl': '1rem', '3xl': '1.5rem', full: '9999px'
};

const DEFAULT_THEME_SHADOWS: ThemeShadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none'
};

const DEFAULT_COMPONENT_THEME: ComponentTheme = {
  variants: {},
  defaultProps: {},
  customCSS: '',
  baseStyles: {}
};

const DEFAULT_THEME_COMPONENTS: ThemeComponents = {
  button: { ...DEFAULT_COMPONENT_THEME },
  card: { ...DEFAULT_COMPONENT_THEME },
  input: { ...DEFAULT_COMPONENT_THEME },
  sidebar: { ...DEFAULT_COMPONENT_THEME },
  navbar: { ...DEFAULT_COMPONENT_THEME },
  modal: { ...DEFAULT_COMPONENT_THEME },
  dropdown: { ...DEFAULT_COMPONENT_THEME },
  table: { ...DEFAULT_COMPONENT_THEME },
  badge: { ...DEFAULT_COMPONENT_THEME },
  alert: { ...DEFAULT_COMPONENT_THEME },
  tooltip: { ...DEFAULT_COMPONENT_THEME },
  tabs: { ...DEFAULT_COMPONENT_THEME },
};


const DEFAULT_THEME_LAYOUT: ThemeLayout = {
  sidebarWidth: '16rem',
  headerHeight: '4rem',
  containerMaxWidth: '1280px',
  contentPadding: '1.5rem',
  gridGap: '1rem',
  cardPadding: '1rem',
  formSpacing: '1rem'
};

const DEFAULT_THEME_ANIMATIONS: ThemeAnimations = {
  duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
  easing: { ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  transitions: { all: 'all 0.3s ease', colors: 'background-color 0.3s ease, color 0.3s ease', opacity: 'opacity 0.3s ease', transform: 'transform 0.3s ease' }
};

// Helper function for deep merging objects recursively
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target } as T;

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      const sourceValue = (source as any)[key];
      const targetValue = (target as any)[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        (output as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue;
      }
    });
  }
  return output;
}


// --- Main Functions ---

export function getDefaultTheme(): OrganizationTheme {
  const now = new Date().toISOString();
  // Deep merge default colors to ensure all properties like 'neutral' are present
  const colors = deepMerge(DEFAULT_THEME_COLORS, {});
  
  return {
    id: 'default',
    name: 'Default',
    version: '1.0.0',
    description: 'Default Token Nexus theme',
    isTemplate: true,
    templateId: 'default',
    organizationId: 'system',
    createdAt: now,
    updatedAt: now,
    colors: colors,
    typography: DEFAULT_THEME_TYPOGRAPHY,
    spacing: DEFAULT_THEME_SPACING,
    borderRadius: DEFAULT_THEME_BORDERRADIUS,
    shadows: DEFAULT_THEME_SHADOWS,
    components: DEFAULT_THEME_COMPONENTS,
    branding: {
      logo: '/assets/logo.svg',
      favicon: '/assets/favicon.ico',
      appIcon: '/assets/app-icon.png',
      brandName: 'Token Nexus',
      tagline: 'Decentralized Token Management Platform'
    },
    layout: DEFAULT_THEME_LAYOUT,
    animations: DEFAULT_THEME_ANIMATIONS,
    customProperties: {},
    darkMode: undefined
  };
}

export function getBuiltInThemes(): OrganizationTheme[] {
  const builtInThemeConfigs = [ // Represents the simplified input themes
    {
      id: 'theme_minimal',
      name: 'Minimal',
      description: 'A clean and simple theme.',
      category: 'minimal',
      colors: {
        primary: '#3B82F6', secondary: '#6B7280', background: '#F9FAFB',
        text: { primary: '#1F2937', secondary: '#1F2937', muted: '#1F2937' },
        border: '#D1D5DB'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headingSize: '2.25rem', // Will be mapped to sizes['4xl']
        bodySize: '1rem' // Will be mapped to sizes.base
      },
      spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem' },
      branding: {
        logo: '/assets/logo.svg', favicon: '/assets/favicon.ico', appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus', tagline: 'Minimal Design'
      },
      // components, borderRadius, shadows, layout, animations will be derived from defaults
    },
    {
      id: 'theme_modern',
      name: 'Modern',
      description: 'A sleek and contemporary theme.',
      category: 'modern',
      colors: {
        primary: '#8B5CF6', secondary: '#4B5563', background: '#FFFFFF',
        text: { primary: '#111827', secondary: '#111827', muted: '#111827' },
        border: '#E5E7EB'
      },
      typography: {
        fontFamily: 'Roboto, sans-serif',
        headingSize: '2.5rem',
        bodySize: '1.05rem'
      },
      spacing: { sm: '0.75rem', md: '1.25rem', lg: '1.75rem' },
      branding: {
        logo: '/assets/logo.svg', favicon: '/assets/favicon.ico', appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus', tagline: 'Modern Interface'
      },
    },
    {
      id: 'theme_corporate',
      name: 'Corporate',
      description: 'A professional and business-oriented theme.',
      category: 'corporate',
      colors: {
        primary: '#007BFF', secondary: '#6C757D', background: '#F8F9FA',
        text: { primary: '#343A40', secondary: '#343A40', muted: '#343A40' },
        border: '#DEE2E6'
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        headingSize: '2rem',
        bodySize: '0.95rem'
      },
      spacing: { sm: '0.625rem', md: '1.125rem', lg: '1.625rem' },
      branding: {
        logo: '/assets/logo.svg', favicon: '/assets/favicon.ico', appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus', tagline: 'Professional Solutions'
      },
    },
    {
      id: 'theme_dark',
      name: 'Dark Mode (Experimental)',
      description: 'A theme with dark background and light text.',
      category: 'experimental',
      colors: {
        primary: '#3B82F6', secondary: '#6B7280', background: '#1F2937',
        text: { primary: '#F9FAFB', secondary: '#F9FAFB', muted: '#F9FAFB' },
        border: '#4B5563'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headingSize: '2.25rem',
        bodySize: '1rem'
      },
      spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem' },
      branding: {
        logo: '/assets/logo-light.svg', // Specify dark mode logo
        favicon: '/assets/favicon.ico', appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus', tagline: 'Dark Mode Experience'
      },
    }
  ];

  const now = new Date().toISOString();

  return builtInThemeConfigs.map(partialTheme => {
    // Start with a clone of the base theme so deepMerge correctly applies partialTheme changes
    const baseTheme = getDefaultTheme();
    // Use JSON.parse(JSON.stringify()) for a deep clone to ensure no shared references
    let finalTheme: OrganizationTheme = JSON.parse(JSON.stringify(baseTheme)); 

    // Directly assign simple properties
    finalTheme.id = partialTheme.id;
    finalTheme.name = partialTheme.name;
    finalTheme.description = partialTheme.description;
    // Removed: finalTheme.category = partialTheme.category; // Removed as OrganizationTheme does not have 'category'
    finalTheme.isTemplate = true; // Always true for built-in themes
    finalTheme.templateId = partialTheme.id;
    finalTheme.organizationId = 'system'; // Built-in themes are system-level
    finalTheme.createdAt = now;
    finalTheme.updatedAt = now;
    finalTheme.version = '1.0.0'; // Default version for built-in themes

    // Deep merge complex properties with default values
    finalTheme.colors = deepMerge(finalTheme.colors, partialTheme.colors);
    
    // Convert simplified typography to full Typography object
    const mergedTypography = deepMerge(finalTheme.typography, partialTheme.typography);
    if ((partialTheme.typography as any).headingSize) {
      mergedTypography.sizes['4xl'] = (partialTheme.typography as any).headingSize;
    }
    if ((partialTheme.typography as any).bodySize) {
      mergedTypography.sizes.base = (partialTheme.typography as any).bodySize;
    }
    finalTheme.typography = mergedTypography;

    finalTheme.spacing = deepMerge(finalTheme.spacing, partialTheme.spacing);
    finalTheme.branding = deepMerge(finalTheme.branding, partialTheme.branding);

    // For components, borderRadius, shadows, layout, and animations,
    // if the partialTheme provides specific values, deepMerge with them.
    // Otherwise, they will retain the values from the baseTheme (which are the defaults).
    if ((partialTheme as any).borderRadius) finalTheme.borderRadius = deepMerge(finalTheme.borderRadius, (partialTheme as any).borderRadius);
    if ((partialTheme as any).shadows) finalTheme.shadows = deepMerge(finalTheme.shadows, (partialTheme as any).shadows);
    if ((partialTheme as any).components) finalTheme.components = deepMerge(finalTheme.components, (partialTheme as any).components);
    if ((partialTheme as any).layout) finalTheme.layout = deepMerge(finalTheme.layout, (partialTheme as any).layout);
    if ((partialTheme as any).animations) finalTheme.animations = deepMerge(finalTheme.animations, (partialTheme as any).animations);

    // Assign customProperties and darkMode if they exist in partialTheme
    if ((partialTheme as any).customProperties) finalTheme.customProperties = (partialTheme as any).customProperties;
    if ((partialTheme as any).darkMode) finalTheme.darkMode = (partialTheme as any).darkMode;

    return finalTheme;
  });
}