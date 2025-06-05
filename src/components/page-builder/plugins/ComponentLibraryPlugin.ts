import grapesjs from 'grapesjs';
import '../../../types/grapesjs-extended';

export interface ComponentLibraryPluginOptions {
  customComponents?: any[];
}

export const ComponentLibraryPlugin = (editor: grapesjs.Editor, options: ComponentLibraryPluginOptions = {}) => {
  const { customComponents = [] } = options;

  // Add custom component blocks to the block manager
  const blockManager = editor.BlockManager;
  
  // Create a category for custom components
  customComponents.forEach((component, index) => {
    blockManager.add(`custom-component-${component.id || index}`, {
      label: component.name || `Component ${index + 1}`,
      category: 'Custom Components',
      content: component.content || `<div class="custom-component">${component.name || 'Custom Component'}</div>`,
      attributes: {
        class: 'fa fa-cube',
        title: component.description || 'Custom component from library'
      }
    });
  });

  // Add event listeners for component library integration
  editor.on('load', () => {
    // Initialize component library integration
    console.log('Component Library Plugin loaded');
  });

  // Add commands for component management
  editor.Commands.add('open-component-library', {
    run: (editor) => {
      // This will be implemented to open the component library modal
      console.log('Opening component library...');
    }
  });
};

export default ComponentLibraryPlugin;