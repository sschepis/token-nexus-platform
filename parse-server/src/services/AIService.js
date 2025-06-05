/**
 * AI Service
 * Handles AI/ML functionality for content optimization and suggestions
 */

const OpenAI = require('openai'); // Import OpenAI directly
const BaseService = require('./BaseService');

class AIService extends BaseService {
  constructor() {
    super('AI');
    this.openai = null;
    this.rateLimiter = {
      tokens: 0,
      lastReset: Date.now(),
      resetInterval: 60000, // 1 minute
      maxTokens: 150000, // Adjust based on your OpenAI plan
    };
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register dependencies
    const CacheService = require('./CacheService');
    const AnalyticsService = require('./AnalyticsService');

    this.registerDependency('cache', CacheService);
    this.registerDependency('analytics', AnalyticsService);

    // Initialize OpenAI client (for openai@4.x.x+)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Start rate limit reset interval and register cleanup
    this._startRateLimitReset();
    this.registerCleanup(() => {
      clearInterval(this._resetInterval);
    });
  }

  /**
   * Optimize content for better engagement
   * @param {Object} content Content to optimize
   * @returns {Promise<Object>} Optimization suggestions
   */
  async optimizeContent(content) {
    this.validateInitialization();
    const cache = this.getDependency('cache');
    const cacheKey = this.generateCacheKey('optimize', content);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const [titleOptimization, readability, seo, engagement] = await Promise.all([
            this._optimizeTitle(content),
            this._analyzeReadability(content),
            this._generateSEOSuggestions(content),
            this._predictEngagement(content),
          ]);

          return {
            title: titleOptimization,
            readability,
            seo,
            engagement,
            timestamp: Date.now(),
          };
        },
        3600
      ); // Cache for 1 hour
    } catch (error) {
      throw this.handleError(error, 'content optimization');
    }
  }

  /**
   * Generate content tags automatically
   * @param {Object} content Content to tag
   * @returns {Promise<string[]>} Generated tags
   */
  async generateTags(content) {
    this.validateInitialization();
    const cache = this.getDependency('cache');
    const cacheKey = this.generateCacheKey('tags', content);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const prompt = this._buildTaggingPrompt(content);
          const completion = await this._makeAIRequest('completion', {
            model: 'text-davinci-003',
            prompt,
            max_tokens: 100,
            temperature: 0.5,
          });

          const tags = completion.data.choices[0].text
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0 && tag.length <= 30);

          return {
            tags,
            timestamp: Date.now(),
          };
        },
        3600
      );
    } catch (error) {
      throw this.handleError(error, 'tag generation');
    }
  }

  /**
   * Schedule content for optimal engagement
   * @param {Object} content Content to schedule
   * @returns {Promise<Object>} Scheduling recommendations
   */
  async getOptimalSchedule(content) {
    this.validateInitialization();
    const cache = this.getDependency('cache');
    const analytics = this.getDependency('analytics');
    const cacheKey = this.generateCacheKey('schedule', content);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const analyticsData = await analytics.getAnalytics({
            timeframe: '30d',
            metrics: ['pageViews', 'engagement'],
            filters: { content_type: content.type },
          });

          const patterns = this._analyzeEngagementPatterns(analyticsData);
          const recommendations = this._generateScheduleRecommendations(patterns, content);

          return {
            ...recommendations,
            timestamp: Date.now(),
          };
        },
        1800
      ); // Cache for 30 minutes
    } catch (error) {
      throw this.handleError(error, 'schedule optimization');
    }
  }

  /**
   * Generate content suggestions based on analytics
   * @param {Object} params Suggestion parameters
   * @returns {Promise<Object>} Content suggestions
   */
  async getContentSuggestions(params) {
    this.validateInitialization();
    const cache = this.getDependency('cache');
    const analytics = this.getDependency('analytics');
    const cacheKey = this.generateCacheKey('suggestions', params);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const analyticsData = await analytics.getAnalytics({
            timeframe: params.timeframe || '30d',
            metrics: ['pageViews', 'engagement', 'conversion'],
            filters: params.filters,
          });

          const prompt = this._buildContentSuggestionsPrompt(analyticsData, params);
          const completion = await this._makeAIRequest('completion', {
            model: 'text-davinci-003',
            prompt,
            max_tokens: 300,
            temperature: 0.7,
          });

          return {
            topics: this._parseContentSuggestions(completion.data.choices[0].text),
            insights: this._extractAnalyticsInsights(analyticsData),
            contentTypes: this._recommendContentTypes(analyticsData, params),
            timestamp: Date.now(),
          };
        },
        3600
      );
    } catch (error) {
      throw this.handleError(error, 'content suggestions');
    }
  }

  /**
   * Make an AI request with rate limiting
   * @param {string} type Request type
   * @param {Object} params Request parameters
   * @returns {Promise<Object>} AI response
   * @private
   */
  async _makeAIRequest(type, params) {
    await this._checkRateLimit(params.max_tokens);

    try {
      let response;
      switch (type) {
        case 'completion':
          response = await this.openai.completions.create(params);
          break;
        default:
          throw new Error(`Unsupported AI request type: ${type}`);
      }

      this._updateRateLimit(params.max_tokens);
      return response;
    } catch (error) {
      throw this.handleError(error, `AI ${type} request`);
    }
  }

  /**
   * Check rate limit before making request
   * @param {number} tokens Tokens to consume
   * @private
   */
  async _checkRateLimit(tokens) {
    if (this.rateLimiter.tokens + tokens > this.rateLimiter.maxTokens) {
      const waitTime = this.rateLimiter.resetInterval - (Date.now() - this.rateLimiter.lastReset);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  /**
   * Update rate limit after request
   * @param {number} tokens Tokens consumed
   * @private
   */
  _updateRateLimit(tokens) {
    this.rateLimiter.tokens += tokens;
  }

  /**
   * Start rate limit reset interval
   * @private
   */
  _startRateLimitReset() {
    this._resetInterval = setInterval(() => {
      this.rateLimiter.tokens = 0;
      this.rateLimiter.lastReset = Date.now();
    }, this.rateLimiter.resetInterval);
  }

  /**
   * Build improved tagging prompt
   * @param {Object} content Content object
   * @returns {string} Generated prompt
   * @private
   */
  _buildTaggingPrompt(content) {
    return `Generate relevant, specific tags for this content. Tags should be single words or short phrases, relevant to the content's topic and industry.

Content Title: ${content.title}
Content Type: ${content.type}
Target Audience: ${content.audience || 'General'}
Main Topic: ${content.topic || 'Not specified'}

Content Preview: ${content.content.substring(0, 500)}...

Guidelines:
- Generate 5-10 relevant tags
- Keep tags concise (1-3 words)
- Include both specific and general tags
- Consider SEO value and searchability

Tags (comma-separated):`;
  }

  /**
   * Build improved content suggestions prompt
   * @param {Object} analytics Analytics data
   * @param {Object} params Suggestion parameters
   * @returns {string} Generated prompt
   * @private
   */
  _buildContentSuggestionsPrompt(analytics, params) {
    const topPerforming = this._getTopPerformingMetrics(analytics);

    return `Generate content suggestions based on the following analytics insights:

Top Performing Content:
${topPerforming
  .map(item => `- ${item.title} (Views: ${item.views}, Engagement: ${item.engagement}%)`)
  .join('\n')}

Target Audience: ${params.audience || 'General'}
Content Goals: ${params.goals?.join(', ') || 'Engagement and conversion'}
Industry: ${params.industry || 'General'}

Guidelines:
- Suggest 5 specific content topics
- Include target keywords for each topic
- Consider current trends and performance data
- Focus on ${params.contentType || 'all'} content types

Suggestions:`;
  }

  /**
   * Get top performing metrics from analytics
   * @param {Object} analytics Analytics data
   * @returns {Array} Top performing content metrics
   * @private
   */
  _getTopPerformingMetrics(analytics) {
    return analytics.pageViews
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5)
      .map(item => ({
        title: item.title,
        views: item.views,
        engagement: Math.round(item.engagement * 100) / 100,
      }));
  }
}

module.exports = new AIService();
