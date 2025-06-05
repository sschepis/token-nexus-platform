/**
 * Media Management Tests
 * Tests media handling functionality
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

describe('Media Management', () => {
  let user;
  let testImage;
  let testVideo;

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create test media files
    testImage = {
      name: 'test-image.jpg',
      type: 'image/jpeg',
      data: await fs.promises.readFile(path.join(__dirname, 'fixtures/test-image.jpg')),
    };

    testVideo = {
      name: 'test-video.mp4',
      type: 'video/mp4',
      data: await fs.promises.readFile(path.join(__dirname, 'fixtures/test-video.mp4')),
    };
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
  });

  describe('Image Processing', () => {
    test('should optimize image on upload', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        optimize: true,
      });

      await media.save(null, { useMasterKey: true });

      // Get optimized image data
      const optimizedFile = media.get('file');
      const optimizedData = await optimizedFile.getData();

      // Check if image was optimized
      const originalSize = testImage.data.length;
      const optimizedSize = optimizedData.length;
      expect(optimizedSize).toBeLessThan(originalSize);
    });

    test('should generate image variants', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        variants: {
          thumbnail: { width: 150, height: 150 },
          medium: { width: 800, height: 600 },
        },
      });

      await media.save(null, { useMasterKey: true });

      // Check if variants were created
      const variants = media.get('variants');
      expect(variants.thumbnail).toBeDefined();
      expect(variants.medium).toBeDefined();

      // Verify thumbnail dimensions
      const thumbnailData = await Parse.Cloud.httpRequest({ url: variants.thumbnail.url });
      const thumbnailMetadata = await sharp(thumbnailData.buffer).metadata();
      expect(thumbnailMetadata.width).toBe(150);
      expect(thumbnailMetadata.height).toBe(150);
    });

    test('should handle image metadata', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        extractMetadata: true,
      });

      await media.save(null, { useMasterKey: true });

      const metadata = media.get('metadata');
      expect(metadata).toBeDefined();
      expect(metadata.width).toBeDefined();
      expect(metadata.height).toBeDefined();
      expect(metadata.format).toBeDefined();
    });
  });

  describe('Video Processing', () => {
    test('should generate video thumbnail', async () => {
      const file = new Parse.File(testVideo.name, { base64: testVideo.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testVideo.type,
        name: 'Test Video',
        generateThumbnail: true,
      });

      await media.save(null, { useMasterKey: true });

      const thumbnail = media.get('thumbnail');
      expect(thumbnail).toBeDefined();
      expect(thumbnail.url).toBeDefined();
    });

    test('should transcode video', async () => {
      const file = new Parse.File(testVideo.name, { base64: testVideo.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testVideo.type,
        name: 'Test Video',
        transcode: {
          format: 'mp4',
          quality: 'medium',
        },
      });

      await media.save(null, { useMasterKey: true });

      const transcoded = media.get('transcoded');
      expect(transcoded).toBeDefined();
      expect(transcoded.url).toBeDefined();
      expect(transcoded.format).toBe('mp4');
    });

    test('should extract video metadata', async () => {
      const file = new Parse.File(testVideo.name, { base64: testVideo.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testVideo.type,
        name: 'Test Video',
        extractMetadata: true,
      });

      await media.save(null, { useMasterKey: true });

      const metadata = media.get('metadata');
      expect(metadata).toBeDefined();
      expect(metadata.duration).toBeDefined();
      expect(metadata.dimensions).toBeDefined();
      expect(metadata.format).toBeDefined();
    });
  });

  describe('Media Library', () => {
    test('should track media usage', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
      });

      await media.save(null, { useMasterKey: true });

      // Simulate media usage
      await Parse.Cloud.run('trackMediaUsage', {
        mediaId: media.id,
        context: 'website',
        page: 'home',
      });

      const usage = media.get('usage');
      expect(usage).toBeDefined();
      expect(usage.count).toBeGreaterThan(0);
      expect(usage.contexts).toContain('website');
    });

    test('should organize media in folders', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        folder: '/images/products',
      });

      await media.save(null, { useMasterKey: true });

      const query = new Parse.Query('CMSMedia');
      query.equalTo('folder', '/images/products');
      const results = await query.find({ useMasterKey: true });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(media.id);
    });

    test('should handle media tags', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        tags: ['product', 'featured'],
      });

      await media.save(null, { useMasterKey: true });

      const query = new Parse.Query('CMSMedia');
      query.containedIn('tags', ['featured']);
      const results = await query.find({ useMasterKey: true });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(media.id);
    });
  });

  describe('CDN Integration', () => {
    test('should serve media through CDN', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        useCDN: true,
      });

      await media.save(null, { useMasterKey: true });

      const cdnUrl = media.get('cdnUrl');
      expect(cdnUrl).toBeDefined();
      expect(cdnUrl).toContain(process.env.CDN_DOMAIN);
    });

    test('should handle CDN cache invalidation', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        useCDN: true,
      });

      await media.save(null, { useMasterKey: true });

      // Update media
      media.set('name', 'Updated Test Image');
      await media.save(null, { useMasterKey: true });

      const cacheStatus = media.get('cdnCacheStatus');
      expect(cacheStatus).toBe('invalidated');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid image files', async () => {
      const invalidData = Buffer.from('invalid image data');
      const file = new Parse.File('invalid.jpg', { base64: invalidData.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: 'image/jpeg',
        name: 'Invalid Image',
      });

      await expect(media.save(null, { useMasterKey: true })).rejects.toThrow();
    });

    test('should handle processing errors', async () => {
      const file = new Parse.File(testImage.name, { base64: testImage.data.toString('base64') });
      const media = new Parse.Object('CMSMedia');
      media.set({
        file,
        type: testImage.type,
        name: 'Test Image',
        variants: {
          invalid: { width: -100 }, // Invalid dimensions
        },
      });

      await expect(media.save(null, { useMasterKey: true })).rejects.toThrow();
    });
  });
});
