const Parse = require('parse/node');
const SecurityService = require('../src/services/SecurityService');

describe('Security System', () => {
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Security Service
    await SecurityService.initialize();

    // Create test users
    const user = new Parse.User();
    user.set('username', 'testuser');
    user.set('password', 'Test123!@#');
    user.set('email', 'test@example.com');
    testUser = await user.signUp();

    const admin = new Parse.User();
    admin.set('username', 'adminuser');
    admin.set('password', 'Admin123!@#');
    admin.set('email', 'admin@example.com');
    admin.set('isAdmin', true);
    adminUser = await admin.signUp();
  });

  describe('MFA Configuration', () => {
    it('should configure TOTP MFA successfully', async () => {
      const params = {
        method: 'totp',
        enabled: true,
      };

      const result = await Parse.Cloud.run('configureMFA', params);

      expect(result.success).toBe(true);
      expect(result.secret).toBeTruthy();

      // Verify MFA settings were saved
      const query = new Parse.Query('MFASettings');
      query.equalTo('userId', testUser.id);
      const settings = await query.first({ useMasterKey: true });

      expect(settings).toBeTruthy();
      expect(settings.get('method')).toBe('totp');
      expect(settings.get('enabled')).toBe(true);
    });

    it('should verify MFA token correctly', async () => {
      // Get user's TOTP secret
      const query = new Parse.Query('MFASettings');
      query.equalTo('userId', testUser.id);
      const settings = await query.first({ useMasterKey: true });
      const secret = settings.get('totpSecret');

      // Generate test token (in real scenario, this would be from authenticator app)
      const testToken = '123456'; // Mock token

      const result = await Parse.Cloud.run('verifyMFAToken', {
        token: testToken,
        method: 'totp',
      });

      expect(result).toBeTruthy();
      expect(result.factors).toContain('totp');
    });
  });

  describe('WAF Rules', () => {
    it('should add WAF rule successfully', async () => {
      Parse.User.become(adminUser.getSessionToken());

      const params = {
        name: 'test_rule',
        rule: {
          condition: req => {
            return !req.url.includes('malicious');
          },
          critical: true,
        },
      };

      const result = await Parse.Cloud.run('addWAFRule', params);
      expect(result.success).toBe(true);

      // Verify rule was added
      const rules = SecurityService.rules;
      expect(rules.has('test_rule')).toBe(true);
    });

    it('should block requests that violate WAF rules', async () => {
      const maliciousRequest = {
        url: '/api/malicious',
        body: {},
        headers: {},
      };

      const result = SecurityService.validateRequest(maliciousRequest);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('test_rule');
      expect(result.action).toBe('block');
    });
  });

  describe('IP Management', () => {
    it('should update IP blacklist successfully', async () => {
      Parse.User.become(adminUser.getSessionToken());

      const params = {
        ip: '192.168.1.1',
        block: true,
      };

      const result = await Parse.Cloud.run('updateIPBlacklist', params);
      expect(result.success).toBe(true);

      // Verify IP was blacklisted
      const request = {
        ip: '192.168.1.1',
        url: '/api/test',
        body: {},
        headers: {},
      };

      const validation = SecurityService.validateRequest(request);
      expect(validation.passed).toBe(false);
      expect(validation.violations).toContain('ip_blacklisted');
    });

    it('should update IP whitelist successfully', async () => {
      Parse.User.become(adminUser.getSessionToken());

      const params = {
        ip: '192.168.1.2',
        allow: true,
      };

      const result = await Parse.Cloud.run('updateIPWhitelist', params);
      expect(result.success).toBe(true);

      // Verify IP was whitelisted
      const request = {
        ip: '192.168.1.2',
        url: '/api/test',
        body: {},
        headers: {},
      };

      const validation = SecurityService.validateRequest(request);
      expect(validation.passed).toBe(true);
    });
  });

  describe('Content Security', () => {
    it('should sanitize HTML content', async () => {
      const Content = Parse.Object.extend('Content');
      const content = new Content();
      content.set('title', 'Test Content');
      content.set('body', '<p>Safe content</p><script>alert("xss")</script>');

      await content.save(null, { useMasterKey: true });

      // Verify content was sanitized
      expect(content.get('body')).toBe('<p>Safe content</p>');
      expect(content.get('body')).not.toContain('<script>');
    });

    it('should validate password strength', async () => {
      const user = new Parse.User();
      user.set('username', 'weakuser');
      user.set('email', 'weak@example.com');
      user.set('password', 'weak');

      await expect(user.signUp()).rejects.toThrow('Password does not meet security requirements');
    });
  });

  describe('Session Management', () => {
    it('should handle session IP binding', async () => {
      // Enable IP binding
      SecurityService.config.authentication.session.ipBinding = true;

      // Create session
      const user = await Parse.User.logIn('testuser', 'Test123!@#');
      const session = await new Parse.Query(Parse.Session)
        .equalTo('sessionToken', user.getSessionToken())
        .first({ useMasterKey: true });

      expect(session.get('ip')).toBeTruthy();
    });

    it('should validate session with IP binding', async () => {
      const session = await new Parse.Query(Parse.Session)
        .equalTo('sessionToken', testUser.getSessionToken())
        .first({ useMasterKey: true });

      // Test with matching IP
      const validRequest = {
        ip: session.get('ip'),
        headers: {
          'x-parse-session-token': testUser.getSessionToken(),
        },
      };

      const validResult = await SecurityService._validateSession(testUser, validRequest);
      expect(validResult).toBe(true);

      // Test with different IP
      const invalidRequest = {
        ip: '1.2.3.4',
        headers: {
          'x-parse-session-token': testUser.getSessionToken(),
        },
      };

      const invalidResult = await SecurityService._validateSession(testUser, invalidRequest);
      expect(invalidResult).toBe(false);
    });
  });

  afterEach(async () => {
    // Clean up test data
    const queries = [new Parse.Query('MFASettings'), new Parse.Query('Content')];

    for (const query of queries) {
      const objects = await query.find({ useMasterKey: true });
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }

    // Reset security settings
    SecurityService.rules.clear();
    SecurityService.blacklist.clear();
    SecurityService.whitelist.clear();
    SecurityService.config.authentication.session.ipBinding = false;
  });

  afterAll(async () => {
    // Clean up test users
    await testUser.destroy({ useMasterKey: true });
    await adminUser.destroy({ useMasterKey: true });
  });
});
