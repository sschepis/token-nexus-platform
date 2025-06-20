const Anthropic = require('@anthropic-ai/sdk');

// Singleton instance
let aiServiceInstance = null;

module.exports = Parse => {
  // Return existing instance if already created
  if (aiServiceInstance) {
    return aiServiceInstance;
  }
  class AIService {
    constructor() {
      // Get config from Parse app configuration
      const appConfig = require('../../src/config');
      this.anthropicApiKey = appConfig.ai?.models?.anthropic?.apiKey;
      this.anthropicModel = appConfig.ai?.models?.anthropic?.model || 'claude-3-sonnet-20240229';
      
      if (this.anthropicApiKey) {
        this.anthropic = new Anthropic({
          apiKey: this.anthropicApiKey,
        });
        console.log("✓ AIService initialized with Anthropic");
      } else {
        console.warn("⚠ No Anthropic API key found in configuration");
      }
    }

    async processMessage(provider, messages, options = {}, organizationId = null) {
      const startTime = Date.now();

      try {
        console.log(`Processing AI message with provider: ${provider}`);
        
        if (!this.anthropic) {
          throw new Error('Anthropic client not initialized - check API key configuration');
        }

        // Convert messages to Anthropic format
        const anthropicMessages = messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

        console.log('Sending request to Anthropic...', {
          model: this.anthropicModel,
          messageCount: anthropicMessages.length
        });

        const response = await this.anthropic.messages.create({
          model: this.anthropicModel,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          messages: anthropicMessages
        });

        console.log('✓ Received response from Anthropic');

        const result = {
          content: response.content[0]?.text || 'No response content',
          response: response.content[0]?.text || 'No response content', // For backward compatibility
          usage: {
            promptTokens: response.usage?.input_tokens || 0,
            completionTokens: response.usage?.output_tokens || 0,
            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
            model: this.anthropicModel
          }
        };

        // Simple usage logging
        if (organizationId) {
          await this.logUsage(organizationId, {
            ...result.usage,
            latency: Date.now() - startTime,
            success: true,
            error: null,
          });
        }

        return result;
      } catch (error) {
        console.error('AI Service Error:', error);
        
        // Log error
        if (organizationId) {
          await this.logUsage(organizationId, {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latency: Date.now() - startTime,
            success: false,
            error: error.message,
          });
        }

        throw error;
      }
    }

    // TODO: Re-enable these advanced features once basic AI is working
    // async checkRateLimit(organizationId) {
    //   const Usage = Parse.Object.extend('AIUsage');
    //   const query = new Parse.Query(Usage);

    //   query.equalTo('organization', organizationId);
    //   query.greaterThanOrEqual('date', new Date(Date.now() - 3600000)); // Last hour

    //   const count = await query.count({ useMasterKey: true });
    //   const config = await configService(Parse).getOrganizationConfig(organizationId);

    //   return count < config.security.rateLimitMaxRequests;
    // }

    // getCachedResponse(messages, config) {
    //   if (!config.cache.enabled) return null;

    //   const key = JSON.stringify(messages);
    //   const cached = this.cache.get(key);
    //   const now = Date.now();

    //   if (cached && now - cached.timestamp < config.cache.ttl * 1000) {
    //     return cached.response;
    //   }

    //   return null;
    // }

    // setCachedResponse(messages, response, config) {
    //   if (!config.cache.enabled) return;

    //   const key = JSON.stringify(messages);

    //   this.cache.set(key, {
    //     response,
    //     timestamp: Date.now(),
    //   });

    //   // Maintain cache size limit
    //   if (this.cache.size > config.cache.maxSize) {
    //     const oldestKey = Array.from(this.cache.keys())[0];

    //     this.cache.delete(oldestKey);
    //   }
    // }

    async logUsage(organizationId, usage) {
      try {
        const Usage = Parse.Object.extend('AIUsage');
        const entry = new Usage();

        entry.set('organization', organizationId);
        entry.set('date', new Date());
        entry.set('tokens', usage.totalTokens);
        entry.set('latency', usage.latency);
        entry.set('success', usage.success);
        entry.set('error', usage.error);
        entry.set('cost', this.calculateCost(usage));

        await entry.save(null, { useMasterKey: true });
      } catch (error) {
        console.error('Failed to log AI usage:', error);
        // Don't throw - usage logging failures shouldn't break the main flow
      }
    }

    calculateCost(usage) {
      // Cost per 1000 tokens for Claude (approximate)
      const rates = {
        'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
      };

      const rate = rates[usage.model] || rates['claude-sonnet-4-20250514'];
      const inputCost = (usage.promptTokens / 1000) * rate.input;
      const outputCost = (usage.completionTokens / 1000) * rate.output;

      return inputCost + outputCost;
    }
  }

  // Create and cache the singleton instance
  aiServiceInstance = new AIService();
  return aiServiceInstance;
};
