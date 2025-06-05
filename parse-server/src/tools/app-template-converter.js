const fs = require('fs').promises;
const path = require('path');
const { validateTemplate } = require('../utils/validation');
const { logger } = require('../utils/logger');

/**
 * Converts application templates between different formats and versions
 */
class AppTemplateConverter {
  /**
   * Convert a template from one format to another
   * @param {Object} options Conversion options
   * @param {string} options.sourcePath Path to source template
   * @param {string} options.targetPath Path to save converted template
   * @param {string} options.sourceFormat Original template format (v1, v2, etc)
   * @param {string} options.targetFormat Desired template format
   * @param {Object} options.mappings Custom field mappings
   * @return {Promise<Object>} Conversion result
   */
  async convert(options) {
    const { sourcePath, targetPath, sourceFormat, targetFormat, mappings = {} } = options;

    try {
      // Read source template
      const sourceTemplate = await this.readTemplate(sourcePath);

      // Convert template
      const convertedTemplate = await this.convertTemplate(
        sourceTemplate,
        sourceFormat,
        targetFormat,
        mappings
      );

      // Validate converted template
      const validationResult = await validateTemplate(convertedTemplate, targetFormat);

      if (!validationResult.isValid) {
        throw new Error(`Invalid template: ${validationResult.errors.join(', ')}`);
      }

      // Save converted template
      await this.saveTemplate(targetPath, convertedTemplate);

      return {
        success: true,
        template: convertedTemplate,
        validation: validationResult,
      };
    } catch (error) {
      logger.error('Template conversion failed', {
        error: error.message,
        source: sourcePath,
        sourceFormat,
        targetFormat,
      });
      throw error;
    }
  }

  /**
   * Read template from file
   * @param {string} templatePath Path to template file
   * @return {Promise<Object>} Template object
   */
  async readTemplate(templatePath) {
    const content = await fs.readFile(templatePath, 'utf8');

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid template JSON: ${error.message}`);
    }
  }

  /**
   * Save converted template to file
   * @param {string} targetPath Path to save template
   * @param {Object} template Template object
   */
  async saveTemplate(targetPath, template) {
    const content = JSON.stringify(template, null, 2);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf8');
  }

  /**
   * Convert template between formats
   * @param {Object} template Source template
   * @param {string} sourceFormat Source format
   * @param {string} targetFormat Target format
   * @param {Object} mappings Field mappings
   * @return {Object} Converted template
   */
  convertTemplate(template, sourceFormat, targetFormat, mappings) {
    // Handle different format conversions
    switch (`${sourceFormat}->${targetFormat}`) {
      case 'v1->v2':
        return this.convertV1ToV2(template, mappings);
      case 'v2->v3':
        return this.convertV2ToV3(template, mappings);
      default:
        throw new Error(`Unsupported conversion: ${sourceFormat} to ${targetFormat}`);
    }
  }

  /**
   * Convert v1 template to v2 format
   * @param {Object} template V1 template
   * @param {Object} mappings Field mappings
   * @return {Object} V2 template
   */
  convertV1ToV2(template, mappings) {
    const { name, description, version, components = [], settings = {}, ...rest } = template;

    // Convert to v2 format
    return {
      metadata: {
        name,
        description,
        version: version || '1.0.0',
        format: 'v2',
        convertedFrom: 'v1',
        convertedAt: new Date().toISOString(),
      },
      components: components.map(component => ({
        id: component.id || component.name,
        type: component.type,
        name: component.name,
        config: this.mapFields(component.config || {}, mappings.components || {}),
        dependencies: component.requires || [],
      })),
      configuration: {
        settings: this.mapFields(settings, mappings.settings || {}),
        features: rest.features || [],
        permissions: rest.permissions || [],
        environments: this.convertEnvironments(rest.environments || {}),
      },
      resources: {
        storage: rest.storage || {},
        database: rest.database || {},
        compute: rest.compute || {},
      },
    };
  }

  /**
   * Convert v2 template to v3 format
   * @param {Object} template V2 template
   * @param {Object} mappings Field mappings
   * @return {Object} V3 template
   */
  convertV2ToV3(template, mappings) {
    const { metadata, components, configuration, resources } = template;

    // Convert to v3 format
    return {
      metadata: {
        ...metadata,
        format: 'v3',
        convertedFrom: 'v2',
        convertedAt: new Date().toISOString(),
        schema: 'https://schema.gemcms.com/templates/v3',
      },
      spec: {
        components: components.map(component => ({
          ...component,
          spec: this.mapFields(component.config, mappings.components || {}),
          config: undefined,
        })),
        configuration: {
          ...configuration,
          settings: this.mapFields(configuration.settings, mappings.settings || {}),
          features: this.convertFeatures(configuration.features),
        },
        resources: {
          ...resources,
          limits: this.convertResourceLimits(resources),
        },
      },
      status: {
        phase: 'Pending',
        conditions: [],
      },
    };
  }

  /**
   * Map fields using provided mappings
   * @param {Object} fields Source fields
   * @param {Object} mappings Field mappings
   * @return {Object} Mapped fields
   */
  mapFields(fields, mappings) {
    const result = {};

    for (const [key, value] of Object.entries(fields)) {
      const targetKey = mappings[key] || key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[targetKey] = this.mapFields(value, mappings);
      } else {
        result[targetKey] = value;
      }
    }

    return result;
  }

  /**
   * Convert environment configurations
   * @param {Object} environments Environment configurations
   * @return {Object} Converted environments
   */
  convertEnvironments(environments) {
    const result = {};

    for (const [env, config] of Object.entries(environments)) {
      result[env] = {
        settings: config.settings || {},
        variables: config.variables || {},
        features: config.features || {},
        resources: config.resources || {},
      };
    }

    return result;
  }

  /**
   * Convert feature configurations to new format
   * @param {Array} features Feature configurations
   * @return {Object} Converted features
   */
  convertFeatures(features) {
    return features.reduce((acc, feature) => {
      if (typeof feature === 'string') {
        acc[feature] = { enabled: true };
      } else {
        acc[feature.name] = {
          enabled: feature.enabled !== false,
          config: feature.config || {},
        };
      }

      return acc;
    }, {});
  }

  /**
   * Convert resource limits to new format
   * @param {Object} resources Resource configurations
   * @return {Object} Converted resource limits
   */
  convertResourceLimits(resources) {
    return {
      storage: {
        size: resources.storage?.size || '1Gi',
        files: resources.storage?.files || 1000,
      },
      database: {
        size: resources.database?.size || '1Gi',
        connections: resources.database?.connections || 10,
      },
      compute: {
        cpu: resources.compute?.cpu || '100m',
        memory: resources.compute?.memory || '128Mi',
      },
    };
  }
}

module.exports = new AppTemplateConverter();
