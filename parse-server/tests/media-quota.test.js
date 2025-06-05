/**
 * Media Quota Tests
 * Tests quota management and usage tracking
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const quotaManager = require('../src/media/quota');
const config = require('../src/media/config');

describe('Media Quota Management', () => {
  let user;
  let organization;
  let testMedia = [];

  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test organization
    organization = new Parse.Object('Organization');
    organization.set({
      name: 'Test Org',
      subscriptionPlan: 'business',
    });
    await organization.save(null, { useMasterKey: true });

    // Create test user
    user = await createTestUser();
    user.set({
      organization,
      subscriptionPlan: 'pro',
    });
    await user.save(null, { useMasterKey: true });

    // Create test role
    const role = new Parse.Role('premium', new Parse.ACL());
    await role.save(null, { useMasterKey: true });
    await role.getUsers().add(user);
    await role.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    // Clean up test data
    await Parse.Object.destroyAll(testMedia, { useMasterKey: true });
    await organization.destroy({ useMasterKey: true });
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    // Clear quota cache
    quotaManager.cache.clear();
  });

  describe('User Quotas', () => {
    test('should calculate user quota', async () => {
      const quota = await quotaManager.getUserQuota(user.id);

      expect(quota).toHaveProperty('storage');
      expect(quota).toHaveProperty('bandwidth');
      expect(quota).toHaveProperty('files');
      expect(quota).toHaveProperty('remaining');
      expect(quota).toHaveProperty('exceeded');
    });

    test('should include role-based quota bonuses', async () => {
      const baseQuota = config.quotas.plans.pro;
      const roleBonus = config.quotas.roles.premium;
      const quota = await quotaManager.getUserQuota(user.id);

      expect(quota.storage).toBe(baseQuota.storage + roleBonus.storage);
      expect(quota.bandwidth).toBe(baseQuota.bandwidth + roleBonus.bandwidth);
      expect(quota.files).toBe(baseQuota.files + roleBonus.files);
    });

    test('should track media usage', async () => {
      const initialQuota = await quotaManager.getUserQuota(user.id);

      // Create test media
      const media = new Parse.Object('CMSMedia');
      media.set({
        owner: user,
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
      });
      await media.save(null, { useMasterKey: true });
      testMedia.push(media);

      // Track upload
      await quotaManager.trackUsage(user.id, {
        type: 'upload',
        size: media.get('size'),
      });

      // Wait for usage update
      await new Promise(resolve => setTimeout(resolve, config.performance.queue.interval + 100));

      const updatedQuota = await quotaManager.getUserQuota(user.id);
      expect(updatedQuota.storage).toBe(initialQuota.storage + media.get('size'));
      expect(updatedQuota.files).toBe(initialQuota.files + 1);
    });

    test('should enforce storage limits', async () => {
      const quota = await quotaManager.getUserQuota(user.id);
      const oversizedOperation = {
        type: 'upload',
        size: quota.remaining.storage + 1,
      };

      const result = await quotaManager.checkQuota(user.id, oversizedOperation);
      expect(result.allowed).toBe(false);
    });

    test('should track bandwidth usage', async () => {
      const initialQuota = await quotaManager.getUserQuota(user.id);
      const downloadSize = 1024 * 1024; // 1MB

      await quotaManager.trackUsage(user.id, {
        type: 'bandwidth',
        size: downloadSize,
      });

      // Wait for usage update
      await new Promise(resolve => setTimeout(resolve, config.performance.queue.interval + 100));

      const updatedQuota = await quotaManager.getUserQuota(user.id);
      expect(updatedQuota.bandwidth).toBe(initialQuota.bandwidth + downloadSize);
    });

    test('should reset bandwidth tracking', async () => {
      // Add some bandwidth usage
      await quotaManager.trackUsage(user.id, {
        type: 'bandwidth',
        size: 1024 * 1024,
      });

      await new Promise(resolve => setTimeout(resolve, config.performance.queue.interval + 100));

      // Reset bandwidth
      await quotaManager.resetBandwidth(user.id);

      const quota = await quotaManager.getUserQuota(user.id);
      expect(quota.bandwidth).toBe(0);
    });
  });

  describe('Organization Quotas', () => {
    test('should calculate organization quota', async () => {
      const quota = await quotaManager.getOrganizationQuota(organization.id);

      expect(quota).toHaveProperty('storage');
      expect(quota).toHaveProperty('bandwidth');
      expect(quota).toHaveProperty('files');
      expect(quota).toHaveProperty('users');
      expect(quota).toHaveProperty('remaining');
      expect(quota).toHaveProperty('exceeded');
    });

    test('should aggregate usage across organization users', async () => {
      // Create another org user
      const user2 = await createTestUser();
      user2.set({
        organization,
        subscriptionPlan: 'basic',
      });
      await user2.save(null, { useMasterKey: true });

      // Add media for both users
      const media1 = new Parse.Object('CMSMedia');
      media1.set({
        owner: user,
        size: 1024 * 1024,
      });
      await media1.save(null, { useMasterKey: true });
      testMedia.push(media1);

      const media2 = new Parse.Object('CMSMedia');
      media2.set({
        owner: user2,
        size: 2 * 1024 * 1024,
      });
      await media2.save(null, { useMasterKey: true });
      testMedia.push(media2);

      // Track usage for both users
      await quotaManager.trackUsage(user.id, {
        type: 'upload',
        size: media1.get('size'),
      });
      await quotaManager.trackUsage(user2.id, {
        type: 'upload',
        size: media2.get('size'),
      });

      // Wait for usage updates
      await new Promise(resolve => setTimeout(resolve, config.performance.queue.interval + 100));

      const orgQuota = await quotaManager.getOrganizationQuota(organization.id);
      expect(orgQuota.storage).toBe(media1.get('size') + media2.get('size'));
      expect(orgQuota.users).toBe(2);
    });
  });

  describe('Cache Management', () => {
    test('should cache quota calculations', async () => {
      // First call should calculate and cache
      const quota1 = await quotaManager.getUserQuota(user.id);
      expect(quotaManager.cache.has(user.id)).toBe(true);

      // Second call should use cache
      const quota2 = await quotaManager.getUserQuota(user.id);
      expect(quota1).toEqual(quota2);
    });

    test('should invalidate cache on usage updates', async () => {
      await quotaManager.getUserQuota(user.id);
      expect(quotaManager.cache.has(user.id)).toBe(true);

      await quotaManager.trackUsage(user.id, {
        type: 'bandwidth',
        size: 1024,
      });

      // Wait for usage update
      await new Promise(resolve => setTimeout(resolve, config.performance.queue.interval + 100));

      expect(quotaManager.cache.has(user.id)).toBe(false);
    });

    test('should clean up expired cache entries', async () => {
      await quotaManager.getUserQuota(user.id);
      expect(quotaManager.cache.has(user.id)).toBe(true);

      // Simulate cache expiration
      const entry = quotaManager.cache.get(user.id);
      entry.lastCalculated = new Date(Date.now() - config.performance.cache.duration * 2);
      quotaManager.cache.set(user.id, entry);

      quotaManager.cleanup();
      expect(quotaManager.cache.has(user.id)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user ID', async () => {
      await expect(quotaManager.getUserQuota('invalid-id')).rejects.toThrow();
    });

    test('should handle invalid operation type', async () => {
      await expect(quotaManager.checkQuota(user.id, { type: 'invalid' })).rejects.toThrow(
        'Unknown operation type: invalid'
      );
    });

    test('should handle missing organization', async () => {
      await expect(quotaManager.getOrganizationQuota('invalid-id')).rejects.toThrow();
    });
  });
});
