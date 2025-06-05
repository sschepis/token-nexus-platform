const Parse = require('parse/node');

describe('AI Assistant Settings', () => {
  let testUser;
  let testOrg;

  beforeEach(async () => {
    // Create test user
    testUser = new Parse.User();
    testUser.set('username', `testuser_${Date.now()}`);
    testUser.set('password', 'password123');
    testUser.set('email', `test_${Date.now()}@example.com`);
    await testUser.signUp();

    // Create test organization
    const Organization = Parse.Object.extend('Organization');
    testOrg = new Organization();
    testOrg.set('name', `Test Org ${Date.now()}`);
    testOrg.set('owner', testUser);
    await testOrg.save(null, { useMasterKey: true });
  });

  afterEach(async () => {
    // Clean up
    if (testUser) {
      await testUser.destroy({ useMasterKey: true });
    }
    if (testOrg) {
      await testOrg.destroy({ useMasterKey: true });
    }
  });

  test('should get default AI assistant settings for new user', async () => {
    const result = await Parse.Cloud.run('getAIAssistantSettings', {}, {
      user: testUser
    });

    expect(result).toBeDefined();
    expect(result.provider).toBe('deepseek');
    expect(result.model).toBe('deepseek-chat');
    expect(result.maxTokens).toBe(4000);
    expect(result.temperature).toBe(0.7);
    expect(result.conversationRetention).toBe(30);
    expect(result.actionPermissions).toEqual({
      fileOperations: true,
      webSearch: true,
      codeExecution: false,
      dataAnalysis: true,
      integrations: false
    });
    expect(result.privacySettings).toEqual({
      shareConversations: false,
      allowAnalytics: true,
      dataRetention: 90
    });
  });

  test('should update AI assistant settings', async () => {
    const newSettings = {
      provider: 'deepseek',
      model: 'deepseek-coder',
      maxTokens: 2000,
      temperature: 0.5,
      conversationRetention: 60,
      actionPermissions: {
        fileOperations: false,
        webSearch: true,
        codeExecution: true,
        dataAnalysis: true,
        integrations: true
      },
      privacySettings: {
        shareConversations: true,
        allowAnalytics: false,
        dataRetention: 30
      }
    };

    const result = await Parse.Cloud.run('updateAIAssistantSettings', newSettings, {
      user: testUser
    });

    expect(result.success).toBe(true);

    // Verify settings were saved
    const savedSettings = await Parse.Cloud.run('getAIAssistantSettings', {}, {
      user: testUser
    });

    expect(savedSettings.provider).toBe('deepseek');
    expect(savedSettings.model).toBe('deepseek-coder');
    expect(savedSettings.maxTokens).toBe(2000);
    expect(savedSettings.temperature).toBe(0.5);
    expect(savedSettings.conversationRetention).toBe(60);
    expect(savedSettings.actionPermissions.codeExecution).toBe(true);
    expect(savedSettings.privacySettings.shareConversations).toBe(true);
  });

  test('should validate settings before saving', async () => {
    const invalidSettings = {
      provider: 'invalid-provider',
      maxTokens: -100,
      temperature: 2.5
    };

    await expect(
      Parse.Cloud.run('updateAIAssistantSettings', invalidSettings, {
        user: testUser
      })
    ).rejects.toThrow();
  });

  test('should get organization AI settings', async () => {
    const result = await Parse.Cloud.run('getOrganizationAISettings', {
      organizationId: testOrg.id
    }, {
      user: testUser
    });

    expect(result).toBeDefined();
    expect(result.enabled).toBe(true);
    expect(result.allowedProviders).toEqual(['anthropic', 'openai']);
    expect(result.maxTokensPerRequest).toBe(8000);
    expect(result.maxRequestsPerDay).toBe(1000);
  });

  test('should track AI usage', async () => {
    const usageData = {
      provider: 'deepseek',
      model: 'deepseek-chat',
      tokens: 150,
      cost: 0.0001,
      latency: 800,
      success: true
    };

    const result = await Parse.Cloud.run('getAIAssistantUsage', {
      period: 'day',
      ...usageData
    }, {
      user: testUser
    });

    expect(result).toBeDefined();
    expect(result.totalTokens).toBeGreaterThanOrEqual(0);
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.requestCount).toBeGreaterThanOrEqual(0);
  });

  test('should log settings changes', async () => {
    const newSettings = {
      provider: 'openai',
      model: 'gpt-4'
    };

    await Parse.Cloud.run('updateAIAssistantSettings', newSettings, {
      user: testUser
    });

    // Check that a log entry was created
    const AISettingsLog = Parse.Object.extend('AISettingsLog');
    const query = new Parse.Query(AISettingsLog);
    query.equalTo('user', testUser);
    query.equalTo('action', 'update_settings');
    query.descending('timestamp');

    const logs = await query.find({ useMasterKey: true });
    expect(logs.length).toBeGreaterThan(0);
    
    const latestLog = logs[0];
    expect(latestLog.get('user').id).toBe(testUser.id);
    expect(latestLog.get('action')).toBe('update_settings');
    expect(latestLog.get('settings')).toBeDefined();
  });
});