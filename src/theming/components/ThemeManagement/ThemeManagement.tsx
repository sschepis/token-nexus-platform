import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Sparkles, 
  Settings, 
  Eye, 
  Save, 
  Download,
  Upload,
  History,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ThemeEditor } from '../ThemeEditor/ThemeEditor';
import { ThemeTemplateGallery } from '../ThemeTemplateGallery/ThemeTemplateGallery';
import { 
  selectCurrentTheme, 
  selectThemeLoading, 
  selectThemeError,
  selectValidationResult,
  selectEditorState,
  selectIsPreviewMode,
  loadOrganizationTheme,
  saveOrganizationTheme,
  clearPreview
} from '@/store/slices/themeSlice';
import { useTheme } from '../../providers/ThemeContext';
import type { AppDispatch } from '@/store/store';

interface ThemeManagementProps {
  organizationId: string;
  className?: string;
}

export const ThemeManagement: React.FC<ThemeManagementProps> = ({
  organizationId,
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentTheme = useSelector(selectCurrentTheme);
  const isLoading = useSelector(selectThemeLoading);
  const error = useSelector(selectThemeError);
  const validationResult = useSelector(selectValidationResult);
  const editorState = useSelector(selectEditorState);
  const isPreviewMode = useSelector(selectIsPreviewMode);

  const { applyTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'history'>('editor');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // Load organization theme on mount
  useEffect(() => {
    if (organizationId && !currentTheme) {
      dispatch(loadOrganizationTheme(organizationId));
    }
  }, [organizationId, currentTheme, dispatch]);

  // Handle save theme
  const handleSaveTheme = useCallback(async () => {
    if (!currentTheme) return;

    try {
      await dispatch(saveOrganizationTheme(currentTheme)).unwrap();
      await applyTheme(currentTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [currentTheme, dispatch, applyTheme]);

  // Handle exit preview
  const handleExitPreview = useCallback(() => {
    dispatch(clearPreview());
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  }, [dispatch, currentTheme, applyTheme]);

  // Get theme status
  const getThemeStatus = () => {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Theme Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your organization's visual identity and branding
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Status */}
          {themeStatus && (
            <Badge 
              variant={themeStatus.type === 'error' ? 'destructive' : 
                      themeStatus.type === 'warning' ? 'secondary' : 'default'}
              className="flex items-center gap-1"
            >
              {themeStatus.type === 'error' && <AlertTriangle className="h-3 w-3" />}
              {themeStatus.type === 'warning' && <Info className="h-3 w-3" />}
              {themeStatus.type === 'success' && <CheckCircle className="h-3 w-3" />}
              {themeStatus.message}
            </Badge>
          )}

          {/* Preview Mode Indicator */}
          {isPreviewMode && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Preview Mode
            </Badge>
          )}

          {/* Unsaved Changes Indicator */}
          {editorState.isDirty && (
            <Badge variant="outline">
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      {/* Preview Mode Alert */}
      {isPreviewMode && (
        <Alert className="mb-6">
          <Eye className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You are currently previewing a theme. Changes are temporary until you apply them.
            </span>
            <Button variant="outline" size="sm" onClick={handleExitPreview}>
              Exit Preview
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>
            Common theme management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTemplateGallery(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Browse Templates
            </Button>
            
            <Button
              onClick={handleSaveTheme}
              disabled={!editorState.isDirty || isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Theme
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled
            >
              <Download className="h-4 w-4" />
              Export Theme
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled
            >
              <Upload className="h-4 w-4" />
              Import Theme
            </Button>
          </div>
        </CardContent>
      </Card>

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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Current Theme Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Name</p>
                <p>{currentTheme.name}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Version</p>
                <p>{currentTheme.version}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Last Updated</p>
                <p>{new Date(currentTheme.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Template</p>
                <p>{currentTheme.templateId || 'Custom'}</p>
              </div>
            </div>
            
            {validationResult && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Accessibility Score</p>
                    <p className={validationResult.accessibilityScore >= 80 ? 'text-green-600' : 
                                 validationResult.accessibilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                      {validationResult.accessibilityScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Performance Score</p>
                    <p className={validationResult.performanceScore >= 80 ? 'text-green-600' : 
                                 validationResult.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                      {validationResult.performanceScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Issues</p>
                    <p>
                      {validationResult.errors.length} errors, {validationResult.warnings.length} warnings
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThemeManagement;