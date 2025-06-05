/**
 * Template Management Tests
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  clearTestData,
  Parse,
} = require('./setup');

describe('Template Management', () => {
  let user;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearTestData();
    user = await createTestUser();
  });

  describe('Template Creation', () => {
    test('should create template successfully', async () => {
      const result = await Parse.Cloud.run('createTemplate', {
        name: 'Blog Post',
        schema: {
          title: { type: 'String', required: true },
          subtitle: { type: 'String' },
          content: { type: 'Object', required: true },
          tags: { type: 'Array', items: { type: 'String' } },
        },
        defaultContent: {
          title: 'New Blog Post',
          content: { body: '' },
          tags: [],
        },
      });

      expect(result.id).toBeDefined();
      expect(result.get('name')).toBe('Blog Post');
      expect(result.get('schema')).toBeDefined();
      expect(result.get('isActive')).toBe(true);
    });

    test('should validate schema structure', async () => {
      await expect(
        Parse.Cloud.run('createTemplate', {
          name: 'Invalid Template',
          schema: {
            field: { invalidType: 'Unknown' },
          },
        })
      ).rejects.toThrow();
    });

    test('should generate slug from name', async () => {
      const result = await Parse.Cloud.run('createTemplate', {
        name: 'My Complex Template Name!',
        schema: {
          title: { type: 'String', required: true },
        },
      });

      expect(result.get('slug')).toBe('my-complex-template-name');
    });
  });

  describe('Template Inheritance', () => {
    test('should inherit parent template schema', async () => {
      // Create parent template
      const parent = await Parse.Cloud.run('createTemplate', {
        name: 'Base Page',
        schema: {
          title: { type: 'String', required: true },
          metadata: { type: 'Object' },
        },
      });

      // Create child template
      const child = await Parse.Cloud.run('createTemplate', {
        name: 'Product Page',
        schema: {
          price: { type: 'Number', required: true },
          description: { type: 'String' },
        },
        parent: parent.id,
      });

      // Child should have combined schema
      const childSchema = child.get('schema');
      expect(childSchema.title).toBeDefined();
      expect(childSchema.metadata).toBeDefined();
      expect(childSchema.price).toBeDefined();
      expect(childSchema.description).toBeDefined();
    });

    test('should override parent fields in child template', async () => {
      // Create parent template
      const parent = await Parse.Cloud.run('createTemplate', {
        name: 'Base Page',
        schema: {
          title: { type: 'String', required: false },
          content: { type: 'String' },
        },
      });

      // Create child template with overrides
      const child = await Parse.Cloud.run('createTemplate', {
        name: 'Required Page',
        schema: {
          title: { type: 'String', required: true }, // Override required
          content: { type: 'Object' }, // Override type
        },
        parent: parent.id,
      });

      const childSchema = child.get('schema');
      expect(childSchema.title.required).toBe(true);
      expect(childSchema.content.type).toBe('Object');
    });
  });

  describe('Template Updates', () => {
    test('should update template successfully', async () => {
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Initial Template',
        schema: {
          title: { type: 'String', required: true },
        },
      });

      const result = await Parse.Cloud.run('updateTemplate', {
        templateId: template.id,
        name: 'Updated Template',
        schema: {
          title: { type: 'String', required: true },
          description: { type: 'String' },
        },
      });

      expect(result.get('name')).toBe('Updated Template');
      expect(result.get('schema').description).toBeDefined();
    });

    test('should update associated content on schema change', async () => {
      // Create template
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Content Template',
        schema: {
          title: { type: 'String', required: true },
          oldField: { type: 'String' },
        },
      });

      // Create content using template
      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Test Content',
        content: {
          title: 'My Title',
          oldField: 'Old Value',
        },
        template: template,
        createdBy: user,
        organization: user,
      });
      await content.save(null, { useMasterKey: true });

      // Update template schema
      await Parse.Cloud.run('updateTemplate', {
        templateId: template.id,
        schema: {
          title: { type: 'String', required: true },
          newField: { type: 'String', default: 'Default Value' },
        },
      });

      // Check if content was updated
      const query = new Parse.Query('CMSContent');
      const updatedContent = await query.get(content.id, { useMasterKey: true });
      const contentData = updatedContent.get('content');

      expect(contentData.title).toBe('My Title');
      expect(contentData.newField).toBe('Default Value');
      expect(contentData.oldField).toBeUndefined();
    });
  });

  describe('Template Validation', () => {
    test('should validate content against template schema', async () => {
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Validated Template',
        schema: {
          title: { type: 'String', required: true, minLength: 5 },
          count: { type: 'Number', min: 0, max: 100 },
          tags: { type: 'Array', minItems: 1, maxItems: 5 },
        },
      });

      // Test invalid content
      const invalidContent = new Parse.Object('CMSContent');
      invalidContent.set({
        title: 'Test Content',
        content: {
          title: 'Short', // Too short
          count: 150, // Exceeds max
          tags: [], // No items
        },
        template: template,
        createdBy: user,
        organization: user,
      });

      await expect(invalidContent.save(null, { useMasterKey: true })).rejects.toThrow();

      // Test valid content
      const validContent = new Parse.Object('CMSContent');
      validContent.set({
        title: 'Test Content',
        content: {
          title: 'Valid Title',
          count: 50,
          tags: ['tag1'],
        },
        template: template,
        createdBy: user,
        organization: user,
      });

      await expect(validContent.save(null, { useMasterKey: true })).resolves.toBeDefined();
    });

    test('should handle complex nested schemas', async () => {
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Complex Template',
        schema: {
          header: {
            type: 'Object',
            required: true,
            schema: {
              title: { type: 'String', required: true },
              subtitle: { type: 'String' },
            },
          },
          sections: {
            type: 'Array',
            items: {
              type: 'Object',
              schema: {
                title: { type: 'String', required: true },
                content: { type: 'String', required: true },
              },
            },
          },
        },
      });

      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Complex Content',
        content: {
          header: {
            title: 'Main Title',
            subtitle: 'Optional Subtitle',
          },
          sections: [
            {
              title: 'Section 1',
              content: 'Section 1 content',
            },
            {
              title: 'Section 2',
              content: 'Section 2 content',
            },
          ],
        },
        template: template,
        createdBy: user,
        organization: user,
      });

      await expect(content.save(null, { useMasterKey: true })).resolves.toBeDefined();
    });
  });

  describe('Template Permissions', () => {
    test('should enforce template access control', async () => {
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Protected Template',
        schema: {
          title: { type: 'String', required: true },
        },
      });

      // Try to update template as different user
      const otherUser = await createTestUser();
      Parse.User.become(otherUser.getSessionToken());

      await expect(
        Parse.Cloud.run('updateTemplate', {
          templateId: template.id,
          name: 'Unauthorized Update',
        })
      ).rejects.toThrow();
    });

    test('should allow template use across organization', async () => {
      const template = await Parse.Cloud.run('createTemplate', {
        name: 'Shared Template',
        schema: {
          title: { type: 'String', required: true },
        },
      });

      // Create user in same organization
      const orgUser = await createTestUser();
      orgUser.set('organization', user.get('organization'));
      await orgUser.save(null, { useMasterKey: true });

      // Try to use template as organization user
      Parse.User.become(orgUser.getSessionToken());

      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Org Content',
        content: {
          title: 'Valid Title',
        },
        template: template,
        createdBy: orgUser,
        organization: orgUser,
      });

      await expect(content.save(null, { useMasterKey: true })).resolves.toBeDefined();
    });
  });
});
