/**
 * Template Management Plugin for Parse Server
 */

const TemplateService = require('../../services/TemplateService');
const AnalyticsService = require('../../services/AnalyticsService');
const CacheService = require('../../services/CacheService');

/**
 * Template Plugin
 * @param {Object} config Plugin configuration
 */
class ParseTemplatePlugin {
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
      className: 'CMSTemplate',
      fields: {
        name: { type: 'String', required: true },
        description: { type: 'String' },
        type: { type: 'String', required: true },
        schema: { type: 'Object', required: true },
        defaultContent: { type: 'Object' },
        version: { type: 'Number', required: true, defaultValue: 1 },
        status: { type: 'String', required: true, defaultValue: 'draft' },
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },
        publishedAt: { type: 'Date' },
        validationRules: { type: 'Object' },
        renderOptions: { type: 'Object' },
      },
      indexes: {
        name: { index: true },
        type: { index: true },
        organization: { index: true },
        status: { index: true },
      },
    };

    const versionSchema = {
      className: 'CMSTemplateVersion',
      fields: {
        template: { type: 'Pointer', targetClass: 'CMSTemplate', required: true },
        version: { type: 'Number', required: true },
        schema: { type: 'Object', required: true },
        defaultContent: { type: 'Object' },
        validationRules: { type: 'Object' },
        renderOptions: { type: 'Object' },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        changes: { type: 'Array' },
      },
      indexes: {
        template: { index: true },
        version: { index: true },
      },
    };

    const schemaController = await parseServer.config.databaseController.loadSchema();
    await schemaController.addClassIfNotExists(schema);
    await schemaController.addClassIfNotExists(versionSchema);
  }

  /**
   * Register cloud functions
   */
  registerCloudFunctions() {
    Parse.Cloud.define('createTemplate', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { name, type, schema, defaultContent, validationRules, renderOptions } = request.params;

      if (!name || !type || !schema) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, 'Name, type, and schema are required');
      }

      try {
        // Validate schema
        const validation = await TemplateService.validateSchema(schema);
        if (!validation.isValid) {
          throw new Parse.Error(
            Parse.Error.INVALID_JSON,
            `Schema validation failed: ${validation.errors.join(', ')}`
          );
        }

        // Create template object
        const template = new Parse.Object('CMSTemplate');
        template.setACL(new Parse.ACL(request.user));
        template.set({
          name,
          type,
          schema,
          defaultContent,
          validationRules,
          renderOptions,
          version: 1,
          status: 'draft',
          organization: request.user,
          createdBy: request.user,
        });

        await template.save(null, { useMasterKey: true });

        // Create initial version
        const version = new Parse.Object('CMSTemplateVersion');
        version.set({
          template,
          version: 1,
          schema,
          defaultContent,
          validationRules,
          renderOptions,
          createdBy: request.user,
          changes: ['Initial version'],
        });

        await version.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'template_created',
          properties: {
            templateId: template.id,
            type,
            version: 1,
          },
          userId: request.user.id,
        });

        return template;
      } catch (error) {
        console.error('Template creation failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Template creation failed');
      }
    });

    Parse.Cloud.define('updateTemplate', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { templateId, schema, defaultContent, validationRules, renderOptions, changes } =
        request.params;

      try {
        const template = await new Parse.Query('CMSTemplate').get(templateId, {
          useMasterKey: true,
        });

        // Check permissions
        if (!template.getACL().getWriteAccess(request.user)) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Permission denied');
        }

        // Validate schema if provided
        if (schema) {
          const validation = await TemplateService.validateSchema(schema);
          if (!validation.isValid) {
            throw new Parse.Error(
              Parse.Error.INVALID_JSON,
              `Schema validation failed: ${validation.errors.join(', ')}`
            );
          }
        }

        // Create new version
        const newVersion = template.get('version') + 1;
        const version = new Parse.Object('CMSTemplateVersion');
        version.set({
          template,
          version: newVersion,
          schema: schema || template.get('schema'),
          defaultContent: defaultContent || template.get('defaultContent'),
          validationRules: validationRules || template.get('validationRules'),
          renderOptions: renderOptions || template.get('renderOptions'),
          createdBy: request.user,
          changes: changes || ['Updated template'],
        });

        await version.save(null, { useMasterKey: true });

        // Update template
        template.set({
          schema: schema || template.get('schema'),
          defaultContent: defaultContent || template.get('defaultContent'),
          validationRules: validationRules || template.get('validationRules'),
          renderOptions: renderOptions || template.get('renderOptions'),
          version: newVersion,
          updatedBy: request.user,
        });

        await template.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'template_updated',
          properties: {
            templateId: template.id,
            version: newVersion,
            changes,
          },
          userId: request.user.id,
        });

        return template;
      } catch (error) {
        console.error('Template update failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Template update failed');
      }
    });

    Parse.Cloud.define('publishTemplate', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { templateId } = request.params;

      try {
        const template = await new Parse.Query('CMSTemplate').get(templateId, {
          useMasterKey: true,
        });

        // Check permissions
        if (!template.getACL().getWriteAccess(request.user)) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Permission denied');
        }

        template.set({
          status: 'published',
          publishedAt: new Date(),
          updatedBy: request.user,
        });

        await template.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'template_published',
          properties: {
            templateId: template.id,
            version: template.get('version'),
          },
          userId: request.user.id,
        });

        return template;
      } catch (error) {
        console.error('Template publishing failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Template publishing failed');
      }
    });
  }

  /**
   * Register background jobs
   */
  registerJobs() {
    // Clean up old template versions
    Parse.Cloud.job('cleanupOldTemplateVersions', async () => {
      const query = new Parse.Query('CMSTemplate');
      const templates = await query.find({ useMasterKey: true });

      for (const template of templates) {
        try {
          const versionsQuery = new Parse.Query('CMSTemplateVersion');
          versionsQuery.equalTo('template', template);
          versionsQuery.descending('version');
          versionsQuery.skip(5); // Keep last 5 versions

          const oldVersions = await versionsQuery.find({ useMasterKey: true });
          if (oldVersions.length > 0) {
            await Parse.Object.destroyAll(oldVersions, { useMasterKey: true });
          }
        } catch (error) {
          console.error(`Error cleaning up versions for template ${template.id}:`, error);
        }
      }
    });
  }

  /**
   * Register webhooks
   */
  registerWebhooks() {
    Parse.Cloud.define('template.published', async request => {
      const { templateId } = request.params;
      const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

      await Parse.Cloud.run('triggerWebhook', {
        type: 'template.published',
        payload: {
          templateId: template.id,
          type: template.get('type'),
          name: template.get('name'),
          version: template.get('version'),
        },
      });
    });
  }
}

module.exports = ParseTemplatePlugin;
