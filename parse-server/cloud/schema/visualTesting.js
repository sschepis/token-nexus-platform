/**
 * Schema definitions for visual testing
 */

const VisualBaseline = {
  className: 'VisualBaseline',
  fields: {
    componentId: { type: 'String', required: true },
    state: { type: 'String', required: true },
    screenshot: { type: 'File', required: true },
    createdAt: { type: 'Date', required: true },
    updatedAt: { type: 'Date' },
    organization: { type: 'Pointer', targetClass: 'Organization', required: true },
  },
  indexes: {
    component_state: {
      componentId: 1,
      state: 1,
    },
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

const VisualDiff = {
  className: 'VisualDiff',
  fields: {
    componentId: { type: 'String', required: true },
    state: { type: 'String', required: true },
    image: { type: 'File', required: true },
    createdAt: { type: 'Date', required: true },
    organization: { type: 'Pointer', targetClass: 'Organization', required: true },
    baseline: { type: 'Pointer', targetClass: 'VisualBaseline', required: true },
  },
  indexes: {
    component_state: {
      componentId: 1,
      state: 1,
    },
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

const VisualTestRun = {
  className: 'VisualTestRun',
  fields: {
    componentId: { type: 'String', required: true },
    state: { type: 'String', required: true },
    status: { type: 'String', required: true },
    differences: { type: 'Number' },
    diffImage: { type: 'Pointer', targetClass: 'VisualDiff' },
    createdAt: { type: 'Date', required: true },
    organization: { type: 'Pointer', targetClass: 'Organization', required: true },
  },
  indexes: {
    organization_date: {
      organization: 1,
      createdAt: -1,
    },
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
  },
};

// Add fields to Organization class for visual testing quotas
const OrganizationFields = {
  visualTestingQuota: { type: 'Number', defaultValue: 1000 },
  visualTestingUsage: { type: 'Number', defaultValue: 0 },
};

module.exports = {
  VisualBaseline,
  VisualDiff,
  VisualTestRun,
  OrganizationFields,
};
