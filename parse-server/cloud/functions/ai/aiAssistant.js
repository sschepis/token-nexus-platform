// Cloud functions for AI Organization Assistant

// Assuming Parse is available globally in the Parse Server Cloud Code environment
// No longer requiring 'parse/node' explicitly.

// Import necessary services and middleware with correct relative paths
const AIServiceFactory = require('../../services/aiService');
const configServiceFactory = require('../../services/configService');
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware'); // Corrected path

// Initialize services with Parse instance
const AIService = AIServiceFactory(Parse);
const configService = configServiceFactory(Parse);

// Helper function to robustly fetch the user's current organization.
async function getOrganizationForUser(user) {
  if (!user) {
    return null;
  }

  try {
    let organization = user.get('organization');
    if (organization && organization.id) {
      if (typeof organization.fetch === 'function') {
        try {
          await organization.fetch({ useMasterKey: true });
        } catch (fetchError) {
          console.warn(`Failed to fetch user's organization directly: ${fetchError.message}`);
          organization = null; // Reset if fetch fails
        }
      }
      if (organization && organization.id) {
          return organization;
      }
    }

    const orgPointer = user.get('organizationPointer');
    if (orgPointer && orgPointer.id) {
      const Organization = Parse.Object.extend('Organization');
      const query = new Parse.Query(Organization);
      organization = await query.get(orgPointer.id, { useMasterKey: true });
      if (organization && organization.id) {
        return organization;
      }
    }
  } catch (error) {
    console.error('Error fetching user organization in middleware:', error);
  }
  return null;
}

// Define the getOrganization cloud function for AI service
Parse.Cloud.define('getOrganization', withOrganizationContext(async request => {
  const { user } = request; // User from middleware
  const { userId } = request; // No longer taking userId from params, assume it's from request.user
  
  if (!user) { // The middleware ensures user is authenticated, but this is a double check.
    throw new Error('User must be authenticated');
  }

  if (userId && userId !== user.id) {
    throw new Error('Invalid user ID or unauthorized access');
  }

  try {
    return await getOrganizationForUser(user); // Use direct user object
  } catch (error) {
    console.error('Error getting organization for user:', error);
    throw new Error('Failed to get user organization');
  }
}));

// Define processAIMessage cloud function
Parse.Cloud.define('processAIMessage', withOrganizationContext(async request => {
  const { user, organization, organizationId } = request; // From middleware
  const { provider, messages, options } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Validate provider
  if (!['openai', 'anthropic', 'deepseek'].includes(provider)) { // Added deepseek as a valid provider
    throw new Error('Invalid provider');
  }

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Validate message format
  messages.forEach(msg => {
    if (!msg.role || !msg.content) {
      throw new Error('Invalid message format');
    }
    if (!['user', 'assistant', 'system', 'tool'].includes(msg.role)) { // Added tool role
      throw new Error('Invalid message role');
    }
  });

  try {
    if (!organization) {
      throw new Error('User must be associated with an organization');
    }

    const config = await configService.getOrganizationConfig(organization.id);

    if (!config.ai?.enabled) { // Changed from config.features.enableAI to config.ai?.enabled
      throw new Error('AI features are not enabled for this organization');
    }

    const result = await AIService.processMessage(provider, messages, options, organization.id, user); // Pass user for logging if needed

    return result;
  } catch (error) {
    console.error('AI Processing Error:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to process message');
  }
}));

// Define streamAIMessage cloud function
Parse.Cloud.define('streamAIMessage', withOrganizationContext(async request => {
  const { user, organization, organizationId } = request; // From middleware
  const { provider, messages, options } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Validate provider
  if (!['openai', 'anthropic', 'deepseek'].includes(provider)) { // Added deepseek
    throw new Error('Invalid provider');
  }

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Validate message format
  messages.forEach(msg => {
    if (!msg.role || !msg.content) {
      throw new Error('Invalid message format');
    }
    if (!['user', 'assistant', 'system', 'tool'].includes(msg.role)) { // Added tool role
      throw new Error('Invalid message role');
    }
  });

  try {
    if (!organization) {
      throw new Error('User must be associated with an organization');
    }

    const config = await configService.getOrganizationConfig(organization.id);

    if (!config.ai?.enabled) { // Changed from config.features.enableAI
      throw new Error('AI features are not enabled for this organization');
    }

    if (!config.ai?.streamingEnabled) { // Changed from config.features.enableStreaming
      throw new Error('Streaming is not enabled for this organization');
    }

    const result = await AIService.streamMessage(provider, messages, options, organization.id, user); // Assuming streamMessage in AIService
    
    return {
      content: result.content,
      usage: result.usage,
    };
  } catch (error) {
    console.error('AI Streaming Error:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to stream message');
  }
}));

// Define getAIUsageStats cloud function
Parse.Cloud.define('getAIUsageStats', withOrganizationContext(async request => {
  const { user, organization, organizationId } = request; // From middleware

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    if (!organization) {
      throw new Error('User must be associated with an organization');
    }

    const Usage = Parse.Object.extend('AIUsage');
    const query = new Parse.Query(Usage);

    query.equalTo('organization', organization);
    query.descending('date');
    query.limit(1000);

    const usageData = await query.find({ useMasterKey: true });

    const stats = {
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      successRate: 0,
      requestCount: usageData.length,
    };

    usageData.forEach(usage => {
      stats.totalTokens += usage.get('tokens') || 0;
      stats.totalCost += usage.get('cost') || 0;
      stats.averageLatency += usage.get('latency') || 0;
      if (usage.get('success')) stats.successRate++;
    });

    if (stats.requestCount > 0) {
      stats.averageLatency /= stats.requestCount;
      stats.successRate = (stats.successRate / stats.requestCount) * 100;
    }

    return stats;
  } catch (error) {
    console.error('AI Stats Error:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to retrieve AI usage statistics');
  }
}));

// Define updateAISettings cloud function
Parse.Cloud.define('updateAISettings', withOrganizationContext(async request => {
  const { user, organization, organizationId } = request; // From middleware
  const { settings } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !settings) {
    throw new Error('Organization ID and settings are required');
  }

  // Ensure user is an admin of the organization or system admin
  if (!user.get('isSystemAdmin') && !await Parse.Cloud.run('checkUserRole', { userId: user.id, organizationId, roles: ['admin'] })) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'UNAUTHORIZED: Must be an admin to update AI settings.');
  }

  try {
    const success = await configService.updateOrganizationConfig(organization.id, { ai: settings }); // Pass organization object

    if (!success) {
      throw new Error('Failed to update AI settings');
    }

    return { success: true };
  } catch (error) {
    console.error('AI Settings Update Error:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update AI settings');
  }
}));
// AI Assistant Query - Main function for AI chat interface
Parse.Cloud.define('aiAssistantQuery', withOrganizationContext(async request => { // Wrapped with middleware
  const { user, organization, organizationId } = request; // From middleware
  const { query, conversationId } = request.params; 

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string');
  }

  try {
    // Check if user is system admin
    const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
    
    let config;
    if (isSystemAdmin && !organization) {
      // For system admins without organization context, use default AI config
      config = { ai: { enabled: true } };
    } else {
      if (!organization) {
        throw new Error('User must be associated with an organization');
      }
      
      // Get AI service (already imported as AIService)
      config = await configService.getOrganizationConfig(organization.id);

      if (!config.ai?.enabled) {
        throw new Error('AI features are not enabled for this organization');
      }
    }

    const messages = [
      {
        role: 'user',
        content: query
      }
    ];

    // Process the message through AI service
    const safeOrganizationId = organization?.id || organizationId || 'system';
    const aiResponse = await AIService.processMessage(
      config.ai?.provider || 'deepseek', // Use configured provider or default
      messages,
      {
        conversationId: conversationId,
        organizationId: safeOrganizationId, // Pass organizationId explicitly
        user: user // Pass user for logging if needed
      },
      safeOrganizationId // Pass organizationId to processMessage
    );

    return {
      response: aiResponse.content || aiResponse.response || 'No response from AI service',
      conversationId: conversationId || `conv_${Date.now()}_${user.id}`,
      structuredData: aiResponse.structuredData,
      suggestions: aiResponse.suggestions,
      error: aiResponse.error
    };

  } catch (error) {
    console.error('Error in aiAssistantQuery:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to process assistant query');
  }
}));

// Unified LLM Service for multi-provider support
class UnifiedLLMService {
  constructor() {
    this.anthropicService = AIService; 
    this.configService = configService; 
    
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY; 
    this.deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat'; 
    this.deepseekBaseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/'; 
    
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    
    try {
      const { OpenAI } = require('openai'); 
      this.deepseek = new OpenAI({
        apiKey: this.deepseekApiKey,
        baseURL: this.deepseekBaseURL,
      });
      console.log("✓ UnifiedLLMService initialized with Deepseek support");
    } catch (error) {
      console.warn("⚠ OpenAI package not available for Deepseek, falling back to Anthropic");
      this.deepseek = null;
    }
    
    if (this.openaiApiKey) {
      try {
        const { OpenAI } = require('openai'); 
        this.openai = new OpenAI({
          apiKey: this.openaiApiKey,
        });
        console.log("✓ UnifiedLLMService initialized with OpenAI fallback support");
      } catch (error) {
        console.warn("⚠ OpenAI package not available, using Deepseek and Anthropic only");
        this.openai = null;
      }
    } else {
      console.log("ℹ No OpenAI API key found, using Deepseek and Anthropic");
      this.openai = null;
    }
  }

  async query(prompt, options = {}) {
    try {
      const provider = options.provider || await this.getPreferredProvider(options.organizationId);
      const messages = this.normalizeMessages(prompt);
      
      switch (provider) {
        case 'deepseek':
          if (!this.deepseek) {
            console.log('Deepseek not available, falling back to OpenAI or Anthropic');
            if (this.openai) {
              return this.processWithOpenAI(messages, options);
            } else {
              return this.processWithAnthropic(messages, options);
            }
          }
          return this.processWithDeepseek(messages, options);
          
        case 'openai':
          if (!this.openai) {
            console.log('OpenAI not available, falling back to Deepseek or Anthropic');
            if (this.deepseek) {
              return this.processWithDeepseek(messages, options);
            } else {
              return this.processWithAnthropic(messages, options);
            }
          }
          return this.processWithOpenAI(messages, options);
          
        case 'anthropic':
          return this.processWithAnthropic(messages, options);
          
        default:
          if (this.deepseek) {
            return this.processWithDeepseek(messages, options);
          } else if (this.openai) {
            return this.processWithOpenAI(messages, options);
          } else {
            return this.processWithAnthropic(messages, options);
          }
      }
    } catch (error) {
      console.error('UnifiedLLMService error:', error);
      throw error;
    }
  }

  async continueWithToolResult(toolResult, options = {}) {
    const toolMessage = {
      role: 'tool', 
      content: JSON.stringify(toolResult)
    };
    return this.query([...options.messages || [], toolMessage], options); 
  }

  async processWithAnthropic(messages, options = {}) {
    try {
      const result = await this.anthropicService.processMessage(
        'anthropic',
        messages,
        {
          maxTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          ...options
        },
        options.organizationId
      );

      return {
        content: result.content || result.response,
        usage: result.usage,
        provider: 'anthropic',
        model: result.usage?.model || 'claude-3-sonnet-20240229'
      };
    } catch (error) {
      console.error('Anthropic processing error:', error);
      throw error;
    }
  }

  async processWithOpenAI(messages, options = {}) {
    if (!this.openai) {
      throw new Error('OpenAI client is not initialized');
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || this.openaiModel,
        messages: messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const result = {
        content: response.choices[0]?.message?.content || 'No response content',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          model: response.model
        },
        provider: 'openai',
        model: response.model
      };

      if (options.organizationId) {
        await this.logOpenAIUsage(options.organizationId, result.usage);
      }

      return result;
    } catch (error) {
      console.error('OpenAI processing error:', error);
      throw error;
    }
  }

  async processWithDeepseek(messages, options = {}) {
    if (!this.deepseek) {
      throw new Error('Deepseek client is not initialized');
    }
    
    try {
      const response = await this.deepseek.chat.completions.create({
        model: options.model || this.deepseekModel,
        messages: messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const result = {
        content: response.choices[0]?.message?.content || 'No response content',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          model: response.model
        },
        provider: 'deepseek',
        model: response.model
      };

      if (options.organizationId) {
        await this.logDeepseekUsage(options.organizationId, result.usage);
      }

      return result;
    } catch (error) {
      console.error('Deepseek processing error:', error);
      throw error;
    }
  }

  normalizeMessages(input) {
    if (typeof input === 'string') {
      return [{ role: 'user', content: input }];
    }
    if (Array.isArray(input)) {
      return input;
    }
    if (input && typeof input === 'object') {
      if (input.messages) {
        return input.messages;
      }
      if (input.content) {
        return [{ role: 'user', content: input.content }];
      }
    }
    throw new Error('Invalid message format provided to UnifiedLLMService');
  }

  async getPreferredProvider(organizationId) {
    try {
      if (organizationId) {
        const config = await this.configService.getOrganizationConfig(organizationId);
        return config.ai?.provider || 'deepseek';
      }
      return 'deepseek'; // Default fallback
    } catch (error) {
      console.warn('Could not get organization config, using default provider:', error.message);
      return 'deepseek';
    }
  }

  async logOpenAIUsage(organizationId, usage) {
    try {
      const Usage = Parse.Object.extend('AIUsage');
      const entry = new Usage();

      entry.set('organization', organizationId);
      entry.set('date', new Date());
      entry.set('tokens', usage.totalTokens);
      entry.set('latency', 0);
      entry.set('success', true);
      entry.set('error', null);
      entry.set('cost', this.calculateOpenAICost(usage));
      entry.set('provider', 'openai');
      entry.set('model', usage.model);

      await entry.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Failed to log OpenAI usage:', error);
    }
  }

  async logDeepseekUsage(organizationId, usage) {
    try {
      const Usage = Parse.Object.extend('AIUsage');
      const entry = new Usage();

      entry.set('organization', organizationId);
      entry.set('date', new Date());
      entry.set('tokens', usage.totalTokens);
      entry.set('latency', 0);
      entry.set('success', true);
      entry.set('error', null);
      entry.set('cost', this.calculateDeepseekCost(usage));
      entry.set('provider', 'deepseek');
      entry.set('model', usage.model);

      await entry.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Failed to log Deepseek usage:', error);
    }
  }

  calculateOpenAICost(usage) {
    const rates = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    };

    const rate = rates[usage.model] || rates['gpt-4-turbo-preview'];
    const inputCost = (usage.promptTokens / 1000) * rate.input;
    const outputCost = (usage.completionTokens / 1000) * rate.output;

    return inputCost + outputCost;
  }

  calculateDeepseekCost(usage) {
    const rates = {
      'deepseek-chat': { input: 0.00014, output: 0.00028 }, 
      'deepseek-coder': { input: 0.00014, output: 0.00028 },
    };

    const rate = rates[usage.model] || rates['deepseek-chat'];
    const inputCost = (usage.promptTokens / 1000000) * rate.input;
    const outputCost = (usage.completionTokens / 1000000) * rate.output;

    return inputCost + outputCost;
  }

  calculateCost(usage, provider = 'deepseek') {
    if (provider === 'deepseek') {
      return this.calculateDeepseekCost(usage);
    } else if (provider === 'openai') {
      return this.calculateOpenAICost(usage);
    } else {
      const rate = 0.015; 
      return (usage.totalTokens / 1000) * rate;
    }
  }

  async switchProvider(newProvider, organizationId) {
    try {
      if (!['anthropic', 'openai'].includes(newProvider)) {
        throw new Error(`Unsupported provider: ${newProvider}`);
      }

      if (newProvider === 'openai' && !this.openai) {
        throw new Error('OpenAI provider not available - missing API key or package');
      }

      if (newProvider === 'anthropic' && !this.anthropicService) {
        throw new Error('Anthropic provider not available');
      }

      if (organizationId) {
        await this.configService.updateOrganizationConfig(organizationId, {
          ai: { provider: newProvider }
        });
      }

      return {
        success: true,
        provider: newProvider,
        message: `Successfully switched to ${newProvider} provider`
      };
    } catch (error) {
      console.error('Provider switch error:', error);
      throw error;
    }
  }
}

// Tool Executor for executing assistant tools
class ToolExecutor {
  constructor(userContext) {
    this.userContext = userContext;
    this.permissionService = new PermissionService(userContext); 
  }

  async execute(toolCall) {
    const { name, arguments: args } = toolCall;

    const hasPermission = await this.permissionService.checkPermission({
      userContext: this.userContext,
      action: name,
      resource: args.objectApiName,
      data: args
    });

    if (!hasPermission) {
      throw new Error(`Permission denied for action: ${name}`);
    }

    switch (name) {
      case 'getObjectSchema':
        return await this.getObjectSchema(args);
      case 'createObjectRecord':
        return await this.createObjectRecord(args);
      case 'getObjectRecord':
        return await this.getObjectRecord(args);
      case 'listObjectRecords':
        return await this.listObjectRecords(args);
      case 'updateObjectRecord':
        return await this.updateObjectRecord(args);
      case 'deleteObjectRecord':
        return await this.deleteObjectRecord(args);
      case 'getUserDetails':
        return await this.getUserDetails(args);
      case 'listUserTokens':
        return await this.listUserTokens(args);
      case 'summarizeUserActivity':
        return await this.summarizeUserActivity(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async getObjectSchema({ objectApiName }) {
    const schemas = await getAvailableSchemas(this.userContext);
    const schema = schemas.find(s => s.apiName === objectApiName);
    
    if (!schema) {
      throw new Error(`Schema not found: ${objectApiName}`);
    }

    return {
      success: true,
      data: schema
    };
  }

  async createObjectRecord({ objectApiName, recordData }) {
    if (objectApiName.startsWith('CustomObject_')) {
      const apiName = objectApiName.replace('CustomObject_', '');
      const result = await Parse.Cloud.run('createObjectRecord', {
        objectApiName: apiName,
        data: recordData
      });
      return { success: true, data: result };
    } else {
      switch (objectApiName) {
        case 'Token':
          const result = await Parse.Cloud.run('createToken', recordData);
          return { success: true, data: result };
        default:
          throw new Error(`Cannot create records for object type: ${objectApiName}`);
      }
    }
  }

  async listObjectRecords({ objectApiName, filters, sort, limit, offset, fields }) {
    if (objectApiName.startsWith('CustomObject_')) {
      const apiName = objectApiName.replace('CustomObject_', '');
      const result = await Parse.Cloud.run('queryObjectRecords', {
        objectApiName: apiName,
        filters,
        sort,
        limit: limit || 20,
        offset: offset || 0,
        fields
      });
      return { success: true, data: result };
    } else {
      switch (objectApiName) {
        case 'User':
          if (this.userContext.isSystemAdmin) {
            const result = await Parse.Cloud.run('getAllUsers', { 
              page: Math.floor((offset || 0) / (limit || 20)) + 1,
              limit: limit || 20 
            });
            return { success: true, data: result };
          } else {
            const result = await Parse.Cloud.run('getOrgUsers', {
              organizationId: this.userContext.orgId
            });
            return { success: true, data: result };
          }
        case 'Token':
          const result = await Parse.Cloud.run('getTokens', {
            organizationId: this.userContext.orgId
          });
          return { success: true, data: result };
        default:
          throw new Error(`Cannot list records for object type: ${objectApiName}`);
      }
    }
  }

  async getUserDetails({ userId }) {
    const targetUserId = userId || this.userContext.userId;
    
    if (targetUserId !== this.userContext.userId && !this.userContext.isSystemAdmin) {
      const canAccess = await this.permissionService.canAccessUser(this.userContext, targetUserId);
      if (!canAccess) {
        throw new Error('Permission denied to access user details');
      }
    }

    const user = await new Parse.Query(Parse.User).get(targetUserId, { useMasterKey: true });
    
    return {
      success: true,
      data: {
        id: user.id,
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        isActive: user.get('isActive'),
        createdAt: user.get('createdAt'),
        lastLogin: user.get('lastLogin')
      }
    };
  }
}

// Permission Service
class PermissionService {
  constructor(userContext) {
    this.userContext = userContext;
  }
  
  async checkPermission({ userContext, action, resource, data }) {
    if (userContext.isSystemAdmin) {
      return true;
    }

    const readActions = ['getObjectSchema', 'getObjectRecord', 'listObjectRecords', 'getUserDetails', 'listUserTokens', 'summarizeUserActivity'];
    const writeActions = ['createObjectRecord', 'updateObjectRecord', 'deleteObjectRecord'];

    if (readActions.includes(action)) {
      if (resource === 'User' && (!data.userId || data.userId === userContext.userId)) {
        return true;
      }

      if (userContext.orgId) {
        return true; 
      }
    }

    if (writeActions.includes(action) && userContext.orgId) {
      const hasWriteRole = userContext.orgRoles.some(role => 
        role.orgId === userContext.orgId && ['admin', 'member'].includes(role.role)
      );
      return hasWriteRole;
    }

    return false;
  }

  async canAccessUser(userContext, targetUserId) {
    if (!userContext.orgId) return false;

    const OrgRole = Parse.Object.extend('OrgRole');
    const query = new Parse.Query(OrgRole);
    query.equalTo('user', { __type: 'Pointer', className: '_User', objectId: targetUserId });
    query.equalTo('organization', { __type: 'Pointer', className: 'Organization', objectId: userContext.orgId });
    query.equalTo('isActive', true);
    
    const role = await query.first({ useMasterKey: true });
    return !!role;
  }
}

// AI Conversation Management Cloud Functions
// These functions support the AI Assistant page controller actions

/**
 * Fetch AI conversations for the current user's organization
 */
Parse.Cloud.define('fetchAIConversations', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { limit = 20, skip = 0, status } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
  
  if (!organization && !isSystemAdmin) {
    throw new Error('User must be associated with an organization');
  }

  // For system admins without organization context, use the provided organizationId
  let targetOrganization = organization;
  let targetOrganizationId = organizationId;
  
  if (isSystemAdmin && !organization && request.params.organizationId) {
    const Organization = Parse.Object.extend('Organization');
    const query = new Parse.Query(Organization);
    targetOrganization = await query.get(request.params.organizationId, { useMasterKey: true });
    targetOrganizationId = request.params.organizationId;
  }

  if (!targetOrganization && !isSystemAdmin) {
    throw new Error('Organization context is required');
  }

  try {
    const AIConversation = Parse.Object.extend('AIConversation');
    const query = new Parse.Query(AIConversation);
    
    // Filter by organization (use target organization for system admins)
    if (targetOrganization) {
      query.equalTo('organization', targetOrganization);
    } else if (isSystemAdmin) {
      // System admin can see all conversations if no specific org
      // No organization filter applied
    }
    
    // Filter by status if provided
    if (status) {
      query.equalTo('status', status);
    }
    
    // Order by most recent first
    query.descending('updatedAt');
    query.limit(limit);
    query.skip(skip);
    
    // Include user information
    query.include('user');
    
    const conversations = await query.find({ useMasterKey: true });
    
    return {
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.get('title'),
        status: conv.get('status'),
        messageCount: conv.get('messageCount') || 0,
        createdAt: conv.get('createdAt'),
        updatedAt: conv.get('updatedAt'),
        user: {
          id: conv.get('user').id,
          firstName: conv.get('user').get('firstName'),
          lastName: conv.get('user').get('lastName'),
          email: conv.get('user').get('email')
        }
      }))
    };
  } catch (error) {
    console.error('Error fetching AI conversations:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch conversations');
  }
}));

/**
 * Create a new AI conversation
 */
Parse.Cloud.define('createAIConversation', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { title, initialMessage } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
  
  if (!organization && !isSystemAdmin) {
    throw new Error('User must be associated with an organization');
  }

  // For system admins without organization context, use the provided organizationId
  let targetOrganization = organization;
  if (isSystemAdmin && !organization && request.params.organizationId) {
    const Organization = Parse.Object.extend('Organization');
    const query = new Parse.Query(Organization);
    targetOrganization = await query.get(request.params.organizationId, { useMasterKey: true });
  }

  if (!targetOrganization && !isSystemAdmin) {
    throw new Error('Organization context is required');
  }

  if (!title) {
    throw new Error('Conversation title is required');
  }

  try {
    const AIConversation = Parse.Object.extend('AIConversation');
    const conversation = new AIConversation();
    
    conversation.set('title', title);
    conversation.set('status', 'active');
    conversation.set('messageCount', 0);
    if (targetOrganization) {
      conversation.set('organization', targetOrganization);
    }
    conversation.set('user', user);
    
    const savedConversation = await conversation.save(null, { useMasterKey: true });
    
    // If there's an initial message, create it
    if (initialMessage) {
      await Parse.Cloud.run('sendAIMessage', {
        conversationId: savedConversation.id,
        content: initialMessage,
        role: 'user'
      });
    }
    
    return {
      success: true,
      conversation: {
        id: savedConversation.id,
        title: savedConversation.get('title'),
        status: savedConversation.get('status'),
        messageCount: savedConversation.get('messageCount'),
        createdAt: savedConversation.get('createdAt'),
        updatedAt: savedConversation.get('updatedAt')
      }
    };
  } catch (error) {
    console.error('Error creating AI conversation:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create conversation');
  }
}));

/**
 * Archive an AI conversation
 */
Parse.Cloud.define('archiveAIConversation', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { conversationId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;

  try {
    const AIConversation = Parse.Object.extend('AIConversation');
    const query = new Parse.Query(AIConversation);
    
    // Only filter by organization if not system admin or if organization is available
    if (organization) {
      query.equalTo('organization', organization);
    } else if (!isSystemAdmin) {
      throw new Error('Organization context is required');
    }
    
    const conversation = await query.get(conversationId, { useMasterKey: true });
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    conversation.set('status', 'archived');
    await conversation.save(null, { useMasterKey: true });
    
    return {
      success: true,
      message: 'Conversation archived successfully'
    };
  } catch (error) {
    console.error('Error archiving AI conversation:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to archive conversation');
  }
}));

/**
 * Delete an AI conversation
 */
Parse.Cloud.define('deleteAIConversation', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { conversationId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;

  try {
    const AIConversation = Parse.Object.extend('AIConversation');
    const query = new Parse.Query(AIConversation);
    
    // Only filter by organization if not system admin or if organization is available
    if (organization) {
      query.equalTo('organization', organization);
    } else if (!isSystemAdmin) {
      throw new Error('Organization context is required');
    }
    
    const conversation = await query.get(conversationId, { useMasterKey: true });
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Delete all messages in the conversation first
    const AIMessage = Parse.Object.extend('AIMessage');
    const messageQuery = new Parse.Query(AIMessage);
    messageQuery.equalTo('conversation', conversation);
    
    const messages = await messageQuery.find({ useMasterKey: true });
    await Parse.Object.destroyAll(messages, { useMasterKey: true });
    
    // Delete the conversation
    await conversation.destroy({ useMasterKey: true });
    
    return {
      success: true,
      message: 'Conversation deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting AI conversation:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete conversation');
  }
}));

/**
 * Fetch messages for a specific AI conversation
 */
Parse.Cloud.define('fetchAIMessages', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { conversationId, limit = 50, skip = 0 } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;

  try {
    // Verify conversation belongs to organization
    const AIConversation = Parse.Object.extend('AIConversation');
    const convQuery = new Parse.Query(AIConversation);
    
    // Only filter by organization if not system admin or if organization is available
    if (organization) {
      convQuery.equalTo('organization', organization);
    } else if (!isSystemAdmin) {
      throw new Error('Organization context is required');
    }
    
    const conversation = await convQuery.get(conversationId, { useMasterKey: true });
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Fetch messages
    const AIMessage = Parse.Object.extend('AIMessage');
    const query = new Parse.Query(AIMessage);
    query.equalTo('conversation', conversation);
    query.ascending('createdAt');
    query.limit(limit);
    query.skip(skip);
    query.include('user');
    
    const messages = await query.find({ useMasterKey: true });
    
    return {
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.get('content'),
        role: msg.get('role'),
        createdAt: msg.get('createdAt'),
        user: msg.get('user') ? {
          id: msg.get('user').id,
          firstName: msg.get('user').get('firstName'),
          lastName: msg.get('user').get('lastName')
        } : null
      }))
    };
  } catch (error) {
    console.error('Error fetching AI messages:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch messages');
  }
}));

/**
 * Send a message in an AI conversation
 */
Parse.Cloud.define('sendAIMessage', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { conversationId, content, role = 'user' } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!conversationId || !content) {
    throw new Error('Conversation ID and content are required');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;

  try {
    // Verify conversation belongs to organization
    const AIConversation = Parse.Object.extend('AIConversation');
    const convQuery = new Parse.Query(AIConversation);
    
    // Only filter by organization if not system admin or if organization is available
    if (organization) {
      convQuery.equalTo('organization', organization);
    } else if (!isSystemAdmin) {
      throw new Error('Organization context is required');
    }
    
    const conversation = await convQuery.get(conversationId, { useMasterKey: true });
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Create the message
    const AIMessage = Parse.Object.extend('AIMessage');
    const message = new AIMessage();
    
    message.set('content', content);
    message.set('role', role);
    message.set('conversation', conversation);
    message.set('organization', organization);
    message.set('user', user);
    
    const savedMessage = await message.save(null, { useMasterKey: true });
    
    // Update conversation message count and timestamp
    const currentCount = conversation.get('messageCount') || 0;
    conversation.set('messageCount', currentCount + 1);
    conversation.set('updatedAt', new Date());
    await conversation.save(null, { useMasterKey: true });
    
    // If this is a user message, generate AI response
    if (role === 'user') {
      try {
        // Get conversation history
        const messageQuery = new Parse.Query(AIMessage);
        messageQuery.equalTo('conversation', conversation);
        messageQuery.ascending('createdAt');
        messageQuery.limit(20); // Last 20 messages for context
        
        const recentMessages = await messageQuery.find({ useMasterKey: true });
        
        const messages = recentMessages.map(msg => ({
          role: msg.get('role'),
          content: msg.get('content')
        }));
        
        // Generate AI response
        const aiResponse = await Parse.Cloud.run('processAIMessage', {
          provider: 'deepseek', // Default provider
          messages: messages,
          options: {
            conversationId: conversationId,
            organizationId: organizationId
          }
        });
        
        // Save AI response
        const aiMessage = new AIMessage();
        aiMessage.set('content', aiResponse.content || aiResponse.response);
        aiMessage.set('role', 'assistant');
        aiMessage.set('conversation', conversation);
        aiMessage.set('organization', organization);
        
        await aiMessage.save(null, { useMasterKey: true });
        
        // Update message count again
        conversation.set('messageCount', currentCount + 2);
        await conversation.save(null, { useMasterKey: true });
        
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
        // Don't fail the user message if AI response fails
      }
    }
    
    return {
      success: true,
      message: {
        id: savedMessage.id,
        content: savedMessage.get('content'),
        role: savedMessage.get('role'),
        createdAt: savedMessage.get('createdAt')
      }
    };
  } catch (error) {
    console.error('Error sending AI message:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to send message');
  }
}));

/**
 * Delete an AI message
 */
Parse.Cloud.define('deleteAIMessage', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { messageId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!messageId) {
    throw new Error('Message ID is required');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;

  try {
    const AIMessage = Parse.Object.extend('AIMessage');
    const query = new Parse.Query(AIMessage);
    
    // Only filter by organization if not system admin or if organization is available
    if (organization) {
      query.equalTo('organization', organization);
    } else if (!isSystemAdmin) {
      throw new Error('Organization context is required');
    }
    
    const message = await query.get(messageId, { useMasterKey: true });
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    // Get conversation to update message count
    const conversation = message.get('conversation');
    await conversation.fetch({ useMasterKey: true });
    
    // Delete the message
    await message.destroy({ useMasterKey: true });
    
    // Update conversation message count
    const currentCount = conversation.get('messageCount') || 0;
    conversation.set('messageCount', Math.max(0, currentCount - 1));
    await conversation.save(null, { useMasterKey: true });
    
    return {
      success: true,
      message: 'Message deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting AI message:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete message');
  }
}));

/**
 * Get AI configuration for the organization
 */
Parse.Cloud.define('getAIConfiguration', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
  
  if (!organization && !isSystemAdmin) {
    throw new Error('User must be associated with an organization');
  }

  // For system admins without organization context, use the provided organizationId
  let targetOrganizationId = organizationId;
  if (isSystemAdmin && !organization && request.params.organizationId) {
    targetOrganizationId = request.params.organizationId;
  }

  if (!targetOrganizationId && !isSystemAdmin) {
    throw new Error('Organization context is required');
  }

  try {
    const config = await configService.getOrganizationConfig(targetOrganizationId);
    
    return {
      success: true,
      configuration: {
        enabled: config.ai?.enabled || false,
        provider: config.ai?.provider || 'deepseek',
        streamingEnabled: config.ai?.streamingEnabled || false,
        maxTokens: config.ai?.maxTokens || 1000,
        temperature: config.ai?.temperature || 0.7,
        features: config.ai?.features || {}
      }
    };
  } catch (error) {
    console.error('Error getting AI configuration:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get AI configuration');
  }
}));

/**
 * Get AI usage statistics for the organization
 */
Parse.Cloud.define('getAIStatistics', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { timeframe = '30d' } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
  
  if (!organization && !isSystemAdmin) {
    throw new Error('User must be associated with an organization');
  }

  // For system admins without organization context, use the provided organizationId
  let targetOrganization = organization;
  if (isSystemAdmin && !organization && request.params.organizationId) {
    const Organization = Parse.Object.extend('Organization');
    const query = new Parse.Query(Organization);
    targetOrganization = await query.get(request.params.organizationId, { useMasterKey: true });
  }

  if (!targetOrganization && !isSystemAdmin) {
    throw new Error('Organization context is required');
  }

  try {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get conversation statistics
    const AIConversation = Parse.Object.extend('AIConversation');
    const convQuery = new Parse.Query(AIConversation);
    if (targetOrganization) {
      convQuery.equalTo('organization', targetOrganization);
    }
    convQuery.greaterThanOrEqualTo('createdAt', startDate);
    
    const conversationCount = await convQuery.count({ useMasterKey: true });
    
    // Get message statistics
    const AIMessage = Parse.Object.extend('AIMessage');
    const msgQuery = new Parse.Query(AIMessage);
    if (targetOrganization) {
      msgQuery.equalTo('organization', targetOrganization);
    }
    msgQuery.greaterThanOrEqualTo('createdAt', startDate);
    
    const messageCount = await msgQuery.count({ useMasterKey: true });
    
    // Get user message count
    const userMsgQuery = new Parse.Query(AIMessage);
    if (targetOrganization) {
      userMsgQuery.equalTo('organization', targetOrganization);
    }
    userMsgQuery.equalTo('role', 'user');
    userMsgQuery.greaterThanOrEqualTo('createdAt', startDate);
    
    const userMessageCount = await userMsgQuery.count({ useMasterKey: true });
    
    // Get AI usage data
    const Usage = Parse.Object.extend('AIUsage');
    const usageQuery = new Parse.Query(Usage);
    if (targetOrganization) {
      usageQuery.equalTo('organization', targetOrganization);
    }
    usageQuery.greaterThanOrEqualTo('date', startDate);
    
    const usageData = await usageQuery.find({ useMasterKey: true });
    
    const totalTokens = usageData.reduce((sum, usage) => sum + (usage.get('tokens') || 0), 0);
    const totalCost = usageData.reduce((sum, usage) => sum + (usage.get('cost') || 0), 0);
    const avgLatency = usageData.length > 0
      ? usageData.reduce((sum, usage) => sum + (usage.get('latency') || 0), 0) / usageData.length
      : 0;
    
    return {
      success: true,
      statistics: {
        timeframe,
        conversations: conversationCount,
        totalMessages: messageCount,
        userMessages: userMessageCount,
        aiMessages: messageCount - userMessageCount,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
        averageLatency: Math.round(avgLatency),
        requestCount: usageData.length
      }
    };
  } catch (error) {
    console.error('Error getting AI statistics:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get AI statistics');
  }
}));

/**
 * Export AI conversation data
 */
Parse.Cloud.define('exportAIData', withOrganizationContext(async (request) => {
  const { user, organization, organizationId } = request;
  const { format = 'json', includeMessages = true } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Check if user is system admin
  const isSystemAdmin = user.get('isAdmin') === true || user.get('isSystemAdmin') === true;
  
  if (!organization && !isSystemAdmin) {
    throw new Error('User must be associated with an organization');
  }

  // For system admins without organization context, use the provided organizationId
  let targetOrganization = organization;
  let targetOrganizationId = organizationId;
  
  if (isSystemAdmin && !organization && request.params.organizationId) {
    const Organization = Parse.Object.extend('Organization');
    const query = new Parse.Query(Organization);
    targetOrganization = await query.get(request.params.organizationId, { useMasterKey: true });
    targetOrganizationId = request.params.organizationId;
  }

  if (!targetOrganization && !isSystemAdmin) {
    throw new Error('Organization context is required');
  }

  try {
    // Get all conversations
    const AIConversation = Parse.Object.extend('AIConversation');
    const convQuery = new Parse.Query(AIConversation);
    if (targetOrganization) {
      convQuery.equalTo('organization', targetOrganization);
    }
    convQuery.include('user');
    convQuery.descending('createdAt');
    
    const conversations = await convQuery.find({ useMasterKey: true });
    
    const exportData = {
      exportDate: new Date().toISOString(),
      organizationId: targetOrganizationId,
      conversationCount: conversations.length,
      conversations: []
    };
    
    for (const conv of conversations) {
      const convData = {
        id: conv.id,
        title: conv.get('title'),
        status: conv.get('status'),
        messageCount: conv.get('messageCount'),
        createdAt: conv.get('createdAt'),
        updatedAt: conv.get('updatedAt'),
        user: {
          id: conv.get('user').id,
          firstName: conv.get('user').get('firstName'),
          lastName: conv.get('user').get('lastName'),
          email: conv.get('user').get('email')
        }
      };
      
      if (includeMessages) {
        const AIMessage = Parse.Object.extend('AIMessage');
        const msgQuery = new Parse.Query(AIMessage);
        msgQuery.equalTo('conversation', conv);
        msgQuery.ascending('createdAt');
        msgQuery.include('user');
        
        const messages = await msgQuery.find({ useMasterKey: true });
        
        convData.messages = messages.map(msg => ({
          id: msg.id,
          content: msg.get('content'),
          role: msg.get('role'),
          createdAt: msg.get('createdAt'),
          user: msg.get('user') ? {
            id: msg.get('user').id,
            firstName: msg.get('user').get('firstName'),
            lastName: msg.get('user').get('lastName')
          } : null
        }));
      }
      
      exportData.conversations.push(convData);
    }
    
    return {
      success: true,
      format,
      data: exportData,
      filename: `ai-conversations-${organizationId}-${new Date().toISOString().split('T')[0]}.${format}`
    };
  } catch (error) {
    console.error('Error exporting AI data:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to export AI data');
  }
}));

// Ensure these are globally available or handled via dependency injection pattern used by Parse Server's initialization
// Removed module.exports structure and global assignments from the original file
// if they are not intended for direct module consumption.
// Assuming that the Parse Server setup (e.g., in server.js) ensures Parse is global
// and resolves services like UnifiedLLMService, ToolExecutor, etc., if needed.
// These are not needed for this file's cloud functions to operate.