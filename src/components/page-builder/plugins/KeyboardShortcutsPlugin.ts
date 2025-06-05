import grapesjs from 'grapesjs';
import '../../../types/grapesjs-extended';

export interface KeyboardShortcutsPluginOptions {
  shortcuts?: { [key: string]: string };
}

export const KeyboardShortcutsPlugin = (editor: grapesjs.Editor, options: KeyboardShortcutsPluginOptions = {}) => {
  const defaultShortcuts = {
    'ctrl+s': 'core:save',
    'cmd+s': 'core:save',
    'ctrl+z': 'core:undo',
    'cmd+z': 'core:undo',
    'ctrl+y': 'core:redo',
    'cmd+y': 'core:redo',
    'ctrl+shift+z': 'core:redo',
    'cmd+shift+z': 'core:redo',
    'ctrl+c': 'core:copy',
    'cmd+c': 'core:copy',
    'ctrl+v': 'core:paste',
    'cmd+v': 'core:paste',
    'delete': 'core:component-delete',
    'backspace': 'core:component-delete',
    'escape': 'core:component-deselect',
    'ctrl+a': 'core:select-all',
    'cmd+a': 'core:select-all',
    ...options.shortcuts
  };

  // Add keyboard event listener
  editor.on('load', () => {
    const canvas = editor.Canvas.getDocument();
    const editorEl = editor.getContainer();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [];
      
      if (e.ctrlKey) key.push('ctrl');
      if (e.metaKey) key.push('cmd');
      if (e.shiftKey) key.push('shift');
      if (e.altKey) key.push('alt');
      
      key.push(e.key.toLowerCase());
      
      const shortcut = key.join('+');
      const command = defaultShortcuts[shortcut];
      
      if (command) {
        e.preventDefault();
        e.stopPropagation();
        
        // Execute the command
        try {
          const commands = editor.Commands as any;
          if (commands && commands.run) {
            commands.run(command);
          }
        } catch (error) {
          console.warn(`Command ${command} not found for shortcut ${shortcut}`);
        }
      }
    };

    // Add event listeners to both canvas and editor container
    if (canvas) {
      canvas.addEventListener('keydown', handleKeyDown);
    }
    if (editorEl) {
      editorEl.addEventListener('keydown', handleKeyDown);
    }
    
    // Also add to window for global shortcuts
    window.addEventListener('keydown', handleKeyDown);
  });

  // Add commands for common operations
  editor.Commands.add('core:save', {
    run: (editor) => {
      editor.trigger('storage:start:store');
    }
  });

  editor.Commands.add('core:undo', {
    run: (editor) => {
      if (editor.UndoManager) {
        editor.UndoManager.undo();
      }
    }
  });

  editor.Commands.add('core:redo', {
    run: (editor) => {
      if (editor.UndoManager) {
        editor.UndoManager.redo();
      }
    }
  });

  editor.Commands.add('core:copy', {
    run: (editor) => {
      const selected = editor.getSelected();
      if (selected) {
        editor.trigger('component:copy', selected);
      }
    }
  });

  editor.Commands.add('core:paste', {
    run: (editor) => {
      editor.trigger('component:paste');
    }
  });

  editor.Commands.add('core:component-delete', {
    run: (editor) => {
      const selected = editor.getSelected();
      if (selected) {
        selected.remove();
      }
    }
  });

  editor.Commands.add('core:component-deselect', {
    run: (editor) => {
      editor.select(null);
    }
  });

  editor.Commands.add('core:select-all', {
    run: (editor) => {
      // This would select all components - implementation depends on requirements
      console.log('Select all components');
    }
  });
};

export default KeyboardShortcutsPlugin;