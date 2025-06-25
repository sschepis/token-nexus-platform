import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye } from 'lucide-react';

/**
 * Props for ThemePreview component
 */
export interface ThemePreviewProps {
  isPreviewMode: boolean;
  onExitPreview?: () => void;
  className?: string;
}

/**
 * Theme Preview Component
 * 
 * Displays a preview mode alert when the user is previewing a theme.
 * Provides an option to exit preview mode and return to normal editing.
 */
export const ThemePreview: React.FC<ThemePreviewProps> = ({
  isPreviewMode,
  onExitPreview,
  className = ""
}) => {
  if (!isPreviewMode) {
    return null;
  }

  return (
    <Alert className={`mb-6 ${className}`}>
      <Eye className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          You are currently previewing a theme. Changes are temporary until you apply them.
        </span>
        {onExitPreview && (
          <Button variant="outline" size="sm" onClick={onExitPreview}>
            Exit Preview
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ThemePreview;