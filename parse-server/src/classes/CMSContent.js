/**
 * CMSContent Class
 * Represents a content item in the CMS (pages, posts, etc.)
 */

class CMSContent {
  static className = 'CMSContent';

  /**
   * Get the schema for the CMSContent class
   * @returns {Object} Parse Schema definition
   */
  static getSchema() {
    return {
      className: this.className,
      fields: {
        // Basic content fields
        title: { type: 'String', required: true },
        slug: { type: 'String', required: true },
        content: { type: 'Object', required: true },
        status: { type: 'String', required: true, defaultValue: 'draft' },

        // Template and layout
        template: { type: 'Pointer', targetClass: 'CMSTemplate' },
        layout: { type: 'String' },

        // SEO and metadata
        meta: { type: 'Object' },
        seo: { type: 'Object' },

        // Publishing and scheduling
        publishedAt: { type: 'Date' },
        scheduledAt: { type: 'Date' },

        // Version control
        version: { type: 'Number', defaultValue: 1 },
        previousVersion: { type: 'Pointer', targetClass: 'CMSContent' },

        // Organization and user
        organization: { type: 'Pointer', targetClass: '_User', required: true },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User' },

        // Standard fields
        createdAt: { type: 'Date' },
        updatedAt: { type: 'Date' },
        ACL: { type: 'ACL' },
      },
      indexes: {
        slug: { type: 'string' },
        status: { type: 'string' },
        publishedAt: { type: 'date' },
        organization: { type: 'string' },
      },
      classLevelPermissions: {
        find: { '*': true },
        count: { '*': true },
        get: { '*': true },
        create: { requiresAuthentication: true },
        update: { requiresAuthentication: true },
        delete: { requiresAuthentication: true },
        addField: { requiresAuthentication: true },
      },
    };
  }

  /**
   * Before save trigger
   * @param {Parse.Object} content - The content object being saved
   * @returns {Promise}
   */
  static async beforeSave(content) {
    // Generate slug if not provided
    if (!content.get('slug')) {
      content.set('slug', this.generateSlug(content.get('title')));
    }

    // Set or update version
    if (!content.get('version')) {
      content.set('version', 1);
    } else if (content.dirty('content')) {
      content.increment('version');
    }

    // Set organization if not set
    if (!content.get('organization')) {
      const currentUser = Parse.User.current();
      content.set('organization', currentUser);
    }

    // Set creator/updater
    const currentUser = Parse.User.current();
    if (!content.get('createdBy')) {
      content.set('createdBy', currentUser);
    }
    content.set('updatedBy', currentUser);

    // Validate content structure
    await this.validateContent(content);
  }

  /**
   * After save trigger
   * @param {Parse.Object} content - The saved content object
   * @returns {Promise}
   */
  static async afterSave(content) {
    // Handle publishing
    if (content.get('status') === 'published') {
      await this.handlePublishing(content);
    }

    // Handle versioning
    if (content.get('version') > 1) {
      await this.handleVersioning(content);
    }
  }

  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Content title
   * @returns {string} URL-friendly slug
   */
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Validate content structure
   * @param {Parse.Object} content - Content object to validate
   * @returns {Promise}
   */
  static async validateContent(content) {
    const contentData = content.get('content');
    if (!contentData || typeof contentData !== 'object') {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'Content must be a valid JSON object');
    }

    // Additional validation based on template if specified
    const template = content.get('template');
    if (template) {
      await this.validateAgainstTemplate(content, template);
    }
  }

  /**
   * Handle content publishing
   * @param {Parse.Object} content - Content object being published
   * @returns {Promise}
   */
  static async handlePublishing(content) {
    content.set('publishedAt', new Date());

    // Emit publishing event
    await Parse.Cloud.run('onContentPublished', {
      contentId: content.id,
      version: content.get('version'),
    });
  }

  /**
   * Handle content versioning
   * @param {Parse.Object} content - Content object being versioned
   * @returns {Promise}
   */
  static async handleVersioning(content) {
    // Create a new version record
    const version = new Parse.Object('CMSContentVersion');
    version.set('content', content);
    version.set('versionNumber', content.get('version'));
    version.set('contentData', content.get('content'));
    await version.save(null, { useMasterKey: true });
  }

  /**
   * Validate content against template
   * @param {Parse.Object} content - Content object
   * @param {Parse.Object} template - Template object
   * @returns {Promise}
   */
  static async validateAgainstTemplate(content, template) {
    const templateSchema = template.get('schema');
    const contentData = content.get('content');

    // Implement template validation logic here
    // This would check if the content structure matches the template schema
  }
}

module.exports = CMSContent;
