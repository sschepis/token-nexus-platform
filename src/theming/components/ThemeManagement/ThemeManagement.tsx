import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Sparkles, History, AlertTriangle } from 'lucide-react';
import { ThemeEditor } from '../ThemeEditor/ThemeEditor';
import { ThemeTemplateGallery } from '../ThemeTemplateGallery/ThemeTemplateGallery';
import {
  selectCurrentTheme,
  selectThemeLoading,
  selectThemeError,
  selectValidationResult,
  selectEditorState,
  selectIsPreviewMode
} from '@/store/slices/themeSlice';
import { useTheme } from '../../providers/ThemeContext';
import { useThemeActions } from '../../../hooks/useThemeActions';
import {
  ThemeHeader,
  ThemeActions,
  ThemePreview,
  ThemeInfo,
  type ThemeStatus
} from '../../../components/theme';
import type { UsePageControllerReturn } from '../../../hooks/usePageController';

interface ThemeManagementProps {
  organizationId: string;
  pageController: UsePageControllerReturn;
  className?: string;
}

export const ThemeManagement: React.FC<ThemeManagementProps> = ({
  organizationId,
  pageController,
  className = ''
}) => {
  const currentTheme = useSelector(selectCurrentTheme);
  const isLoading = useSelector(selectThemeLoading);
  const error = useSelector(selectThemeError);
  const validationResult = useSelector(selectValidationResult);
  const editorState = useSelector(selectEditorState);
  const isPreviewMode = useSelector(selectIsPreviewMode);

  const { applyTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'history'>('editor');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // Initialize theme actions hook
  const themeActions = useThemeActions({
    pageController,
    onError: (error) => console.error('Theme action failed:', error),
    onSuccess: (message) => console.log('Theme action succeeded:', message)
  });

  // Load organization theme on mount
  useEffect(() => {
    if (organizationId && !currentTheme) {
      themeActions.handleGetCurrentTheme();
    }
  }, [organizationId, currentTheme, themeActions]);

  // Handle exit preview
  const handleExitPreview = useCallback(() => {
    themeActions.handleRefreshThemes();
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  }, [themeActions, currentTheme, applyTheme]);

  // Handle save theme
  const handleSaveTheme = useCallback(async () => {
    if (!currentTheme) return;
    const success = await themeActions.handleApplyTheme(currentTheme);
    if (success) {
      await applyTheme(currentTheme);
    }
  }, [currentTheme, themeActions, applyTheme]);

  // Handle browse templates
  const handleBrowseTemplates = useCallback(async () => {
    const themes = await themeActions.handleGetAvailableThemes();
    if (themes.length > 0) {
      setShowTemplateGallery(true);
    }
  }, [themeActions]);

  // Get theme status
  const getThemeStatus = (): ThemeStatus | null => {
    if (!validationResult) return null;

    const hasErrors = validationResult.errors.length > 0;
    const hasWarnings = validationResult.warnings.length > 0;

    if (hasErrors) {
      return { type: 'error', message: `${validationResult.errors.length} error(s) found` };
    } else if (hasWarnings) {
      return { type: 'warning', message: `${validationResult.warnings.length} warning(s) found` };
    } else {
      return { type: 'success', message: 'Theme is valid' };
    }
  };

  const themeStatus = getThemeStatus();

  if (isLoading && !currentTheme) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading theme...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load theme: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`theme-management ${className}`}>
      {/* Theme Header */}
      <ThemeHeader
        themeStatus={themeStatus}
        isPreviewMode={isPreviewMode}
        hasUnsavedChanges={editorState.isDirty}
      />

      {/* Preview Mode Alert */}
      <ThemePreview
        isPreviewMode={isPreviewMode}
        onExitPreview={handleExitPreview}
      />

      {/* Quick Actions */}
      <ThemeActions
        onBrowseTemplates={handleBrowseTemplates}
        onSaveTheme={handleSaveTheme}
        onRefreshThemes={() => { themeActions.handleRefreshThemes(); }}
        onPreviewTheme={() => { themeActions.handlePreviewTheme(currentTheme); }}
        isLoading={isLoading}
        hasUnsavedChanges={editorState.isDirty}
        canSave={!!currentTheme}
        canPreview={!!currentTheme}
      />

      {/* Main Content */}
      {showTemplateGallery ? (
        <ThemeTemplateGallery
          organizationId={organizationId}
          onTemplateSelect={() => setShowTemplateGallery(false)}
          onClose={() => setShowTemplateGallery(false)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'editor' | 'templates' | 'history')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Theme Editor
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" disabled>
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-6">
            {currentTheme ? (
              <ThemeEditor
                organizationId={organizationId}
                className="w-full"
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No theme available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <ThemeTemplateGallery
              organizationId={organizationId}
              onTemplateSelect={() => setActiveTab('editor')}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Theme history coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Theme Information Panel */}
      {currentTheme && (
        <ThemeInfo
          theme={currentTheme}
          validationResult={validationResult}
        />
      )}
    </div>
  );
};

export default ThemeManagement;