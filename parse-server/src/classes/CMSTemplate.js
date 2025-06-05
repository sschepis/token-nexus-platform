/**
 * CMS Template Class
 * Manages reusable page layouts and structures
 */

const Parse = require('parse/node');

class CMSTemplate extends Parse.Object {
  constructor() {
    super('CMSTemplate');
  }

  static get className() {
    return 'CMSTemplate';
  }

  static get schema() {
    return {
      // Basic Info
      name: { type: 'String', required: true },
      description: { type: 'String' },
      type: {
        type: 'String',
        enum: ['page', 'section', 'email', 'document'],
        required: true,
      },
      category: {
        type: 'String',
        enum: ['standard', 'landing', 'admin', 'custom'],
        default: 'standard',
      },
      status: {
        type: 'String',
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
      },

      // Relationships
      application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },

      // Template Structure
      layout: {
        type: 'Object',
        required: true,
        default: {
          type: 'grid',
          rows: 12,
          columns: 12,
          areas: [],
          gaps: { row: 16, column: 16 },
        },
      },

      // Components
      components: {
        type: 'Array',
        required: true,
        default: [],
      },

      // Template Variables
      variables: {
        type: 'Array',
        default: [],
      },

      // Content Placeholders
      placeholders: {
        type: 'Array',
        default: [],
      },

      // Template Settings
      settings: {
        type: 'Object',
        default: {
          responsive: true,
          minWidth: 320,
          maxWidth: 1920,
          allowCustomization: true,
          requireAuth: false,
          cacheEnabled: true,
          cacheDuration: 3600,
        },
      },

      // Style Configuration
      styles: {
        type: 'Object',
        default: {
          global: {},
          layout: {},
          components: {},
          themes: [],
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
          structuredData: null,
        },
      },

      // Analytics Configuration
      analytics: {
        type: 'Object',
        default: {
          enabled: true,
          events: ['view', 'interact', 'convert'],
          goals: [],
          customDimensions: [],
        },
      },

      // Usage Statistics
      stats: {
        type: 'Object',
        default: {
          usage: 0,
          lastUsed: null,
          performance: {
            avgLoadTime: 0,
            avgRenderTime: 0,
          },
        },
      },

      // Metadata
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
      publishedAt: { type: 'Date' },
    };
  }

  /**
   * Initialize template
   */
  static async initialize(params) {
    const {
      name,
      description,
      type,
      category,
      application,
      createdBy,
      layout,
      components = [],
      settings = {},
    } = params;

    const template = new CMSTemplate();
    template.set('name', name);
    template.set('description', description);
    template.set('type', type);
    template.set('category', category);
    template.set('application', application);
    template.set('createdBy', createdBy);
    template.set('layout', layout);
    template.set('components', components);
    template.set('settings', {
      ...template.get('settings'),
      ...settings,
    });

    return template.save(null, { useMasterKey: true });
  }

  /**
   * Create page from template
   */
  async createPage(params = {}) {
    const { name, slug, variables = {}, content = {} } = params;

    // Validate variables
    this.validateVariables(variables);

    // Create page
    const page = new Parse.Object('CMSPage');
    page.set('name', name);
    page.set('slug', slug);
    page.set('template', this);
    page.set('application', this.get('application'));
    page.set('layout', this.get('layout'));
    page.set('components', this.processComponents(variables));
    page.set('content', this.processContent(content));
    page.set('settings', this.get('settings'));
    page.set('styles', this.get('styles'));
    page.set('seo', this.get('seo'));

    await page.save(null, { useMasterKey: true });

    // Update usage statistics
    await this.updateStats();

    return page;
  }

  /**
   * Process template components with variables
   */
  processComponents(variables) {
    return this.get('components').map(component => ({
      ...component,
      config: this.interpolateVariables(component.config, variables),
    }));
  }

  /**
   * Process template content
   */
  processContent(content) {
    const placeholders = this.get('placeholders');
    return placeholders.reduce((acc, placeholder) => {
      acc[placeholder.id] = content[placeholder.id] || placeholder.defaultContent;
      return acc;
    }, {});
  }

  /**
   * Validate template variables
   */
  validateVariables(variables) {
    const templateVars = this.get('variables');

    // Check required variables
    templateVars
      .filter(v => v.required)
      .forEach(v => {
        if (!(v.name in variables)) {
          throw new Error(`Missing required variable: ${v.name}`);
        }
      });

    // Validate variable types
    Object.entries(variables).forEach(([name, value]) => {
      const varDef = templateVars.find(v => v.name === name);
      if (!varDef) {
        throw new Error(`Unknown variable: ${name}`);
      }

      if (!this.validateVariableType(value, varDef.type)) {
        throw new Error(`Invalid type for variable ${name}`);
      }
    });
  }

  /**
   * Validate variable type
   */
  validateVariableType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }

  /**
   * Interpolate variables in object
   */
  interpolateVariables(obj, variables) {
    if (typeof obj !== 'object') return obj;

    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value.replace(/\${(\w+)}/g, (_, name) => variables[name] || '');
        } else if (typeof value === 'object') {
          acc[key] = this.interpolateVariables(value, variables);
        } else {
          acc[key] = value;
        }
        return acc;
      },
      Array.isArray(obj) ? [] : {}
    );
  }

  /**
   * Update template statistics
   */
  async updateStats() {
    const stats = this.get('stats');
    stats.usage++;
    stats.lastUsed = new Date();

    this.set('stats', stats);
    await this.save(null, { useMasterKey: true });
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const template = request.object;

    // Set timestamps
    if (!template.get('createdAt')) {
      template.set('createdAt', new Date());
    }
    template.set('updatedAt', new Date());

    // Validate components
    await this.validateComponents(template);
  }

  /**
   * Validate template components
   */
  static async validateComponents(template) {
    const components = template.get('components');
    const layout = template.get('layout');

    // Validate component positions
    components.forEach(component => {
      const { position } = component;

      // Check if position is within grid bounds
      if (position.x + position.w > layout.columns || position.y + position.h > layout.rows) {
        throw new Error(`Component ${component.id} position out of bounds`);
      }

      // Check for overlapping components
      const overlapping = components.find(
        other => other.id !== component.id && this.componentsOverlap(component, other)
      );

      if (overlapping) {
        throw new Error(`Component ${component.id} overlaps with ${overlapping.id}`);
      }
    });
  }

  /**
   * Check if components overlap
   */
  static componentsOverlap(a, b) {
    return !(
      a.position.x + a.position.w <= b.position.x ||
      b.position.x + b.position.w <= a.position.x ||
      a.position.y + a.position.h <= b.position.y ||
      b.position.y + b.position.h <= a.position.y
    );
  }
}

Parse.Object.registerSubclass('CMSTemplate', CMSTemplate);
module.exports = CMSTemplate;
