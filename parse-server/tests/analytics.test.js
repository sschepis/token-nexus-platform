const Parse = require('parse/node');
const AnalyticsService = require('../src/services/AnalyticsService');

describe('Analytics System', () => {
  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Analytics Service
    await AnalyticsService.initialize();
  });

  describe('Page View Tracking', () => {
    it('should track page views successfully', async () => {
      const pageViewData = {
        url: '/test-page',
        title: 'Test Page',
        referrer: 'https://example.com',
        userAgent: 'Mozilla/5.0',
        sessionId: 'test-session',
        userId: 'test-user',
        organizationId: 'test-org',
      };

      await Parse.Cloud.run('trackPageView', pageViewData);

      // Verify the page view was recorded
      const query = new Parse.Query('AnalyticsEvent');
      query.equalTo('type', 'pageView');
      query.equalTo('data.url', '/test-page');

      const result = await query.first({ useMasterKey: true });
      expect(result).toBeTruthy();
      expect(result.get('data').title).toBe('Test Page');
      expect(result.get('sessionId')).toBe('test-session');
    });
  });

  describe('Custom Event Tracking', () => {
    it('should track custom events successfully', async () => {
      const eventData = {
        name: 'button_click',
        properties: {
          buttonId: 'submit-form',
          page: '/contact',
        },
        sessionId: 'test-session',
        userId: 'test-user',
        organizationId: 'test-org',
      };

      await Parse.Cloud.run('trackEvent', eventData);

      // Verify the custom event was recorded
      const query = new Parse.Query('AnalyticsEvent');
      query.equalTo('type', 'custom');
      query.equalTo('data.name', 'button_click');

      const result = await query.first({ useMasterKey: true });
      expect(result).toBeTruthy();
      expect(result.get('data').properties.buttonId).toBe('submit-form');
    });
  });

  describe('Analytics Retrieval', () => {
    beforeEach(async () => {
      // Create some test data
      const AnalyticsEvent = Parse.Object.extend('AnalyticsEvent');
      const events = [
        new AnalyticsEvent({
          type: 'pageView',
          timestamp: new Date(),
          data: { url: '/page1', title: 'Page 1' },
          sessionId: 'test-session',
          userId: 'test-user',
          organizationId: 'test-org',
        }),
        new AnalyticsEvent({
          type: 'pageView',
          timestamp: new Date(),
          data: { url: '/page2', title: 'Page 2' },
          sessionId: 'test-session',
          userId: 'test-user',
          organizationId: 'test-org',
        }),
        new AnalyticsEvent({
          type: 'custom',
          timestamp: new Date(),
          data: { name: 'test_event', properties: {} },
          sessionId: 'test-session',
          userId: 'test-user',
          organizationId: 'test-org',
        }),
      ];

      await Parse.Object.saveAll(events, { useMasterKey: true });
    });

    it('should retrieve analytics data successfully', async () => {
      const params = {
        timeframe: '24h',
        metrics: ['pageViews', 'uniqueVisitors', 'topPages'],
        organizationId: 'test-org',
      };

      const analytics = await Parse.Cloud.run('getAnalytics', params);

      expect(analytics).toBeTruthy();
      expect(analytics.pageViews).toBeGreaterThan(0);
      expect(analytics.uniqueVisitors).toBeGreaterThan(0);
      expect(Array.isArray(analytics.topPages)).toBeTruthy();
    });

    it('should retrieve real-time analytics successfully', async () => {
      const params = {
        channel: 'stats',
      };

      const realTimeData = await Parse.Cloud.run('getRealTimeAnalytics', params);

      expect(realTimeData).toBeTruthy();
      expect(realTimeData.activeUsers).toBeGreaterThanOrEqual(0);
      expect(realTimeData.pageViews).toBeGreaterThanOrEqual(0);
      expect(realTimeData.events).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Aggregation', () => {
    it('should aggregate hourly statistics correctly', async () => {
      // Create test events
      const AnalyticsEvent = Parse.Object.extend('AnalyticsEvent');
      const events = [
        new AnalyticsEvent({
          type: 'pageView',
          timestamp: new Date(),
          data: { url: '/test', title: 'Test' },
          sessionId: 'test-session',
          userId: 'test-user',
          organizationId: 'test-org',
        }),
        new AnalyticsEvent({
          type: 'pageView',
          timestamp: new Date(),
          data: { url: '/test', title: 'Test' },
          sessionId: 'test-session',
          userId: 'test-user',
          organizationId: 'test-org',
        }),
      ];

      await Parse.Object.saveAll(events, { useMasterKey: true });

      // Wait for aggregation to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify hourly aggregation
      const query = new Parse.Query('HourlyAnalytics');
      query.equalTo('type', 'pageView');

      const result = await query.first({ useMasterKey: true });
      expect(result).toBeTruthy();
      expect(result.get('count')).toBeGreaterThanOrEqual(2);
      expect(result.get('data').urls['/test']).toBeGreaterThanOrEqual(2);
    });
  });

  afterEach(async () => {
    // Clean up test data
    const queries = [new Parse.Query('AnalyticsEvent'), new Parse.Query('HourlyAnalytics')];

    for (const query of queries) {
      const objects = await query.find({ useMasterKey: true });
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }
  });
});
