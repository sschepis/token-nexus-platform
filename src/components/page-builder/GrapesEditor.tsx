import React, { useEffect, useRef, useState, useCallback } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

// Import the plugins we have available
import gjsPresetWebpage from 'grapesjs-preset-webpage';

import { Button } from '@/components/ui/button';
import { Save, Undo, Redo, Eye, Code, Layers, Palette, Bot, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useTheme } from 'next-themes';
import { CustomComponent } from '@/types/component-library';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { apiService } from '@/services/api';
import ComponentLibraryPanel from './ComponentLibraryPanel';

interface GrapesEditorProps {
  onSave?: (html: string, css: string, components: any) => void;
  initialHtml?: string;
  initialCss?: string;
  initialComponents?: any;
  customComponents?: CustomComponent[];
  onComponentSelect?: (component: any) => void;
  readOnly?: boolean;
  
  // Additional props for enhanced functionality
  onComponentDrop?: (component: CustomComponent, position: { x: number; y: number }) => void;
  onAISuggestion?: (suggestion: any) => void;
  onLayoutOptimization?: (optimization: any) => void;
}

const GrapesEditor: React.FC<GrapesEditorProps> = ({
  onSave,
  initialHtml = '',
  initialCss = '',
  initialComponents = null,
  customComponents = [],
  onComponentSelect,
  readOnly = false,
  onComponentDrop,
  onAISuggestion,
  onLayoutOptimization
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<grapesjs.Editor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Store state
  const {
    ui: {
      currentView,
      deviceMode,
      showComponentLibrary,
      showAIAssistant,
      showLayers,
      showStyles,
      leftPanelWidth,
      rightPanelWidth
    },
    aiAssistant: {
      isActive: aiAssistantActive,
      isLoading: aiLoading,
      suggestions,
      layoutOptimizations
    },
    setCurrentView,
    setDeviceMode,
    toggleComponentLibrary,
    toggleAIAssistantPanel,
    toggleLayers,
    toggleStyles,
    setComponentSuggestions,
    setLayoutOptimizations,
    setAILoading
  } = usePageBuilderStore();

  // Initialize GrapesJS with comprehensive configuration
  useEffect(() => {
    if (!editorRef.current) return;

    setIsLoading(true);

    const grapesjsEditor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: '100%',
      fromElement: false,
      
      // Storage configuration
      storageManager: {
        type: 'local',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
        id: 'page-builder-grapesjs-v2' // Changed ID to force fresh state
      },

      // Plugin configuration
      plugins: [gjsPresetWebpage],
      pluginsOpts: {
        [gjsPresetWebpage]: {} // Simplified options
      },

      // Device manager for responsive design
      deviceManager: {
        devices: [
          {
            id: 'desktop',
            name: 'Desktop',
            width: '',
            widthMedia: '1024px'
          },
          {
            id: 'tablet-landscape',
            name: 'Tablet Landscape',
            width: '1024px',
            widthMedia: '1024px'
          },
          {
            id: 'tablet',
            name: 'Tablet Portrait',
            width: '768px',
            widthMedia: '768px'
          },
          {
            id: 'mobile-landscape',
            name: 'Mobile Landscape',
            width: '568px',
            widthMedia: '568px'
          },
          {
            id: 'mobile',
            name: 'Mobile Portrait',
            width: '320px',
            widthMedia: '480px'
          }
        ]
      },

      // Panels configuration
      panels: {
        defaults: [
          {
            id: 'layers',
            el: '.layers-container',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0
            }
          },
          {
            id: 'styles',
            el: '.styles-container',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 0,
              cr: 1,
              bc: 0
            }
          },
          {
            id: 'blocks',
            el: '.blocks-container',
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0
            }
          }
        ]
      },

      // Canvas configuration
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
          // Add custom styles for better component rendering
          `
          .gjs-dashed *[data-gjs-highlightable] {
            outline: 1px dashed rgba(59, 130, 246, 0.5) !important;
            outline-offset: -1px;
          }
          .gjs-selected {
            outline: 2px solid #3b82f6 !important;
            outline-offset: -2px;
          }
          `
        ]
      }
    });

    // Commands
    grapesjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => {
        editor.setDevice('desktop');
        setDeviceMode('desktop');
      }
    });

    grapesjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => {
        editor.setDevice('tablet');
        setDeviceMode('tablet');
      }
    });

    grapesjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => {
        editor.setDevice('mobile');
        setDeviceMode('mobile');
      }
    });

    // AI-powered commands
    grapesjsEditor.Commands.add('ai-suggest-components', {
      run: async (editor) => {
        await handleAISuggestions(editor);
      }
    });

    grapesjsEditor.Commands.add('ai-optimize-layout', {
      run: async (editor) => {
        await handleLayoutOptimization(editor);
      }
    });

    // Set initial content if provided
    if (initialComponents) {
      try {
        grapesjsEditor.loadProjectData(initialComponents);
      } catch (error) {
        console.warn('Failed to load project data:', error);
        if (initialHtml || initialCss) {
          grapesjsEditor.setComponents(initialHtml);
          grapesjsEditor.setStyle(initialCss);
        }
      }
    } else if (initialHtml || initialCss) {
      grapesjsEditor.setComponents(initialHtml);
      grapesjsEditor.setStyle(initialCss);
    }

    // Component selection handler
    grapesjsEditor.on('component:selected', (component) => {
      if (onComponentSelect) {
        onComponentSelect(component);
      }
    });

    // Auto-save functionality
    grapesjsEditor.on('storage:end:store', () => {
      if (onSave) {
        const html = grapesjsEditor.getHtml();
        const css = grapesjsEditor.getCss();
        const components = grapesjsEditor.getProjectData();
        onSave(html, css, components);
      }
    });

    // Add custom components from component library
    if (customComponents.length > 0) {
      addCustomComponentsToEditor(grapesjsEditor, customComponents);
    }

    setEditor(grapesjsEditor);
    setIsLoading(false);
    console.log('GrapesJS editor initialized:', grapesjsEditor);

    // Cleanup
    return () => {
      grapesjsEditor.destroy();
      console.log('GrapesJS editor destroyed');
    };
  }, [initialHtml, initialCss, initialComponents, customComponents, theme]);

  // Add custom components to GrapesJS
  const addCustomComponentsToEditor = useCallback((editor: grapesjs.Editor, components: CustomComponent[]) => {
    const blockManager = editor.BlockManager;
    
    components.forEach((component) => {
      blockManager.add(component.id, {
        label: component.name,
        category: 'Custom Components',
        content: {
          type: 'custom-component',
          attributes: {
            'data-component-id': component.id,
            'data-component-name': component.name
          },
          components: component.elements
        },
        media: `<div class="flex items-center justify-center w-full h-full bg-blue-100 text-blue-600 text-xs font-medium">${component.name}</div>`
      });
    });
  }, []);

  // AI suggestion handlers
  const handleAISuggestions = useCallback(async (editor: grapesjs.Editor) => {
    setAILoading(true);
    
    try {
      // Get current page structure from GrapesJS
      const projectData = editor.getProjectData();
      const currentElements = projectData.pages?.[0]?.frames?.[0]?.component?.components || [];

      const response = await apiService.suggestComponents({
        currentElements: currentElements.map((comp: any) => ({
          id: comp.attributes?.id || 'unknown',
          type: comp.type || 'div',
          props: comp.attributes || {},
          position: { x: 0, y: 0 },
          size: { width: 0, height: 0 },
          children: comp.components || []
        })),
        pageType: 'dashboard',
        userIntent: 'improve user experience'
      });

      setComponentSuggestions(response.data.suggestions);
      
      if (onAISuggestion) {
        response.data.suggestions.forEach(onAISuggestion);
      }
      
      toast.success(`Found ${response.data.suggestions.length} AI suggestions`);
    } catch (error: any) {
      console.error('AI suggestions failed:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setAILoading(false);
    }
  }, [setAILoading, setComponentSuggestions, onAISuggestion]);

  const handleLayoutOptimization = useCallback(async (editor: grapesjs.Editor) => {
    setAILoading(true);
    
    try {
      // Get current page structure from GrapesJS
      const projectData = editor.getProjectData();
      const currentElements = projectData.pages?.[0]?.frames?.[0]?.component?.components || [];

      const response = await apiService.optimizeLayout(
        currentElements.map((comp: any) => ({
          id: comp.attributes?.id || 'unknown',
          type: comp.type || 'div',
          props: comp.attributes || {},
          position: { x: 0, y: 0 },
          size: { width: 0, height: 0 },
          children: comp.components || []
        }))
      );
      
      setLayoutOptimizations(response.data.optimizations);
      
      if (onLayoutOptimization) {
        response.data.optimizations.forEach(onLayoutOptimization);
      }
      
      toast.success(`Found ${response.data.optimizations.length} layout optimizations`);
    } catch (error: any) {
      console.error('Layout optimization failed:', error);
      toast.error('Failed to optimize layout');
    } finally {
      setAILoading(false);
    }
  }, [setAILoading, setLayoutOptimizations, onLayoutOptimization]);

  // Event handlers
  const handleSave = useCallback(() => {
    if (!editor) return;
    
    const html = editor.getHtml();
    const css = editor.getCss();
    const components = editor.getProjectData();
    
    if (onSave) {
      onSave(html, css, components);
    }
    
    toast.success('Page saved successfully!');
  }, [editor, onSave]);

  const handleUndo = useCallback(() => {
    if (editor && editor.UndoManager) {
      editor.UndoManager.undo();
    }
  }, [editor]);

  const handleRedo = useCallback(() => {
    if (editor && editor.UndoManager) {
      editor.UndoManager.redo();
    }
  }, [editor]);

  const handleDeviceChange = useCallback((device: 'desktop' | 'tablet' | 'mobile') => {
    if (editor) {
      editor.setDevice(device);
      setDeviceMode(device);
    }
  }, [editor, setDeviceMode]);

  const togglePreview = useCallback(() => {
    if (editor) {
      const commands = editor.Commands as any;
      if (commands && commands.isActive && commands.run && commands.stop) {
        if (commands.isActive('preview')) {
          commands.stop('preview');
          setCurrentView('design');
        } else {
          commands.run('preview');
          setCurrentView('preview');
        }
      }
    }
  }, [editor, setCurrentView]);

  const handleComponentSelect = useCallback((component: CustomComponent) => {
    // Handle component selection from library
    console.log('Component selected:', component);
  }, []);

  const handleComponentDrag = useCallback((component: CustomComponent) => {
    // Handle component drag from library
    if (onComponentDrop) {
      onComponentDrop(component, { x: 0, y: 0 });
    }
  }, [onComponentDrop]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Device Controls */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant={deviceMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('desktop')}
              className="px-3"
            >
              Desktop
            </Button>
            <Button
              variant={deviceMode === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('tablet')}
              className="px-3"
            >
              Tablet
            </Button>
            <Button
              variant={deviceMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('mobile')}
              className="px-3"
            >
              Mobile
            </Button>
          </div>

          {/* Action Controls */}
          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={togglePreview}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Assistant Controls */}
          <Button
            variant={aiAssistantActive ? 'default' : 'outline'}
            size="sm"
            onClick={toggleAIAssistantPanel}
            disabled={aiLoading}
          >
            <Bot className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAISuggestions(editor!)}
            disabled={!editor || aiLoading}
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          {/* Panel Toggles */}
          <Button
            variant={showLayers ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLayers}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant={showStyles ? 'default' : 'outline'}
            size="sm"
            onClick={toggleStyles}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant={currentView === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView(currentView === 'code' ? 'design' : 'code')}
          >
            <Code className="h-4 w-4" />
          </Button>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={readOnly}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Component Library and Blocks */}
        {showComponentLibrary && (
          <ComponentLibraryPanel
            isVisible={showComponentLibrary}
            onComponentSelect={handleComponentSelect}
            onComponentDrag={handleComponentDrag}
            className="border-r"
          />
        )}

        {/* Traditional Blocks and Layers Panel */}
        {(showLayers || true) && (
          <div className="w-64 border-r bg-card flex flex-col" style={{ width: leftPanelWidth }}>
            <div className="blocks-container flex-1 overflow-auto"></div>
            {showLayers && (
              <div className="layers-container h-64 border-t overflow-auto"></div>
            )}
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 relative bg-muted/20">
          <div ref={editorRef} className="absolute inset-0"></div>
        </div>

        {/* Right Panel - Styles and Traits */}
        {showStyles && (
          <div className="w-64 border-l bg-card flex flex-col" style={{ width: rightPanelWidth }}>
            <div className="styles-container flex-1 overflow-auto"></div>
            <div className="traits-container h-48 border-t overflow-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrapesEditor;
