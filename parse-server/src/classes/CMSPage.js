/**
 * CMS Page Class
 * Manages application pages and their components
 */

const Parse = require('parse/node');

class CMSPage extends Parse.Object {
  constructor() {
    super('CMSPage');
  }

  static get className() {
    return 'CMSPage';
  }

  static get schema() {
    return {
      // Basic Info
      name: { type: 'String', required: true },
      title: { type: 'String', required: true },
      slug: { type: 'String', required: true },
      description: { type: 'String' },
      type: {
        type: 'String',
        enum: ['user', 'admin', 'system'],
        default: 'user',
      },
      status: {
        type: 'String',
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
      },

      // Relationships
      application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      parent: { type: 'Pointer', targetClass: 'CMSPage' }, // For nested pages

      // Layout & Components
      layout: {
        type: 'Object',
        required: true,
        default: {
          type: 'flex', // flex, grid, custom
          direction: 'column',
          components: [], // Array of component configurations
        },
      },

      // Page Components
      components: {
        type: 'Array',
        default: [],
      },

      // Data Sources
      dataSources: {
        type: 'Array',
        default: [],
      },

      // Access Control
      access: {
        type: 'Object',
        default: {
          public: false,
          roles: [], // Required roles
          users: [], // Specific users
          groups: [], // User groups
        },
      },

      // SEO Configuration
      seo: {
        type: 'Object',
        default: {
          title: '',
          description: '',
          keywords: [],
          ogImage: '',
          noIndex: false,
        },
      },

      // Page Settings
      settings: {
        type: 'Object',
        default: {
          theme: null, // Override application theme
          layout: {
            maxWidth: null,
            padding: null,
            gap: null,
          },
          navigation: {
            showInMenu: true,
            menuOrder: 0,
            menuIcon: null,
          },
          cache: {
            enabled: true,
            duration: 300, // seconds
          },
          analytics: {
            enabled: true,
            events: ['view', 'click', 'scroll'],
          },
        },
      },

      // Client-side Scripts
      scripts: {
        type: 'Array',
        default: [],
      },

      // Page Styles
      styles: {
        type: 'Array',
        default: [],
      },

      // Analytics
      analytics: {
        type: 'Object',
        default: {
          views: 0,
          uniqueVisitors: 0,
          averageTime: 0,
          bounceRate: 0,
          lastViewed: null,
        },
      },

      // Metadata
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
      publishedAt: { type: 'Date' },
      archivedAt: { type: 'Date' },
    };
  }

  /**
   * Initialize page
   */
  static async initialize(params) {
    const {
      name,
      title,
      slug,
      description,
      type,
      application,
      createdBy,
      layout,
      components = [],
      settings = {},
    } = params;

    const page = new CMSPage();
    page.set('name', name);
    page.set('title', title);
    page.set('slug', this.generateSlug(slug || title));
    page.set('description', description);
    page.set('type', type);
    page.set('application', application);
    page.set('createdBy', createdBy);
    page.set('layout', layout);
    page.set('components', components);
    page.set('settings', {
      ...page.get('settings'),
      ...settings,
    });

    return page.save(null, { useMasterKey: true });
  }

  /**
   * Render page
   */
  async render(params = {}, context = {}) {
    try {
      // Load data sources
      const data = await this.loadDataSources(params);

      // Render components
      const components = await this.renderComponents(data, context);

      // Generate page metadata
      const metadata = this.generateMetadata(data);

      // Track analytics
      await this.trackPageView(context);

      return {
        page: this,
        components,
        data,
        metadata,
      };
    } catch (error) {
      console.error(`Error rendering page ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Load page data sources
   */
  async loadDataSources(params) {
    const dataSources = this.get('dataSources');
    const results = {};

    for (const source of dataSources) {
      try {
        // Check cache first
        const cached = await this.getDataFromCache(source.id);
        if (cached) {
          results[source.id] = cached;
          continue;
        }

        // Load data based on source type
        let data;
        switch (source.type) {
          case 'api':
            data = await this.loadApiData(source, params);
            break;
          case 'query':
            data = await this.loadQueryData(source, params);
            break;
          case 'function':
            data = await this.loadFunctionData(source, params);
            break;
          default:
            throw new Error(`Unknown data source type: ${source.type}`);
        }

        // Cache results if enabled
        if (source.cache?.enabled) {
          await this.cacheData(source.id, data, source.cache.duration);
        }

        results[source.id] = data;
      } catch (error) {
        console.error(`Error loading data source ${source.id}:`, error);
        results[source.id] = null;
      }
    }

    return results;
  }

  /**
   * Render page components
   */
  async renderComponents(data, context) {
    const components = this.get('components');
    return Promise.all(
      components.map(async component => {
        try {
          return {
            ...component,
            rendered: await this.renderComponent(component, data, context),
          };
        } catch (error) {
          console.error(`Error rendering component ${component.id}:`, error);
          return {
            ...component,
            error: error.message,
          };
        }
      })
    );
  }

  /**
   * Generate page metadata
   */
  generateMetadata(data) {
    const seo = this.get('seo');
    return {
      title: this.interpolate(seo.title || this.get('title'), data),
      description: this.interpolate(seo.description || this.get('description'), data),
      keywords: seo.keywords,
      ogImage: seo.ogImage,
      noIndex: seo.noIndex,
    };
  }

  /**
   * Track page view
   */
  async trackPageView(context) {
    const analytics = this.get('analytics');
    const now = new Date();

    analytics.views++;
    if (context.user) {
      analytics.uniqueVisitors++;
    }
    analytics.lastViewed = now;

    this.set('analytics', analytics);
    await this.save(null, { useMasterKey: true });

    // Create analytics log
    const log = new Parse.Object('CMSPageView');
    log.set('page', this);
    log.set('user', context.user);
    log.set('sessionId', context.sessionId);
    log.set('userAgent', context.userAgent);
    log.set('ip', context.ip);
    await log.save(null, { useMasterKey: true });
  }

  /**
   * Generate URL-friendly slug
   */
  static generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const page = request.object;

    // Set timestamps
    if (!page.get('createdAt')) {
      page.set('createdAt', new Date());
    }
    page.set('updatedAt', new Date());

    // Validate slug uniqueness within application
    const slug = page.get('slug');
    const application = page.get('application');

    if (slug && application) {
      const query = new Parse.Query('CMSPage');
      query.equalTo('slug', slug);
      query.equalTo('application', application);
      if (page.id) {
        query.notEqualTo('objectId', page.id);
      }
      return query.first({ useMasterKey: true }).then(existing => {
        if (existing) {
          throw new Error(`Page with slug "${slug}" already exists in this application`);
        }
      });
    }
  }

  /**
   * After save trigger
   */
  static async afterSave(request) {
    const page = request.object;

    // Clear page cache if published
    if (page.get('status') === 'published') {
      Parse.Cloud.run('clearPageCache', { pageId: page.id });
    }
  }
}

Parse.Object.registerSubclass('CMSPage', CMSPage);
module.exports = CMSPage;
