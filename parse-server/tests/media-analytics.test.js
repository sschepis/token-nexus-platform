/**
 * Media Analytics Tests
 * Tests media analytics tracking and reporting
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const mediaAnalytics = require('../src/media/analytics');

describe('Media Analytics', () => {
  let user;
  let testMedia;
  let accessLogs = [];

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create test media
    testMedia = new Parse.Object('CMSMedia');
    testMedia.set({
      name: 'Test Media',
      type: 'image/jpeg',
      size: 1024,
      status: 'active',
    });
    await testMedia.save(null, { useMasterKey: true });

    // Create test access logs
    const contexts = ['website', 'mobile', 'email'];
    const types = ['view', 'download'];
    const devices = ['desktop', 'mobile', 'tablet'];
    const locations = ['US', 'UK', 'CA'];

    // Generate logs over the past 30 days
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const log = new Parse.Object('MediaAccessLog');
      log.set({
        media: testMedia,
        user: Math.random() > 0.5 ? user : null,
        type: types[Math.floor(Math.random() * types.length)],
        context: contexts[Math.floor(Math.random() * contexts.length)],
        metadata: {
          device: devices[Math.floor(Math.random() * devices.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          referrer: 'https://example.com',
        },
        timestamp,
      });
      accessLogs.push(log);
    }

    await Parse.Object.saveAll(accessLogs, { useMasterKey: true });
  });

  afterAll(async () => {
    // Clean up test data
    await Parse.Object.destroyAll(accessLogs, { useMasterKey: true });
    await testMedia.destroy({ useMasterKey: true });
    await teardownTestEnvironment();
  });

  describe('Access Tracking', () => {
    test('should track media access', async () => {
      const accessData = {
        mediaId: testMedia.id,
        userId: user.id,
        type: 'view',
        context: 'website',
        metadata: {
          device: 'desktop',
          location: 'US',
          referrer: 'https://example.com',
        },
      };

      await mediaAnalytics.trackAccess(accessData);

      // Verify access log was created
      const query = new Parse.Query('MediaAccessLog');
      query.equalTo('media', testMedia);
      query.equalTo('type', 'view');
      query.equalTo('context', 'website');
      query.descending('createdAt');

      const log = await query.first({ useMasterKey: true });
      expect(log).toBeDefined();
      expect(log.get('metadata')).toEqual(accessData.metadata);
    });

    test('should update access counters', async () => {
      const initialCounters = testMedia.get('counters') || {};
      const initialViews = initialCounters.views || 0;

      await mediaAnalytics.updateCounters(testMedia.id, 'view');

      const updatedMedia = await new Parse.Query('CMSMedia').get(testMedia.id, {
        useMasterKey: true,
      });
      const updatedCounters = updatedMedia.get('counters');

      expect(updatedCounters.views).toBe(initialViews + 1);
      expect(updatedCounters.total).toBeGreaterThan(initialCounters.total || 0);
    });
  });

  describe('Analytics Aggregation', () => {
    test('should aggregate analytics data', async () => {
      const analytics = await mediaAnalytics.aggregateAnalytics(testMedia.id);

      expect(analytics).toHaveProperty('views');
      expect(analytics).toHaveProperty('downloads');
      expect(analytics).toHaveProperty('uniqueUsers');
      expect(analytics).toHaveProperty('contexts');
      expect(analytics).toHaveProperty('timeRanges');
      expect(analytics).toHaveProperty('devices');
      expect(analytics).toHaveProperty('locations');
    });

    test('should cache and refresh analytics', async () => {
      // Get initial analytics
      const initial = await mediaAnalytics.getAnalytics(testMedia.id);

      // Add new access log
      await mediaAnalytics.trackAccess({
        mediaId: testMedia.id,
        userId: user.id,
        type: 'view',
        context: 'website',
      });

      // Get cached analytics
      const cached = await mediaAnalytics.getAnalytics(testMedia.id);
      expect(cached).toEqual(initial);

      // Get fresh analytics
      const fresh = await mediaAnalytics.getAnalytics(testMedia.id, { refresh: true });
      expect(fresh.views).toBeGreaterThan(initial.views);
    });
  });

  describe('Trending Media', () => {
    test('should get trending media', async () => {
      const trending = await mediaAnalytics.getTrendingMedia({
        timeRange: '24h',
        limit: 5,
      });

      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeLessThanOrEqual(5);
      trending.forEach(item => {
        expect(item).toHaveProperty('media');
        expect(item).toHaveProperty('count');
      });
    });

    test('should filter trending media by context', async () => {
      const trending = await mediaAnalytics.getTrendingMedia({
        timeRange: '24h',
        context: 'website',
      });

      trending.forEach(item => {
        const logs = accessLogs.filter(
          log => log.get('media').id === item.media.id && log.get('context') === 'website'
        );
        expect(logs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Analytics Reports', () => {
    test('should generate daily report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const report = await mediaAnalytics.generateReport({
        startDate,
        groupBy: 'day',
        metrics: ['views', 'downloads'],
      });

      expect(report).toHaveProperty('data');
      expect(Array.isArray(report.data)).toBe(true);
      expect(report.data[0]).toHaveProperty('views');
      expect(report.data[0]).toHaveProperty('downloads');
    });

    test('should generate filtered report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const report = await mediaAnalytics.generateReport({
        startDate,
        groupBy: 'day',
        metrics: ['views'],
        filters: {
          context: 'website',
          'metadata.device': 'desktop',
        },
      });

      report.data.forEach(day => {
        expect(day.views).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle different time groupings', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const report = await mediaAnalytics.generateReport({
        startDate,
        groupBy: 'month',
        metrics: ['views', 'downloads'],
      });

      expect(report.data.length).toBeLessThanOrEqual(4);
      report.data.forEach(month => {
        expect(month.objectId).toMatch(/^\d{4}-\d{2}$/);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid media ID', async () => {
      await expect(mediaAnalytics.getAnalytics('invalid-id')).rejects.toThrow();
    });

    test('should handle invalid time range', async () => {
      await expect(mediaAnalytics.getTrendingMedia({ timeRange: 'invalid' })).rejects.toThrow(
        'Invalid time range'
      );
    });

    test('should handle missing required report parameters', async () => {
      await expect(mediaAnalytics.generateReport({})).rejects.toThrow();
    });
  });
});
