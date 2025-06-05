import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { OrganizationTheme, ThemeContextValue, ThemeValidationResult, ThemeUpdate } from '../types/theme.types';
import { getThemeEngine } from '../engine/ThemeEngine';
import { ThemeValidator } from '../utils/themeValidation';
import { CSSGenerator } from '../utils/cssGeneration';

/**
 * React Context for theme management
 * Provides theme state and operations to components
 */

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: OrganizationTheme;
  enableCaching?: boolean;
  enableValidation?: boolean;
  fallbackTheme?: OrganizationTheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme,
  enableCaching = true,
  enableValidation = true,
  fallbackTheme
}) => {
  const [currentTheme, setCurrentTheme] = useState<OrganizationTheme | null>(initialTheme || null);
  const [currentInstallationId, setCurrentInstallationId] = useState<string | null>(null);
  
  useEffect(() => {
    // Attempt to fetch currentInstallationId from Parse SDK
    const fetchInstallationId = async () => {
      try {
        const installationId = localStorage.getItem('parse/currentInstallationId') || 'fallback-installation-id';
        setCurrentInstallationId(installationId);
      } catch (error) {
        console.warn("Failed to fetch currentInstallationId. Using fallback value.");
        setCurrentInstallationId("fallback-installation-id");
      }
    };
  
    fetchInstallationId();
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<OrganizationTheme | null>(null);

  // Initialize theme engine
  const themeEngine = getThemeEngine({
    enableCaching,
    cacheTimeout: 300000, // 5 minutes
    enableValidation,
    enableAccessibilityCheck: true,
    enablePerformanceMonitoring: true,
    fallbackTheme: fallbackTheme || {} as OrganizationTheme
  });

  /**
   * Sets a new theme and applies it to the document
   */
  const setTheme = useCallback(async (theme: OrganizationTheme) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate theme if validation is enabled
      if (enableValidation) {
        const validation = ThemeValidator.validateTheme(theme);
        if (!validation.isValid && validation.errors.some(e => e.severity === 'error')) {
          throw new Error(`Theme validation failed: ${validation.errors[0].message}`);
        }
      }

      // Apply theme through engine
      await themeEngine.applyTheme(theme);
      
      // Update state
      setCurrentTheme(theme);
      setPreviewTheme(null); // Clear any preview

      // Store theme in localStorage for persistence
      try {
        localStorage.setItem('organization-theme', JSON.stringify({
          id: theme.id,
          organizationId: theme.organizationId,
          version: theme.version,
          updatedAt: theme.updatedAt
        }));
      } catch (storageError) {
        console.warn('Failed to persist theme to localStorage:', storageError);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply theme';
      setError(errorMessage);
      console.error('Theme application error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [themeEngine, enableValidation]);

  /**
   * Updates the current theme with partial changes
   */
  const updateTheme = useCallback(async (updates: ThemeUpdate) => {
    if (!currentTheme) {
      setError('No current theme to update');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Resolve the updated theme
      const inheritance = themeEngine.resolveTheme(updates, currentTheme);
      const updatedTheme = inheritance.resolved;

      // Apply the updated theme
      await setTheme(updatedTheme);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update theme';
      setError(errorMessage);
      console.error('Theme update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTheme, themeEngine, setTheme]);

  /**
   * Resets theme to platform defaults
   */
  const resetTheme = useCallback(async () => {
    const platformDefaults = themeEngine.getPlatformDefaults();
    await setTheme(platformDefaults);
  }, [themeEngine, setTheme]);

  /**
   * Validates a theme without applying it
   */
  const validateTheme = useCallback((theme: OrganizationTheme): ThemeValidationResult => {
    return ThemeValidator.validateTheme(theme);
  }, []);

  /**
   * Generates CSS from a theme without applying it
   */
  const generateCSS = useCallback((theme: OrganizationTheme): string => {
    return CSSGenerator.generateThemeCSS(theme);
  }, []);

  /**
   * Previews a theme temporarily without persisting it
   */
  const previewThemeCallback = useCallback(async (theme: OrganizationTheme) => {
    setIsLoading(true);
    setError(null);

    try {
      // Apply theme temporarily
      await themeEngine.applyTheme(theme);
      setPreviewTheme(theme);

      // Auto-revert after 30 seconds
      setTimeout(() => {
        if (currentTheme) {
          themeEngine.applyTheme(currentTheme);
          setPreviewTheme(null);
        }
      }, 30000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview theme';
      setError(errorMessage);
      console.error('Theme preview error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [themeEngine, currentTheme]);

  /**
   * Applies a theme permanently (same as setTheme but more explicit)
   */
  const applyTheme = useCallback(async (theme: OrganizationTheme) => {
    await setTheme(theme);
  }, [setTheme]);

  // Load persisted theme on mount
  useEffect(() => {
    const loadPersistedTheme = async () => {
      if (currentTheme) return; // Don't load if theme is already set
      let hasShownError = false; // Prevent multiple error notifications

      try {
        const persistedThemeInfo = localStorage.getItem('organization-theme');
        if (persistedThemeInfo) {
          const themeInfo = JSON.parse(persistedThemeInfo);
          
          // In a real application, you would fetch the full theme from your API
          // For now, we'll use the platform defaults
          const platformDefaults = themeEngine.getPlatformDefaults();
          platformDefaults.id = themeInfo.id;
          platformDefaults.organizationId = themeInfo.organizationId;
          
          await setTheme(platformDefaults);
        } else {
          // Load platform defaults if no persisted theme
          const platformDefaults = themeEngine.getPlatformDefaults();
          await setTheme(platformDefaults);
        }
      } catch (err) {
        if (!hasShownError) {
          console.warn('Failed to load persisted theme, using defaults:', err);
          hasShownError = true; // Mark error as shown
        }
        const platformDefaults = themeEngine.getPlatformDefaults();
        await setTheme(platformDefaults);
      }
    };

    loadPersistedTheme();
  }, [currentTheme, themeEngine, setTheme]);

  // Handle system theme changes
  useEffect(() => {
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (currentTheme && currentTheme.darkMode) {
        // If current theme has dark mode support, apply appropriate variant
        const isDark = e.matches;
        const themeToApply = isDark && currentTheme.darkMode ? 
          { ...currentTheme, ...currentTheme.darkMode } : 
          currentTheme;
        
        themeEngine.applyTheme(themeToApply);
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [currentTheme, themeEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      themeEngine.clearCache();
    };
  }, [themeEngine]);

  const contextValue: ThemeContextValue = {
    currentTheme: previewTheme || currentTheme,
    isLoading,
    error,
    setTheme,
    updateTheme,
    resetTheme,
    validateTheme,
    generateCSS,
    previewTheme: previewThemeCallback,
    applyTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use the theme context
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Hook to get theme-aware CSS variables
 */
export const useThemeVariables = (): Record<string, string> => {
  const { currentTheme } = useTheme();
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentTheme) {
      const cssVariables = CSSGenerator.generateCSSVariables(currentTheme);
      setVariables(cssVariables);
    }
  }, [currentTheme]);

  return variables;
};

/**
 * Hook to get current theme colors
 */
export const useThemeColors = () => {
  const { currentTheme } = useTheme();
  return currentTheme?.colors || null;
};

/**
 * Hook to get current theme typography
 */
export const useThemeTypography = () => {
  const { currentTheme } = useTheme();
  return currentTheme?.typography || null;
};

/**
 * Hook to get current theme spacing
 */
export const useThemeSpacing = () => {
  const { currentTheme } = useTheme();
  return currentTheme?.spacing || null;
};

/**
 * Hook to check if a theme is currently being previewed
 */
export const useIsPreviewMode = (): boolean => {
  const { currentTheme } = useTheme();
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    // Check if there's a preview indicator in the DOM
    const previewIndicator = document.querySelector('[data-theme-preview]');
    setIsPreview(!!previewIndicator);
  }, [currentTheme]);

  return isPreview;
};

/**
 * Higher-order component to provide theme context
 */
export const withTheme = <P extends object>(
  Component: React.ComponentType<P & { theme: OrganizationTheme | null }>
) => {
  return (props: P) => {
    const { currentTheme } = useTheme();
    return <Component {...props} theme={currentTheme} />;
  };
};

/**
 * Component to display theme debug information (development only)
 */
export const ThemeDebugInfo: React.FC = () => {
  const { currentTheme, isLoading, error } = useTheme();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Theme Debug</strong></div>
      <div>ID: {currentTheme?.id || 'None'}</div>
      <div>Name: {currentTheme?.name || 'None'}</div>
      <div>Version: {currentTheme?.version || 'None'}</div>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
      {error && <div style={{ color: '#ff6b6b' }}>Error: {error}</div>}
    </div>
  );
};

export default ThemeProvider;