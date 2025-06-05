/**
 * Performance Tests
 * Tests system performance under various conditions
 */

const { setupTestEnvironment, teardownTestEnvironment, helpers, Parse } = require('./setup');

describe('Performance Tests', () => {
  let admin;
  let editor;
  const BATCH_SIZE = 100;

  beforeAll(async () => {
    await setupTestEnvironment();
    admin = await helpers.createUserWithRole('admin');
    editor = await helpers.createUserWithRole('editor');
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
  });

  describe('Content Operations', () => {
    test('should handle bulk content creation efficiently', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('basicPage');

      const startTime = Date.now();
      const contents = [];

      // Create content in batches
      for (let i = 0; i < BATCH_SIZE; i++) {
        contents.push(
          Parse.Cloud.run('createContent', {
            title: `Test Content ${i}`,
            content: {
              title: `Test Content ${i}`,
              content: `Content body ${i}`,
            },
            templateId: template.id,
          })
        );
      }

      await Promise.all(contents);
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(BATCH_SIZE * 100); // Less than 100ms per operation
      console.log(`Bulk content creation: ${duration}ms for ${BATCH_SIZE} items`);
    });

    test('should handle concurrent content updates efficiently', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('basicPage');

      // Create initial content
      const content = await Parse.Cloud.run('createContent', {
        title: 'Concurrent Test',
        content: {
          title: 'Concurrent Test',
          content: 'Initial content',
        },
        templateId: template.id,
      });

      const startTime = Date.now();
      const updates = [];

      // Perform concurrent updates
      for (let i = 0; i < 10; i++) {
        updates.push(
          Parse.Cloud.run('updateContent', {
            contentId: content.id,
            content: {
              title: 'Concurrent Test',
              content: `Update ${i}`,
            },
          })
        );
      }

      await Promise.all(updates);
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(1000); // Less than 1 second total
      console.log(`Concurrent updates: ${duration}ms for 10 updates`);
    });
  });

  describe('Media Operations', () => {
    test('should handle concurrent media uploads efficiently', async () => {
      Parse.User.become(editor.getSessionToken());
      const startTime = Date.now();
      const uploads = [];

      // Perform concurrent uploads
      for (let i = 0; i < 10; i++) {
        const file = new Parse.File(`test${i}.jpg`, {
          base64: Buffer.from('test').toString('base64'),
        });
        uploads.push(
          Parse.Cloud.run('uploadMedia', {
            file,
            type: 'image/jpeg',
            name: `Test Image ${i}`,
          })
        );
      }

      await Promise.all(uploads);
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(2000); // Less than 2 seconds total
      console.log(`Concurrent uploads: ${duration}ms for 10 uploads`);
    });
  });

  describe('Query Performance', () => {
    test('should handle large dataset queries efficiently', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('basicPage');

      // Create large dataset
      const contents = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        contents.push(
          Parse.Cloud.run('createContent', {
            title: `Test Content ${i}`,
            content: {
              title: `Test Content ${i}`,
              content: `Content body ${i}`,
            },
            templateId: template.id,
          })
        );
      }
      await Promise.all(contents);

      // Test query performance
      const startTime = Date.now();
      const query = new Parse.Query('CMSContent');
      query.limit(1000);
      query.include('template');

      const results = await query.find();
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(results.length).toBe(BATCH_SIZE);
      console.log(`Large dataset query: ${duration}ms for ${BATCH_SIZE} items`);
    });

    test('should handle complex queries efficiently', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('blogPost');

      // Create test data
      const contents = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        contents.push(
          Parse.Cloud.run('createContent', {
            title: `Post ${i}`,
            content: {
              title: `Post ${i}`,
              content: `Content ${i}`,
              categories: ['Test', i % 2 ? 'Even' : 'Odd'],
              tags: [`tag${i}`],
            },
            templateId: template.id,
          })
        );
      }
      await Promise.all(contents);

      const startTime = Date.now();

      // Perform complex query
      const query = new Parse.Query('CMSContent');
      query.matchesKeyInQuery(
        'title',
        'title',
        new Parse.Query('CMSContent').startsWith('title', 'Post').lessThan('createdAt', new Date())
      );
      query.include('template');
      query.include('createdBy');
      query.addAscending('createdAt');
      query.limit(50);

      const results = await query.find();
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(500); // Less than 500ms
      console.log(`Complex query: ${duration}ms`);
    });
  });

  describe('Cache Performance', () => {
    test('should improve query performance with caching', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('basicPage');

      // Create test content
      const content = await Parse.Cloud.run('createContent', {
        title: 'Cache Test',
        content: {
          title: 'Cache Test',
          content: 'Test content',
        },
        templateId: template.id,
      });

      // First query (uncached)
      const startTime1 = Date.now();
      const query1 = new Parse.Query('CMSContent');
      await query1.get(content.id);
      const duration1 = Date.now() - startTime1;

      // Second query (cached)
      const startTime2 = Date.now();
      const query2 = new Parse.Query('CMSContent');
      await query2.get(content.id);
      const duration2 = Date.now() - startTime2;

      // Verify cache performance
      expect(duration2).toBeLessThan(duration1);
      console.log(`Query performance improvement: ${duration1 - duration2}ms`);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent operations', async () => {
      Parse.User.become(editor.getSessionToken());
      const template = await helpers.createTemplate('basicPage');

      const startTime = Date.now();
      const operations = [];

      // Mix of different operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          // Create content
          Parse.Cloud.run('createContent', {
            title: `Concurrent Content ${i}`,
            content: {
              title: `Concurrent Content ${i}`,
              content: `Content body ${i}`,
            },
            templateId: template.id,
          }),
          // Upload media
          Parse.Cloud.run('uploadMedia', {
            file: new Parse.File(`test${i}.jpg`, {
              base64: Buffer.from('test').toString('base64'),
            }),
            type: 'image/jpeg',
            name: `Concurrent Image ${i}`,
          }),
          // Query content
          new Parse.Query('CMSContent').equalTo('title', `Concurrent Content ${i}`).find()
        );
      }

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Verify performance
      expect(duration).toBeLessThan(3000); // Less than 3 seconds total
      console.log(`Concurrent operations: ${duration}ms for 30 operations`);
    });
  });
});
