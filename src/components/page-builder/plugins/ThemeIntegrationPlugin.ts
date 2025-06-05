import grapesjs from 'grapesjs';
import '../../../types/grapesjs-extended';

export interface ThemeIntegrationPluginOptions {
  theme?: string;
}

export const ThemeIntegrationPlugin = (editor: grapesjs.Editor, options: ThemeIntegrationPluginOptions = {}) => {
  const { theme = 'light' } = options;

  // Apply theme-specific styles to the editor
  editor.on('load', () => {
    const canvas = editor.Canvas.getDocument();
    if (canvas) {
      const body = canvas.body;
      body.classList.add(`theme-${theme}`);
      
      // Add theme-specific CSS variables
      const themeStyles = `
        :root {
          --editor-bg: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
          --editor-text: ${theme === 'dark' ? '#ffffff' : '#000000'};
          --editor-border: ${theme === 'dark' ? '#333333' : '#e5e5e5'};
          --editor-accent: #3b82f6;
        }
        
        body {
          background-color: var(--editor-bg);
          color: var(--editor-text);
        }
        
        .gjs-selected {
          outline: 2px solid var(--editor-accent) !important;
        }
        
        .gjs-dashed *[data-gjs-highlightable] {
          outline: 1px dashed var(--editor-accent) !important;
          outline-offset: -1px;
        }
      `;
      
      const styleElement = canvas.createElement('style');
      styleElement.textContent = themeStyles;
      canvas.head.appendChild(styleElement);
    }
  });

  // Add theme switching command
  editor.Commands.add('switch-theme', {
    run: (editor) => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      const canvas = editor.Canvas.getDocument();
      if (canvas) {
        const body = canvas.body;
        body.classList.remove(`theme-${theme}`);
        body.classList.add(`theme-${newTheme}`);
      }
    }
  });
};

export default ThemeIntegrationPlugin;