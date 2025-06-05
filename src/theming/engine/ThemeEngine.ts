import { OrganizationTheme, ThemeUpdate, ThemeInheritance, ThemeEngineConfig, ThemeMetrics } from '../types/theme.types';
import { CSSGenerator } from '../utils/cssGeneration';
import { ThemeValidator } from '../utils/themeValidation';

/**
 * Core Theme Engine responsible for theme resolution, inheritance,
 * caching, and dynamic CSS generation
 */

export class ThemeEngine {
  private static instance: ThemeEngine;
  private config: ThemeEngineConfig;
  private themeCache: Map<string, { theme: OrganizationTheme; timestamp: number; css: string }>;
  private platformDefaults: OrganizationTheme;
  private activeTheme: OrganizationTheme | null = null;
  private styleElement: HTMLStyleElement | null = null;

  private constructor(config: ThemeEngineConfig) {
    this.config = config;
    this.themeCache = new Map();
    this.platformDefaults = this.createPlatformDefaults();
    this.initializeStyleElement();
  }

  /**
   * Gets the singleton instance of ThemeEngine
   */
  static getInstance(config?: ThemeEngineConfig): ThemeEngine {
    if (!ThemeEngine.instance) {
      const defaultConfig: ThemeEngineConfig = {
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
        enableValidation: true,
        enableAccessibilityCheck: true,
        enablePerformanceMonitoring: true,
        fallbackTheme: {} as OrganizationTheme // Will be set in constructor
      };
      ThemeEngine.instance = new ThemeEngine(config || defaultConfig);
    }
    return ThemeEngine.instance;
  }

  /**
   * Resolves a complete theme from platform defaults, template, and organization overrides
   */
  resolveTheme(
    organizationOverrides: ThemeUpdate,
    templateBase?: OrganizationTheme
  ): ThemeInheritance {
    const startTime = performance.now();

    // Create inheritance chain: platform defaults → template → organization overrides
    let resolvedTheme = this.deepClone(this.platformDefaults);

    // Apply template base if provided
    if (templateBase) {
      resolvedTheme = this.mergeThemes(resolvedTheme, templateBase);
    }

    // Apply organization overrides
    resolvedTheme = this.mergeThemes(resolvedTheme, organizationOverrides as Partial<OrganizationTheme>);

    // Ensure required fields are present
    this.ensureRequiredFields(resolvedTheme);

    // Update metadata
    resolvedTheme.updatedAt = new Date().toISOString();
    if (!resolvedTheme.version) {
      resolvedTheme.version = '1.0.0';
    }

    const inheritance: ThemeInheritance = {
      platformDefaults: this.platformDefaults,
      templateBase,
      organizationOverrides,
      resolved: resolvedTheme
    };

    // Performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      const resolveTime = performance.now() - startTime;
      console.debug(`Theme resolution took ${resolveTime.toFixed(2)}ms`);
    }

    return inheritance;
  }

  /**
   * Applies a theme to the current document
   */
  async applyTheme(theme: OrganizationTheme): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate theme if enabled
      if (this.config.enableValidation) {
        const validation = ThemeValidator.validateTheme(theme);
        if (!validation.isValid) {
          console.warn('Theme validation failed:', validation.errors);
          if (validation.errors.some(e => e.severity === 'error')) {
            throw new Error('Theme contains critical errors and cannot be applied');
          }
        }
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(theme);
      let css = '';

      if (this.config.enableCaching) {
        const cached = this.getCachedTheme(cacheKey);
        if (cached) {
          css = cached.css;
          console.debug('Using cached theme CSS');
        }
      }

      // Generate CSS if not cached
      if (!css) {
        css = CSSGenerator.generateThemeCSS(theme);
        
        // Add dark mode CSS if available
        if (theme.darkMode) {
          css += '\n' + CSSGenerator.generateDarkModeCSS(theme);
        }

        // Cache the result
        if (this.config.enableCaching) {
          this.cacheTheme(cacheKey, theme, css);
        }
      }

      // Apply CSS to document
      this.injectCSS(css);

      // Update active theme
      this.activeTheme = theme;

      // Update document attributes for theme-aware components
      this.updateDocumentAttributes(theme);

      // Performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        const applyTime = performance.now() - startTime;
        const metrics: ThemeMetrics = {
          loadTime: applyTime,
          cssSize: css.length,
          variableCount: this.countCSSVariables(css),
          accessibilityScore: 0, // Will be calculated by validator
          contrastRatios: {},
          performanceImpact: applyTime
        };
        console.debug('Theme application metrics:', metrics);
      }

    } catch (error) {
      console.error('Failed to apply theme:', error);
      
      // Fallback to default theme
      if (this.config.fallbackTheme && theme.id !== this.config.fallbackTheme.id) {
        console.warn('Applying fallback theme');
        await this.applyTheme(this.config.fallbackTheme);
      }
      
      throw error;
    }
  }

  /**
   * Merges two theme objects with deep merging
   */
  private mergeThemes(base: OrganizationTheme, override: Partial<OrganizationTheme>): OrganizationTheme {
    const merged = this.deepClone(base);
    
    // Recursively merge objects
    this.deepMerge(merged as unknown as Record<string, unknown>, override as Record<string, unknown>);
    
    return merged;
  }

  /**
   * Deep merges two objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (this.isObject(sourceValue) && this.isObject(targetValue)) {
        this.deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
      } else if (sourceValue !== undefined) {
        target[key] = sourceValue;
      }
    });
  }

  /**
   * Checks if a value is a plain object
   */
  private isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Deep clones an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as unknown as T;
    
    const cloned = {} as T;
    Object.keys(obj as Record<string, unknown>).forEach(key => {
      (cloned as Record<string, unknown>)[key] = this.deepClone((obj as Record<string, unknown>)[key]);
    });
    
    return cloned;
  }

  /**
   * Ensures required fields are present in the theme
   */
  private ensureRequiredFields(theme: OrganizationTheme): void {
    if (!theme.id) theme.id = `theme-${Date.now()}`;
    if (!theme.name) theme.name = 'Untitled Theme';
    if (!theme.createdAt) theme.createdAt = new Date().toISOString();
    if (!theme.updatedAt) theme.updatedAt = new Date().toISOString();
  }

  /**
   * Generates a cache key for a theme
   */
  private generateCacheKey(theme: OrganizationTheme): string {
    // Create a hash-like key based on theme content
    const content = JSON.stringify({
      id: theme.id,
      version: theme.version,
      updatedAt: theme.updatedAt,
      colors: theme.colors,
      typography: theme.typography,
      components: theme.components
    });
    
    // Simple hash function (in production, consider using a proper hash library)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `theme-${Math.abs(hash)}`;
  }

  /**
   * Gets a cached theme if available and not expired
   */
  private getCachedTheme(cacheKey: string): { theme: OrganizationTheme; css: string } | null {
    const cached = this.themeCache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.themeCache.delete(cacheKey);
      return null;
    }

    return { theme: cached.theme, css: cached.css };
  }

  /**
   * Caches a theme and its generated CSS
   */
  private cacheTheme(cacheKey: string, theme: OrganizationTheme, css: string): void {
    this.themeCache.set(cacheKey, {
      theme: this.deepClone(theme),
      timestamp: Date.now(),
      css
    });

    // Cleanup old cache entries if cache gets too large
    if (this.themeCache.size > 50) {
      const oldestKey = this.themeCache.keys().next().value;
      this.themeCache.delete(oldestKey);
    }
  }

  /**
   * Initializes the style element for CSS injection
   */
  private initializeStyleElement(): void {
    if (typeof document === 'undefined') return; // SSR safety

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'theme-engine-styles';
    this.styleElement.type = 'text/css';
    document.head.appendChild(this.styleElement);
  }

  /**
   * Injects CSS into the document
   */
  private injectCSS(css: string): void {
    if (!this.styleElement) {
      this.initializeStyleElement();
    }

    if (this.styleElement) {
      this.styleElement.textContent = css;
    }
  }

  /**
   * Updates document attributes for theme-aware components
   */
  private updateDocumentAttributes(theme: OrganizationTheme): void {
    if (typeof document === 'undefined') return; // SSR safety

    const root = document.documentElement;
    
    // Set theme ID attribute
    root.setAttribute('data-theme-id', theme.id);
    
    // Set theme name attribute
    root.setAttribute('data-theme-name', theme.name);
    
    // Set organization ID if available
    if (theme.organizationId) {
      root.setAttribute('data-organization-id', theme.organizationId);
    }

    // Set primary color as CSS custom property for external integrations
    root.style.setProperty('--theme-primary-color', theme.colors.primary);
  }

  /**
   * Counts CSS variables in generated CSS
   */
  private countCSSVariables(css: string): number {
    const matches = css.match(/--[\w-]+:/g);
    return matches ? matches.length : 0;
  }

  /**
   * Creates platform default theme
   */
  private createPlatformDefaults(): OrganizationTheme {
    return {
      id: 'platform-default',
      name: 'Platform Default',
      version: '1.0.0',
      description: 'Default platform theme',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: {
          primary: '#1e293b',
          secondary: '#475569',
          muted: '#94a3b8'
        },
        border: '#e0e7eb', // Slightly softer border color
        input: '#e0e7eb', // Slightly softer input border color
        ring: '#3b82f6',
        popover: '#ffffff', // Default popover background
        'popover-foreground': '#1e293b', // Default popover foreground text
        destructive: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#06b6d4',
        neutral: {
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
        }
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
          '5xl': '3rem',
          '6xl': '3.75rem'
        },
        weights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800
        },
        lineHeights: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.625',
          loose: '2'
        },
        letterSpacing: {
          tight: '-0.025em',
          normal: '0em',
          wide: '0.025em'
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
        '5xl': '8rem',
        '6xl': '12rem'
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        md: '0 6px 12px -2px rgb(0 0 0 / 0.15), 0 3px 6px -3px rgb(0 0 0 / 0.1)',
        lg: '0 15px 25px -5px rgb(0 0 0 / 0.18), 0 6px 10px -6px rgb(0 0 0 / 0.12)',
        xl: '0 25px 40px -8px rgb(0 0 0 / 0.2), 0 10px 15px -8px rgb(0 0 0 / 0.15)',
        '2xl': '0 30px 60px -15px rgb(0 0 0 / 0.3)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
        none: '0 0 #0000'
      },
      components: {
        button: { variants: {}, baseStyles: {} },
        popover: {
          DEFAULT: '#ffffff', // Default popover background
          foreground: '#1e293b' // Default popover foreground text
        },
        card: { variants: {}, baseStyles: {} },
        input: { variants: {}, baseStyles: {} },
        sidebar: { variants: {}, baseStyles: {} },
        navbar: { variants: {}, baseStyles: {} },
        modal: { variants: {}, baseStyles: {} },
        dropdown: { variants: {}, baseStyles: {} },
        table: { variants: {}, baseStyles: {} },
        badge: { variants: {}, baseStyles: {} },
        alert: { variants: {}, baseStyles: {} },
        tooltip: { variants: {}, baseStyles: {} },
        tabs: { variants: {}, baseStyles: {} }
      },
      branding: {
        logo: '',
        favicon: '/favicon.ico',
        appIcon: '/icon-192.png'
      },
      layout: {
        sidebarWidth: '16rem',
        headerHeight: '4rem',
        containerMaxWidth: '1200px',
        contentPadding: '1.5rem',
        gridGap: '1rem',
        cardPadding: '1.5rem',
        formSpacing: '1rem'
      },
      animations: {
        duration: {
          fast: '150ms',
          normal: '300ms',
          slow: '500ms'
        },
        easing: {
          ease: 'ease',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out',
          bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        transitions: {
          all: 'all 300ms ease-in-out',
          colors: 'color 150ms ease-in-out, background-color 150ms ease-in-out, border-color 150ms ease-in-out',
          opacity: 'opacity 150ms ease-in-out',
          transform: 'transform 150ms ease-in-out'
        }
      }
    };
  }

  /**
   * Gets the currently active theme
   */
  getActiveTheme(): OrganizationTheme | null {
    return this.activeTheme;
  }

  /**
   * Gets the platform default theme
   */
  getPlatformDefaults(): OrganizationTheme {
    return this.deepClone(this.platformDefaults);
  }

  /**
   * Clears the theme cache
   */
  clearCache(): void {
    this.themeCache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.themeCache.size,
      keys: Array.from(this.themeCache.keys())
    };
  }

  /**
   * Preloads a theme (generates and caches CSS without applying)
   */
  async preloadTheme(theme: OrganizationTheme): Promise<void> {
    const cacheKey = this.generateCacheKey(theme);
    
    if (!this.getCachedTheme(cacheKey)) {
      const css = CSSGenerator.generateThemeCSS(theme);
      this.cacheTheme(cacheKey, theme, css);
    }
  }

  /**
   * Removes a specific theme from cache
   */
  removeCachedTheme(themeId: string): void {
    Array.from(this.themeCache.entries()).forEach(([key, cached]) => {
      if (cached.theme.id === themeId) {
        this.themeCache.delete(key);
      }
    });
  }
}

// Export singleton instance getter
export const getThemeEngine = (config?: ThemeEngineConfig): ThemeEngine => {
  return ThemeEngine.getInstance(config);
};