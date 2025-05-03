
import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface GrapesEditorProps {
  onSave?: (html: string, css: string) => void;
  initialHtml?: string;
  initialCss?: string;
}

const GrapesEditor: React.FC<GrapesEditorProps> = ({
  onSave,
  initialHtml = '',
  initialCss = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<grapesjs.Editor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize GrapesJS
    const grapesjsEditor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: '100%',
      fromElement: false,
      storageManager: {
        type: 'local',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
        id: 'page-builder-grapesjs'
      },
      plugins: [gjsPresetWebpage],
      pluginsOpts: {
        gjsPresetWebpage: {}
      },
      deviceManager: {
        devices: [
          {
            id: 'desktop',
            name: 'Desktop',
            width: ''
          },
          {
            id: 'tablet',
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px'
          },
          {
            id: 'mobile',
            name: 'Mobile',
            width: '320px',
            widthMedia: '480px'
          }
        ]
      },
      panels: {
        defaults: [
          {
            id: 'layers',
            el: '.layers-container',
            resizable: {
              maxDim: 300,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0
            }
          },
          {
            id: 'panel-devices',
            el: '.panel__devices',
            buttons: [
              {
                id: 'device-desktop',
                label: 'D',
                command: 'set-device-desktop',
                active: true,
                togglable: false
              },
              {
                id: 'device-tablet',
                label: 'T',
                command: 'set-device-tablet',
                togglable: false
              },
              {
                id: 'device-mobile',
                label: 'M',
                command: 'set-device-mobile',
                togglable: false
              }
            ]
          }
        ]
      },
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
        ]
      }
    });

    // Set commands for responsive design
    grapesjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => editor.setDevice('desktop')
    });
    grapesjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => editor.setDevice('tablet')
    });
    grapesjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => editor.setDevice('mobile')
    });

    // Set initial content if provided
    if (initialHtml || initialCss) {
      grapesjsEditor.setComponents(initialHtml);
      grapesjsEditor.setStyle(initialCss);
    }

    setEditor(grapesjsEditor);

    // Clean up
    return () => {
      grapesjsEditor.destroy();
    };
  }, [initialHtml, initialCss]);

  const handleSave = () => {
    if (!editor) return;
    
    const html = editor.getHtml();
    const css = editor.getCss();
    
    if (onSave) {
      onSave(html, css);
    }
    
    toast.success('Page saved successfully!');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="panel__devices"></div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
      <div className="flex-1 flex">
        <div className="layers-container w-64 border-r overflow-auto bg-background"></div>
        <div className="flex-1 relative">
          <div ref={editorRef} className="absolute inset-0"></div>
        </div>
      </div>
    </div>
  );
};

export default GrapesEditor;
