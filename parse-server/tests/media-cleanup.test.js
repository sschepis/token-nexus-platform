/**
 * Media Cleanup Tests
 * Tests automatic cleanup of media files and resources
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const mediaCleanup = require('../src/media/cleanup');
const config = require('../src/media/config');
const fs = require('fs').promises;
const path = require('path');

describe('Media Cleanup Service', () => {
  let user;
  let testMedia = [];
  let tempFiles = [];

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create temp directory if it doesn't exist
    try {
      await fs.mkdir(config.storage.local.tempDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await Parse.Object.destroyAll(testMedia, { useMasterKey: true });

    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.error(`Error cleaning up temp file ${file}:`, error);
      }
    }

    await teardownTestEnvironment();
  });

  beforeEach(() => {
    mediaCleanup.resetStats();
  });

  afterEach(() => {
    mediaCleanup.stop();
  });

  describe('Service Management', () => {
    test('should start and stop cleanup service', () => {
      expect(mediaCleanup.running).toBe(false);

      mediaCleanup.start();
      expect(mediaCleanup.running).toBe(true);

      mediaCleanup.stop();
      expect(mediaCleanup.running).toBe(false);
    });

    test('should schedule next cleanup', () => {
      mediaCleanup.start();
      expect(mediaCleanup.cleanupTimeout).toBeDefined();

      const nextRun = mediaCleanup.lastRun
        ? mediaCleanup.lastRun + config.cleanup.interval
        : Date.now() + config.cleanup.interval;

      expect(nextRun).toBeGreaterThan(Date.now());
    });
  });

  describe('Unused Media Cleanup', () => {
    test('should clean up unused media files', async () => {
      // Create unused media
      const unusedMedia = new Parse.Object('CMSMedia');
      unusedMedia.set({
        status: 'unused',
        lastAccessed: new Date(Date.now() - config.cleanup.unusedThreshold * 2),
        size: 1024,
        owner: user,
      });
      await unusedMedia.save(null, { useMasterKey: true });
      testMedia.push(unusedMedia);

      // Create active media
      const activeMedia = new Parse.Object('CMSMedia');
      activeMedia.set({
        status: 'active',
        lastAccessed: new Date(),
        size: 1024,
        owner: user,
      });
      await activeMedia.save(null, { useMasterKey: true });
      testMedia.push(activeMedia);

      await mediaCleanup.cleanupUnusedMedia();

      // Verify unused media was deleted
      const query = new Parse.Query('CMSMedia');
      const remaining = await query.find({ useMasterKey: true });
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(activeMedia.id);

      // Verify stats
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(1);
      expect(stats.bytesRecovered).toBe(1024);
    });
  });

  describe('Temporary Files Cleanup', () => {
    test('should clean up old temporary files', async () => {
      // Create temp files
      const oldFile = path.join(config.storage.local.tempDir, 'old-temp.txt');
      const newFile = path.join(config.storage.local.tempDir, 'new-temp.txt');

      await fs.writeFile(oldFile, 'old content');
      await fs.writeFile(newFile, 'new content');
      tempFiles.push(oldFile, newFile);

      // Set old file mtime
      const oldTime = new Date(Date.now() - config.cleanup.tempFileThreshold * 2);
      await fs.utimes(oldFile, oldTime, oldTime);

      await mediaCleanup.cleanupTempFiles();

      // Verify old file was deleted but new file remains
      await expect(fs.access(oldFile)).rejects.toThrow();
      await expect(fs.access(newFile)).resolves.toBeUndefined();
    });
  });

  describe('Expired Content Cleanup', () => {
    test('should clean up expired media', async () => {
      // Create expired media
      const expiredMedia = new Parse.Object('CMSMedia');
      expiredMedia.set({
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        size: 2048,
        owner: user,
      });
      await expiredMedia.save(null, { useMasterKey: true });
      testMedia.push(expiredMedia);

      // Create non-expired media
      const validMedia = new Parse.Object('CMSMedia');
      validMedia.set({
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        size: 2048,
        owner: user,
      });
      await validMedia.save(null, { useMasterKey: true });
      testMedia.push(validMedia);

      await mediaCleanup.cleanupExpiredContent();

      // Verify expired media was deleted
      const query = new Parse.Query('CMSMedia');
      const remaining = await query.find({ useMasterKey: true });
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(validMedia.id);

      // Verify stats
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(1);
      expect(stats.bytesRecovered).toBe(2048);
    });
  });

  describe('Orphaned Files Cleanup', () => {
    test('should clean up orphaned storage files', async () => {
      // Mock storage files list
      const mockFiles = [
        { path: 'valid.jpg', size: 1024 },
        { path: 'orphaned.jpg', size: 2048 },
      ];

      // Create media record for valid file
      const media = new Parse.Object('CMSMedia');
      media.set({
        file: { name: () => 'valid.jpg' },
        size: 1024,
        owner: user,
      });
      await media.save(null, { useMasterKey: true });
      testMedia.push(media);

      // Mock storage methods
      const originalListFiles = mediaCleanup.listStorageFiles;
      const originalDeleteFile = mediaCleanup.deleteStorageFile;

      mediaCleanup.listStorageFiles = jest.fn().mockResolvedValue(mockFiles);
      mediaCleanup.deleteStorageFile = jest.fn().mockResolvedValue();

      await mediaCleanup.cleanupOrphanedFiles();

      // Verify orphaned file was deleted
      expect(mediaCleanup.deleteStorageFile).toHaveBeenCalledWith('orphaned.jpg');
      expect(mediaCleanup.deleteStorageFile).not.toHaveBeenCalledWith('valid.jpg');

      // Verify stats
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(1);
      expect(stats.bytesRecovered).toBe(2048);

      // Restore original methods
      mediaCleanup.listStorageFiles = originalListFiles;
      mediaCleanup.deleteStorageFile = originalDeleteFile;
    });
  });

  describe('Error Handling', () => {
    test('should handle file deletion errors', async () => {
      // Create test media that will fail to delete
      const media = new Parse.Object('CMSMedia');
      media.set({
        status: 'unused',
        lastAccessed: new Date(Date.now() - config.cleanup.unusedThreshold * 2),
        size: 1024,
        owner: user,
      });
      await media.save(null, { useMasterKey: true });
      testMedia.push(media);

      // Mock destroy to throw error
      const originalDestroy = media.destroy;
      media.destroy = jest.fn().mockRejectedValue(new Error('Delete failed'));

      await mediaCleanup.cleanupUnusedMedia();

      // Verify stats weren't updated
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(0);
      expect(stats.bytesRecovered).toBe(0);

      // Restore original method
      media.destroy = originalDestroy;
    });

    test('should handle storage errors', async () => {
      // Mock storage error
      const originalListFiles = mediaCleanup.listStorageFiles;
      mediaCleanup.listStorageFiles = jest.fn().mockRejectedValue(new Error('Storage error'));

      await mediaCleanup.cleanupOrphanedFiles();

      // Verify stats weren't updated
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(0);
      expect(stats.bytesRecovered).toBe(0);

      // Restore original method
      mediaCleanup.listStorageFiles = originalListFiles;
    });
  });

  describe('Statistics', () => {
    test('should track cleanup statistics', async () => {
      // Create test media
      const media1 = new Parse.Object('CMSMedia');
      media1.set({
        status: 'unused',
        lastAccessed: new Date(Date.now() - config.cleanup.unusedThreshold * 2),
        size: 1024,
        owner: user,
      });
      await media1.save(null, { useMasterKey: true });
      testMedia.push(media1);

      const media2 = new Parse.Object('CMSMedia');
      media2.set({
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        size: 2048,
        owner: user,
      });
      await media2.save(null, { useMasterKey: true });
      testMedia.push(media2);

      // Run cleanup
      await mediaCleanup.runCleanup();

      // Verify stats
      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(2);
      expect(stats.bytesRecovered).toBe(3072);
      expect(stats.lastCleanup).toBeInstanceOf(Date);
      expect(stats.duration).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      mediaCleanup.stats = {
        filesDeleted: 10,
        bytesRecovered: 1024,
        lastCleanup: new Date(),
      };

      mediaCleanup.resetStats();

      const stats = mediaCleanup.getStats();
      expect(stats.filesDeleted).toBe(0);
      expect(stats.bytesRecovered).toBe(0);
      expect(stats.lastCleanup).toBeNull();
    });
  });
});
