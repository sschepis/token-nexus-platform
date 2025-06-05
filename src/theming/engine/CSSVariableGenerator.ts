import { OrganizationTheme, CSSVariableMap } from '../types/theme.types';

/**
 * CSS Variable Generator handles the conversion of theme objects
 * to CSS custom properties and manages dynamic stylesheet injection
 */

export class CSSVariableGenerator {
  private static readonly VAR_PREFIX = '--theme';
  private static readonly COMPONENT_PREFIX = '--component';
  private static readonly BREAKPOINTS = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  };

  /**
   * Generates a complete set of CSS variables from a theme
   */
  static generateVariables(theme: OrganizationTheme): CSSVariableMap {
    const variables: CSSVariableMap = {};

    // Generate color variables
    this.addColorVariables(variables, theme.colors);

    // Generate typography variables
    this.addTypographyVariables(variables, theme.typography);

    // Generate spacing variables
    this.addSpacingVariables(variables, theme.spacing);

    // Generate border radius variables
    this.addBorderRadiusVariables(variables, theme.borderRadius);

    // Generate shadow variables
    this.addShadowVariables(variables, theme.shadows);

    // Generate layout variables
    this.addLayoutVariables(variables, theme.layout);

    // Generate animation variables
    this.addAnimationVariables(variables, theme.animations);

    // Generate component variables
    this.addComponentVariables(variables, theme.components);

    // Add custom properties
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => {
        variables[`${this.VAR_PREFIX}-custom-${this.kebabCase(key)}`] = value;
      });
    }

    return variables;
  }

  /**
   * Adds color-related CSS variables
   */
  private static addColorVariables(variables: CSSVariableMap, colors: OrganizationTheme['colors']): void {
    // Primary color system
    variables[`${this.VAR_PREFIX}-primary`] = colors.primary;
    variables[`${this.VAR_PREFIX}-primary-rgb`] = this.hexToRgb(colors.primary);
    variables[`${this.VAR_PREFIX}-primary-hsl`] = this.hexToHsl(colors.primary);

    variables[`${this.VAR_PREFIX}-secondary`] = colors.secondary;
    variables[`${this.VAR_PREFIX}-secondary-rgb`] = this.hexToRgb(colors.secondary);
    variables[`${this.VAR_PREFIX}-secondary-hsl`] = this.hexToHsl(colors.secondary);

    variables[`${this.VAR_PREFIX}-accent`] = colors.accent;
    variables[`${this.VAR_PREFIX}-accent-rgb`] = this.hexToRgb(colors.accent);
    variables[`${this.VAR_PREFIX}-accent-hsl`] = this.hexToHsl(colors.accent);

    // Background and surface colors
    variables[`${this.VAR_PREFIX}-background`] = colors.background;
    variables[`${this.VAR_PREFIX}-surface`] = colors.surface;

    // Text colors
    variables[`${this.VAR_PREFIX}-text-primary`] = colors.text.primary;
    variables[`${this.VAR_PREFIX}-text-secondary`] = colors.text.secondary;
    variables[`${this.VAR_PREFIX}-text-muted`] = colors.text.muted;

    // UI element colors
    variables[`${this.VAR_PREFIX}-border`] = colors.border;
    variables[`${this.VAR_PREFIX}-input`] = colors.input;
    variables[`${this.VAR_PREFIX}-ring`] = colors.ring;

    // Status colors
    variables[`${this.VAR_PREFIX}-destructive`] = colors.destructive;
    variables[`${this.VAR_PREFIX}-warning`] = colors.warning;
    variables[`${this.VAR_PREFIX}-success`] = colors.success;
    variables[`${this.VAR_PREFIX}-info`] = colors.info;

    // Neutral palette
    Object.entries(colors.neutral).forEach(([shade, color]) => {
      variables[`${this.VAR_PREFIX}-neutral-${shade}`] = color;
      variables[`${this.VAR_PREFIX}-neutral-${shade}-rgb`] = this.hexToRgb(color);
    });

    // Generate color variations for interactive states
    this.generateColorVariations(variables, colors);
  }

  /**
   * Generates color variations for hover, active, and focus states
   */
  private static generateColorVariations(variables: CSSVariableMap, colors: OrganizationTheme['colors']): void {
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
      // Generate hover state (slightly darker)
      const hoverColor = this.adjustColorLightness(color, -8);
      variables[`${this.VAR_PREFIX}-${name}-hover`] = hoverColor;

      // Generate active state (darker)
      const activeColor = this.adjustColorLightness(color, -12);
      variables[`${this.VAR_PREFIX}-${name}-active`] = activeColor;

      // Generate focus state (with opacity)
      variables[`${this.VAR_PREFIX}-${name}-focus`] = `${color}33`; // 20% opacity

      // Generate light variant
      const lightColor = this.adjustColorLightness(color, 40);
      variables[`${this.VAR_PREFIX}-${name}-light`] = lightColor;

      // Generate dark variant
      const darkColor = this.adjustColorLightness(color, -30);
      variables[`${this.VAR_PREFIX}-${name}-dark`] = darkColor;
    });
  }

  /**
   * Adds typography-related CSS variables
   */
  private static addTypographyVariables(variables: CSSVariableMap, typography: OrganizationTheme['typography']): void {
    // Font families
    variables[`${this.VAR_PREFIX}-font-family`] = typography.fontFamily;
    if (typography.headingFont) {
      variables[`${this.VAR_PREFIX}-font-heading`] = typography.headingFont;
    }

    // Font sizes with responsive scaling
    Object.entries(typography.sizes).forEach(([size, value]) => {
      variables[`${this.VAR_PREFIX}-text-${size}`] = value;
      
      // Generate responsive variants
      const numericValue = parseFloat(value);
      const unit = value.replace(numericValue.toString(), '');
      
      if (unit === 'rem') {
        // Mobile: 90% of desktop size
        variables[`${this.VAR_PREFIX}-text-${size}-mobile`] = `${(numericValue * 0.9).toFixed(3)}${unit}`;
        // Tablet: 95% of desktop size
        variables[`${this.VAR_PREFIX}-text-${size}-tablet`] = `${(numericValue * 0.95).toFixed(3)}${unit}`;
      }
    });

    // Font weights
    Object.entries(typography.weights).forEach(([weight, value]) => {
      variables[`${this.VAR_PREFIX}-font-${weight}`] = value.toString();
    });

    // Line heights
    Object.entries(typography.lineHeights).forEach(([height, value]) => {
      variables[`${this.VAR_PREFIX}-leading-${height}`] = value;
    });

    // Letter spacing
    Object.entries(typography.letterSpacing).forEach(([spacing, value]) => {
      variables[`${this.VAR_PREFIX}-tracking-${spacing}`] = value;
    });
  }

  /**
   * Adds spacing-related CSS variables
   */
  private static addSpacingVariables(variables: CSSVariableMap, spacing: OrganizationTheme['spacing']): void {
    Object.entries(spacing).forEach(([size, value]) => {
      variables[`${this.VAR_PREFIX}-spacing-${size}`] = value;
      
      // Generate negative spacing variants
      variables[`${this.VAR_PREFIX}-spacing-${size}-negative`] = `-${value}`;
      
      // Generate half spacing variants
      const numericValue = parseFloat(value);
      const unit = value.replace(numericValue.toString(), '');
      variables[`${this.VAR_PREFIX}-spacing-${size}-half`] = `${(numericValue / 2).toFixed(3)}${unit}`;
    });
  }

  /**
   * Adds border radius CSS variables
   */
  private static addBorderRadiusVariables(variables: CSSVariableMap, borderRadius: OrganizationTheme['borderRadius']): void {
    Object.entries(borderRadius).forEach(([size, value]) => {
      variables[`${this.VAR_PREFIX}-radius-${size}`] = value;
    });
  }

  /**
   * Adds shadow CSS variables
   */
  private static addShadowVariables(variables: CSSVariableMap, shadows: OrganizationTheme['shadows']): void {
    Object.entries(shadows).forEach(([size, value]) => {
      variables[`${this.VAR_PREFIX}-shadow-${size}`] = value;
      
      // Generate colored shadow variants for primary color
      if (size !== 'none' && size !== 'inner') {
        variables[`${this.VAR_PREFIX}-shadow-${size}-primary`] = value.replace('rgb(0 0 0', 'var(--theme-primary-rgb');
      }
    });
  }

  /**
   * Adds layout CSS variables
   */
  private static addLayoutVariables(variables: CSSVariableMap, layout: OrganizationTheme['layout']): void {
    Object.entries(layout).forEach(([property, value]) => {
      const kebabProperty = this.kebabCase(property);
      variables[`${this.VAR_PREFIX}-layout-${kebabProperty}`] = value;
      
      // Generate responsive variants for key layout properties
      if (['sidebarWidth', 'headerHeight', 'containerMaxWidth'].includes(property)) {
        const numericValue = parseFloat(value);
        const unit = value.replace(numericValue.toString(), '');
        
        if (unit === 'rem' || unit === 'px') {
          // Mobile variants (smaller)
          const mobileValue = property === 'sidebarWidth' ? '100%' : `${(numericValue * 0.8).toFixed(2)}${unit}`;
          variables[`${this.VAR_PREFIX}-layout-${kebabProperty}-mobile`] = mobileValue;
          
          // Tablet variants
          const tabletValue = property === 'sidebarWidth' ? '16rem' : `${(numericValue * 0.9).toFixed(2)}${unit}`;
          variables[`${this.VAR_PREFIX}-layout-${kebabProperty}-tablet`] = tabletValue;
        }
      }
    });
  }

  /**
   * Adds animation CSS variables
   */
  private static addAnimationVariables(variables: CSSVariableMap, animations: OrganizationTheme['animations']): void {
    // Duration variables
    Object.entries(animations.duration).forEach(([speed, value]) => {
      variables[`${this.VAR_PREFIX}-duration-${speed}`] = value;
    });

    // Easing variables
    Object.entries(animations.easing).forEach(([type, value]) => {
      variables[`${this.VAR_PREFIX}-ease-${type}`] = value;
    });

    // Transition variables
    Object.entries(animations.transitions).forEach(([property, value]) => {
      variables[`${this.VAR_PREFIX}-transition-${property}`] = value;
    });

    // Generate common transition combinations
    variables[`${this.VAR_PREFIX}-transition-base`] = `all var(${this.VAR_PREFIX}-duration-normal) var(${this.VAR_PREFIX}-ease-ease-in-out)`;
    variables[`${this.VAR_PREFIX}-transition-fast`] = `all var(${this.VAR_PREFIX}-duration-fast) var(${this.VAR_PREFIX}-ease-ease-out)`;
    variables[`${this.VAR_PREFIX}-transition-slow`] = `all var(${this.VAR_PREFIX}-duration-slow) var(${this.VAR_PREFIX}-ease-ease-in-out)`;
  }

  /**
   * Adds component-specific CSS variables
   */
  private static addComponentVariables(variables: CSSVariableMap, components: OrganizationTheme['components']): void {
    Object.entries(components).forEach(([componentName, componentTheme]) => {
      const componentPrefix = `${this.COMPONENT_PREFIX}-${componentName}`;
      
      // Add base styles as variables
      if (componentTheme.baseStyles) {
        Object.entries(componentTheme.baseStyles).forEach(([property, value]) => {
          const kebabProperty = this.kebabCase(property);
          variables[`${componentPrefix}-${kebabProperty}`] = String(value);
        });
      }

      // Add variant-specific variables
      Object.entries(componentTheme.variants).forEach(([variantName, variantStyles]) => {
        Object.entries(variantStyles).forEach(([property, value]) => {
          const kebabProperty = this.kebabCase(property);
          variables[`${componentPrefix}-${variantName}-${kebabProperty}`] = value;
        });
      });
    });
  }

  /**
   * Generates responsive CSS with media queries
   */
  static generateResponsiveCSS(variables: CSSVariableMap): string {
    const baseVariables = Object.entries(variables)
      .filter(([key]) => !key.includes('-mobile') && !key.includes('-tablet'))
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    const mobileVariables = Object.entries(variables)
      .filter(([key]) => key.includes('-mobile'))
      .map(([key, value]) => `  ${key.replace('-mobile', '')}: ${value};`)
      .join('\n');

    const tabletVariables = Object.entries(variables)
      .filter(([key]) => key.includes('-tablet'))
      .map(([key, value]) => `  ${key.replace('-tablet', '')}: ${value};`)
      .join('\n');

    return `
:root {
${baseVariables}
}

@media (max-width: ${this.BREAKPOINTS.md}) {
  :root {
${tabletVariables}
  }
}

@media (max-width: ${this.BREAKPOINTS.sm}) {
  :root {
${mobileVariables}
  }
}
    `.trim();
  }

  /**
   * Generates CSS for dark mode variables
   */
  static generateDarkModeVariables(darkTheme: Partial<OrganizationTheme>): CSSVariableMap {
    const variables: CSSVariableMap = {};

    if (darkTheme.colors) {
      this.addColorVariables(variables, darkTheme.colors as OrganizationTheme['colors']);
    }

    return variables;
  }

  /**
   * Converts hex color to RGB values
   */
  private static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Converts hex color to HSL values
   */
  private static hexToHsl(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0%, 0%';

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  }

  /**
   * Adjusts color lightness
   */
  private static adjustColorLightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
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
  private static kebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Validates CSS variable names
   */
  static validateVariableNames(variables: CSSVariableMap): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validNameRegex = /^--[a-z0-9-]+$/;

    Object.keys(variables).forEach(name => {
      if (!validNameRegex.test(name)) {
        errors.push(`Invalid CSS variable name: ${name}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Optimizes CSS variables by removing duplicates and unused variables
   */
  static optimizeVariables(variables: CSSVariableMap, usedVariables: Set<string>): CSSVariableMap {
    const optimized: CSSVariableMap = {};

    Object.entries(variables).forEach(([name, value]) => {
      if (usedVariables.has(name) || name.startsWith('--theme-')) {
        optimized[name] = value;
      }
    });

    return optimized;
  }

  /**
   * Generates CSS variable fallbacks
   */
  static generateFallbacks(variables: CSSVariableMap, fallbackTheme: OrganizationTheme): CSSVariableMap {
    const fallbackVariables = this.generateVariables(fallbackTheme);
    const withFallbacks: CSSVariableMap = {};

    Object.entries(variables).forEach(([name, value]) => {
      const fallbackValue = fallbackVariables[name];
      withFallbacks[name] = fallbackValue ? `${value}, ${fallbackValue}` : value;
    });

    return withFallbacks;
  }
}