/**
 * Content Management Plugin for Parse Server
 */

const ContentService = require('../../services/ContentService');
const AnalyticsService = require('../../services/AnalyticsService');
const CacheService = require('../../services/CacheService');

/**
 * Content Plugin
 * @param {Object} config Plugin configuration
 */
class ParseContentPlugin {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Required by Parse Server plugin system
   * Called when plugin is loaded
   * @param {ParseServer} parseServer Parse Server instance
   */
  async load(parseServer) {
    // Register schema
    await this.registerSchema(parseServer);

    // Register cloud functions
    this.registerCloudFunctions();

    // Register jobs
    this.registerJobs();

    // Register webhooks if enabled
    if (this.config.webhooks?.enabled) {
      this.registerWebhooks();
    }
  }

  /**
   * Register Parse class schema
   * @param {ParseServer} parseServer Parse Server instance
   */
  async registerSchema(parseServer) {
    const schema = {
      className: 'CMSContent',
      fields: {
        title: { type: 'String', required: true },
        slug: { type: 'String', required: true },
        content: { type: 'Object', required: true },
        template: { type: 'Pointer', targetClass: 'CMSTemplate' },
        status: { type: 'String', required: true, defaultValue: 'draft' },
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },
        publishedAt: { type: 'Date' },
        scheduledAt: { type: 'Date' },
        optimizationResults: { type: 'Object' },
        aiSuggestions: { type: 'Object' },
      },
      indexes: {
        slug: { unique: true },
        status: { index: true },
        organization: { index: true },
      },
    };

    await parseServer.config.databaseController
      .loadSchema()
      .then(schemaController => schemaController.addClassIfNotExists(schema));
  }

  /**
   * Register cloud functions
   */
  registerCloudFunctions() {
    Parse.Cloud.define('createContent', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { title, content, templateId, status = 'draft' } = request.params;

      // Validate required fields
      if (!title || !content) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, 'Title and content are required');
      }

      try {
        let template = null;
        if (templateId) {
          template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });
        }

        // Validate and optimize content
        const validation = await ContentService.validateContent(content, template);
        if (!validation.isValid) {
          throw new Parse.Error(
            Parse.Error.INVALID_JSON,
            `Content validation failed: ${validation.errors.join(', ')}`
          );
        }

        // Generate slug
        const slug = await ContentService.generateSlug(title);

        // Create content object
        const contentObj = new Parse.Object('CMSContent');
        contentObj.setACL(new Parse.ACL(request.user));
        contentObj.set({
          title,
          slug,
          content,
          template,
          status,
          organization: request.user,
          createdBy: request.user,
          optimizationResults: validation.optimizations,
          aiSuggestions: validation.suggestions,
        });

        await contentObj.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'content_created',
          properties: {
            contentId: contentObj.id,
            title,
            template: template ? template.id : null,
            status,
          },
          userId: request.user.id,
        });

        // Invalidate relevant caches
        await CacheService.delete(`content:${contentObj.id}`);

        return contentObj;
      } catch (error) {
        console.error('Content creation failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Content creation failed');
      }
    });

    // Additional cloud functions (updateContent, publishContent, etc.)
    // would be registered here following the same pattern
  }

  /**
   * Register background jobs
   */
  registerJobs() {
    Parse.Cloud.job('processScheduledContent', async () => {
      const query = new Parse.Query('CMSContent');
      query.equalTo('status', 'scheduled');
      query.lessThanOrEqualTo('scheduledAt', new Date());

      const contents = await query.find({ useMasterKey: true });

      for (const content of contents) {
        try {
          await ContentService.handlePublishing(content.id);
        } catch (error) {
          console.error(`Error publishing content ${content.id}:`, error);
        }
      }
    });
  }

  /**
   * Register webhooks
   */
  registerWebhooks() {
    Parse.Cloud.define('content.published', async request => {
      const { contentId } = request.params;
      const content = await new Parse.Query('CMSContent').get(contentId, { useMasterKey: true });

      await Parse.Cloud.run('triggerWebhook', {
        type: 'content.published',
        payload: {
          contentId: content.id,
          type: content.get('type'),
          title: content.get('title'),
        },
      });
    });
  }
}

module.exports = ParseContentPlugin;
