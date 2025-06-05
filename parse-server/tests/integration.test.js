const Parse = require('parse/node');
const nock = require('nock');
const IntegrationService = require('../src/services/IntegrationService');

describe('Integration System', () => {
  let adminUser;
  let testExtension;
  let testService;
  let testWebhook;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize()
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Integration Service
    await IntegrationService.initialize();

    // Create admin user
    const user = new Parse.User();
    user.set('username', 'adminuser');
    user.set('password', 'adminpass');
    user.set('email', 'admin@example.com');
    user.set('isAdmin', true);
    adminUser = await user.signUp();
  });

  describe('Extension Management', () => {
    beforeEach(() => {
      // Mock extension registry API
      nock('https://registry.example.com')
        .get('/extensions/test-extension')
        .reply(200, {
          id: 'test-extension',
          name: 'Test Extension',
          description: 'A test extension',
          author: 'Test Author',
          latest: '1.0.0',
          versions: {
            '1.0.0': {
              dependencies: {},
            },
          },
        })
        .get('/extensions/test-extension/download/1.0.0')
        .reply(200, Buffer.from('test extension files'));
    });

    it('should install extension successfully', async () => {
      const params = {
        extensionId: 'test-extension',
        version: '1.0.0',
        config: {
          setting1: 'value1',
        },
      };

      const result = await Parse.Cloud.run('installExtension', params);
      testExtension = result.extension;

      expect(result.success).toBe(true);
      expect(result.extension).toBeTruthy();
      expect(result.extension.name).toBe('Test Extension');
      expect(result.extension.version).toBe('1.0.0');
    });

    it('should validate extension dependencies', async () => {
      // Mock extension with dependencies
      nock('https://registry.example.com')
        .get('/extensions/dependent-extension')
        .reply(200, {
          id: 'dependent-extension',
          name: 'Dependent Extension',
          latest: '1.0.0',
          versions: {
            '1.0.0': {
              dependencies: {
                'missing-extension': '^1.0.0',
              },
            },
          },
        });

      const params = {
        extensionId: 'dependent-extension',
        version: '1.0.0',
      };

      await expect(Parse.Cloud.run('installExtension', params)).rejects.toThrow(
        'Missing dependencies'
      );
    });

    it('should handle extension status changes', async () => {
      const Extension = Parse.Object.extend('Extension');
      const extension = new Extension();
      extension.set('name', 'Status Test Extension');
      extension.set('version', '1.0.0');
      extension.set('status', 'active');

      await extension.save(null, { useMasterKey: true });

      // Change status to inactive
      extension.set('status', 'inactive');
      await extension.save(null, { useMasterKey: true });

      expect(IntegrationService.extensions.get(extension.id).status).toBe('inactive');
    });
  });

  describe('Service Connections', () => {
    beforeEach(() => {
      // Mock service test endpoint
      nock('https://api.example.com').post('/test-connection').reply(200);
    });

    it('should connect service successfully', async () => {
      const params = {
        service: 'test-service',
        credentials: {
          apiKey: 'test-key',
        },
        config: {
          setting1: 'value1',
        },
      };

      const result = await Parse.Cloud.run('connectService', params);
      testService = result.connection;

      expect(result.success).toBe(true);
      expect(result.connection).toBeTruthy();
      expect(result.connection.status).toBe('active');
    });

    it('should validate service credentials', async () => {
      // Mock failed connection test
      nock('https://api.example.com').post('/test-connection').reply(401);

      const params = {
        service: 'test-service',
        credentials: {
          apiKey: 'invalid-key',
        },
      };

      await expect(Parse.Cloud.run('connectService', params)).rejects.toThrow(
        'Connection test failed'
      );
    });

    it('should handle service status changes', async () => {
      const ServiceConnection = Parse.Object.extend('ServiceConnection');
      const connection = new ServiceConnection();
      connection.set('service', 'status-test-service');
      connection.set('status', 'active');

      await connection.save(null, { useMasterKey: true });

      // Change status to inactive
      connection.set('status', 'inactive');
      await connection.save(null, { useMasterKey: true });

      expect(IntegrationService.connections.get('status-test-service').status).toBe('inactive');
    });
  });

  describe('Webhook Management', () => {
    beforeEach(() => {
      // Mock webhook endpoint
      nock('https://webhook.example.com').options('/').reply(200).post('/').reply(200);
    });

    it('should register webhook successfully', async () => {
      const params = {
        event: 'test.event',
        url: 'https://webhook.example.com',
        secret: 'webhook-secret',
        config: {
          retries: 3,
        },
      };

      const result = await Parse.Cloud.run('registerWebhook', params);
      testWebhook = result.webhook;

      expect(result.success).toBe(true);
      expect(result.webhook).toBeTruthy();
      expect(result.webhook.status).toBe('active');
    });

    it('should validate webhook URL', async () => {
      // Mock invalid webhook URL
      nock('https://invalid-webhook.example.com').options('/').reply(404);

      const params = {
        event: 'test.event',
        url: 'https://invalid-webhook.example.com',
        secret: 'webhook-secret',
      };

      await expect(Parse.Cloud.run('registerWebhook', params)).rejects.toThrow(
        'Invalid webhook URL'
      );
    });

    it('should trigger webhooks successfully', async () => {
      const params = {
        event: 'test.event',
        data: {
          message: 'Test webhook trigger',
        },
      };

      const result = await Parse.Cloud.run('triggerWebhook', params);

      expect(result.success).toBe(true);
      expect(result.delivered).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });

    it('should handle webhook status changes', async () => {
      const Webhook = Parse.Object.extend('Webhook');
      const webhook = new Webhook();
      webhook.set('event', 'status.test');
      webhook.set('url', 'https://webhook.example.com');
      webhook.set('secret', 'test-secret');
      webhook.set('status', 'active');

      await webhook.save(null, { useMasterKey: true });

      // Change status to inactive
      webhook.set('status', 'inactive');
      await webhook.save(null, { useMasterKey: true });

      expect(IntegrationService.webhooks.get(webhook.id).status).toBe('inactive');
    });
  });

  afterEach(async () => {
    // Clean up test data
    const queries = [
      new Parse.Query('Extension'),
      new Parse.Query('ServiceConnection'),
      new Parse.Query('Webhook'),
    ];

    for (const query of queries) {
      const objects = await query.find({ useMasterKey: true });
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }

    // Clear all nock interceptors
    nock.cleanAll();
  });

  afterAll(async () => {
    // Clean up admin user
    await adminUser.destroy({ useMasterKey: true });
  });
});
