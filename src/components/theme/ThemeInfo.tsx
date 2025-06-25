import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type {
  ThemeValidationResult,
  ThemeValidationError,
  ThemeValidationWarning
} from '../../theming/types/theme.types';

/**
 * Theme data interface
 */
export interface ThemeData {
  name: string;
  version: string;
  updatedAt: string;
  templateId?: string;
}

/**
 * Props for ThemeInfo component
 */
export interface ThemeInfoProps {
  theme: ThemeData;
  validationResult?: ThemeValidationResult;
  className?: string;
}

/**
 * Theme Information Component
 * 
 * Displays detailed information about the current theme including metadata,
 * validation scores, and accessibility/performance metrics.
 */
export const ThemeInfo: React.FC<ThemeInfoProps> = ({
  theme,
  validationResult,
  className = ""
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`mt-6 ${className}`}>
      <CardHeader>
        <CardTitle className="text-base">Current Theme Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Name</p>
            <p>{theme.name}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Version</p>
            <p>{theme.version}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Last Updated</p>
            <p>{new Date(theme.updatedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Template</p>
            <p>{theme.templateId || 'Custom'}</p>
          </div>
        </div>
        
        {validationResult && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Accessibility Score</p>
                <p className={getScoreColor(validationResult.accessibilityScore)}>
                  {validationResult.accessibilityScore}/100
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Performance Score</p>
                <p className={getScoreColor(validationResult.performanceScore)}>
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
  );
};

export default ThemeInfo;