/**
 * Content Management Tests
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  createTestTemplate,
  clearTestData,
  Parse,
} = require('./setup');

describe('Content Management', () => {
  let user;
  let template;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearTestData();
    user = await createTestUser();
    template = await createTestTemplate(user);
  });

  describe('Content Creation', () => {
    test('should create content successfully', async () => {
      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Test Content',
        content: { body: 'Test content body' },
        status: 'draft',
        template: template,
        createdBy: user,
        organization: user,
      });

      await content.save(null, { useMasterKey: true });
      expect(content.id).toBeDefined();
      expect(content.get('status')).toBe('draft');
    });

    test('should validate required fields', async () => {
      const content = new Parse.Object('CMSContent');
      content.set({
        content: { body: 'Test content body' },
        status: 'draft',
      });

      await expect(content.save(null, { useMasterKey: true })).rejects.toThrow();
    });

    test('should validate content against template schema', async () => {
      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Test Content',
        content: { invalidField: 'Invalid content' },
        status: 'draft',
        template: template,
        createdBy: user,
        organization: user,
      });

      await expect(content.save(null, { useMasterKey: true })).rejects.toThrow();
    });
  });

  describe('Content Publishing', () => {
    test('should publish content successfully', async () => {
      const content = await Parse.Cloud.run('createContent', {
        title: 'Test Content',
        content: {
          title: 'Test Title',
          body: 'Test content body',
        },
        templateId: template.id,
      });

      const result = await Parse.Cloud.run('publishContent', {
        contentId: content.id,
      });

      expect(result.get('status')).toBe('published');
      expect(result.get('publishedAt')).toBeDefined();
    });

    test('should handle scheduled publishing', async () => {
      const content = await Parse.Cloud.run('createContent', {
        title: 'Scheduled Content',
        content: {
          title: 'Test Title',
          body: 'Test content body',
        },
        templateId: template.id,
      });

      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + 1);

      const result = await Parse.Cloud.run('publishContent', {
        contentId: content.id,
        scheduledAt: scheduledDate.toISOString(),
      });

      expect(result.get('status')).toBe('scheduled');
      expect(result.get('scheduledAt')).toBeDefined();
    });
  });

  describe('Content Versioning', () => {
    test('should create new version on content update', async () => {
      const content = await Parse.Cloud.run('createContent', {
        title: 'Version Test',
        content: {
          title: 'Test Title',
          body: 'Original content',
        },
        templateId: template.id,
      });

      // Update content
      await Parse.Cloud.run('updateContent', {
        contentId: content.id,
        content: {
          title: 'Test Title',
          body: 'Updated content',
        },
      });

      const query = new Parse.Query('CMSContent');
      const updated = await query.get(content.id, { useMasterKey: true });

      expect(updated.get('version')).toBe(2);
      expect(updated.get('content').body).toBe('Updated content');
    });

    test('should maintain version history within limits', async () => {
      const content = await Parse.Cloud.run('createContent', {
        title: 'Version Test',
        content: {
          title: 'Test Title',
          body: 'Original content',
        },
        templateId: template.id,
      });

      // Create multiple versions
      for (let i = 0; i < 5; i++) {
        await Parse.Cloud.run('updateContent', {
          contentId: content.id,
          content: {
            title: 'Test Title',
            body: `Content version ${i + 2}`,
          },
        });
      }

      // Check version history
      const query = new Parse.Query('CMSContentVersion');
      query.equalTo('content', content);
      const versions = await query.find({ useMasterKey: true });

      // Should only keep 3 versions (configured in setup)
      expect(versions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Content Permissions', () => {
    test('should enforce user permissions', async () => {
      const otherUser = await createTestUser();
      const content = await Parse.Cloud.run('createContent', {
        title: 'Permission Test',
        content: {
          title: 'Test Title',
          body: 'Test content',
        },
        templateId: template.id,
      });

      // Try to update content as different user
      Parse.User.become(otherUser.getSessionToken());

      await expect(
        Parse.Cloud.run('updateContent', {
          contentId: content.id,
          content: {
            title: 'Test Title',
            body: 'Unauthorized update',
          },
        })
      ).rejects.toThrow();
    });

    test('should allow admin access', async () => {
      const adminUser = await createTestUser();
      await Parse.Cloud.run('assignRole', {
        userId: adminUser.id,
        role: 'cms-admin',
      });

      const content = await Parse.Cloud.run('createContent', {
        title: 'Admin Test',
        content: {
          title: 'Test Title',
          body: 'Test content',
        },
        templateId: template.id,
      });

      // Update content as admin
      Parse.User.become(adminUser.getSessionToken());

      const result = await Parse.Cloud.run('updateContent', {
        contentId: content.id,
        content: {
          title: 'Test Title',
          body: 'Admin update',
        },
      });

      expect(result.get('content').body).toBe('Admin update');
    });
  });
});
