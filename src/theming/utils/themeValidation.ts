import { OrganizationTheme, ThemeValidationResult, ThemeValidationError, ThemeValidationWarning } from '../types/theme.types';

/**
 * Theme validation utilities for ensuring theme completeness,
 * accessibility compliance, and performance optimization
 */

export class ThemeValidator {
  private static readonly REQUIRED_FIELDS = [
    'colors.primary',
    'colors.secondary',
    'colors.background',
    'colors.text.primary',
    'typography.fontFamily',
    'branding.logo'
  ];

  private static readonly MIN_CONTRAST_RATIO = 4.5;
  private static readonly MIN_CONTRAST_RATIO_LARGE = 3.0;

  /**
   * Validates a complete theme configuration
   */
  static validateTheme(theme: OrganizationTheme): ThemeValidationResult {
    const errors: ThemeValidationError[] = [];
    const warnings: ThemeValidationWarning[] = [];

    // Validate required fields
    this.validateRequiredFields(theme, errors);

    // Validate color values
    this.validateColors(theme, errors, warnings);

    // Validate typography
    this.validateTypography(theme, errors, warnings);

    // Validate accessibility
    const accessibilityScore = this.calculateAccessibilityScore(theme, warnings);

    // Validate performance impact
    const performanceScore = this.calculatePerformanceScore(theme, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      accessibilityScore,
      performanceScore
    };
  }

  /**
   * Validates that all required fields are present
   */
  private static validateRequiredFields(theme: OrganizationTheme, errors: ThemeValidationError[]): void {
    this.REQUIRED_FIELDS.forEach(fieldPath => {
      const value = this.getNestedValue(theme as unknown as Record<string, unknown>, fieldPath);
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field: fieldPath,
          message: `Required field '${fieldPath}' is missing or empty`,
          severity: 'error',
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    });
  }

  /**
   * Validates color values and formats
   */
  private static validateColors(
    theme: OrganizationTheme,
    errors: ThemeValidationError[],
    warnings: ThemeValidationWarning[]
  ): void {
    const colorFields = [
      'colors.primary',
      'colors.secondary',
      'colors.accent',
      'colors.background',
      'colors.surface',
      'colors.text.primary',
      'colors.text.secondary',
      'colors.text.muted',
      'colors.border',
      'colors.destructive',
      'colors.warning',
      'colors.success',
      'colors.info'
    ];

    colorFields.forEach(fieldPath => {
      const color = this.getNestedValue(theme as unknown as Record<string, unknown>, fieldPath);
      if (color && typeof color === 'string' && !this.isValidColor(color)) {
        errors.push({
          field: fieldPath,
          message: `Invalid color format: ${color}. Use hex, rgb, rgba, hsl, or hsla format.`,
          severity: 'error',
          code: 'INVALID_COLOR_FORMAT'
        });
      }
    });

    // Validate contrast ratios
    this.validateContrastRatios(theme, warnings);
  }

  /**
   * Validates typography settings
   */
  private static validateTypography(
    theme: OrganizationTheme,
    errors: ThemeValidationError[],
    warnings: ThemeValidationWarning[]
  ): void {
    // Validate font family
    if (theme.typography.fontFamily && !this.isValidFontFamily(theme.typography.fontFamily)) {
      warnings.push({
        field: 'typography.fontFamily',
        message: 'Font family may not be web-safe or available',
        suggestion: 'Consider using web-safe fonts or Google Fonts',
        code: 'FONT_AVAILABILITY_WARNING'
      });
    }

    // Validate font sizes
    Object.entries(theme.typography.sizes).forEach(([size, value]) => {
      if (!this.isValidCSSUnit(value)) {
        errors.push({
          field: `typography.sizes.${size}`,
          message: `Invalid font size unit: ${value}. Use px, rem, em, or % units.`,
          severity: 'error',
          code: 'INVALID_CSS_UNIT'
        });
      }
    });

    // Validate font weights
    Object.entries(theme.typography.weights).forEach(([weight, value]) => {
      if (typeof value !== 'number' || value < 100 || value > 900 || value % 100 !== 0) {
        errors.push({
          field: `typography.weights.${weight}`,
          message: `Invalid font weight: ${value}. Use values between 100-900 in increments of 100.`,
          severity: 'error',
          code: 'INVALID_FONT_WEIGHT'
        });
      }
    });
  }

  /**
   * Validates color contrast ratios for accessibility
   */
  private static validateContrastRatios(theme: OrganizationTheme, warnings: ThemeValidationWarning[]): void {
    const contrastPairs = [
      { fg: theme.colors.text.primary, bg: theme.colors.background, context: 'primary text on background' },
      { fg: theme.colors.text.secondary, bg: theme.colors.background, context: 'secondary text on background' },
      { fg: theme.colors.text.primary, bg: theme.colors.surface, context: 'primary text on surface' },
      { fg: theme.colors.primary, bg: theme.colors.background, context: 'primary color on background' }
    ];

    contrastPairs.forEach(({ fg, bg, context }) => {
      const ratio = this.calculateContrastRatio(fg, bg);
      if (ratio < this.MIN_CONTRAST_RATIO) {
        warnings.push({
          field: 'colors',
          message: `Low contrast ratio (${ratio.toFixed(2)}) for ${context}. Minimum recommended: ${this.MIN_CONTRAST_RATIO}`,
          suggestion: 'Adjust colors to improve accessibility',
          code: 'LOW_CONTRAST_RATIO'
        });
      }
    });
  }

  /**
   * Calculates accessibility score based on WCAG guidelines
   */
  private static calculateAccessibilityScore(theme: OrganizationTheme, warnings: ThemeValidationWarning[]): number {
    let score = 100;

    // Deduct points for contrast issues
    const contrastWarnings = warnings.filter(w => w.code === 'LOW_CONTRAST_RATIO');
    score -= contrastWarnings.length * 15;

    // Deduct points for font availability issues
    const fontWarnings = warnings.filter(w => w.code === 'FONT_AVAILABILITY_WARNING');
    score -= fontWarnings.length * 5;

    // Check for sufficient color differentiation
    const colors = [theme.colors.primary, theme.colors.secondary, theme.colors.accent];
    const uniqueColors = new Set(colors);
    if (uniqueColors.size < colors.length) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculates performance score based on theme complexity
   */
  private static calculatePerformanceScore(theme: OrganizationTheme, warnings: ThemeValidationWarning[]): number {
    let score = 100;

    // Deduct points for custom CSS
    if (theme.branding.customCSS && theme.branding.customCSS.length > 5000) {
      score -= 20;
      warnings.push({
        field: 'branding.customCSS',
        message: 'Large custom CSS may impact performance',
        suggestion: 'Consider optimizing or reducing custom CSS',
        code: 'LARGE_CUSTOM_CSS'
      });
    }

    // Deduct points for complex component overrides
    const componentOverrides = Object.values(theme.components).filter(c => c.customCSS);
    if (componentOverrides.length > 5) {
      score -= 15;
    }

    // Deduct points for too many custom properties
    if (theme.customProperties && Object.keys(theme.customProperties).length > 50) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Validates if a string is a valid CSS color
   */
  private static isValidColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/;
    const hslRegex = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/;
    const hslaRegex = /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*(0|1|0?\.\d+)\s*\)$/;

    return hexRegex.test(color) || 
           rgbRegex.test(color) || 
           rgbaRegex.test(color) || 
           hslRegex.test(color) || 
           hslaRegex.test(color);
  }

  /**
   * Validates if a font family is web-safe
   */
  private static isValidFontFamily(fontFamily: string): boolean {
    const webSafeFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
      'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Inter', 'Roboto', 'Open Sans'
    ];

    const fonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
    return fonts.some(font => webSafeFonts.includes(font) || font === 'sans-serif' || font === 'serif' || font === 'monospace');
  }

  /**
   * Validates if a value is a valid CSS unit
   */
  private static isValidCSSUnit(value: string): boolean {
    const cssUnitRegex = /^-?\d*\.?\d+(px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in|pt|pc)$/;
    return cssUnitRegex.test(value) || value === '0';
  }

  /**
   * Calculates contrast ratio between two colors
   */
  private static calculateContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calculates relative luminance of a color
   */
  private static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Converts hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Gets nested value from object using dot notation
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      return current && typeof current === 'object' && current !== null ?
        (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  /**
   * Validates theme against a specific template
   */
  static validateAgainstTemplate(theme: OrganizationTheme, template: OrganizationTheme): ThemeValidationResult {
    const errors: ThemeValidationError[] = [];
    const warnings: ThemeValidationWarning[] = [];

    // Check for missing properties that exist in template
    this.compareThemeStructure(template, theme, '', errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      accessibilityScore: this.calculateAccessibilityScore(theme, warnings),
      performanceScore: this.calculatePerformanceScore(theme, warnings)
    };
  }

  /**
   * Recursively compares theme structure against template
   */
  private static compareThemeStructure(
    template: unknown,
    theme: unknown,
    path: string,
    errors: ThemeValidationError[],
    warnings: ThemeValidationWarning[]
  ): void {
    if (typeof template === 'object' && template !== null && typeof theme === 'object' && theme !== null) {
      Object.keys(template as Record<string, unknown>).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        const templateValue = (template as Record<string, unknown>)[key];
        const themeValue = (theme as Record<string, unknown>)[key];

        if (themeValue === undefined && templateValue !== undefined) {
          warnings.push({
            field: newPath,
            message: `Property '${newPath}' exists in template but missing in theme`,
            suggestion: 'Consider adding this property for consistency',
            code: 'MISSING_TEMPLATE_PROPERTY'
          });
        } else if (typeof templateValue === 'object' && typeof themeValue === 'object') {
          this.compareThemeStructure(templateValue, themeValue, newPath, errors, warnings);
        }
      });
    }
  }
}

/**
 * Quick validation functions for common use cases
 */
export const validateTheme = (theme: OrganizationTheme): ThemeValidationResult => {
  return ThemeValidator.validateTheme(theme);
};

export const validateColor = (color: string): boolean => {
  return ThemeValidator['isValidColor'](color);
};

export const calculateContrastRatio = (color1: string, color2: string): number => {
  return ThemeValidator['calculateContrastRatio'](color1, color2);
};

export const isAccessible = (foreground: string, background: string, isLargeText = false): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  return ratio >= (isLargeText ? ThemeValidator['MIN_CONTRAST_RATIO_LARGE'] : ThemeValidator['MIN_CONTRAST_RATIO']);
};