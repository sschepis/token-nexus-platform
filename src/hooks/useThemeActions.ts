import { useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { UsePageControllerReturn } from './usePageController';

/**
 * Configuration for useThemeActions hook
 */
export interface UseThemeActionsConfig {
  pageController: UsePageControllerReturn;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

/**
 * Return type for useThemeActions hook
 */
export interface UseThemeActionsReturn {
  handleApplyTheme: (themeData: any) => Promise<boolean>;
  handleCreateCustomTheme: (themeData: any) => Promise<boolean>;
  handleUpdateThemeCustomization: (themeData: any) => Promise<boolean>;
  handleDeleteCustomTheme: (themeId: string) => Promise<boolean>;
  handleGetCurrentTheme: () => Promise<any>;
  handleGetAvailableThemes: () => Promise<any[]>;
  handlePreviewTheme: (themeData: any) => Promise<boolean>;
  handleRefreshThemes: () => Promise<boolean>;
  handleResetToDefaultTheme: () => Promise<boolean>;
}

/**
 * Custom hook for theme actions using page controller pattern
 * 
 * This hook provides a standardized interface for theme operations,
 * encapsulating error handling, success notifications, and controller integration.
 * 
 * @param config Configuration object with pageController and optional callbacks
 * @returns Object with theme action handlers
 */
export const useThemeActions = ({
  pageController,
  onError,
  onSuccess
}: UseThemeActionsConfig): UseThemeActionsReturn => {
  const { toast } = useToast();

  // Default error handler
  const handleError = useCallback((error: string, action: string) => {
    const message = `Failed to ${action}: ${error}`;
    if (onError) {
      onError(message);
    } else {
      toast({
        title: "Theme Action Failed",
        description: message,
        variant: "destructive"
      });
    }
    console.error(message);
  }, [onError, toast]);

  // Default success handler
  const handleSuccess = useCallback((message: string) => {
    if (onSuccess) {
      onSuccess(message);
    } else {
      toast({
        title: "Success",
        description: message,
        variant: "default"
      });
    }
  }, [onSuccess, toast]);

  // Apply theme to organization
  const handleApplyTheme = useCallback(async (themeData: any): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('applyTheme', { themeData });
      if (result.success) {
        handleSuccess('Theme applied successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'apply theme');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'apply theme');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Create custom theme
  const handleCreateCustomTheme = useCallback(async (themeData: any): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('createCustomTheme', { themeData });
      if (result.success) {
        handleSuccess('Custom theme created successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'create custom theme');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'create custom theme');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Update theme customization
  const handleUpdateThemeCustomization = useCallback(async (themeData: any): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('updateThemeCustomization', { themeData });
      if (result.success) {
        handleSuccess('Theme customization updated successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'update theme customization');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'update theme customization');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Delete custom theme
  const handleDeleteCustomTheme = useCallback(async (themeId: string): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('deleteCustomTheme', { themeId });
      if (result.success) {
        handleSuccess('Custom theme deleted successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'delete custom theme');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'delete custom theme');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Get current theme
  const handleGetCurrentTheme = useCallback(async (): Promise<any> => {
    try {
      const result = await pageController.executeAction('getCurrentTheme', {});
      if (result.success) {
        return result.data;
      } else {
        handleError(result.message || 'Unknown error', 'get current theme');
        return null;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'get current theme');
      return null;
    }
  }, [pageController.executeAction, handleError]);

  // Get available themes
  const handleGetAvailableThemes = useCallback(async (): Promise<any[]> => {
    try {
      const result = await pageController.executeAction('getAvailableThemes', {});
      if (result.success) {
        return Array.isArray(result.data) ? result.data : [];
      } else {
        handleError(result.message || 'Unknown error', 'get available themes');
        return [];
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'get available themes');
      return [];
    }
  }, [pageController.executeAction, handleError]);

  // Preview theme
  const handlePreviewTheme = useCallback(async (themeData: any): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('previewTheme', { themeData });
      if (result.success) {
        handleSuccess('Theme preview activated');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'preview theme');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'preview theme');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Refresh themes
  const handleRefreshThemes = useCallback(async (): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('refreshThemes', {});
      if (result.success) {
        handleSuccess('Themes refreshed successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'refresh themes');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'refresh themes');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  // Reset to default theme
  const handleResetToDefaultTheme = useCallback(async (): Promise<boolean> => {
    try {
      const result = await pageController.executeAction('resetToDefaultTheme', {});
      if (result.success) {
        handleSuccess('Theme reset to default successfully');
        return true;
      } else {
        handleError(result.message || 'Unknown error', 'reset to default theme');
        return false;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error', 'reset to default theme');
      return false;
    }
  }, [pageController.executeAction, handleError, handleSuccess]);

  return useMemo(() => ({
    handleApplyTheme,
    handleCreateCustomTheme,
    handleUpdateThemeCustomization,
    handleDeleteCustomTheme,
    handleGetCurrentTheme,
    handleGetAvailableThemes,
    handlePreviewTheme,
    handleRefreshThemes,
    handleResetToDefaultTheme
  }), [
    handleApplyTheme,
    handleCreateCustomTheme,
    handleUpdateThemeCustomization,
    handleDeleteCustomTheme,
    handleGetCurrentTheme,
    handleGetAvailableThemes,
    handlePreviewTheme,
    handleRefreshThemes,
    handleResetToDefaultTheme
  ]);
};