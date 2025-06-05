/**
 * Schema definition for CMSApplication
 */

const CMSApplication = {
  className: 'CMSApplication',
  fields: {
    name: { type: 'String', required: true },
    description: { type: 'String' },
    type: { type: 'String', required: true },
    version: { type: 'String', required: true },
    status: { type: 'String', required: true },
    isTemplate: { type: 'Boolean', required: true },
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    updatedBy: { type: 'Pointer', targetClass: '_User', required: true },
    template: { type: 'Pointer', targetClass: 'CMSTemplate' },
    components: { type: 'Array' },
    content: { type: 'Object' },
    configuration: { type: 'Object' },
    settings: { type: 'Object' },
    organization: { type: 'Pointer', targetClass: 'Organization', required: false },
  },
  indexes: {
    name_type: {
      name: 1,
      type: 1,
    },
  },
  classLevelPermissions: {
    find: { '*': true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

module.exports = CMSApplication;
