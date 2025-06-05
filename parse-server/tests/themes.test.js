/**
 * Theme Tests
 * Tests theme functionality in the website builder
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const WebsiteBuilder = require('../src/website-builder').default;
const themes = require('../src/website-builder/themes');

describe('Website Builder Themes', () => {
  let editor;
  let builder;
  let user;

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    // Initialize builder with test container
    builder = new WebsiteBuilder({
      container: document.createElement('div'),
      height: '900px',
    });
    editor = builder.initialize();
  });

  describe('Theme Registration', () => {
    test('should register default theme', () => {
      const defaultTheme = 'modern';
      themes.register(editor, defaultTheme);

      // Check if theme styles are applied
      const canvas = editor.Canvas.getBody();
      const computedStyle = window.getComputedStyle(canvas);

      expect(computedStyle.getPropertyValue('--primary-color')).toBeDefined();
      expect(computedStyle.getPropertyValue('--font-primary')).toBeDefined();
    });

    test('should switch themes', () => {
      // Start with modern theme
      themes.register(editor, 'modern');
      let canvas = editor.Canvas.getBody();
      let modernStyle = window.getComputedStyle(canvas);
      const modernPrimaryColor = modernStyle.getPropertyValue('--primary-color');

      // Switch to creative theme
      themes.register(editor, 'creative');
      canvas = editor.Canvas.getBody();
      let creativeStyle = window.getComputedStyle(canvas);
      const creativePrimaryColor = creativeStyle.getPropertyValue('--primary-color');

      expect(modernPrimaryColor).not.toBe(creativePrimaryColor);
    });

    test('should handle invalid theme name', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      themes.register(editor, 'nonexistent-theme');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Theme "nonexistent-theme" not found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Integration', () => {
    test('should apply theme to new content', async () => {
      themes.register(editor, 'modern');

      // Add content using theme classes
      editor.setComponents(`
        <div class="container">
          <h1>Test Title</h1>
          <p>Test content</p>
        </div>
      `);

      const html = editor.getHtml();
      expect(html).toContain('class="container"');
    });

    test('should preserve theme when saving content', async () => {
      themes.register(editor, 'creative');

      // Create content with theme
      editor.setComponents(`
        <div class="portfolio-grid">
          <div class="portfolio-item">Test Item</div>
        </div>
      `);

      // Save content
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: editor.getHtml(),
          css: editor.getCss(),
          components: editor.getComponents(),
          styles: editor.getStyle(),
        },
        metadata: {
          title: 'Theme Test',
          theme: 'creative',
        },
      });

      expect(page.get('metadata').theme).toBe('creative');
      expect(page.get('content').html).toContain('portfolio-grid');
    });

    test('should load content with correct theme', async () => {
      // Create content with minimal theme
      themes.register(editor, 'minimal');

      editor.setComponents(`
        <article class="post">
          <h1 class="post-title">Test Post</h1>
          <div class="post-content">Test content</div>
        </article>
      `);

      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: editor.getHtml(),
          css: editor.getCss(),
          components: editor.getComponents(),
          styles: editor.getStyle(),
        },
        metadata: {
          title: 'Minimal Post',
          theme: 'minimal',
        },
      });

      // Load content in new editor instance
      const newBuilder = new WebsiteBuilder({
        container: document.createElement('div'),
      });
      const newEditor = newBuilder.initialize();

      await Parse.Cloud.run('getWebsiteContent', {
        pageId: page.id,
      });

      const loadedHtml = newEditor.getHtml();
      expect(loadedHtml).toContain('post-title');
      expect(loadedHtml).toContain('post-content');
    });
  });

  describe('Theme Customization', () => {
    test('should allow custom CSS variables', () => {
      themes.register(editor, 'modern');

      // Override theme variables
      editor.setStyle(`
        :root {
          --primary-color: #ff0000;
          --secondary-color: #00ff00;
        }
      `);

      const css = editor.getCss();
      expect(css).toContain('--primary-color: #ff0000');
      expect(css).toContain('--secondary-color: #00ff00');
    });

    test('should preserve custom styles across theme switches', () => {
      // Start with modern theme
      themes.register(editor, 'modern');

      // Add custom styles
      editor.setStyle(`
        .custom-component {
          background: blue;
          padding: 20px;
        }
      `);

      // Switch theme
      themes.register(editor, 'creative');

      const css = editor.getCss();
      expect(css).toContain('.custom-component');
      expect(css).toContain('background: blue');
    });
  });

  describe('Theme Performance', () => {
    test('should handle rapid theme switching', () => {
      const themeNames = ['modern', 'creative', 'minimal'];

      // Switch themes rapidly
      themeNames.forEach(theme => {
        themes.register(editor, theme);
      });

      // Should still be responsive
      editor.setComponents('<div>Test content</div>');
      expect(editor.getHtml()).toContain('Test content');
    });

    test('should clean up previous theme resources', () => {
      const documentHeadSpy = jest.spyOn(document.head, 'appendChild');

      // Register and switch themes
      themes.register(editor, 'modern');
      themes.register(editor, 'creative');

      // Should only have current theme's resources
      const styleElements = document.head.getElementsByTagName('style');
      const linkElements = document.head.getElementsByTagName('link');

      expect(styleElements.length).toBeLessThanOrEqual(1);
      expect(linkElements.length).toBeLessThanOrEqual(themes.creative.fonts.length);

      documentHeadSpy.mockRestore();
    });
  });
});
