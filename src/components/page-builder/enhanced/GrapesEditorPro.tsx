import React, { useEffect, useRef, useState, useCallback } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

// Import the plugins we have available
import gjsPresetWebpage from 'grapesjs-preset-webpage';

import { Button } from '@/components/ui/button';
import { Save, Undo, Redo, Eye, Code, Layers, Palette } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useTheme } from 'next-themes';

interface GrapesEditorProProps {
  onSave?: (html: string, css: string, components: any) => void;
  initialHtml?: string;
  initialCss?: string;
  initialComponents?: any;
  customComponents?: any[];
  onComponentSelect?: (component: any) => void;
  readOnly?: boolean;
}

const GrapesEditorPro: React.FC<GrapesEditorProProps> = ({
  onSave,
  initialHtml = '',
  initialCss = '',
  initialComponents = null,
  customComponents = [],
  onComponentSelect,
  readOnly = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<grapesjs.Editor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDevice, setCurrentDevice] = useState('desktop');
  const [showCode, setShowCode] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [showStyles, setShowStyles] = useState(true);
  const { theme } = useTheme();

  // Initialize GrapesJS with enhanced configuration
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
        id: 'page-builder-grapesjs-pro'
      },

      // Plugin configuration
      plugins: [gjsPresetWebpage],
      pluginsOpts: {
        [gjsPresetWebpage]: {
          modalImportTitle: 'Import Template',
          modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Paste here your HTML/CSS and click Import</div>',
          modalImportContent: function(editor: any) {
            return editor.getHtml() + '<style>' + editor.getCss() + '</style>';
          },
          filestackOpts: null,
          aviaryOpts: false,
          blocksBasicOpts: {
            blocks: ['column1', 'column2', 'column3', 'column3-7', 'text', 'link', 'image', 'video'],
            flexGrid: 1,
          },
          customStyleManager: [{
            name: 'General',
            buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
            properties: [{
              type: 'select',
              property: 'float',
              defaults: 'none',
              list: [
                { value: 'none', name: 'None' },
                { value: 'left', name: 'Left' },
                { value: 'right', name: 'Right' }
              ],
            }]
          }]
        }
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

      // Enhanced panels configuration
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

    // Enhanced commands
    grapesjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => {
        editor.setDevice('desktop');
        setCurrentDevice('desktop');
      }
    });

    grapesjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => {
        editor.setDevice('tablet');
        setCurrentDevice('tablet');
      }
    });

    grapesjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => {
        editor.setDevice('mobile');
        setCurrentDevice('mobile');
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

    setEditor(grapesjsEditor);
    setIsLoading(false);

    // Cleanup
    return () => {
      grapesjsEditor.destroy();
    };
  }, [initialHtml, initialCss, initialComponents, customComponents, theme]);

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

  const handleDeviceChange = useCallback((device: string) => {
    if (editor) {
      editor.setDevice(device);
      setCurrentDevice(device);
    }
  }, [editor]);

  const togglePreview = useCallback(() => {
    if (editor) {
      const commands = editor.Commands as any;
      if (commands && commands.isActive && commands.run && commands.stop) {
        if (commands.isActive('preview')) {
          commands.stop('preview');
        } else {
          commands.run('preview');
        }
      }
    }
  }, [editor]);

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
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Device Controls */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant={currentDevice === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('desktop')}
              className="px-3"
            >
              Desktop
            </Button>
            <Button
              variant={currentDevice === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('tablet')}
              className="px-3"
            >
              Tablet
            </Button>
            <Button
              variant={currentDevice === 'mobile' ? 'default' : 'outline'}
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
          {/* Panel Toggles */}
          <Button
            variant={showLayers ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant={showStyles ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowStyles(!showStyles)}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant={showCode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCode(!showCode)}
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
        {/* Left Panel - Blocks and Layers */}
        {(showLayers || true) && (
          <div className="w-64 border-r bg-card flex flex-col">
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
          <div className="w-64 border-l bg-card flex flex-col">
            <div className="styles-container flex-1 overflow-auto"></div>
            <div className="traits-container h-48 border-t overflow-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrapesEditorPro;