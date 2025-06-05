/**
 * CMSWebPage Class
 * Represents a website page created with GrapesJS
 */

const Parse = require('parse/node');
const cache = require('../utils/cache');
const events = require('../utils/events');

class CMSWebPage extends Parse.Object {
  constructor() {
    super('CMSWebPage');
  }

  static get className() {
    return 'CMSWebPage';
  }

  static get fields() {
    return {
      // Content fields
      content: {
        type: 'Object',
        required: true,
        defaultValue: {
          html: '',
          css: '',
          components: [],
          styles: [],
        },
      },
      metadata: {
        type: 'Object',
        required: true,
        defaultValue: {
          title: '',
          description: '',
          keywords: [],
          slug: '',
          template: null,
          isHomepage: false,
          menuOrder: 0,
        },
      },
      status: {
        type: 'String',
        required: true,
        defaultValue: 'draft',
        options: ['draft', 'published', 'archived'],
      },

      // SEO fields
      seo: {
        type: 'Object',
        defaultValue: {
          title: '',
          description: '',
          ogImage: null,
          canonical: '',
          robots: 'index,follow',
        },
      },

      // Publishing fields
      publishedAt: {
        type: 'Date',
      },
      publishedBy: {
        type: 'Pointer',
        targetClass: '_User',
      },
      scheduledAt: {
        type: 'Date',
      },

      // Organization and user fields
      organization: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      createdBy: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      updatedBy: {
        type: 'Pointer',
        targetClass: '_User',
      },

      // URL and routing
      path: {
        type: 'String',
        required: true,
        defaultValue: '/',
      },
      customDomain: {
        type: 'String',
      },

      // Layout and design
      layout: {
        type: 'String',
        defaultValue: 'default',
      },
      theme: {
        type: 'String',
        defaultValue: 'default',
      },

      // Cache and optimization
      cacheControl: {
        type: 'String',
        defaultValue: 'public, max-age=3600',
      },
      lastModified: {
        type: 'Date',
      },
    };
  }

  static get indexes() {
    return {
      // Path and organization must be unique together
      pathOrg: {
        path: 1,
        organization: 1,
      },
      // Status and organization for quick filtering
      statusOrg: {
        status: 1,
        organization: 1,
      },
      // Published date for sorting
      publishedAt: {
        publishedAt: -1,
      },
      // Scheduled publishing
      scheduledAt: {
        scheduledAt: 1,
      },
    };
  }

  static get classLevelPermissions() {
    return {
      find: {
        '*': true,
      },
      count: {
        '*': true,
      },
      get: {
        '*': true,
      },
      create: {
        requiresAuthentication: true,
      },
      update: {
        requiresAuthentication: true,
      },
      delete: {
        requiresAuthentication: true,
      },
      addField: {
        requiresAuthentication: true,
      },
    };
  }

  /**
   * Initialize page
   */
  static async initialize(params) {
    const page = new CMSWebPage();

    // Set default values
    Object.entries(this.fields).forEach(([field, config]) => {
      if (config.defaultValue !== undefined) {
        page.set(field, config.defaultValue);
      }
    });

    // Set provided values
    Object.entries(params).forEach(([key, value]) => {
      page.set(key, value);
    });

    return page.save(null, { useMasterKey: true });
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const page = request.object;

    // Generate slug if not provided
    if (!page.get('metadata').slug) {
      const title = page.get('metadata').title || 'untitled';
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      page.set('metadata', {
        ...page.get('metadata'),
        slug,
      });
    }

    // Update lastModified
    page.set('lastModified', new Date());

    // Validate content
    const content = page.get('content');
    if (!content || !content.html || !content.css) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'Content must include HTML and CSS');
    }

    // Validate path format
    const path = page.get('path');
    if (!path.startsWith('/')) {
      page.set('path', `/${path}`);
    }

    // Ensure unique path per organization
    const query = new Parse.Query('CMSWebPage');
    query.equalTo('path', page.get('path'));
    query.equalTo('organization', page.get('organization'));
    if (page.id) {
      query.notEqualTo('objectId', page.id);
    }
    const existing = await query.first({ useMasterKey: true });
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A page with this path already exists');
    }
  }

  /**
   * After save trigger
   */
  static async afterSave(request) {
    const page = request.object;

    // Clear cache for this page
    await cache.delete(`page:${page.id}`);
    await cache.delete(`page:${page.get('path')}`);

    // If published, trigger webhooks
    if (page.get('status') === 'published') {
      await events.emit('website.page.published', {
        pageId: page.id,
        path: page.get('path'),
        organization: page.get('organization').id,
      });
    }
  }

  /**
   * Before delete trigger
   */
  static async beforeDelete(request) {
    const page = request.object;

    // Check if homepage
    if (page.get('metadata').isHomepage) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Cannot delete homepage');
    }

    // Delete all versions
    const query = new Parse.Query('CMSWebPageVersion');
    query.equalTo('page', page);
    const versions = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(versions, { useMasterKey: true });
  }

  /**
   * After delete trigger
   */
  static async afterDelete(request) {
    const page = request.object;

    // Clear cache
    await cache.delete(`page:${page.id}`);
    await cache.delete(`page:${page.get('path')}`);

    // Trigger webhooks
    await events.emit('website.page.deleted', {
      pageId: page.id,
      path: page.get('path'),
      organization: page.get('organization').id,
    });
  }

  /**
   * Publish page
   */
  async publish(user) {
    this.set('status', 'published');
    this.set('publishedAt', new Date());
    this.set('publishedBy', user);
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Unpublish page
   */
  async unpublish() {
    this.set('status', 'draft');
    this.unset('publishedAt');
    this.unset('publishedBy');
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Schedule publishing
   */
  async schedule(date, user) {
    this.set('scheduledAt', date);
    this.set('publishedBy', user);
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Clone page
   */
  async clone(newTitle) {
    const clone = new CMSWebPage();

    // Copy all fields except unique identifiers
    const fields = Object.keys(CMSWebPage.fields);
    fields.forEach(field => {
      if (field !== 'objectId' && field !== 'createdAt' && field !== 'updatedAt') {
        clone.set(field, this.get(field));
      }
    });

    // Update title and generate new slug
    const metadata = clone.get('metadata');
    metadata.title = newTitle;
    metadata.slug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    clone.set('metadata', metadata);

    // Reset publishing fields
    clone.set('status', 'draft');
    clone.unset('publishedAt');
    clone.unset('publishedBy');
    clone.unset('scheduledAt');

    return clone.save(null, { useMasterKey: true });
  }
}

Parse.Object.registerSubclass('CMSWebPage', CMSWebPage);
module.exports = CMSWebPage;
