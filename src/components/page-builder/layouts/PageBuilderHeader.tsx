import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Code, Smartphone, Tablet, Monitor, Layers, Palette, Bot, Play, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface PageBuilderHeaderProps {
  currentPageTitle: string;
  lastSaved: Date | null;
  aiAssistantActive: boolean;
  suggestionsCount: number;
  layoutOptimizationsCount: number;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  currentView: 'design' | 'code' | 'preview';
  showPageList: boolean;
  showComponentLibrary: boolean;
  showAIAssistant: boolean;
  showStyles: boolean;
  isLoading: boolean;
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onViewChange: (view: 'design' | 'code' | 'preview') => void;
  onTogglePageList: () => void;
  onToggleComponentLibrary: () => void;
  onToggleAIAssistantPanel: () => void;
  onToggleStyles: () => void;
  onToggleFullscreen: () => void;
  onSave: () => void;
}

const PageBuilderHeader: React.FC<PageBuilderHeaderProps> = ({
  currentPageTitle,
  lastSaved,
  aiAssistantActive,
  suggestionsCount,
  layoutOptimizationsCount,
  deviceMode,
  currentView,
  showPageList,
  showComponentLibrary,
  showAIAssistant,
  showStyles,
  isLoading,
  onDeviceChange,
  onViewChange,
  onTogglePageList,
  onToggleComponentLibrary,
  onToggleAIAssistantPanel,
  onToggleStyles,
  onToggleFullscreen,
  onSave,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold">Page Builder</h1>
          <p className="text-sm text-muted-foreground mr-4">
            {currentPageTitle ? `Editing: ${currentPageTitle}` : 'No page selected'}
            {lastSaved && (
              <span className="ml-2">
                • Last saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        {/* AI Status */}
        {aiAssistantActive && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            AI Assistant Active
            {(suggestionsCount > 0 || layoutOptimizationsCount > 0) && (
              <span className="ml-1">({suggestionsCount + layoutOptimizationsCount} suggestions)</span>
            )}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Device Mode Selector */}
        <div className="flex items-center gap-1 mr-4">
          <Button
            variant={deviceMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDeviceChange('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={deviceMode === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDeviceChange('tablet')}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={deviceMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDeviceChange('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 mr-4">
          <Button
            variant={currentView === 'design' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('design')}
          >
            Design
          </Button>
          <Button
            variant={currentView === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('code')}
          >
            <Code className="mr-1 h-4 w-4" />
            Code
          </Button>
          <Button
            variant={currentView === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('preview')}
          >
            <Eye className="mr-1 h-4 w-4" />
            Preview
          </Button>
        </div>

        {/* Panel Toggles */}
        <div className="flex items-center gap-1 mr-4">
          <Button
            variant={showPageList ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePageList}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant={showComponentLibrary ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleComponentLibrary}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant={showAIAssistant ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAIAssistantPanel}
          >
            <Bot className="h-4 w-4" />
          </Button>
          <Button
            variant={showStyles ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleStyles}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
        >
          <Play className="mr-1 h-4 w-4" />
          Fullscreen
        </Button>
        
        <Button
          onClick={onSave}
          disabled={isLoading}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

export default PageBuilderHeader;