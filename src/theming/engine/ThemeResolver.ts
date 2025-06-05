import { OrganizationTheme, ThemeUpdate, ThemeTemplate, DeepPartial } from '../types/theme.types';

/**
 * Theme Resolver handles the logic for resolving themes from different sources
 * including platform defaults, templates, and organization overrides
 */

export class ThemeResolver {
  /**
   * Resolves a theme property path to its final value
   */
  static resolveProperty<T>(
    platformDefault: T,
    templateValue?: T,
    organizationOverride?: T
  ): T {
    // Organization override takes highest priority
    if (organizationOverride !== undefined && organizationOverride !== null) {
      return organizationOverride;
    }

    // Template value takes second priority
    if (templateValue !== undefined && templateValue !== null) {
      return templateValue;
    }

    // Platform default is the fallback
    return platformDefault;
  }

  /**
   * Resolves color inheritance with automatic color generation
   */
  static resolveColors(
    platformColors: OrganizationTheme['colors'],
    templateColors?: DeepPartial<OrganizationTheme['colors']>,
    orgColors?: DeepPartial<OrganizationTheme['colors']>
  ): OrganizationTheme['colors'] {
    const resolved = { ...platformColors };

    // Apply template colors
    if (templateColors) {
      this.mergeColors(resolved, templateColors);
    }

    // Apply organization colors
    if (orgColors) {
      this.mergeColors(resolved, orgColors);
    }

    // Generate missing color variations
    this.generateColorVariations(resolved);

    return resolved;
  }

  /**
   * Merges color objects with deep merging for nested properties
   */
  private static mergeColors(
    target: OrganizationTheme['colors'],
    source: DeepPartial<OrganizationTheme['colors']>
  ): void {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key as keyof typeof source];
      if (sourceValue !== undefined) {
        if (key === 'text' || key === 'neutral') {
          // Handle nested color objects
          (target as unknown as Record<string, unknown>)[key] = {
            ...(target as unknown as Record<string, unknown>)[key] as Record<string, unknown>,
            ...sourceValue as Record<string, unknown>
          };
        } else {
          // Handle direct color values
          (target as unknown as Record<string, unknown>)[key] = sourceValue;
        }
      }
    });
  }

  /**
   * Generates color variations and ensures all required colors are present
   */
  private static generateColorVariations(colors: OrganizationTheme['colors']): void {
    // Ensure neutral palette is complete
    if (!colors.neutral || Object.keys(colors.neutral).length < 11) {
      colors.neutral = this.generateNeutralPalette(colors.text.primary, colors.background);
    }

    // Generate missing status colors if not provided
    if (!colors.success) {
      colors.success = '#10b981'; // Default green
    }
    if (!colors.warning) {
      colors.warning = '#f59e0b'; // Default amber
    }
    if (!colors.info) {
      colors.info = '#06b6d4'; // Default cyan
    }
    if (!colors.destructive) {
      colors.destructive = '#ef4444'; // Default red
    }
  }

  /**
   * Generates a neutral color palette based on text and background colors
   */
  private static generateNeutralPalette(textColor: string, backgroundColor: string): OrganizationTheme['colors']['neutral'] {
    // This is a simplified implementation
    // In production, you might want to use a color manipulation library
    return {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    };
  }

  /**
   * Resolves typography with font fallbacks and validation
   */
  static resolveTypography(
    platformTypography: OrganizationTheme['typography'],
    templateTypography?: DeepPartial<OrganizationTheme['typography']>,
    orgTypography?: DeepPartial<OrganizationTheme['typography']>
  ): OrganizationTheme['typography'] {
    const resolved = { ...platformTypography };

    // Apply template typography
    if (templateTypography) {
      this.mergeTypography(resolved, templateTypography);
    }

    // Apply organization typography
    if (orgTypography) {
      this.mergeTypography(resolved, orgTypography);
    }

    // Ensure font fallbacks
    this.ensureFontFallbacks(resolved);

    return resolved;
  }

  /**
   * Merges typography objects
   */
  private static mergeTypography(
    target: OrganizationTheme['typography'],
    source: DeepPartial<OrganizationTheme['typography']>
  ): void {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key as keyof typeof source];
      if (sourceValue !== undefined) {
        if (typeof sourceValue === 'object' && sourceValue !== null) {
          // Handle nested objects like sizes, weights, etc.
          (target as unknown as Record<string, unknown>)[key] = {
            ...(target as unknown as Record<string, unknown>)[key] as Record<string, unknown>,
            ...sourceValue as Record<string, unknown>
          };
        } else {
          // Handle direct values like fontFamily
          (target as unknown as Record<string, unknown>)[key] = sourceValue;
        }
      }
    });
  }

  /**
   * Ensures font families have proper fallbacks
   */
  private static ensureFontFallbacks(typography: OrganizationTheme['typography']): void {
    // Add fallbacks to main font family
    if (typography.fontFamily && !typography.fontFamily.includes('sans-serif')) {
      typography.fontFamily += ', system-ui, sans-serif';
    }

    // Add fallbacks to heading font
    if (typography.headingFont && !typography.headingFont.includes('sans-serif')) {
      typography.headingFont += ', system-ui, sans-serif';
    }
  }

  /**
   * Resolves component themes with inheritance
   */
  static resolveComponents(
    platformComponents: OrganizationTheme['components'],
    templateComponents?: DeepPartial<OrganizationTheme['components']>,
    orgComponents?: DeepPartial<OrganizationTheme['components']>
  ): OrganizationTheme['components'] {
    const resolved = { ...platformComponents };

    // Apply template components
    if (templateComponents) {
      this.mergeComponents(resolved, templateComponents);
    }

    // Apply organization components
    if (orgComponents) {
      this.mergeComponents(resolved, orgComponents);
    }

    return resolved;
  }

  /**
   * Merges component theme objects
   */
  private static mergeComponents(
    target: OrganizationTheme['components'],
    source: DeepPartial<OrganizationTheme['components']>
  ): void {
    Object.keys(source).forEach(componentName => {
      const sourceComponent = source[componentName as keyof typeof source];
      if (sourceComponent) {
        const targetComponent = target[componentName as keyof typeof target];
        
        // Merge component configuration
        target[componentName as keyof typeof target] = {
          variants: {
            ...targetComponent.variants,
            ...sourceComponent.variants
          },
          baseStyles: {
            ...targetComponent.baseStyles,
            ...sourceComponent.baseStyles
          },
          defaultProps: {
            ...targetComponent.defaultProps,
            ...sourceComponent.defaultProps
          },
          customCSS: sourceComponent.customCSS || targetComponent.customCSS
        };
      }
    });
  }

  /**
   * Resolves spacing with consistent scale
   */
  static resolveSpacing(
    platformSpacing: OrganizationTheme['spacing'],
    templateSpacing?: DeepPartial<OrganizationTheme['spacing']>,
    orgSpacing?: DeepPartial<OrganizationTheme['spacing']>
  ): OrganizationTheme['spacing'] {
    const resolved = { ...platformSpacing };

    // Apply template spacing
    if (templateSpacing) {
      Object.assign(resolved, templateSpacing);
    }

    // Apply organization spacing
    if (orgSpacing) {
      Object.assign(resolved, orgSpacing);
    }

    // Validate spacing scale consistency
    this.validateSpacingScale(resolved);

    return resolved;
  }

  /**
   * Validates that spacing scale is consistent
   */
  private static validateSpacingScale(spacing: OrganizationTheme['spacing']): void {
    const spacingValues = Object.values(spacing);
    const remValues = spacingValues
      .filter(value => value.endsWith('rem'))
      .map(value => parseFloat(value));

    // Check if spacing follows a consistent scale
    if (remValues.length > 1) {
      const ratios = [];
      for (let i = 1; i < remValues.length; i++) {
        ratios.push(remValues[i] / remValues[i - 1]);
      }

      // Log warning if spacing scale is inconsistent
      const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
      const isConsistent = ratios.every(ratio => Math.abs(ratio - avgRatio) < 0.5);

      if (!isConsistent) {
        console.warn('Spacing scale may be inconsistent. Consider using a consistent ratio.');
      }
    }
  }

  /**
   * Resolves layout properties with responsive considerations
   */
  static resolveLayout(
    platformLayout: OrganizationTheme['layout'],
    templateLayout?: DeepPartial<OrganizationTheme['layout']>,
    orgLayout?: DeepPartial<OrganizationTheme['layout']>
  ): OrganizationTheme['layout'] {
    const resolved = { ...platformLayout };

    // Apply template layout
    if (templateLayout) {
      Object.assign(resolved, templateLayout);
    }

    // Apply organization layout
    if (orgLayout) {
      Object.assign(resolved, orgLayout);
    }

    // Ensure responsive values
    this.ensureResponsiveLayout(resolved);

    return resolved;
  }

  /**
   * Ensures layout values are responsive-friendly
   */
  private static ensureResponsiveLayout(layout: OrganizationTheme['layout']): void {
    // Convert fixed pixel values to responsive units where appropriate
    Object.keys(layout).forEach(key => {
      const value = layout[key as keyof typeof layout];
      
      // Convert large pixel values to rem for better scalability
      if (typeof value === 'string' && value.endsWith('px')) {
        const pixelValue = parseInt(value);
        if (pixelValue > 100) {
          const remValue = pixelValue / 16; // Assuming 16px base font size
          console.info(`Consider using ${remValue}rem instead of ${value} for better responsiveness`);
        }
      }
    });
  }

  /**
   * Resolves branding with asset validation
   */
  static resolveBranding(
    platformBranding: OrganizationTheme['branding'],
    templateBranding?: DeepPartial<OrganizationTheme['branding']>,
    orgBranding?: DeepPartial<OrganizationTheme['branding']>
  ): OrganizationTheme['branding'] {
    const resolved = { ...platformBranding };

    // Apply template branding
    if (templateBranding) {
      Object.assign(resolved, templateBranding);
    }

    // Apply organization branding
    if (orgBranding) {
      Object.assign(resolved, orgBranding);
    }

    // Validate asset URLs
    this.validateBrandingAssets(resolved);

    return resolved;
  }

  /**
   * Validates branding asset URLs
   */
  private static validateBrandingAssets(branding: OrganizationTheme['branding']): void {
    const urlFields = ['logo', 'logoLight', 'logoDark', 'favicon', 'appIcon', 'emailLogo'];
    
    urlFields.forEach(field => {
      const url = branding[field as keyof typeof branding];
      if (url && typeof url === 'string' && url.length > 0) {
        try {
          new URL(url);
        } catch {
          // If not a valid URL, check if it's a relative path
          if (!url.startsWith('/') && !url.startsWith('./')) {
            console.warn(`Branding asset ${field} may have an invalid URL: ${url}`);
          }
        }
      }
    });
  }

  /**
   * Creates a theme diff showing what changed between two themes
   */
  static createThemeDiff(
    originalTheme: OrganizationTheme,
    newTheme: OrganizationTheme
  ): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};

    this.compareObjects(
      originalTheme as unknown as Record<string, unknown>,
      newTheme as unknown as Record<string, unknown>,
      '',
      diff
    );

    return diff;
  }

  /**
   * Recursively compares two objects to find differences
   */
  private static compareObjects(
    original: Record<string, unknown>,
    updated: Record<string, unknown>,
    path: string,
    diff: Record<string, { from: unknown; to: unknown }>
  ): void {
    const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);

    allKeys.forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      const originalValue = original[key];
      const updatedValue = updated[key];

      if (typeof originalValue === 'object' && typeof updatedValue === 'object' &&
          originalValue !== null && updatedValue !== null &&
          !Array.isArray(originalValue) && !Array.isArray(updatedValue)) {
        // Recursively compare objects
        this.compareObjects(
          originalValue as Record<string, unknown>,
          updatedValue as Record<string, unknown>,
          currentPath,
          diff
        );
      } else if (originalValue !== updatedValue) {
        // Value changed
        diff[currentPath] = {
          from: originalValue,
          to: updatedValue
        };
      }
    });
  }

  /**
   * Validates theme compatibility with a template
   */
  static validateTemplateCompatibility(
    theme: OrganizationTheme,
    template: ThemeTemplate
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if theme structure matches template expectations
    const templateTheme = template.theme as OrganizationTheme;
    
    // Validate color compatibility
    if (theme.colors.primary && templateTheme.colors?.primary) {
      const contrast = this.calculateColorContrast(theme.colors.primary, theme.colors.background);
      if (contrast < 3) {
        issues.push('Primary color may not have sufficient contrast with background');
      }
    }

    // Validate typography compatibility
    if (theme.typography.fontFamily !== templateTheme.typography?.fontFamily) {
      issues.push('Font family differs from template recommendation');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Simple color contrast calculation
   */
  private static calculateColorContrast(color1: string, color2: string): number {
    // Simplified contrast calculation
    // In production, use a proper color library
    return 4.5; // Placeholder value
  }
}