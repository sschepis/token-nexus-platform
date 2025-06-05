/**
 * Utilities Tests
 */

const utils = require('../src/utils');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  clearTestData,
  Parse,
} = require('./setup');

describe('Utilities', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
    await utils.initialize();
  });

  afterAll(async () => {
    await utils.shutdown();
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('Logger', () => {
    test('should log messages with correct levels', () => {
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      utils.logger.info('Test info message', { metadata: { test: true } });
      utils.logger.error('Test error message', new Error('Test error'));

      expect(infoSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      infoSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test('should include request logging middleware', () => {
      expect(utils.logger.requestLogger).toBeDefined();
      expect(typeof utils.logger.requestLogger).toBe('function');
    });
  });

  describe('Validator', () => {
    test('should validate content against schema', () => {
      const schema = {
        title: { type: 'String', required: true },
        count: { type: 'Number', min: 0 },
      };

      const validContent = {
        title: 'Test',
        count: 5,
      };

      const invalidContent = {
        count: -1,
      };

      expect(() => utils.validator.validateContent(validContent, schema)).not.toThrow();

      expect(() => utils.validator.validateContent(invalidContent, schema)).toThrow();
    });

    test('should validate media files', () => {
      expect(() =>
        utils.validator.validateMedia({ name: 'test.jpg' }, 'image/jpeg', 1024)
      ).not.toThrow();

      expect(() =>
        utils.validator.validateMedia({ name: 'test.exe' }, 'application/x-msdownload', 1024)
      ).toThrow();
    });
  });

  describe('ACL Manager', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    test('should create ACL with correct permissions', () => {
      const acl = utils.acl.createACL(user, {
        publicRead: true,
        roles: ['editor'],
      });

      expect(acl.getPublicReadAccess()).toBe(true);
      expect(acl.getPublicWriteAccess()).toBe(false);
      expect(acl.getRoleReadAccess('editor')).toBe(true);
    });

    test('should check permissions correctly', async () => {
      await utils.acl.assignRole(user, 'content-editor');

      const hasPermission = await utils.acl.hasPermission(user, 'content:create');

      expect(hasPermission).toBe(true);
    });
  });

  describe('Cache Manager', () => {
    test('should cache and retrieve values', async () => {
      const key = 'test-key';
      const value = { test: true };

      await utils.cache.set(key, value);
      const cached = await utils.cache.get(key);

      expect(cached).toEqual(value);
    });

    test('should handle cache expiration', async () => {
      const key = 'expiring-key';
      const value = { test: true };

      await utils.cache.set(key, value, 1); // 1 second TTL
      await new Promise(resolve => setTimeout(resolve, 1100));
      const cached = await utils.cache.get(key);

      expect(cached).toBeNull();
    });

    test('should clear cache by pattern', async () => {
      await utils.cache.set('test:1', { id: 1 });
      await utils.cache.set('test:2', { id: 2 });
      await utils.cache.set('other:1', { id: 3 });

      await utils.cache.clear('test:*');

      expect(await utils.cache.get('test:1')).toBeNull();
      expect(await utils.cache.get('test:2')).toBeNull();
      expect(await utils.cache.get('other:1')).not.toBeNull();
    });
  });

  describe('Event Manager', () => {
    test('should emit and handle events', async () => {
      const handler = jest.fn();
      utils.events.on('test.event', handler);

      await utils.events.emit('test.event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should handle webhook registration', async () => {
      const webhook = await utils.events.registerWebhook(
        'https://example.com/webhook',
        ['content.published'],
        {
          secret: 'test-secret',
        }
      );

      expect(webhook.get('url')).toBe('https://example.com/webhook');
      expect(webhook.get('events')).toContain('content.published');
    });

    test('should validate webhook events', async () => {
      await expect(
        utils.events.registerWebhook('https://example.com/webhook', ['invalid.event'], {
          secret: 'test-secret',
        })
      ).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    test('should merge configurations correctly', () => {
      const config = utils.config.getConfig();

      expect(config.database.collectionPrefix).toBe('CMS_Test');
      expect(config.content.versioning.enabled).toBe(true);
      expect(config.webhooks.enabled).toBe(false);
    });

    test('should validate configuration', () => {
      expect(() =>
        utils.config.validateSection('cache', {
          enabled: true,
          storage: 'invalid',
        })
      ).toThrow();

      expect(() =>
        utils.config.validateSection('cache', {
          enabled: true,
          storage: 'memory',
        })
      ).not.toThrow();
    });
  });

  describe('Utility Integration', () => {
    test('should work together in typical workflow', async () => {
      // Create user and set up roles
      const user = await createTestUser();
      await utils.acl.assignRole(user, 'content-editor');

      // Create and cache content
      const content = {
        title: 'Test Content',
        body: 'Test body',
      };

      const key = `content:${user.id}`;
      await utils.cache.set(key, content);

      // Validate content
      const schema = {
        title: { type: 'String', required: true },
        body: { type: 'String', required: true },
      };

      utils.validator.validateContent(content, schema);

      // Emit event
      const eventHandler = jest.fn();
      utils.events.on('content.created', eventHandler);

      await utils.events.emit('content.created', {
        userId: user.id,
        content,
      });

      // Verify everything worked
      expect(await utils.cache.get(key)).toEqual(content);
      expect(await utils.acl.hasPermission(user, 'content:create')).toBe(true);
      expect(eventHandler).toHaveBeenCalled();
    });
  });
});
