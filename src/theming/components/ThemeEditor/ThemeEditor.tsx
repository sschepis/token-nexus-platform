import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  EyeOff, 
  Palette, 
  Type, 
  Layout, 
  Brush, 
  Image,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { 
  selectCurrentTheme, 
  selectThemeLoading, 
  selectThemeError,
  selectValidationResult,
  selectEditorState,
  selectCanUndo,
  selectCanRedo,
  selectIsPreviewMode,
  setEditorActiveTab,
  undoTheme,
  redoTheme,
  saveOrganizationTheme,
  validateTheme,
  setPreviewTheme,
  clearPreview
} from '@/store/slices/themeSlice';
import { useTheme } from '../../providers/ThemeContext';
import { OrganizationTheme } from '../../types/theme.types';

// Import sub-components
import { ColorEditor } from './ColorEditor';
// import { TypographyEditor } from './TypographyEditor';
// import { ComponentEditor } from './ComponentEditor';
// import { BrandingEditor } from './BrandingEditor';
// import { LayoutEditor } from './LayoutEditor';

interface ThemeEditorProps {
  organizationId: string;
  onClose?: () => void;
  className?: string;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  organizationId,
  onClose,
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentTheme = useSelector(selectCurrentTheme);
  const isLoading = useSelector(selectThemeLoading);
  const error = useSelector(selectThemeError);
  const validationResult = useSelector(selectValidationResult);
  const editorState = useSelector(selectEditorState);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const isPreviewMode = useSelector(selectIsPreviewMode);

  const { previewTheme, applyTheme } = useTheme();
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(editorState.isDirty);
  }, [editorState.isDirty]);

  // Validate theme when it changes
  useEffect(() => {
    if (currentTheme) {
      dispatch(validateTheme(currentTheme));
    }
  }, [currentTheme, dispatch]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    dispatch(setEditorActiveTab(tab as 'colors' | 'typography' | 'components' | 'branding' | 'layout'));
  }, [dispatch]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentTheme) return;

    try {
      await dispatch(saveOrganizationTheme(currentTheme)).unwrap();
      await applyTheme(currentTheme);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [currentTheme, dispatch, applyTheme]);

  // Handle preview toggle
  const handlePreviewToggle = useCallback(() => {
    if (isPreviewMode) {
      dispatch(clearPreview());
    } else if (currentTheme) {
      dispatch(setPreviewTheme(currentTheme));
      previewTheme(currentTheme);
    }
  }, [isPreviewMode, currentTheme, dispatch, previewTheme]);

  // Handle undo
  const handleUndo = useCallback(() => {
    dispatch(undoTheme());
  }, [dispatch]);

  // Handle redo
  const handleRedo = useCallback(() => {
    dispatch(redoTheme());
  }, [dispatch]);

  // Get validation status
  const getValidationStatus = () => {
    if (!validationResult) return null;

    const hasErrors = validationResult.errors.length > 0;
    const hasWarnings = validationResult.warnings.length > 0;

    if (hasErrors) {
      return { type: 'error', count: validationResult.errors.length };
    } else if (hasWarnings) {
      return { type: 'warning', count: validationResult.warnings.length };
    } else {
      return { type: 'success', count: 0 };
    }
  };

  const validationStatus = getValidationStatus();

  if (!currentTheme) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No theme loaded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`theme-editor ${className}`}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Editor
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="ml-2">
                    Unsaved Changes
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Customize your organization's theme and branding
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Validation Status */}
              {validationStatus && (
                <Badge 
                  variant={validationStatus.type === 'error' ? 'destructive' : 
                          validationStatus.type === 'warning' ? 'secondary' : 'default'}
                  className="flex items-center gap-1"
                >
                  {validationStatus.type === 'error' && <AlertTriangle className="h-3 w-3" />}
                  {validationStatus.type === 'warning' && <Info className="h-3 w-3" />}
                  {validationStatus.type === 'success' && <CheckCircle className="h-3 w-3" />}
                  {validationStatus.count > 0 ? `${validationStatus.count} issues` : 'Valid'}
                </Badge>
              )}
              
              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
              >
                <Redo className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewToggle}
                className={isPreviewMode ? 'bg-primary text-primary-foreground' : ''}
              >
                {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isPreviewMode ? 'Exit Preview' : 'Preview'}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isLoading || !hasUnsavedChanges}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Theme
              </Button>
              
              {onClose && (
                <Button variant="outline" onClick={onClose} size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Results */}
      {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {validationResult.errors.length > 0 && (
                <div>
                  <p className="font-medium text-destructive">Errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationResult.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                    {validationResult.errors.length > 3 && (
                      <li>... and {validationResult.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              {validationResult.warnings.length > 0 && (
                <div>
                  <p className="font-medium text-warning">Warnings:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationResult.warnings.slice(0, 3).map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                    {validationResult.warnings.length > 3 && (
                      <li>... and {validationResult.warnings.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Theme Editor Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={editorState.activeTab} onValueChange={handleTabChange}>
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="components" className="flex items-center gap-2">
                  <Brush className="h-4 w-4" />
                  Components
                </TabsTrigger>
                <TabsTrigger value="branding" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="colors" className="mt-0">
                <ColorEditor theme={currentTheme} organizationId={organizationId} />
              </TabsContent>

              <TabsContent value="typography" className="mt-0">
                <div className="p-4 border rounded-lg">
                  <p className="text-muted-foreground">Typography editor coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="components" className="mt-0">
                <div className="p-4 border rounded-lg">
                  <p className="text-muted-foreground">Component editor coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="mt-0">
                <div className="p-4 border rounded-lg">
                  <p className="text-muted-foreground">Branding editor coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="mt-0">
                <div className="p-4 border rounded-lg">
                  <p className="text-muted-foreground">Layout editor coming soon...</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Theme Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Theme Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span>{currentTheme.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version:</span>
            <span>{currentTheme.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated:</span>
            <span>{new Date(currentTheme.updatedAt).toLocaleDateString()}</span>
          </div>
          {validationResult && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accessibility Score:</span>
                <span className={validationResult.accessibilityScore >= 80 ? 'text-green-600' : 
                               validationResult.accessibilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                  {validationResult.accessibilityScore}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Performance Score:</span>
                <span className={validationResult.performanceScore >= 80 ? 'text-green-600' : 
                               validationResult.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                  {validationResult.performanceScore}/100
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeEditor;