/**
 * Website Builder Integration
 * Integrates GrapesJS with Parse Server CMS
 */

import grapesjs from 'grapesjs';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsPluginForms from 'grapesjs-plugin-forms';
import gjsCustomCode from 'grapesjs-custom-code';
import gjsStyleBg from 'grapesjs-style-bg';
import gjsParserPostcss from 'grapesjs-parser-postcss';
import gjsTooltip from 'grapesjs-tooltip';
import gjsTyped from 'grapesjs-typed';
import blocks from './blocks';
import themes from './themes';
import dataComponents from './data-components';
import dataBlocks from './data-blocks';

class WebsiteBuilder {
  constructor(config = {}) {
    this.config = {
      // Default configuration
      container: '#gjs',
      height: '100%',
      storageManager: {
        type: 'parse',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
      },
      assetManager: {
        upload: '/api/upload',
        uploadName: 'files',
        multiUpload: true,
        assets: [],
      },
      styleManager: {
        sectors: [
          {
            name: 'General',
            open: false,
            buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
          },
          {
            name: 'Dimension',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Typography',
            open: false,
            buildProps: [
              'font-family',
              'font-size',
              'font-weight',
              'letter-spacing',
              'color',
              'line-height',
              'text-align',
              'text-shadow',
            ],
          },
          {
            name: 'Decorations',
            open: false,
            buildProps: ['background-color', 'border', 'border-radius', 'box-shadow'],
          },
          {
            name: 'Extra',
            open: false,
            buildProps: ['opacity', 'transition', 'transform'],
          },
        ],
      },
      blockManager: {
        appendTo: '#blocks',
        blocks: [],
      },
      // Theme configuration
      theme: 'modern',
      // Parse Server configuration
      parseConfig: {
        serverURL: '/parse',
        appId: '',
        javascriptKey: '',
      },
      // Merge with custom config
      ...config,
    };

    this.editor = null;
  }

  /**
   * Initialize Parse Server
   */
  initializeParse() {
    const { serverURL, appId, javascriptKey } = this.config.parseConfig;
    Parse.initialize(appId, javascriptKey);
    Parse.serverURL = serverURL;
  }

  /**
   * Initialize GrapesJS editor
   * @returns {Object} GrapesJS editor instance
   */
  initialize() {
    // Initialize Parse if not already initialized
    if (!Parse.applicationId) {
      this.initializeParse();
    }

    this.editor = grapesjs.init({
      ...this.config,
      plugins: [
        gjsPresetWebpage,
        gjsBlocksBasic,
        gjsPluginForms,
        gjsCustomCode,
        gjsStyleBg,
        gjsParserPostcss,
        gjsTooltip,
        gjsTyped,
        // Custom storage manager for Parse Server
        editor => {
          editor.StorageManager.add('parse', {
            load: async keys => {
              // Load content from Parse Server
              const query = new Parse.Query('CMSWebPage');
              const page = await query.get(keys.id);
              return page.get('content');
            },
            store: async (data, options) => {
              // Save content to Parse Server
              const page = options.id
                ? await new Parse.Query('CMSWebPage').get(options.id)
                : new Parse.Object('CMSWebPage');

              page.set('content', data);
              await page.save();
              return { id: page.id };
            },
          });
        },
        // Register custom blocks
        editor => {
          blocks.register(editor);
        },
        // Register theme
        editor => {
          themes.register(editor, this.config.theme);
        },
        // Register data components
        editor => {
          dataComponents.helpers.registerAll(editor);
        },
        // Register data blocks
        editor => {
          dataBlocks.register(editor);
        },
      ],
      pluginsOpts: {
        [gjsPresetWebpage]: {
          blocksBasicOpts: {
            blocks: [
              'column1',
              'column2',
              'column3',
              'column3-7',
              'text',
              'link',
              'image',
              'video',
            ],
            flexGrid: true,
          },
          formsOpts: true,
          exportOpts: true,
          aviaryOpts: false,
          filestackOpts: false,
        },
      },
    });

    // Add custom panels
    this.addCustomPanels();

    // Add custom commands
    this.addCustomCommands();

    // Add custom styles
    this.addCustomStyles();

    // Initialize Parse Query listeners
    this.initializeQueryListeners();

    return this.editor;
  }

  /**
   * Initialize Parse Query listeners for real-time updates
   */
  initializeQueryListeners() {
    // Get all data components
    const components = this.editor.DomComponents.getComponents();
    components.forEach(component => {
      if (component.get('type').startsWith('data-')) {
        const className = component.get('className');
        if (className) {
          const query = new Parse.Query(className);
          const subscription = query.subscribe();

          subscription.on('create', object => {
            component.view.updateData();
          });

          subscription.on('update', object => {
            component.view.updateData();
          });

          subscription.on('delete', object => {
            component.view.updateData();
          });
        }
      }
    });
  }

  /**
   * Add custom panels to the editor
   */
  addCustomPanels() {
    const editor = this.editor;

    // Add device manager
    editor.Panels.addPanel({
      id: 'devices-c',
      buttons: [
        {
          id: 'device-desktop',
          label: '<i class="fa fa-desktop"></i>',
          command: 'set-device-desktop',
          active: true,
          togglable: false,
        },
        {
          id: 'device-tablet',
          label: '<i class="fa fa-tablet"></i>',
          command: 'set-device-tablet',
          togglable: false,
        },
        {
          id: 'device-mobile',
          label: '<i class="fa fa-mobile"></i>',
          command: 'set-device-mobile',
          togglable: false,
        },
      ],
    });

    // Add theme selector
    editor.Panels.addPanel({
      id: 'theme-selector',
      buttons: [
        {
          id: 'theme-modern',
          label: 'Modern',
          command: 'set-theme',
          attributes: { theme: 'modern' },
        },
        {
          id: 'theme-creative',
          label: 'Creative',
          command: 'set-theme',
          attributes: { theme: 'creative' },
        },
        {
          id: 'theme-minimal',
          label: 'Minimal',
          command: 'set-theme',
          attributes: { theme: 'minimal' },
        },
      ],
    });

    // Add data panel
    editor.Panels.addPanel({
      id: 'data-components',
      buttons: [
        {
          id: 'show-data',
          label: 'Data Components',
          command: 'show-data',
          attributes: {
            title: 'Show Data Components',
          },
        },
      ],
    });
  }

  /**
   * Add custom commands to the editor
   */
  addCustomCommands() {
    const editor = this.editor;

    // Device preview commands
    editor.Commands.add('set-device-desktop', {
      run: editor => editor.setDevice('Desktop'),
    });
    editor.Commands.add('set-device-tablet', {
      run: editor => editor.setDevice('Tablet'),
    });
    editor.Commands.add('set-device-mobile', {
      run: editor => editor.setDevice('Mobile'),
    });

    // Theme command
    editor.Commands.add('set-theme', {
      run: (editor, sender, options = {}) => {
        themes.register(editor, options.theme || 'modern');
        editor.refresh();
      },
    });

    // Show data components
    editor.Commands.add('show-data', {
      run: editor => {
        editor.Modal.open({
          title: 'Data Components',
          content: `
            <div class="data-components-list">
              ${Object.entries(dataComponents)
                .filter(([key]) => key !== 'helpers')
                .map(
                  ([category, components]) => `
                  <div class="data-category">
                    <h3>${category}</h3>
                    <div class="data-items">
                      ${Object.entries(components)
                        .map(
                          ([id, component]) => `
                        <div class="data-item" data-component="${id}">
                          <div class="data-item-label">${component.name}</div>
                          <div class="data-item-desc">${component.category}</div>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          `,
          attributes: {
            class: 'data-components-modal',
          },
        });

        // Add drag functionality
        const items = document.querySelectorAll('.data-item');
        items.forEach(item => {
          item.draggable = true;
          item.addEventListener('dragstart', e => {
            const componentId = item.dataset.component;
            e.dataTransfer.setData('component', componentId);
          });
        });
      },
    });

    // Save command
    editor.Commands.add('save-page', {
      run: async editor => {
        try {
          await Parse.Cloud.run('saveWebsiteContent', {
            pageId: editor.Storage.get('id'),
            content: {
              html: editor.getHtml(),
              css: editor.getCss(),
              components: editor.getComponents(),
              styles: editor.getStyle(),
            },
          });
          editor.Notifications.add('Page saved successfully!', {
            type: 'success',
          });
        } catch (error) {
          editor.Notifications.add('Error saving page: ' + error.message, {
            type: 'error',
          });
        }
      },
    });
  }

  /**
   * Add custom styles to the editor
   */
  addCustomStyles() {
    const editor = this.editor;

    // Add custom CSS properties
    editor.StyleManager.addProperty('dimension', {
      name: 'Gap',
      property: 'gap',
      type: 'slider',
      units: ['px', 'em', 'rem'],
      min: 0,
      max: 50,
    });
  }

  /**
   * Get editor instance
   * @returns {Object} GrapesJS editor instance
   */
  getEditor() {
    return this.editor;
  }

  /**
   * Get current content
   * @returns {Object} Current content
   */
  getContent() {
    return {
      html: this.editor.getHtml(),
      css: this.editor.getCss(),
      components: this.editor.getComponents(),
      styles: this.editor.getStyle(),
    };
  }

  /**
   * Set current theme
   * @param {string} themeName - Theme name to set
   */
  setTheme(themeName) {
    if (this.editor) {
      this.editor.runCommand('set-theme', { theme: themeName });
    }
  }

  /**
   * Get available themes
   * @returns {Array} List of available themes
   */
  getAvailableThemes() {
    return Object.keys(themes).filter(key => typeof themes[key] === 'object');
  }
}

export default WebsiteBuilder;
