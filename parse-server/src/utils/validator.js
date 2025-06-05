/**
 * Validator Utility
 * Provides validation functions for various plugin components
 */

const Joi = require('joi');
const mime = require('mime-types');
const config = require('../config');
const logger = require('./logger');

class Validator {
  /**
   * Validate content against schema
   * @param {Object} content - Content to validate
   * @param {Object} schema - Schema to validate against
   * @returns {Object} Validated content
   * @throws {Error} Validation error
   */
  static validateContent(content, schema) {
    try {
      const joiSchema = this.convertSchemaToJoi(schema);
      const { error, value } = joiSchema.validate(content, {
        abortEarly: false,
        stripUnknown: !config.get('content.validation.strict'),
      });

      if (error) {
        throw new Error(`Content validation failed: ${error.message}`);
      }

      return value;
    } catch (error) {
      logger.error(error, { context: 'content validation' });
      throw error;
    }
  }

  /**
   * Convert CMS schema to Joi schema
   * @param {Object} schema - CMS schema
   * @returns {Object} Joi schema
   */
  static convertSchemaToJoi(schema) {
    const joiSchema = {};

    Object.entries(schema).forEach(([field, definition]) => {
      joiSchema[field] = this.convertFieldToJoi(definition);
    });

    return Joi.object(joiSchema);
  }

  /**
   * Convert field definition to Joi schema
   * @param {Object} field - Field definition
   * @returns {Object} Joi field schema
   */
  static convertFieldToJoi(field) {
    let joiField;

    switch (field.type) {
      case 'String':
        joiField = Joi.string();
        if (field.minLength) joiField = joiField.min(field.minLength);
        if (field.maxLength) joiField = joiField.max(field.maxLength);
        if (field.pattern) joiField = joiField.pattern(new RegExp(field.pattern));
        break;

      case 'Number':
        joiField = Joi.number();
        if (field.min) joiField = joiField.min(field.min);
        if (field.max) joiField = joiField.max(field.max);
        break;

      case 'Boolean':
        joiField = Joi.boolean();
        break;

      case 'Date':
        joiField = Joi.date();
        break;

      case 'Object':
        joiField = field.schema ? this.convertSchemaToJoi(field.schema) : Joi.object();
        break;

      case 'Array':
        joiField = Joi.array();
        if (field.items) {
          joiField = joiField.items(this.convertFieldToJoi(field.items));
        }
        if (field.minItems) joiField = joiField.min(field.minItems);
        if (field.maxItems) joiField = joiField.max(field.maxItems);
        break;

      case 'Pointer':
        joiField = Joi.string().regex(/^[a-zA-Z0-9]{10}$/);
        break;

      case 'File':
        joiField = Joi.object({
          name: Joi.string().required(),
          url: Joi.string().uri().required(),
          type: Joi.string(),
        });
        break;

      default:
        joiField = Joi.any();
    }

    // Add common field validations
    if (field.required) joiField = joiField.required();
    if (field.default !== undefined) joiField = joiField.default(field.default);

    return joiField;
  }

  /**
   * Validate media file
   * @param {Object} file - File object
   * @param {string} type - File MIME type
   * @param {number} size - File size in bytes
   * @returns {boolean} Validation result
   * @throws {Error} Validation error
   */
  static validateMedia(file, type, size) {
    try {
      // Check file presence
      if (!file) {
        throw new Error('File is required');
      }

      // Validate file type
      const supportedTypes = [
        ...config.get('media.supportedTypes.images', []),
        ...config.get('media.supportedTypes.videos', []),
        ...config.get('media.supportedTypes.documents', []),
      ];

      if (!supportedTypes.includes(type)) {
        throw new Error(`Unsupported file type: ${type}`);
      }

      // Validate file size
      const maxSize = config.get('media.limits.maxFileSize');
      if (size > maxSize) {
        throw new Error(`File size exceeds limit of ${maxSize} bytes`);
      }

      // Validate file extension
      const extension = mime.extension(type);
      if (!extension) {
        throw new Error(`Invalid file type: ${type}`);
      }

      return true;
    } catch (error) {
      logger.error(error, { context: 'media validation' });
      throw error;
    }
  }

  /**
   * Validate template schema
   * @param {Object} schema - Template schema
   * @returns {boolean} Validation result
   * @throws {Error} Validation error
   */
  static validateTemplateSchema(schema) {
    try {
      if (!schema || typeof schema !== 'object') {
        throw new Error('Schema must be a valid object');
      }

      Object.entries(schema).forEach(([field, definition]) => {
        this.validateFieldDefinition(field, definition);
      });

      return true;
    } catch (error) {
      logger.error(error, { context: 'template validation' });
      throw error;
    }
  }

  /**
   * Validate field definition
   * @param {string} field - Field name
   * @param {Object} definition - Field definition
   * @throws {Error} Validation error
   */
  static validateFieldDefinition(field, definition) {
    const validTypes = [
      'String',
      'Number',
      'Boolean',
      'Date',
      'Object',
      'Array',
      'Pointer',
      'File',
      'GeoPoint',
      'Polygon',
      'Relation',
    ];

    if (!definition.type) {
      throw new Error(`Field "${field}" must have a type`);
    }

    if (!validTypes.includes(definition.type)) {
      throw new Error(`Invalid type "${definition.type}" for field "${field}"`);
    }

    // Validate nested schema for Object type
    if (definition.type === 'Object' && definition.schema) {
      this.validateTemplateSchema(definition.schema);
    }

    // Validate array items for Array type
    if (definition.type === 'Array' && definition.items) {
      this.validateFieldDefinition(`${field}.items`, definition.items);
    }
  }

  /**
   * Validate component props
   * @param {Object} props - Component props
   * @param {Object} schema - Component schema
   * @returns {Object} Validated props
   * @throws {Error} Validation error
   */
  static validateComponentProps(props, schema) {
    try {
      return this.validateContent(props, schema);
    } catch (error) {
      logger.error(error, { context: 'component validation' });
      throw error;
    }
  }
}

module.exports = Validator;
