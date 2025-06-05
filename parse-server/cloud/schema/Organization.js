/**
 * Schema definition for Organization
 */

const Organization = {
  className: 'Organization',
  fields: {
    name: { type: 'String', required: true },
    description: { type: 'String' },
    status: { type: 'String', required: true, defaultValue: 'active' },
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    updatedBy: { type: 'Pointer', targetClass: '_User', required: true },
    settings: { type: 'Object' },
    // Relation to users who are administrators of this organization
    administrators: { type: 'Relation', targetClass: '_User' },
    // Plan type for the organization
    planType: { type: 'String', defaultValue: 'enterprise' },
  },
  indexes: {
    name: {
      name: 1,
    },
  },
  classLevelPermissions: {
    find: { '*': true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

module.exports = Organization;
