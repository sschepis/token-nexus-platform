import { OrganizationTheme, CSSVariableMap, ThemeColors, ThemeTypography, ThemeSpacing } from '../types/theme.types';

/**
 * CSS generation utilities for converting theme objects to CSS variables
 * and generating dynamic stylesheets for organization themes
 */

export class CSSGenerator {
  private static readonly CSS_VAR_PREFIX = '--theme';
  private static readonly COMPONENT_PREFIX = '--component';

  /**
   * Generates a complete CSS stylesheet from a theme object
   */
  static generateThemeCSS(theme: OrganizationTheme): string {
    const variables = this.generateCSSVariables(theme);
    const componentStyles = this.generateComponentStyles(theme);
    const customCSS = theme.branding.customCSS || '';

    return `
/* Generated Theme CSS for ${theme.name} */
:root {
${this.formatCSSVariables(variables)}
}

/* Component Styles */
${componentStyles}

/* Custom CSS */
${customCSS}

/* Theme-specific utility classes */
${this.generateUtilityClasses(theme)}
    `.trim();
  }

  /**
   * Generates CSS variables from theme object
   */
  static generateCSSVariables(theme: OrganizationTheme): CSSVariableMap {
    const variables: CSSVariableMap = {};

    // Color variables
    this.addColorVariables(variables, theme.colors);

    // Typography variables
    this.addTypographyVariables(variables, theme.typography);

    // Spacing variables
    this.addSpacingVariables(variables, theme.spacing);

    // Border radius variables
    this.addBorderRadiusVariables(variables, theme.borderRadius);

    // Shadow variables
    this.addShadowVariables(variables, theme.shadows);

    // Layout variables
    this.addLayoutVariables(variables, theme.layout);

    // Animation variables
    this.addAnimationVariables(variables, theme.animations);

    // Custom properties
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => {
        variables[`${this.CSS_VAR_PREFIX}-custom-${key}`] = value;
      });
    }

    return variables;
  }

  /**
   * Adds color variables to the CSS variable map
   */
  private static addColorVariables(variables: CSSVariableMap, colors: ThemeColors): void {
    // Primary colors
    variables[`${this.CSS_VAR_PREFIX}-primary`] = colors.primary;
    variables[`${this.CSS_VAR_PREFIX}-secondary`] = colors.secondary;
    variables[`${this.CSS_VAR_PREFIX}-accent`] = colors.accent;
    variables[`${this.CSS_VAR_PREFIX}-background`] = colors.background;
    variables[`${this.CSS_VAR_PREFIX}-surface`] = colors.surface;

    // Text colors
    variables[`${this.CSS_VAR_PREFIX}-text-primary`] = colors.text.primary;
    variables[`${this.CSS_VAR_PREFIX}-text-secondary`] = colors.text.secondary;
    variables[`${this.CSS_VAR_PREFIX}-text-muted`] = colors.text.muted;

    // UI colors
    variables[`${this.CSS_VAR_PREFIX}-border`] = colors.border;
    variables[`${this.CSS_VAR_PREFIX}-input`] = colors.input;
    variables[`${this.CSS_VAR_PREFIX}-ring`] = colors.ring;

    // Status colors
    variables[`${this.CSS_VAR_PREFIX}-destructive`] = colors.destructive;
    variables[`${this.CSS_VAR_PREFIX}-warning`] = colors.warning;
    variables[`${this.CSS_VAR_PREFIX}-success`] = colors.success;
    variables[`${this.CSS_VAR_PREFIX}-info`] = colors.info;

    // Neutral palette
    Object.entries(colors.neutral).forEach(([shade, color]) => {
      variables[`${this.CSS_VAR_PREFIX}-neutral-${shade}`] = color;
    });

    // Generate color variations (hover, active states)
    this.generateColorVariations(variables, colors);
  }

  /**
   * Generates color variations for interactive states
   */
  private static generateColorVariations(variables: CSSVariableMap, colors: ThemeColors): void {
    const baseColors = {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      destructive: colors.destructive,
      warning: colors.warning,
      success: colors.success,
      info: colors.info
    };

    Object.entries(baseColors).forEach(([name, color]) => {
      const hoverColor = this.adjustColorBrightness(color, -10);
      const activeColor = this.adjustColorBrightness(color, -20);
      const lightColor = this.adjustColorBrightness(color, 40);

      variables[`${this.CSS_VAR_PREFIX}-${name}-hover`] = hoverColor;
      variables[`${this.CSS_VAR_PREFIX}-${name}-active`] = activeColor;
      variables[`${this.CSS_VAR_PREFIX}-${name}-light`] = lightColor;
    });
  }

  /**
   * Adds typography variables to the CSS variable map
   */
  private static addTypographyVariables(variables: CSSVariableMap, typography: ThemeTypography): void {
    // Font families
    variables[`${this.CSS_VAR_PREFIX}-font-family`] = typography.fontFamily;
    if (typography.headingFont) {
      variables[`${this.CSS_VAR_PREFIX}-font-heading`] = typography.headingFont;
    }

    // Font sizes
    Object.entries(typography.sizes).forEach(([size, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-text-${size}`] = value;
    });

    // Font weights
    Object.entries(typography.weights).forEach(([weight, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-font-${weight}`] = value.toString();
    });

    // Line heights
    Object.entries(typography.lineHeights).forEach(([height, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-leading-${height}`] = value;
    });

    // Letter spacing
    Object.entries(typography.letterSpacing).forEach(([spacing, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-tracking-${spacing}`] = value;
    });
  }

  /**
   * Adds spacing variables to the CSS variable map
   */
  private static addSpacingVariables(variables: CSSVariableMap, spacing: ThemeSpacing): void {
    Object.entries(spacing).forEach(([size, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-spacing-${size}`] = value;
    });
  }

  /**
   * Adds border radius variables to the CSS variable map
   */
  private static addBorderRadiusVariables(variables: CSSVariableMap, borderRadius: OrganizationTheme['borderRadius']): void {
    Object.entries(borderRadius).forEach(([size, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-radius-${size}`] = value;
    });
  }

  /**
   * Adds shadow variables to the CSS variable map
   */
  private static addShadowVariables(variables: CSSVariableMap, shadows: OrganizationTheme['shadows']): void {
    Object.entries(shadows).forEach(([size, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-shadow-${size}`] = value;
    });
  }

  /**
   * Adds layout variables to the CSS variable map
   */
  private static addLayoutVariables(variables: CSSVariableMap, layout: OrganizationTheme['layout']): void {
    Object.entries(layout).forEach(([property, value]) => {
      const kebabCase = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      variables[`${this.CSS_VAR_PREFIX}-layout-${kebabCase}`] = value;
    });
  }

  /**
   * Adds animation variables to the CSS variable map
   */
  private static addAnimationVariables(variables: CSSVariableMap, animations: OrganizationTheme['animations']): void {
    // Duration variables
    Object.entries(animations.duration).forEach(([speed, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-duration-${speed}`] = value;
    });

    // Easing variables
    Object.entries(animations.easing).forEach(([type, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-ease-${type}`] = value;
    });

    // Transition variables
    Object.entries(animations.transitions).forEach(([property, value]) => {
      variables[`${this.CSS_VAR_PREFIX}-transition-${property}`] = value;
    });
  }

  /**
   * Generates component-specific styles
   */
  private static generateComponentStyles(theme: OrganizationTheme): string {
    let styles = '';

    Object.entries(theme.components).forEach(([componentName, componentTheme]) => {
      if (componentTheme.customCSS) {
        styles += `\n/* ${componentName} component styles */\n${componentTheme.customCSS}\n`;
      }

      // Generate variant styles
      Object.entries(componentTheme.variants).forEach(([variantName, variantStyles]) => {
        const selector = `.${componentName}--${variantName}`;
        const cssRules = Object.entries(variantStyles)
          .map(([property, value]) => `  ${this.camelToKebab(property)}: ${value};`)
          .join('\n');

        if (cssRules) {
          styles += `\n${selector} {\n${cssRules}\n}\n`;
        }
      });
    });

    return styles;
  }

  /**
   * Generates utility classes based on theme
   */
  private static generateUtilityClasses(theme: OrganizationTheme): string {
    return `
/* Theme-specific utility classes */
.theme-primary { color: var(${this.CSS_VAR_PREFIX}-primary); }
.theme-secondary { color: var(${this.CSS_VAR_PREFIX}-secondary); }
.theme-accent { color: var(${this.CSS_VAR_PREFIX}-accent); }

.theme-bg-primary { background-color: var(${this.CSS_VAR_PREFIX}-primary); }
.theme-bg-secondary { background-color: var(${this.CSS_VAR_PREFIX}-secondary); }
.theme-bg-accent { background-color: var(${this.CSS_VAR_PREFIX}-accent); }

.theme-border-primary { border-color: var(${this.CSS_VAR_PREFIX}-primary); }
.theme-border-secondary { border-color: var(${this.CSS_VAR_PREFIX}-secondary); }

.theme-font-heading { font-family: var(${this.CSS_VAR_PREFIX}-font-heading, var(${this.CSS_VAR_PREFIX}-font-family)); }

/* Layout utilities */
.theme-sidebar-width { width: var(${this.CSS_VAR_PREFIX}-layout-sidebar-width); }
.theme-header-height { height: var(${this.CSS_VAR_PREFIX}-layout-header-height); }
.theme-container-max { max-width: var(${this.CSS_VAR_PREFIX}-layout-container-max-width); }
    `;
  }

  /**
   * Formats CSS variables for injection into stylesheet
   */
  private static formatCSSVariables(variables: CSSVariableMap): string {
    return Object.entries(variables)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');
  }

  /**
   * Adjusts color brightness for generating variations
   */
  private static adjustColorBrightness(color: string, percent: number): string {
    // Simple hex color adjustment - in production, consider using a color manipulation library
    if (!color.startsWith('#')) return color;

    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16)
      .slice(1);
  }

  /**
   * Converts camelCase to kebab-case
   */
  private static camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Generates CSS for dark mode if theme has dark mode configuration
   */
  static generateDarkModeCSS(theme: OrganizationTheme): string {
    if (!theme.darkMode) return '';

    const darkVariables = this.generateCSSVariables(theme.darkMode as OrganizationTheme);
    
    return `
/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
${this.formatCSSVariables(darkVariables)}
  }
}

[data-theme="dark"] {
${this.formatCSSVariables(darkVariables)}
}
    `;
  }

  /**
   * Minifies CSS by removing unnecessary whitespace and comments
   */
  static minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
      .replace(/;\s*/g, ';') // Remove spaces after semicolon
      .replace(/,\s*/g, ',') // Remove spaces after comma
      .trim();
  }

  /**
   * Validates generated CSS for syntax errors
   */
  static validateCSS(css: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic CSS validation - check for unmatched braces
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched braces in CSS');
    }

    // Check for invalid property names (basic validation)
    const propertyRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = propertyRegex.exec(css)) !== null) {
      const property = match[1];
      if (!/^[a-zA-Z-]+$/.test(property)) {
        errors.push(`Invalid CSS property: ${property}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates CSS custom properties for Tailwind CSS integration
   */
  static generateTailwindVariables(theme: OrganizationTheme): string {
    const variables: string[] = [];

    // Map theme colors to Tailwind color variables
    variables.push(`--color-primary: ${theme.colors.primary};`);
    variables.push(`--color-secondary: ${theme.colors.secondary};`);
    variables.push(`--color-accent: ${theme.colors.accent};`);

    // Map spacing to Tailwind spacing scale
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables.push(`--spacing-${key}: ${value};`);
    });

    return `:root {\n  ${variables.join('\n  ')}\n}`;
  }
}

/**
 * Utility functions for CSS generation
 */
export const generateThemeCSS = (theme: OrganizationTheme): string => {
  return CSSGenerator.generateThemeCSS(theme);
};

export const generateCSSVariables = (theme: OrganizationTheme): CSSVariableMap => {
  return CSSGenerator.generateCSSVariables(theme);
};

export const minifyCSS = (css: string): string => {
  return CSSGenerator.minifyCSS(css);
};

export const validateCSS = (css: string): { isValid: boolean; errors: string[] } => {
  return CSSGenerator.validateCSS(css);
};