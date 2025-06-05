module.exports = Parse => {
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

  /**
   * Helper Functions
   */
  function validateSettings(settings) {
    const validProviders = ['anthropic', 'openai', 'deepseek', 'auto', 'none']; // Added deepseek
    const validModels = {
      anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
      openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
      deepseek: ['deepseek-chat', 'deepseek-coder'] // Added deepseek models
    };
    const validActionCategories = ['read', 'search', 'create', 'update', 'delete', 'admin'];

    const validated = {};

    if (settings.preferredProvider && validProviders.includes(settings.preferredProvider)) {
      validated.preferredProvider = settings.preferredProvider;
    }
    
    if (settings.fallbackProvider && validProviders.includes(settings.fallbackProvider)) {
      validated.fallbackProvider = settings.fallbackProvider;
    }

    if (settings.anthropicModel && validModels.anthropic.includes(settings.anthropicModel)) {
      validated.anthropicModel = settings.anthropicModel;
    }
    
    if (settings.openaiModel && validModels.openai.includes(settings.openaiModel)) {
      validated.openaiModel = settings.openaiModel;
    }

    if (settings.deepseekModel && validModels.deepseek.includes(settings.deepseekModel)) { // Added deepseek model
      validated.deepseekModel = settings.deepseekModel;
    }

    if (typeof settings.temperature === 'number' && settings.temperature >= 0 && settings.temperature <= 1) {
      validated.temperature = settings.temperature;
    }
    
    if (typeof settings.maxTokens === 'number' && settings.maxTokens >= 100 && settings.maxTokens <= 4000) {
      validated.maxTokens = settings.maxTokens;
    }
    
    if (typeof settings.historyRetentionDays === 'number' && settings.historyRetentionDays >= 1 && settings.historyRetentionDays <= 365) {
      validated.historyRetentionDays = settings.historyRetentionDays;
    }
    
    if (typeof settings.maxConversationLength === 'number' && settings.maxConversationLength >= 10 && settings.maxConversationLength <= 200) {
      validated.maxConversationLength = settings.maxConversationLength;
    }

    const booleanFields = [
      'autoSaveConversations', 'contextMemoryEnabled', 'requireActionConfirmation',
      'autoExecuteSafeActions', 'dataSharing', 'conversationLogging', 'analyticsOptIn', 'streamingEnabled' // Added streamingEnabled
    ];
    
    booleanFields.forEach(field => {
      if (typeof settings[field] === 'boolean') {
        validated[field] = settings[field];
      }
    });

    if (Array.isArray(settings.allowedActionCategories)) {
      validated.allowedActionCategories = settings.allowedActionCategories.filter(cat => 
        validActionCategories.includes(cat)
      );
    }

    return validated;
  }
  
  function validatePolicies(policies) {
    const validated = {};

    if (typeof policies.maxTokensPerUser === 'number' && policies.maxTokensPerUser > 0) {
      validated.maxTokensPerUser = policies.maxTokensPerUser;
    }
    
    if (typeof policies.maxRequestsPerDay === 'number' && policies.maxRequestsPerDay > 0) {
      validated.maxRequestsPerDay = policies.maxRequestsPerDay;
    }
    
    if (Array.isArray(policies.allowedProviders)) {
      validated.allowedProviders = policies.allowedProviders.filter(provider => 
        ['anthropic', 'openai', 'deepseek'].includes(provider) // Added deepseek
      );
    }
    
    if (Array.isArray(policies.restrictedActionCategories)) {
      validated.restrictedActionCategories = policies.restrictedActionCategories;
    }
    
    if (typeof policies.requireApprovalForActions === 'boolean') {
      validated.requireApprovalForActions = policies.requireApprovalForActions;
    }

    return validated;
  }
  
  async function checkOrganizationAdminAccess(user, organizationId) {
    try {
      const OrgRole = Parse.Object.extend('OrgRole');
      const query = new Parse.Query(OrgRole);
      query.equalTo('user', user);
      query.equalTo('organization', { __type: 'Pointer', className: 'Organization', objectId: organizationId });
      query.equalTo('role', 'admin');
      query.equalTo('isActive', true);
      
      const role = await query.first({ useMasterKey: true });
      return !!role;
    } catch (error) {
      console.error('Error checking organization admin access:', error);
      return false;
    }
  }
  
  async function checkOrganizationAccess(user, organizationId) {
    try {
      const OrgRole = Parse.Object.extend('OrgRole');
      const query = new Parse.Query(OrgRole);
      query.equalTo('user', user);
      query.equalTo('organization', { __type: 'Pointer', className: 'Organization', objectId: organizationId });
      query.equalTo('isActive', true);
      
      const role = await query.first({ useMasterKey: true });
      return !!role;
    } catch (error) {
      console.error('Error checking organization access:', error);
      return false;
    }
  }
  
  async function logSettingsUpdate(user, settings) {
    try {
      const SettingsLog = Parse.Object.extend('AISettingsLog');
      const log = new SettingsLog();
      
      log.set('user', user);
      log.set('action', 'update_settings');
      log.set('settings', settings);
      log.set('timestamp', new Date());
      
      await log.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error logging settings update:', error);
    }
  }

  // Get user's AI assistant settings
  Parse.Cloud.define('getAIAssistantSettings', async (request) => {
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    try {
      const UserSettings = Parse.Object.extend('AIAssistantUserSettings');
      const query = new Parse.Query(UserSettings);
      query.equalTo('user', user);
      
      const userSettings = await query.first({ useMasterKey: true });
      
      let orgSettings = null;
      const currentOrganization = user.get('organization'); // Use directly if available
      if (currentOrganization) {
        const OrgSettings = Parse.Object.extend('AIAssistantOrgSettings');
        const orgQuery = new Parse.Query(OrgSettings);
        orgQuery.equalTo('organization', currentOrganization);
        orgSettings = await orgQuery.first({ useMasterKey: true });
      }

      const defaultSettings = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        maxTokens: 4000,
        temperature: 0.7,
        conversationRetention: 30,
        actionPermissions: {
          fileOperations: true,
          webSearch: true,
          codeExecution: false,
          dataAnalysis: true,
          integrations: false
        },
        privacySettings: {
          shareConversations: false,
          allowAnalytics: true,
          dataRetention: 90
        }
      };

      let finalSettings = { ...defaultSettings };

      if (orgSettings) {
        const orgData = orgSettings.get('settings') || {};
        finalSettings = { ...finalSettings, ...orgData };
      }

      if (userSettings) {
        const userData = userSettings.get('settings') || {};
        finalSettings = { ...finalSettings, ...userData };
      }

      return finalSettings;
    } catch (error) {
      console.error('Error getting AI assistant settings:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve AI assistant settings');
    }
  });

  // Update user's AI assistant settings
  Parse.Cloud.define('updateAIAssistantSettings', async (request) => {
    const user = request.user;
    const settings = request.params.settings;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    if (!settings || typeof settings !== 'object') {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Settings object is required');
    }

    try {
      const validatedSettings = validateSettings(settings);

      const UserSettings = Parse.Object.extend('AIAssistantUserSettings');
      const query = new Parse.Query(UserSettings);
      query.equalTo('user', user);
      
      let userSettings = await query.first({ useMasterKey: true });
      
      if (!userSettings) {
        userSettings = new UserSettings();
        userSettings.set('user', user);
      }

      userSettings.set('settings', validatedSettings);
      userSettings.set('updatedAt', new Date());
      
      await userSettings.save(null, { useMasterKey: true });

      await logSettingsUpdate(user, validatedSettings);

      return { success: true, settings: validatedSettings };
    } catch (error) {
      console.error('Error updating AI assistant settings:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update AI assistant settings');
    }
  });

  // Get organization-level AI settings (admin only)
  Parse.Cloud.define('getOrganizationAISettings', withOrganizationContext(async (request) => {
    const user = request.user;
    const organization = request.organization;
    const organizationId = request.organizationId;
    
    try {
      const OrgSettings = Parse.Object.extend('AIAssistantOrgSettings');
      const query = new Parse.Query(OrgSettings);
      query.equalTo('organization', organization);
      
      const orgSettings = await query.first({ useMasterKey: true });
      
      if (!orgSettings) {
        return null; // Or return default settings if preferred
      }

      return {
        settings: orgSettings.get('settings'),
        policies: orgSettings.get('policies'),
        usage: orgSettings.get('usage'),
        updatedAt: orgSettings.get('updatedAt')
      };
    } catch (error) {
      console.error('Error getting organization AI settings:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve organization AI settings');
    }
  }));

  // Update organization-level AI settings (admin only)
  Parse.Cloud.define('updateOrganizationAISettings', withOrganizationContext(async (request) => {
    const user = request.user;
    const organization = request.organization;
    const organizationId = request.organizationId;
    const settings = request.params.settings;
    const policies = request.params.policies;
    
    try {
      const validatedSettings = settings ? validateSettings(settings) : null;
      const validatedPolicies = policies ? validatePolicies(policies) : null;

      const OrgSettings = Parse.Object.extend('AIAssistantOrgSettings');
      const query = new Parse.Query(OrgSettings);
      query.equalTo('organization', organization);
      
      let orgSettings = await query.first({ useMasterKey: true });
      
      if (!orgSettings) {
        orgSettings = new OrgSettings();
        orgSettings.set('organization', organization);
      }

      if (validatedSettings) {
        orgSettings.set('settings', validatedSettings);
      }
      
      if (validatedPolicies) {
        orgSettings.set('policies', validatedPolicies);
      }
      
      orgSettings.set('updatedAt', new Date());
      orgSettings.set('updatedBy', user);
      
      await orgSettings.save(null, { useMasterKey: true });

      return { success: true };
    } catch (error) {
        console.error('Error updating organization AI settings:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update organization AI settings');
    }
  }));

  // Get AI assistant usage statistics
  Parse.Cloud.define('getAIAssistantUsage', async (request) => { 
    const user = request.user;
    const organizationId = request.params.organizationId;
    const timeRange = request.params.timeRange || '30d';
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    try {
      let organization;
      if (organizationId) { // If organizationId is provided, fetch organization object
        const Organization = Parse.Object.extend('Organization');
        organization = await new Parse.Query(Organization).get(organizationId, { useMasterKey: true });
      } else { // Otherwise, try to infer from user's default organization
          organization = user.get('organization');
          if (organization && !organization.existed()) { // If it's a pointer, fetch it
              organization = await new Parse.Query('Organization').get(organization.id, { useMasterKey: true });
          }
      }

      if (!organization) {
          throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Organization context required for usage statistics.');
      }
      
      // Check access permissions
      let hasAccess = false;
      // User can always see their own organization's usage
      if (organization.id === user.get('organization')?.id) { // Check if the user's current org matches the requested org
          hasAccess = true;
      }
      // System admin can see any organization's usage
      if (user.get('isSystemAdmin')) {
          hasAccess = true;
      }

      if (!hasAccess) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to view usage statistics');
      }

      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const Usage = Parse.Object.extend('AIUsage');
      const query = new Parse.Query(Usage);
      query.greaterThanOrEqualTo('date', startDate);
      query.lessThanOrEqualTo('date', endDate);
      query.equalTo('organization', organization); // Filter by the resolved organization
      query.descending('date');
      query.limit(1000);

      const usageRecords = await query.find({ useMasterKey: true });

      const stats = {
        totalRequests: usageRecords.length,
        totalTokens: usageRecords.reduce((sum, record) => sum + (record.get('tokens') || 0), 0),
        totalCost: usageRecords.reduce((sum, record) => sum + (record.get('cost') || 0), 0),
        averageLatency: usageRecords.length > 0 ? usageRecords.reduce((sum, record) => sum + (record.get('latency') || 0), 0) / usageRecords.length : 0,
        successRate: usageRecords.length > 0 ? usageRecords.filter(record => record.get('success')).length / usageRecords.length : 0,
        providerBreakdown: {},
        dailyUsage: {}
      };

      usageRecords.forEach(record => {
        const provider = record.get('provider') || 'unknown';
        if (!stats.providerBreakdown[provider]) {
          stats.providerBreakdown[provider] = { requests: 0, tokens: 0, cost: 0 };
        }
        stats.providerBreakdown[provider].requests++;
        stats.providerBreakdown[provider].tokens += record.get('tokens') || 0;
        stats.providerBreakdown[provider].cost += record.get('cost') || 0;
      });

      usageRecords.forEach(record => {
        const date = record.get('date').toISOString().split('T')[0];
        if (!stats.dailyUsage[date]) {
          stats.dailyUsage[date] = { requests: 0, tokens: 0, cost: 0 };
        }
        stats.dailyUsage[date].requests++;
        stats.dailyUsage[date].tokens += record.get('tokens') || 0;
        stats.dailyUsage[date].cost += record.get('cost') || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error getting AI assistant usage:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve usage statistics');
    }
  });
};