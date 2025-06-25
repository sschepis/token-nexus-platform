/**
 * Organization schema definition
 */

const { basePermissions } = require('./basePermissions');

const OrganizationSchema = {
  className: 'Organization',
  fields: {
    name: {
      type: 'String',
      required: true,
    },
    subdomain: {
      type: 'String',
      required: true,
    },
    description: {
      type: 'String',
    },
    industry: {
      type: 'String',
    },
    status: {
      type: 'String',
      required: true,
      defaultValue: 'Active',
    },
    createdBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true,
    },
    updatedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true,
    },
    settings: {
      type: 'Object',
      defaultValue: {},
    },
    metadata: {
      type: 'Object',
      defaultValue: {},
    },
    isParentOrg: {
      type: 'Boolean',
      defaultValue: false,
    },
    administrator: {
      type: 'String',
    },
    facets: {
      type: 'Array',
      defaultValue: [],
    },
  },
  classLevelPermissions: basePermissions,
};

module.exports = OrganizationSchema;