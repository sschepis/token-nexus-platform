/**
 * Media Events Tests
 * Tests media event handling and webhooks
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const mediaEvents = require('../src/media/events');
const nock = require('nock');

describe('Media Events', () => {
  let user;
  let testMedia;
  let webhookUrl;

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();
    webhookUrl = 'https://webhook.test/media';

    // Create test media
    testMedia = new Parse.Object('CMSMedia');
    testMedia.set({
      name: 'Test Media',
      type: 'image/jpeg',
      size: 1024,
      status: 'pending',
    });
    await testMedia.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    // Reset nock before each test
    nock.cleanAll();
  });

  describe('Event Handling', () => {
    test('should handle media uploaded event', async () => {
      const uploadData = {
        mediaId: testMedia.id,
        userId: user.id,
        fileSize: 1024,
        type: 'image/jpeg',
      };

      // Mock webhook endpoint
      const webhook = nock('https://webhook.test').post('/media').reply(200);

      // Register webhook
      mediaEvents.registerWebhook('media.uploaded', webhookUrl);

      // Emit event
      await mediaEvents.emit('media.uploaded', uploadData);

      // Verify webhook was called
      expect(webhook.isDone()).toBe(true);

      // Verify media status update
      const media = await new Parse.Query('CMSMedia').get(testMedia.id, { useMasterKey: true });
      expect(media.get('status')).toBe('uploaded');
    });

    test('should handle media processed event', async () => {
      const processedData = {
        mediaId: testMedia.id,
        variants: {
          thumbnail: { url: 'thumbnail.jpg' },
          medium: { url: 'medium.jpg' },
        },
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('media.processed', webhookUrl);
      await mediaEvents.emit('media.processed', processedData);

      expect(webhook.isDone()).toBe(true);

      const media = await new Parse.Query('CMSMedia').get(testMedia.id, { useMasterKey: true });
      expect(media.get('status')).toBe('processed');
      expect(media.get('variants')).toEqual(processedData.variants);
    });

    test('should handle media deleted event', async () => {
      const deleteData = {
        mediaId: testMedia.id,
        userId: user.id,
        fileSize: 1024,
        cdnUrl: 'https://cdn.test/image.jpg',
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('media.deleted', webhookUrl);
      await mediaEvents.emit('media.deleted', deleteData);

      expect(webhook.isDone()).toBe(true);

      // Verify media was deleted
      const query = new Parse.Query('CMSMedia');
      await expect(query.get(testMedia.id)).rejects.toThrow();
    });

    test('should handle media accessed event', async () => {
      const accessData = {
        mediaId: testMedia.id,
        userId: user.id,
        accessType: 'view',
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('media.accessed', webhookUrl);
      await mediaEvents.emit('media.accessed', accessData);

      expect(webhook.isDone()).toBe(true);

      // Verify usage tracking
      const media = await new Parse.Query('CMSMedia').get(testMedia.id, { useMasterKey: true });
      const usage = media.get('usage') || {};
      expect(usage.views).toBeGreaterThan(0);
    });
  });

  describe('Webhook Management', () => {
    test('should register and unregister webhooks', () => {
      mediaEvents.registerWebhook('test.event', webhookUrl, {
        secret: 'test-secret',
        retries: 3,
      });

      expect(mediaEvents.webhooks.has('test.event')).toBe(true);
      expect(mediaEvents.webhooks.get('test.event').has(webhookUrl)).toBe(true);

      mediaEvents.unregisterWebhook('test.event', webhookUrl);
      expect(mediaEvents.webhooks.get('test.event').has(webhookUrl)).toBe(false);
    });

    test('should handle webhook failures and retries', async () => {
      const failCount = 2;
      let attempts = 0;

      const webhook = nock('https://webhook.test')
        .post('/media')
        .times(failCount)
        .reply(500)
        .post('/media')
        .reply(200, (uri, body) => {
          attempts++;
          return body;
        });

      mediaEvents.registerWebhook('test.event', webhookUrl, {
        retries: failCount,
      });

      await mediaEvents.emit('test.event', { test: true });

      expect(webhook.isDone()).toBe(true);
      expect(attempts).toBe(1);
    });

    test('should sign webhook payloads', async () => {
      const secret = 'test-secret';
      let receivedSignature;

      const webhook = nock('https://webhook.test')
        .post('/media')
        .reply(200, function () {
          receivedSignature = this.req.headers['x-webhook-signature'];
          return {};
        });

      mediaEvents.registerWebhook('test.event', webhookUrl, { secret });
      const payload = { test: true };
      await mediaEvents.emit('test.event', payload);

      expect(webhook.isDone()).toBe(true);
      expect(receivedSignature).toBeDefined();
      expect(receivedSignature).toBe(mediaEvents.generateSignature(payload, secret));
    });
  });

  describe('Error Handling', () => {
    test('should handle media processing errors', async () => {
      const errorData = {
        mediaId: testMedia.id,
        error: 'Processing failed',
        details: { reason: 'Invalid format' },
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('media.error', webhookUrl);
      await mediaEvents.emit('media.error', errorData);

      expect(webhook.isDone()).toBe(true);

      const media = await new Parse.Query('CMSMedia').get(testMedia.id, { useMasterKey: true });
      expect(media.get('status')).toBe('error');
      expect(media.get('error')).toEqual(errorData.error);
    });

    test('should handle quota exceeded events', async () => {
      const quotaData = {
        userId: user.id,
        quota: {
          limit: 1000000,
          used: 1000001,
          exceeded: true,
        },
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('media.quota.exceeded', webhookUrl);
      await mediaEvents.emit('media.quota.exceeded', quotaData);

      expect(webhook.isDone()).toBe(true);

      // Verify user notification
      const notifications = await new Parse.Query('Notification')
        .equalTo('user', user)
        .find({ useMasterKey: true });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].get('type')).toBe('quota_exceeded');
    });
  });

  describe('CDN Events', () => {
    test('should handle CDN cache invalidation', async () => {
      const cacheData = {
        url: 'https://cdn.test/image.jpg',
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('cdn.cache.invalidated', webhookUrl);
      await mediaEvents.emit('cdn.cache.invalidated', cacheData);

      expect(webhook.isDone()).toBe(true);
    });

    test('should handle CDN errors', async () => {
      const errorData = {
        url: 'https://cdn.test/image.jpg',
        error: 'Cache invalidation failed',
      };

      const webhook = nock('https://webhook.test').post('/media').reply(200);

      mediaEvents.registerWebhook('cdn.error', webhookUrl);
      await mediaEvents.emit('cdn.error', errorData);

      expect(webhook.isDone()).toBe(true);
    });
  });
});
