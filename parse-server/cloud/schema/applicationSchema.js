const applicationSchema = {
  InstalledApplication: {
    className: 'InstalledApplication',
    fields: {
      name: { type: 'String', required: true },
      description: { type: 'String' },
      version: { type: 'String', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      status: { type: 'String', required: true, defaultValue: 'active' },
      settings: { type: 'Object', defaultValue: {} },
      metadata: { type: 'Object', defaultValue: {} },
    },
    indexes: {
      organization_status: { organization: 1, status: 1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },
};

module.exports = applicationSchema;
