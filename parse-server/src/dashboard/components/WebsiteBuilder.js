/**
 * Website Builder Component
 * React component for GrapesJS integration in Parse Dashboard
 */

import React, { useEffect, useRef, useState } from 'react';
import WebsiteBuilder from '../../website-builder';
import 'grapesjs/dist/css/grapes.min.css';
import './WebsiteBuilder.css';

const WebsiteBuilderComponent = ({ contentId, onSave }) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [builder, setBuilder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeBuilder();
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [contentId]);

  const initializeBuilder = async () => {
    try {
      setLoading(true);
      setError(null);

      const builderInstance = new WebsiteBuilder({
        container: containerRef.current,
        height: '100vh',
        width: 'auto',
        // Custom panels configuration
        panels: {
          defaults: [
            {
              id: 'basic-actions',
              el: '.panel__basic-actions',
              buttons: [
                {
                  id: 'save',
                  className: 'btn-save',
                  label: 'Save',
                  command: 'save-content',
                  context: 'save-content',
                },
                {
                  id: 'preview',
                  className: 'btn-preview',
                  label: 'Preview',
                  command: 'preview-content',
                  context: 'preview-content',
                },
              ],
            },
          ],
        },
        // Custom commands
        commands: {
          defaults: [
            {
              id: 'save-content',
              run: async editor => {
                try {
                  const content = editor.getContent();
                  if (onSave) {
                    await onSave(content);
                  }
                  editor.Modal.close();
                  editor.Notifications.add('Content saved successfully!', {
                    type: 'success',
                  });
                } catch (err) {
                  console.error('Error saving content:', err);
                  editor.Notifications.add('Error saving content', {
                    type: 'error',
                  });
                }
              },
            },
            {
              id: 'preview-content',
              run: editor => {
                const content = editor.getContent();
                const win = window.open('', '_blank');
                win.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>${content.css}</style>
                    </head>
                    <body>${content.html}</body>
                  </html>
                `);
                win.document.close();
              },
            },
          ],
        },
      });

      const editor = await builderInstance.initialize();
      editorRef.current = editor;
      setBuilder(builderInstance);

      // Load content if contentId is provided
      if (contentId) {
        await builderInstance.load(contentId);
      }

      // Add custom keyboard shortcuts
      editor.Commands.add('save-content', {
        run: editor => editor.runCommand('save-content'),
        keys: '⌘+s, ctrl+s',
      });

      setLoading(false);
    } catch (err) {
      console.error('Error initializing website builder:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="website-builder__loading">
        <div className="spinner"></div>
        <p>Loading website builder...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="website-builder__error">
        <h3>Error loading website builder</h3>
        <p>{error}</p>
        <button onClick={initializeBuilder}>Retry</button>
      </div>
    );
  }

  return (
    <div className="website-builder">
      <div className="panel__basic-actions"></div>
      <div className="editor-container" ref={containerRef}></div>
    </div>
  );
};

export default WebsiteBuilderComponent;
