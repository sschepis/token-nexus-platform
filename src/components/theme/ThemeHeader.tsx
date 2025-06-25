import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Palette, Eye, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Theme status information
 */
export interface ThemeStatus {
  type: 'success' | 'warning' | 'error';
  message: string;
}

/**
 * Props for ThemeHeader component
 */
export interface ThemeHeaderProps {
  title?: string;
  description?: string;
  themeStatus?: ThemeStatus | null;
  isPreviewMode?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

/**
 * Theme Header Component
 * 
 * Displays the main header for theme management pages with status indicators,
 * preview mode alerts, and unsaved changes notifications.
 */
export const ThemeHeader: React.FC<ThemeHeaderProps> = ({
  title = "Theme Management",
  description = "Customize your organization's visual identity and branding",
  themeStatus,
  isPreviewMode = false,
  hasUnsavedChanges = false,
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Palette className="h-8 w-8" />
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {description}
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
        {hasUnsavedChanges && (
          <Badge variant="outline">
            Unsaved Changes
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ThemeHeader;