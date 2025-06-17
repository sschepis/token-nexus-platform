import React from 'react';
import GrapesEditor from '@/components/page-builder/GrapesEditor';
import AIAssistantPanel from '@/components/page-builder/AIAssistantPanel';
import ComponentLibraryPanel from '@/components/page-builder/ComponentLibraryPanel';
import PageListSidebar from '@/components/page-builder/PageListSidebar';
import { CustomComponent } from '@/types/component-library';

interface PageBuilderMainContentProps {
  showPageList: boolean;
  showComponentLibrary: boolean;
  showAIAssistant: boolean;
  customComponents: CustomComponent[];
  onComponentSelect: (component: CustomComponent) => void;
  onComponentDragStart: (component: CustomComponent) => void; // Added new prop
  onComponentDrop: (component: CustomComponent, position: { x: number; y: number }) => void;
  onAISuggestionApply: (suggestion: any) => void;
  onLayoutOptimizationApply: (optimization: any) => void;
  onSave: (html: string, css: string, components: any) => Promise<void>;
}

const PageBuilderMainContent: React.FC<PageBuilderMainContentProps> = ({
  showPageList,
  showComponentLibrary,
  showAIAssistant,
  customComponents,
  onComponentSelect,
  onComponentDragStart, // Destructure new prop
  onComponentDrop,
  onAISuggestionApply,
  onLayoutOptimizationApply,
  onSave,
}) => {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Page List */}
      {showPageList && (
        <PageListSidebar className="border-r" />
      )}

      {/* Left Panel - Component Library (integrated into PageListSidebar space initially, can be tabbed) */}
      {showComponentLibrary && (
          <ComponentLibraryPanel
            isVisible={showComponentLibrary}
            onComponentSelect={onComponentSelect}
            onComponentDrag={onComponentDragStart} // Pass the new prop here
            className="border-r"
          />
        )}

      {/* Main Editor */}
      <div className="flex-1 relative">
        <GrapesEditor
          onSave={onSave}
          customComponents={customComponents}
          onComponentDrop={onComponentDrop}
          onAISuggestion={onAISuggestionApply}
          onLayoutOptimization={onLayoutOptimizationApply}
        />
      </div>

      {/* Right Panel - AI Assistant */}
      {showAIAssistant && (
        <AIAssistantPanel
          isVisible={showAIAssistant}
          onSuggestionApply={onAISuggestionApply}
          onOptimizationApply={onLayoutOptimizationApply}
          className="border-l"
        />
      )}
    </div>
  );
};

export default PageBuilderMainContent;