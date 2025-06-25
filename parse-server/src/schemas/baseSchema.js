/**
 * Base schema fields for all CMS classes
 */

const baseSchema = {
  // Common fields for all CMS classes
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
  organization: {
    type: 'Pointer',
    targetClass: 'Organization',
    required: true,
  },
  status: {
    type: 'String',
    required: true,
    defaultValue: 'active',
  },
  metadata: {
    type: 'Object',
  },
};

module.exports = { baseSchema };