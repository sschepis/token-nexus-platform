/**
 * Website Builder Tests
 * Tests GrapesJS integration and website management functionality
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');

describe('Website Builder', () => {
  let admin;
  let editor;
  let template;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    admin = await helpers.createUserWithRole('admin');
    editor = await helpers.createUserWithRole('editor');
  });

  describe('Page Management', () => {
    test('should create website page', async () => {
      Parse.User.become(editor.getSessionToken());

      const pageData = {
        content: {
          html: '<div>Test Page</div>',
          css: 'div { color: blue; }',
          components: [{ type: 'text', content: 'Test Page' }],
          styles: [{ selectors: ['div'], style: { color: 'blue' } }],
        },
        metadata: {
          title: 'Test Page',
          description: 'A test page',
          keywords: ['test', 'page'],
        },
      };

      const page = await Parse.Cloud.run('saveWebsiteContent', pageData);

      expect(page.id).toBeDefined();
      expect(page.get('content').html).toBe(pageData.content.html);
      expect(page.get('content').css).toBe(pageData.content.css);
      expect(page.get('metadata').title).toBe(pageData.metadata.title);
    });

    test('should update website page', async () => {
      Parse.User.become(editor.getSessionToken());

      // Create initial page
      const initialPage = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Initial Content</div>',
          css: 'div { color: red; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Initial Title',
        },
      });

      // Update page
      const updatedPage = await Parse.Cloud.run('saveWebsiteContent', {
        pageId: initialPage.id,
        content: {
          html: '<div>Updated Content</div>',
          css: 'div { color: green; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Updated Title',
        },
      });

      expect(updatedPage.id).toBe(initialPage.id);
      expect(updatedPage.get('content').html).toBe('<div>Updated Content</div>');
      expect(updatedPage.get('metadata').title).toBe('Updated Title');
    });

    test('should maintain version history', async () => {
      Parse.User.become(editor.getSessionToken());

      // Create page
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Version 1</div>',
          css: 'div { color: red; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Test Versions',
        },
      });

      // Make multiple updates
      const updates = ['<div>Version 2</div>', '<div>Version 3</div>', '<div>Version 4</div>'];

      for (const html of updates) {
        await Parse.Cloud.run('saveWebsiteContent', {
          pageId: page.id,
          content: {
            html,
            css: 'div { color: blue; }',
            components: [],
            styles: [],
          },
        });
      }

      // Check versions
      const query = new Parse.Query('CMSWebPageVersion');
      query.equalTo('page', page);
      query.ascending('version');

      const versions = await query.find({ useMasterKey: true });
      expect(versions.length).toBeGreaterThanOrEqual(3);
      expect(versions[0].get('content').html).toBe('<div>Version 1</div>');
    });
  });

  describe('Page Publishing', () => {
    test('should publish website page', async () => {
      Parse.User.become(editor.getSessionToken());

      // Create draft page
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Draft Content</div>',
          css: 'div { color: blue; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Draft Page',
        },
      });

      // Publish page
      const publishedPage = await Parse.Cloud.run('publishWebsitePage', {
        pageId: page.id,
      });

      expect(publishedPage.get('status')).toBe('published');
      expect(publishedPage.get('publishedAt')).toBeDefined();
      expect(publishedPage.get('publishedBy').id).toBe(editor.id);
    });

    test('should handle scheduled publishing', async () => {
      Parse.User.become(editor.getSessionToken());

      // Create page
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Scheduled Content</div>',
          css: 'div { color: blue; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Scheduled Page',
        },
      });

      // Schedule publication
      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + 1);

      const scheduledPage = await Parse.Cloud.run('publishWebsitePage', {
        pageId: page.id,
        scheduledAt: scheduledDate.toISOString(),
      });

      expect(scheduledPage.get('status')).toBe('scheduled');
      expect(scheduledPage.get('scheduledAt')).toBeDefined();
    });
  });

  describe('Access Control', () => {
    test('should enforce page permissions', async () => {
      // Create page as editor
      Parse.User.become(editor.getSessionToken());
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Protected Content</div>',
          css: 'div { color: blue; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Protected Page',
        },
      });

      // Try to update as different user
      const otherUser = await createTestUser();
      Parse.User.become(otherUser.getSessionToken());

      await expect(
        Parse.Cloud.run('saveWebsiteContent', {
          pageId: page.id,
          content: {
            html: '<div>Unauthorized Update</div>',
            css: 'div { color: red; }',
            components: [],
            styles: [],
          },
        })
      ).rejects.toThrow();
    });

    test('should allow organization-wide access', async () => {
      // Create page as editor
      Parse.User.become(editor.getSessionToken());
      const page = await Parse.Cloud.run('saveWebsiteContent', {
        content: {
          html: '<div>Organization Content</div>',
          css: 'div { color: blue; }',
          components: [],
          styles: [],
        },
        metadata: {
          title: 'Organization Page',
        },
      });

      // Access as organization member
      const orgUser = await createTestUser();
      orgUser.set('organization', editor.get('organization'));
      await orgUser.save(null, { useMasterKey: true });

      Parse.User.become(orgUser.getSessionToken());
      const result = await Parse.Cloud.run('getWebsiteContent', {
        pageId: page.id,
      });

      expect(result.id).toBe(page.id);
    });
  });
});
