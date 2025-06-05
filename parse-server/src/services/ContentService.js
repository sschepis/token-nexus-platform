/**
 * Content Service
 * Handles content operations and workflow management
 */

const BaseService = require('./BaseService');
const Parse = require('parse/node');

class ContentService extends BaseService {
  constructor() {
    super('Content');
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options = {}) {
    // Register dependencies
    const OptimizationService = require('./OptimizationService');
    const AIService = require('./AIService');
    const AnalyticsService = require('./AnalyticsService');
    const CacheService = require('./CacheService');

    this.registerDependency('optimization', OptimizationService);
    this.registerDependency('ai', AIService);
    this.registerDependency('analytics', AnalyticsService);
    this.registerDependency('cache', CacheService);

    // Initialize schema
    await this._initializeSchema();

    // Register cleanup
    this.registerCleanup(async () => {
      await this._cleanupPendingOperations();
    });
  }

  /**
   * Validate and optimize content
   * @param {Object} content Content to validate
   * @param {Parse.Object} template Template to validate against
   * @returns {Promise<Object>} Validation and optimization results
   */
  async validateContent(content, template) {
    this.validateInitialization();
    const optimization = this.getDependency('optimization');
    const ai = this.getDependency('ai');

    if (!content) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'Content is required');
    }

    const results = {
      isValid: true,
      optimizations: null,
      errors: [],
    };

    try {
      // Validate against template if provided
      if (template) {
        const templateObj = await template.fetch({ useMasterKey: true });
        const schema = templateObj.get('schema');
        results.templateValidation = await this._validateAgainstTemplate(content, schema);

        if (!results.templateValidation.isValid) {
          results.isValid = false;
          results.errors.push(...results.templateValidation.errors);
        }
      }

      // Run validations in parallel
      const [optimizationResults, aiSuggestions] = await Promise.all([
        optimization.analyzeSEO({
          title: content.title,
          content: content.content,
          type: template ? template.get('type') : 'general',
        }),
        ai.optimizeContent({
          title: content.title,
          content: content.content,
          type: template ? template.get('type') : 'general',
        }),
      ]);

      results.optimizations = optimizationResults;
      results.suggestions = aiSuggestions;

      return results;
    } catch (error) {
      throw this.handleError(error, 'content validation');
    }
  }

  /**
   * Generate unique slug for content
   * @param {string} title Content title
   * @param {string} existingSlug Existing slug for updates
   * @returns {Promise<string>} Generated slug
   */
  async generateSlug(title, existingSlug = null) {
    this.validateInitialization();
    const cache = this.getDependency('cache');

    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (existingSlug === baseSlug) {
      return baseSlug;
    }

    const cacheKey = this.generateCacheKey('slug', baseSlug);

    try {
      return await cache.getOrCompute(
        cacheKey,
        async () => {
          const query = new Parse.Query('CMSContent');
          query.equalTo('slug', baseSlug);
          const count = await query.count({ useMasterKey: true });
          return count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;
        },
        3600
      ); // Cache for 1 hour
    } catch (error) {
      console.warn('Slug generation fallback:', error);
      return `${baseSlug}-${Date.now()}`;
    }
  }

  /**
   * Handle content publishing workflow
   * @param {string} contentId Content ID
   * @param {Date} scheduledAt Optional scheduled publish time
   */
  async handlePublishing(contentId, scheduledAt = null) {
    this.validateInitialization();
    const optimization = this.getDependency('optimization');

    try {
      const contentObj = await new Parse.Query('CMSContent').get(contentId, { useMasterKey: true });

      // Optimize content for delivery
      const optimized = await optimization.optimizeContent({
        title: contentObj.get('title'),
        content: contentObj.get('content'),
        type: contentObj.get('template')?.get('type') || 'general',
      });

      // Run tasks in parallel
      await Promise.all([
        this._updateSearchIndex(contentId, optimized),
        this._generateStaticFiles(contentId, optimized),
        this._sendNotifications(contentId, 'published', scheduledAt),
      ]);

      return { success: true };
    } catch (error) {
      throw this.handleError(error, 'publishing workflow');
    }
  }

  /**
   * Handle content unpublishing workflow
   * @param {string} contentId Content ID
   */
  async handleUnpublishing(contentId) {
    this.validateInitialization();

    try {
      // Run tasks in parallel
      await Promise.all([
        this._removeFromSearchIndex(contentId),
        this._removeStaticFiles(contentId),
        this._sendNotifications(contentId, 'unpublished'),
      ]);

      return { success: true };
    } catch (error) {
      throw this.handleError(error, 'unpublishing workflow');
    }
  }

  /**
   * Initialize content schema
   * @private
   */
  async _initializeSchema() {
    const schema = new Parse.Schema('CMSContent');

    try {
      await schema.get();
    } catch (error) {
      // Schema doesn't exist, create it
      await schema
        .addString('title')
        .addString('slug')
        .addObject('content')
        .addString('status')
        .addPointer('template', 'CMSTemplate')
        .addPointer('organization', '_User')
        .addPointer('createdBy', '_User')
        .addPointer('updatedBy', '_User')
        .addDate('publishedAt')
        .addDate('scheduledAt')
        .addObject('optimizationResults')
        .addObject('aiSuggestions')
        .addIndex('slug', { slug: 1 })
        .addIndex('status', { status: 1 })
        .addIndex('organization', { organization: 1 })
        .save();
    }
  }

  /**
   * Validate content against template schema
   * @param {Object} content Content to validate
   * @param {Object} schema Template schema
   * @returns {Promise<Object>} Validation results
   * @private
   */
  async _validateAgainstTemplate(content, schema) {
    const results = {
      isValid: true,
      errors: [],
    };

    Object.entries(schema.fields).forEach(([field, rules]) => {
      if (rules.required && !content[field]) {
        results.isValid = false;
        results.errors.push(`Field '${field}' is required`);
      }

      if (content[field] && rules.type && typeof content[field] !== rules.type) {
        results.isValid = false;
        results.errors.push(`Field '${field}' must be of type ${rules.type}`);
      }

      if (content[field] && rules.maxLength && content[field].length > rules.maxLength) {
        results.isValid = false;
        results.errors.push(`Field '${field}' exceeds maximum length of ${rules.maxLength}`);
      }
    });

    return results;
  }

  /**
   * Update search index
   * @param {string} contentId Content ID
   * @param {Object} optimized Optimized content
   * @private
   */
  async _updateSearchIndex(contentId, optimized) {
    await Parse.Cloud.run('updateSearchIndex', {
      contentId,
      optimized,
    });
  }

  /**
   * Remove from search index
   * @param {string} contentId Content ID
   * @private
   */
  async _removeFromSearchIndex(contentId) {
    await Parse.Cloud.run('removeFromSearchIndex', {
      contentId,
    });
  }

  /**
   * Generate static files
   * @param {string} contentId Content ID
   * @param {Object} optimized Optimized content
   * @private
   */
  async _generateStaticFiles(contentId, optimized) {
    const contentObj = await new Parse.Query('CMSContent').get(contentId, { useMasterKey: true });

    if (contentObj.get('template')?.get('generateStatic')) {
      await Parse.Cloud.run('generateStaticFiles', {
        contentId,
        optimized,
      });
    }
  }

  /**
   * Remove static files
   * @param {string} contentId Content ID
   * @private
   */
  async _removeStaticFiles(contentId) {
    await Parse.Cloud.run('removeStaticFiles', {
      contentId,
    });
  }

  /**
   * Send notifications
   * @param {string} contentId Content ID
   * @param {string} type Notification type
   * @param {Date} scheduledAt Optional scheduled time
   * @private
   */
  async _sendNotifications(contentId, type, scheduledAt = null) {
    await Parse.Cloud.run('sendContentNotifications', {
      contentId,
      type,
      scheduledAt,
    });
  }

  /**
   * Cleanup pending operations
   * @private
   */
  async _cleanupPendingOperations() {
    try {
      // Find and handle any stuck operations
      const query = new Parse.Query('CMSContent');
      query.equalTo('status', 'processing');
      const stuck = await query.find({ useMasterKey: true });

      await Promise.all(
        stuck.map(async content => {
          content.set('status', 'error');
          content.set('error', 'Operation interrupted by server shutdown');
          await content.save(null, { useMasterKey: true });
        })
      );
    } catch (error) {
      console.error('Error cleaning up pending operations:', error);
    }
  }
}

module.exports = new ContentService();
