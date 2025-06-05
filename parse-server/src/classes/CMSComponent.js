/**
 * CMSComponent Class
 * Defines reusable components for content creation
 */

const Parse = require('parse/node');

class CMSComponent extends Parse.Object {
  constructor() {
    super('CMSComponent');
  }

  static get className() {
    return 'CMSComponent';
  }

  static get schema() {
    return {
      // Component identification
      name: { type: 'String', required: true },
      type: { type: 'String', required: true },
      description: { type: 'String' },

      // Component structure
      schema: { type: 'Object', required: true },
      defaultProps: { type: 'Object' },
      validation: { type: 'Object' },

      // Component configuration
      config: { type: 'Object' },
      styles: { type: 'Object' },

      // Component categorization
      category: { type: 'String' },
      tags: { type: 'Array' },

      // Component status
      isGlobal: { type: 'Boolean', defaultValue: false },
      isActive: { type: 'Boolean', defaultValue: true },
      version: { type: 'Number', defaultValue: 1 },

      // Preview and documentation
      preview: { type: 'Object' },
      documentation: { type: 'Object' },

      // Component implementation
      implementation: {
        type: 'Object',
        required: true,
        defaultValue: {
          client: {
            script: '',
            style: '',
            template: '',
          },
          server: {
            script: '',
          },
        },
      },

      // Data configuration
      dataConfig: {
        type: 'Object',
        defaultValue: {
          sources: [],
          bindings: {},
          transforms: [],
          cache: {
            enabled: false,
            duration: 300,
          },
        },
      },

      // Analytics
      analytics: {
        type: 'Object',
        defaultValue: {
          usage: 0,
          performance: {
            renderTime: 0,
            updateTime: 0,
          },
          errors: 0,
        },
      },

      // Organization and user
      organization: { type: 'Pointer', targetClass: '_User', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },

      // Standard fields
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' },
      ACL: { type: 'ACL' },
    };
  }

  static get indexes() {
    return {
      type: { type: 'string' },
      category: { type: 'string' },
      isGlobal: { type: 'boolean' },
      isActive: { type: 'boolean' },
      organization: { type: 'string' },
    };
  }

  static get classLevelPermissions() {
    return {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresAuthentication: true },
    };
  }

  /**
   * Render component
   */
  async render(props = {}, context = {}) {
    try {
      const startTime = Date.now();

      // Validate props
      this.validateProps(props);

      // Load data if needed
      const data = await this.loadComponentData(props, context);

      // Execute server-side logic
      const serverResult = await this.executeServerScript(props, data, context);

      // Track performance
      const renderTime = Date.now() - startTime;
      await this.updateAnalytics({ renderTime });

      return {
        props,
        data,
        serverResult,
        implementation: this.get('implementation').client,
      };
    } catch (error) {
      await this.updateAnalytics({ error: true });
      throw error;
    }
  }

  /**
   * Load component data
   */
  async loadComponentData(props, context) {
    const dataConfig = this.get('dataConfig');
    const results = {};

    for (const source of dataConfig.sources) {
      try {
        // Check cache first
        if (source.cache?.enabled) {
          const cached = await this.getFromCache(source.id, props);
          if (cached) {
            results[source.id] = cached;
            continue;
          }
        }

        // Load and transform data
        const data = await this.loadDataSource(source, props, context);
        const transformed = this.applyTransforms(data, dataConfig.transforms);

        // Cache if enabled
        if (source.cache?.enabled) {
          await this.setInCache(source.id, transformed, source.cache.duration, props);
        }

        results[source.id] = transformed;
      } catch (error) {
        console.error(`Error loading data source ${source.id}:`, error);
        results[source.id] = null;
      }
    }

    return results;
  }

  /**
   * Execute server-side component logic
   */
  async executeServerScript(props, data, context) {
    const script = this.get('implementation').server.script;
    if (!script) return null;

    const sandbox = {
      props,
      data,
      context,
      Parse,
      component: this,
    };

    return await eval(`
      (async function() {
        ${script}
      })()
    `).call(sandbox);
  }

  /**
   * Update component analytics
   */
  async updateAnalytics(metrics) {
    const analytics = this.get('analytics');

    analytics.usage++;
    if (metrics.renderTime) {
      analytics.performance.renderTime =
        (analytics.performance.renderTime * (analytics.usage - 1) + metrics.renderTime) /
        analytics.usage;
    }
    if (metrics.error) {
      analytics.errors++;
    }

    this.set('analytics', analytics);
    await this.save(null, { useMasterKey: true });
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const component = request.object;

    // Set organization if not set
    if (!component.get('organization')) {
      const currentUser = Parse.User.current();
      component.set('organization', currentUser);
    }

    // Set creator/updater
    const currentUser = Parse.User.current();
    if (!component.get('createdBy')) {
      component.set('createdBy', currentUser);
    }
    component.set('updatedBy', currentUser);

    // Validate component schema
    await this.validateSchema(component);

    // Generate preview if not provided
    if (!component.get('preview')) {
      await this.generatePreview(component);
    }
  }

  /**
   * After save trigger
   */
  static async afterSave(request) {
    const component = request.object;

    // Update templates using this component if schema changes
    if (component.dirty('schema')) {
      await this.updateAssociatedTemplates(component);
    }
  }

  /**
   * Validate component schema
   */
  static async validateSchema(component) {
    const schema = component.get('schema');
    if (!schema || typeof schema !== 'object') {
      throw new Parse.Error(
        Parse.Error.INVALID_JSON,
        'Component schema must be a valid JSON object'
      );
    }

    // Validate schema structure
    this.validateSchemaStructure(schema);

    // Validate default props against schema
    const defaultProps = component.get('defaultProps');
    if (defaultProps) {
      await this.validateDefaultProps(schema, defaultProps);
    }
  }

  /**
   * Validate schema structure
   */
  static validateSchemaStructure(schema) {
    Object.entries(schema).forEach(([propName, propDef]) => {
      if (!propDef.type) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, `Property "${propName}" must have a type`);
      }

      // Validate property type
      if (!this.isValidPropType(propDef.type)) {
        throw new Parse.Error(
          Parse.Error.INVALID_JSON,
          `Invalid type "${propDef.type}" for property "${propName}"`
        );
      }
    });
  }

  /**
   * Check if property type is valid
   */
  static isValidPropType(type) {
    const validTypes = [
      'string',
      'number',
      'boolean',
      'object',
      'array',
      'richText',
      'image',
      'video',
      'link',
      'color',
      'date',
    ];
    return validTypes.includes(type);
  }

  /**
   * Validate default props against schema
   */
  static validateDefaultProps(schema, defaultProps) {
    Object.entries(defaultProps).forEach(([propName, value]) => {
      const propSchema = schema[propName];
      if (!propSchema) {
        throw new Parse.Error(
          Parse.Error.INVALID_JSON,
          `Unknown property "${propName}" in default props`
        );
      }

      // Validate value against property schema
      if (!this.isValidPropValue(value, propSchema)) {
        throw new Parse.Error(Parse.Error.INVALID_JSON, `Invalid value for property "${propName}"`);
      }
    });
  }

  /**
   * Check if property value is valid
   */
  static isValidPropValue(value, schema) {
    switch (schema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      // Add validation for other types
      default:
        return true; // Allow other types for now
    }
  }

  /**
   * Generate component preview
   */
  static async generatePreview(component) {
    const preview = {
      props: component.get('defaultProps') || {},
      thumbnail: null,
      previewHtml: null,
    };

    component.set('preview', preview);
  }

  /**
   * Update templates using this component
   */
  static async updateAssociatedTemplates(component) {
    const query = new Parse.Query('CMSTemplate');
    query.equalTo('components', component.id);

    const templates = await query.find({ useMasterKey: true });
    const updates = templates.map(template => this.updateTemplateComponent(template, component));

    await Promise.all(updates);
  }

  /**
   * Update component in template
   */
  static async updateTemplateComponent(template, component) {
    try {
      const schema = template.get('schema');
      // Update component references in template schema
      // Implement update logic here

      await template.save(null, { useMasterKey: true });
    } catch (error) {
      console.error(`Error updating template ${template.id}:`, error);
    }
  }
}

Parse.Object.registerSubclass('CMSComponent', CMSComponent);
module.exports = CMSComponent;
