import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  Eye, 
  Download, 
  Upload, 
  RotateCcw 
} from 'lucide-react';

/**
 * Action handler function type
 */
export type ActionHandler = () => void | Promise<void>;

/**
 * Props for ThemeActions component
 */
export interface ThemeActionsProps {
  onBrowseTemplates?: ActionHandler;
  onSaveTheme?: ActionHandler;
  onRefreshThemes?: ActionHandler;
  onPreviewTheme?: ActionHandler;
  onExportTheme?: ActionHandler;
  onImportTheme?: ActionHandler;
  onResetTheme?: ActionHandler;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
  canSave?: boolean;
  canPreview?: boolean;
  className?: string;
}

/**
 * Theme Actions Component
 * 
 * Provides a standardized set of quick action buttons for theme management.
 * Supports customizable handlers and loading states for each action.
 */
export const ThemeActions: React.FC<ThemeActionsProps> = ({
  onBrowseTemplates,
  onSaveTheme,
  onRefreshThemes,
  onPreviewTheme,
  onExportTheme,
  onImportTheme,
  onResetTheme,
  isLoading = false,
  hasUnsavedChanges = false,
  canSave = true,
  canPreview = true,
  className = ""
}) => {
  return (
    <Card className={`mb-6 ${className}`}>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardDescription>
          Common theme management tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Browse Templates */}
          {onBrowseTemplates && (
            <Button
              variant="outline"
              onClick={onBrowseTemplates}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Browse Templates
            </Button>
          )}
          
          {/* Save Theme */}
          {onSaveTheme && (
            <Button
              onClick={onSaveTheme}
              disabled={!hasUnsavedChanges || !canSave || isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Theme
            </Button>
          )}
          
          {/* Refresh Themes */}
          {onRefreshThemes && (
            <Button
              variant="outline"
              onClick={onRefreshThemes}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Themes
            </Button>
          )}
          
          {/* Preview Theme */}
          {onPreviewTheme && (
            <Button
              variant="outline"
              onClick={onPreviewTheme}
              disabled={!canPreview || isLoading}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Theme
            </Button>
          )}
          
          {/* Export Theme */}
          {onExportTheme && (
            <Button
              variant="outline"
              onClick={onExportTheme}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Theme
            </Button>
          )}
          
          {/* Import Theme */}
          {onImportTheme && (
            <Button
              variant="outline"
              onClick={onImportTheme}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Theme
            </Button>
          )}
          
          {/* Reset Theme */}
          {onResetTheme && (
            <Button
              variant="outline"
              onClick={onResetTheme}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeActions;