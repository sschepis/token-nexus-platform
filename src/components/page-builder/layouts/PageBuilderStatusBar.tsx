import React from 'react';
import { Sparkles } from 'lucide-react';
import { CustomComponent } from '@/types/component-library';

interface PageBuilderStatusBarProps {
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  currentView: 'design' | 'code' | 'preview';
  customComponents: CustomComponent[];
  aiAssistantActive: boolean;
  suggestionsCount: number;
  layoutOptimizationsCount: number;
  lastSaved: Date | null;
}

const PageBuilderStatusBar: React.FC<PageBuilderStatusBarProps> = ({
  deviceMode,
  currentView,
  customComponents,
  aiAssistantActive,
  suggestionsCount,
  layoutOptimizationsCount,
  lastSaved,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>Device: {deviceMode}</span>
        <span>View: {currentView}</span>
        <span>Components: {customComponents.length}</span>
        {aiAssistantActive && (
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI: {suggestionsCount + layoutOptimizationsCount} suggestions
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {lastSaved && (
          <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
        )}
        <span>Ready</span>
      </div>
    </div>
  );
};

export default PageBuilderStatusBar;