/**
 * Schema definition for CMSTrigger
 */

const CMSTrigger = {
  className: 'CMSTrigger',
  fields: {
    name: { type: 'String', required: true },
    description: { type: 'String' },
    type: { type: 'String', required: true }, // beforeSave, afterSave, beforeDelete, afterDelete, etc.
    className: { type: 'String', required: true }, // The Parse class this trigger applies to
    code: { type: 'String', required: true }, // The JavaScript code to execute
    enabled: { type: 'Boolean', required: true, defaultValue: true },
    application: { type: 'Pointer', targetClass: 'CMSApplication' },
    organization: { type: 'Pointer', targetClass: 'Organization' },
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    updatedBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastExecuted: { type: 'Date' },
    executionCount: { type: 'Number', defaultValue: 0 },
    errorCount: { type: 'Number', defaultValue: 0 },
    lastError: { type: 'String' },
    settings: { type: 'Object' }, // Additional trigger configuration
  },
  indexes: {
    type_className: {
      type: 1,
      className: 1,
    },
    enabled_type: {
      enabled: 1,
      type: 1,
    },
    organization: {
      organization: 1,
    },
    application: {
      application: 1,
    },
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

module.exports = CMSTrigger;