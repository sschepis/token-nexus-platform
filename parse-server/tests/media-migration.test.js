/**
 * Media Migration Tests
 * Tests media migration, format conversion, and optimization
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const mediaMigration = require('../src/media/migration');
const config = require('../src/media/config');
const fs = require('fs').promises;
const path = require('path');

describe('Media Migration Service', () => {
  let user;
  let testMedia = [];
  let testFiles = [];

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create test image file
    const imageBuffer = await fs.readFile(path.join(__dirname, 'fixtures/test-image.jpg'));
    const imageFile = new Parse.File('test-image.jpg', { base64: imageBuffer.toString('base64') });
    await imageFile.save();
    testFiles.push(imageFile);

    // Create test media items
    const media1 = new Parse.Object('CMSMedia');
    media1.set({
      file: imageFile,
      type: 'image/jpeg',
      size: imageBuffer.length,
      owner: user,
      storage: 'parse',
    });
    await media1.save(null, { useMasterKey: true });
    testMedia.push(media1);

    // Create media with different formats and sizes
    for (let i = 0; i < 5; i++) {
      const media = new Parse.Object('CMSMedia');
      media.set({
        file: imageFile,
        type: 'image/jpeg',
        size: imageBuffer.length,
        owner: user,
        storage: 'parse',
        status: i % 2 === 0 ? 'active' : 'archived',
      });
      await media.save(null, { useMasterKey: true });
      testMedia.push(media);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await Parse.Object.destroyAll(testMedia, { useMasterKey: true });
    for (const file of testFiles) {
      await file.destroy({ useMasterKey: true });
    }
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    mediaMigration.resetProgress();
  });

  describe('Migration Management', () => {
    test('should validate migration options', () => {
      // Invalid type
      expect(() => {
        mediaMigration.validateOptions({ type: 'invalid' });
      }).toThrow('Unknown migration type');

      // Missing storage options
      expect(() => {
        mediaMigration.validateOptions({ type: 'storage' });
      }).toThrow('Source and target storage are required');

      // Invalid format options
      expect(() => {
        mediaMigration.validateOptions({
          type: 'format',
          source: 'invalid',
          target: 'invalid',
        });
      }).toThrow('Invalid format configuration');

      // Valid options
      expect(() => {
        mediaMigration.validateOptions({
          type: 'storage',
          source: 'parse',
          target: 'cloudinary',
        });
      }).not.toThrow();
    });

    test('should prevent concurrent migrations', async () => {
      mediaMigration.running = true;
      await expect(
        mediaMigration.startMigration({
          type: 'storage',
          source: 'parse',
          target: 'cloudinary',
        })
      ).rejects.toThrow('Migration already in progress');
    });
  });

  describe('Storage Migration', () => {
    test('should migrate media to new storage', async () => {
      const options = {
        type: 'storage',
        source: 'parse',
        target: 'cloudinary',
        filters: {
          status: 'active',
        },
      };

      // Mock storage methods
      const mockUpload = jest
        .spyOn(mediaMigration.mediaManager, 'uploadFile')
        .mockImplementation(async (buffer, opts) => {
          return new Parse.File(opts.filename, { base64: buffer.toString('base64') });
        });

      const results = await mediaMigration.startMigration(options);

      // Verify migration results
      expect(results.completed).toBeGreaterThan(0);
      expect(results.failed).toBe(0);
      expect(mockUpload).toHaveBeenCalled();

      // Verify media records were updated
      const query = new Parse.Query('CMSMedia');
      query.equalTo('status', 'active');
      const migratedMedia = await query.find({ useMasterKey: true });

      migratedMedia.forEach(media => {
        expect(media.get('storage')).toBe('cloudinary');
      });

      mockUpload.mockRestore();
    });

    test('should handle storage migration errors', async () => {
      const options = {
        type: 'storage',
        source: 'parse',
        target: 'cloudinary',
      };

      // Mock upload to fail
      const mockUpload = jest
        .spyOn(mediaMigration.mediaManager, 'uploadFile')
        .mockRejectedValue(new Error('Upload failed'));

      const results = await mediaMigration.startMigration(options);

      expect(results.failed).toBeGreaterThan(0);
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0].error).toBe('Upload failed');

      mockUpload.mockRestore();
    });
  });

  describe('Format Migration', () => {
    test('should convert media to new format', async () => {
      const options = {
        type: 'format',
        source: 'jpeg',
        target: 'webp',
        filters: {
          type: 'image/jpeg',
        },
      };

      // Mock conversion methods
      const mockConvert = jest
        .spyOn(mediaMigration.mediaManager, 'processImage')
        .mockImplementation(async buffer => ({
          buffer,
          metadata: { format: 'webp' },
        }));

      const results = await mediaMigration.startMigration(options);

      expect(results.completed).toBeGreaterThan(0);
      expect(results.failed).toBe(0);
      expect(mockConvert).toHaveBeenCalled();

      // Verify media records were updated
      const query = new Parse.Query('CMSMedia');
      query.equalTo('type', 'image/webp');
      const convertedMedia = await query.find({ useMasterKey: true });

      expect(convertedMedia.length).toBeGreaterThan(0);

      mockConvert.mockRestore();
    });

    test('should skip non-image files', async () => {
      // Create test document file
      const docFile = new Parse.File('test.pdf', { base64: 'test' });
      await docFile.save();
      testFiles.push(docFile);

      const docMedia = new Parse.Object('CMSMedia');
      docMedia.set({
        file: docFile,
        type: 'application/pdf',
        size: 4,
        owner: user,
      });
      await docMedia.save(null, { useMasterKey: true });
      testMedia.push(docMedia);

      const options = {
        type: 'format',
        source: 'jpeg',
        target: 'webp',
      };

      const results = await mediaMigration.startMigration(options);
      expect(results.skipped).toBeGreaterThan(0);
    });
  });

  describe('Optimization Migration', () => {
    test('should optimize media files', async () => {
      const options = {
        type: 'optimize',
        target: {
          quality: 80,
          maxWidth: 1920,
          maxHeight: 1080,
        },
      };

      // Mock optimization
      const mockOptimize = jest
        .spyOn(mediaMigration.mediaManager, 'processImage')
        .mockImplementation(async buffer => ({
          buffer: Buffer.from('optimized'),
          metadata: {
            width: 1920,
            height: 1080,
          },
        }));

      const results = await mediaMigration.startMigration(options);

      expect(results.completed).toBeGreaterThan(0);
      expect(results.failed).toBe(0);
      expect(mockOptimize).toHaveBeenCalled();

      // Verify media records were updated
      const query = new Parse.Query('CMSMedia');
      const optimizedMedia = await query.find({ useMasterKey: true });

      optimizedMedia.forEach(media => {
        const metadata = media.get('metadata');
        expect(metadata).toBeDefined();
        expect(metadata.width).toBeLessThanOrEqual(1920);
        expect(metadata.height).toBeLessThanOrEqual(1080);
      });

      mockOptimize.mockRestore();
    });
  });

  describe('Batch Processing', () => {
    test('should process media in batches', async () => {
      const options = {
        type: 'optimize',
        target: { quality: 80 },
        batchSize: 2,
      };

      let batchCount = 0;
      const mockOptimize = jest
        .spyOn(mediaMigration.mediaManager, 'processImage')
        .mockImplementation(async buffer => {
          batchCount++;
          return {
            buffer,
            metadata: { optimized: true },
          };
        });

      const results = await mediaMigration.startMigration(options);

      expect(results.completed).toBe(testMedia.length);
      expect(Math.ceil(results.total / 2)).toBe(Math.ceil(batchCount / 2));

      mockOptimize.mockRestore();
    });
  });

  describe('Dry Run', () => {
    test('should simulate migration without changes', async () => {
      const options = {
        type: 'storage',
        source: 'parse',
        target: 'cloudinary',
        dryRun: true,
      };

      const beforeState = await Promise.all(
        testMedia.map(media => media.fetch({ useMasterKey: true }))
      );

      const results = await mediaMigration.startMigration(options);

      const afterState = await Promise.all(
        testMedia.map(media => media.fetch({ useMasterKey: true }))
      );

      // Verify no changes were made
      beforeState.forEach((before, i) => {
        const after = afterState[i];
        expect(before.get('storage')).toBe(after.get('storage'));
        expect(before.get('file').url()).toBe(after.get('file').url());
      });

      // Verify progress was tracked
      expect(results.total).toBeGreaterThan(0);
      expect(results.completed).toBeGreaterThan(0);
    });
  });

  describe('Progress Tracking', () => {
    test('should track migration progress', async () => {
      const options = {
        type: 'optimize',
        target: { quality: 80 },
      };

      const migration = mediaMigration.startMigration(options);

      // Check initial progress
      let progress = mediaMigration.getProgress();
      expect(progress.running).toBe(true);
      expect(progress.total).toBeGreaterThan(0);
      expect(progress.completed).toBe(0);

      // Wait for migration to complete
      await migration;

      // Check final progress
      progress = mediaMigration.getProgress();
      expect(progress.running).toBe(false);
      expect(progress.completed).toBe(progress.total);
      expect(progress.timestamp).toBeInstanceOf(Date);
    });

    test('should reset progress', () => {
      mediaMigration.progress = {
        total: 10,
        completed: 5,
        failed: 2,
        skipped: 1,
      };
      mediaMigration.errors = [{ error: 'test error' }];

      mediaMigration.resetProgress();

      const progress = mediaMigration.getProgress();
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.skipped).toBe(0);
      expect(progress.errors).toHaveLength(0);
    });
  });
});
