/**
 * Media Management Tests
 */

const fs = require('fs').promises;
const path = require('path');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  clearTestData,
  Parse,
} = require('./setup');

describe('Media Management', () => {
  let user;
  const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
  let testImageData;

  beforeAll(async () => {
    await setupTestEnvironment();
    // Create test image if it doesn't exist
    try {
      testImageData = await fs.readFile(testImagePath);
    } catch (error) {
      // Create a simple test image if fixture doesn't exist
      testImageData = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      await fs.mkdir(path.dirname(testImagePath), { recursive: true });
      await fs.writeFile(testImagePath, testImageData);
    }
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearTestData();
    user = await createTestUser();
  });

  describe('Media Upload', () => {
    test('should upload media successfully', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const result = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      expect(result.id).toBeDefined();
      expect(result.get('status')).toBe('processing');
      expect(result.get('file')).toBeDefined();
    });

    test('should validate file type', async () => {
      const file = new Parse.File('test.exe', { base64: 'SGVsbG8=' });

      await expect(
        Parse.Cloud.run('uploadMedia', {
          file,
          type: 'application/x-msdownload',
          name: 'Test Executable',
        })
      ).rejects.toThrow();
    });

    test('should validate file size', async () => {
      // Create large file that exceeds limit
      const largeData = Buffer.alloc(101 * 1024 * 1024); // 101MB
      const file = new Parse.File('large.jpg', { base64: largeData.toString('base64') });

      await expect(
        Parse.Cloud.run('uploadMedia', {
          file,
          type: 'image/jpeg',
          name: 'Large Image',
        })
      ).rejects.toThrow();
    });
  });

  describe('Media Processing', () => {
    test('should process image and generate variations', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      // Wait for processing to complete
      const query = new Parse.Query('CMSMedia');
      let processedMedia;
      for (let i = 0; i < 5; i++) {
        processedMedia = await query.get(media.id, { useMasterKey: true });
        if (processedMedia.get('status') === 'complete') break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      expect(processedMedia.get('status')).toBe('complete');
      expect(processedMedia.get('variations')).toBeDefined();
      expect(processedMedia.get('thumbnail')).toBeDefined();
    });

    test('should handle processing errors gracefully', async () => {
      // Create corrupted image data
      const corruptedData = Buffer.from('invalid image data');
      const file = new Parse.File('corrupted.jpg', { base64: corruptedData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Corrupted Image',
      });

      // Wait for processing to complete
      const query = new Parse.Query('CMSMedia');
      let processedMedia;
      for (let i = 0; i < 5; i++) {
        processedMedia = await query.get(media.id, { useMasterKey: true });
        if (processedMedia.get('status') === 'error') break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      expect(processedMedia.get('status')).toBe('error');
      expect(processedMedia.get('processingError')).toBeDefined();
    });
  });

  describe('Media Management', () => {
    test('should update media metadata', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      const result = await Parse.Cloud.run('updateMedia', {
        mediaId: media.id,
        name: 'Updated Name',
        alt: 'Alternative Text',
        caption: 'Image Caption',
      });

      expect(result.get('name')).toBe('Updated Name');
      expect(result.get('alt')).toBe('Alternative Text');
      expect(result.get('caption')).toBe('Image Caption');
    });

    test('should track media usage', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      // Create content using the media
      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Test Content',
        content: {
          body: 'Test content',
          media: media.id,
        },
        createdBy: user,
        organization: user,
      });
      await content.save(null, { useMasterKey: true });

      // Get updated media info
      const result = await Parse.Cloud.run('getMediaInfo', {
        mediaId: media.id,
      });

      expect(result.usageCount).toBe(1);
    });

    test('should prevent deletion of used media', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      // Create content using the media
      const content = new Parse.Object('CMSContent');
      content.set({
        title: 'Test Content',
        content: {
          body: 'Test content',
          media: media.id,
        },
        createdBy: user,
        organization: user,
      });
      await content.save(null, { useMasterKey: true });

      // Try to delete the media
      await expect(
        Parse.Cloud.run('deleteMedia', {
          mediaId: media.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Media Permissions', () => {
    test('should enforce user permissions', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      // Try to update media as different user
      const otherUser = await createTestUser();
      Parse.User.become(otherUser.getSessionToken());

      await expect(
        Parse.Cloud.run('updateMedia', {
          mediaId: media.id,
          name: 'Unauthorized Update',
        })
      ).rejects.toThrow();
    });

    test('should allow organization-wide access', async () => {
      const file = new Parse.File('test-image.jpg', { base64: testImageData.toString('base64') });

      const media = await Parse.Cloud.run('uploadMedia', {
        file,
        type: 'image/jpeg',
        name: 'Test Image',
      });

      // Create user in same organization
      const orgUser = await createTestUser();
      orgUser.set('organization', user.get('organization'));
      await orgUser.save(null, { useMasterKey: true });

      // Try to access media as organization user
      Parse.User.become(orgUser.getSessionToken());

      const result = await Parse.Cloud.run('getMediaInfo', {
        mediaId: media.id,
      });

      expect(result.id).toBe(media.id);
    });
  });
});
