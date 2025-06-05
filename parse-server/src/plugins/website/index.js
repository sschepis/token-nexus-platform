/**
 * Website Builder Plugin for Parse Server
 */

const WebsiteService = require('../../services/WebsiteService');
const AnalyticsService = require('../../services/AnalyticsService');
const CacheService = require('../../services/CacheService');

/**
 * Website Plugin
 * @param {Object} config Plugin configuration
 */
class ParseWebsitePlugin {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Required by Parse Server plugin system
   * Called when plugin is loaded
   * @param {ParseServer} parseServer Parse Server instance
   */
  async load(parseServer) {
    // Register schemas
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
   * Register Parse class schemas
   * @param {ParseServer} parseServer Parse Server instance
   */
  async registerSchema(parseServer) {
    const pageSchema = {
      className: 'CMSWebPage',
      fields: {
        title: { type: 'String', required: true },
        path: { type: 'String', required: true },
        template: { type: 'Pointer', targetClass: 'CMSTemplate' },
        content: { type: 'Object', required: true },
        metadata: { type: 'Object' },
        status: { type: 'String', required: true, defaultValue: 'draft' },
        version: { type: 'Number', required: true, defaultValue: 1 },
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },
        publishedAt: { type: 'Date' },
        scheduledAt: { type: 'Date' },
        parent: { type: 'Pointer', targetClass: 'CMSWebPage' },
        order: { type: 'Number', defaultValue: 0 },
        settings: { type: 'Object' },
      },
      indexes: {
        path: { unique: true },
        status: { index: true },
        organization: { index: true },
        parent: { index: true },
      },
    };

    const versionSchema = {
      className: 'CMSWebPageVersion',
      fields: {
        page: { type: 'Pointer', targetClass: 'CMSWebPage', required: true },
        version: { type: 'Number', required: true },
        content: { type: 'Object', required: true },
        metadata: { type: 'Object' },
        settings: { type: 'Object' },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        changes: { type: 'Array' },
      },
      indexes: {
        page: { index: true },
        version: { index: true },
      },
    };

    const navigationSchema = {
      className: 'CMSNavigation',
      fields: {
        name: { type: 'String', required: true },
        structure: { type: 'Array', required: true },
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },
      },
      indexes: {
        name: { index: true },
        organization: { index: true },
      },
    };

    const schemaController = await parseServer.config.databaseController.loadSchema();
    await schemaController.addClassIfNotExists(pageSchema);
    await schemaController.addClassIfNotExists(versionSchema);
    await schemaController.addClassIfNotExists(navigationSchema);
  }

  /**
   * Register cloud functions
   */
  registerCloudFunctions() {
    Parse.Cloud.define('createWebPage', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { title, path, templateId, content, metadata, settings, parentId } = request.params;

      if (!title || !path || !content) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, 'Title, path, and content are required');
      }

      try {
        // Validate path
        const pathExists = await new Parse.Query('CMSWebPage')
          .equalTo('path', path)
          .first({ useMasterKey: true });

        if (pathExists) {
          throw new Parse.Error(
            Parse.Error.DUPLICATE_VALUE,
            'A page with this path already exists'
          );
        }

        let template = null;
        if (templateId) {
          template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });
        }

        let parent = null;
        if (parentId) {
          parent = await new Parse.Query('CMSWebPage').get(parentId, { useMasterKey: true });
        }

        // Create page object
        const page = new Parse.Object('CMSWebPage');
        page.setACL(new Parse.ACL(request.user));
        page.set({
          title,
          path,
          template,
          content,
          metadata: metadata || {},
          settings: settings || {},
          parent,
          status: 'draft',
          version: 1,
          organization: request.user,
          createdBy: request.user,
        });

        await page.save(null, { useMasterKey: true });

        // Create initial version
        const version = new Parse.Object('CMSWebPageVersion');
        version.set({
          page,
          version: 1,
          content,
          metadata: metadata || {},
          settings: settings || {},
          createdBy: request.user,
          changes: ['Initial version'],
        });

        await version.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'webpage_created',
          properties: {
            pageId: page.id,
            path,
            template: template?.id,
          },
          userId: request.user.id,
        });

        return page;
      } catch (error) {
        console.error('Web page creation failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Web page creation failed');
      }
    });

    Parse.Cloud.define('updateWebPage', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { pageId, content, metadata, settings, changes } = request.params;

      try {
        const page = await new Parse.Query('CMSWebPage').get(pageId, { useMasterKey: true });

        // Check permissions
        if (!page.getACL().getWriteAccess(request.user)) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Permission denied');
        }

        // Create new version
        const newVersion = page.get('version') + 1;
        const version = new Parse.Object('CMSWebPageVersion');
        version.set({
          page,
          version: newVersion,
          content: content || page.get('content'),
          metadata: metadata || page.get('metadata'),
          settings: settings || page.get('settings'),
          createdBy: request.user,
          changes: changes || ['Updated page'],
        });

        await version.save(null, { useMasterKey: true });

        // Update page
        page.set({
          content: content || page.get('content'),
          metadata: metadata || page.get('metadata'),
          settings: settings || page.get('settings'),
          version: newVersion,
          updatedBy: request.user,
        });

        await page.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'webpage_updated',
          properties: {
            pageId: page.id,
            version: newVersion,
            changes,
          },
          userId: request.user.id,
        });

        // Invalidate cache
        await CacheService.delete(`webpage:${page.id}`);
        await CacheService.delete(`webpage:${page.get('path')}`);

        return page;
      } catch (error) {
        console.error('Web page update failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Web page update failed');
      }
    });

    Parse.Cloud.define('publishWebPage', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { pageId, scheduledAt } = request.params;

      try {
        const page = await new Parse.Query('CMSWebPage').get(pageId, { useMasterKey: true });

        // Check permissions
        if (!page.getACL().getWriteAccess(request.user)) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Permission denied');
        }

        if (scheduledAt) {
          // Schedule publication
          page.set('status', 'scheduled');
          page.set('scheduledAt', new Date(scheduledAt));
        } else {
          // Publish immediately
          page.set('status', 'published');
          page.set('publishedAt', new Date());
        }

        page.set('updatedBy', request.user);
        await page.save(null, { useMasterKey: true });

        // Track analytics
        await AnalyticsService.trackEvent({
          name: 'webpage_published',
          properties: {
            pageId: page.id,
            scheduled: !!scheduledAt,
            scheduledAt,
          },
          userId: request.user.id,
        });

        // Handle publishing workflow
        await WebsiteService.handlePagePublishing(pageId, scheduledAt);

        // Invalidate cache
        await CacheService.delete(`webpage:${page.id}`);
        await CacheService.delete(`webpage:${page.get('path')}`);

        return page;
      } catch (error) {
        console.error('Web page publishing failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Web page publishing failed');
      }
    });

    Parse.Cloud.define('updateNavigation', async request => {
      if (!request.user) {
        throw new Parse.Error(Parse.Error.SESSION_MISSING, 'User must be authenticated');
      }

      const { name, structure } = request.params;

      if (!name || !structure) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, 'Name and structure are required');
      }

      try {
        let navigation = await new Parse.Query('CMSNavigation')
          .equalTo('name', name)
          .equalTo('organization', request.user)
          .first({ useMasterKey: true });

        if (!navigation) {
          navigation = new Parse.Object('CMSNavigation');
          navigation.setACL(new Parse.ACL(request.user));
        } else if (!navigation.getACL().getWriteAccess(request.user)) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Permission denied');
        }

        navigation.set({
          name,
          structure,
          organization: request.user,
          updatedBy: request.user,
        });

        if (!navigation.get('createdBy')) {
          navigation.set('createdBy', request.user);
        }

        await navigation.save(null, { useMasterKey: true });

        // Invalidate cache
        await CacheService.delete(`navigation:${name}`);

        return navigation;
      } catch (error) {
        console.error('Navigation update failed:', error);
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Navigation update failed');
      }
    });
  }

  /**
   * Register background jobs
   */
  registerJobs() {
    // Process scheduled pages
    Parse.Cloud.job('processScheduledPages', async () => {
      const query = new Parse.Query('CMSWebPage');
      query.equalTo('status', 'scheduled');
      query.lessThanOrEqualTo('scheduledAt', new Date());

      const pages = await query.find({ useMasterKey: true });

      for (const page of pages) {
        try {
          await WebsiteService.handlePagePublishing(page.id);
        } catch (error) {
          console.error(`Error publishing page ${page.id}:`, error);
        }
      }
    });

    // Clean up old page versions
    Parse.Cloud.job('cleanupOldPageVersions', async () => {
      const query = new Parse.Query('CMSWebPage');
      const pages = await query.find({ useMasterKey: true });

      for (const page of pages) {
        try {
          const versionsQuery = new Parse.Query('CMSWebPageVersion');
          versionsQuery.equalTo('page', page);
          versionsQuery.descending('version');
          versionsQuery.skip(10); // Keep last 10 versions

          const oldVersions = await versionsQuery.find({ useMasterKey: true });
          if (oldVersions.length > 0) {
            await Parse.Object.destroyAll(oldVersions, { useMasterKey: true });
          }
        } catch (error) {
          console.error(`Error cleaning up versions for page ${page.id}:`, error);
        }
      }
    });
  }

  /**
   * Register webhooks
   */
  registerWebhooks() {
    Parse.Cloud.define('website.page.published', async request => {
      const { pageId } = request.params;
      const page = await new Parse.Query('CMSWebPage').get(pageId, { useMasterKey: true });

      await Parse.Cloud.run('triggerWebhook', {
        type: 'website.page.published',
        payload: {
          pageId: page.id,
          path: page.get('path'),
          title: page.get('title'),
        },
      });
    });
  }
}

module.exports = ParseWebsitePlugin;
