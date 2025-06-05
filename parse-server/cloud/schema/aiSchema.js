const aiSchema = {
  AIUsage: {
    className: 'AIUsage',
    fields: {
      user: { type: 'Pointer', targetClass: '_User', required: true },
      date: { type: 'Date', required: true },
      tokens: { type: 'Number', required: true, defaultValue: 0 },
      organization: { type: 'Pointer', targetClass: 'Organization' },
    },
    indexes: {
      user_date: { user: 1, date: 1 },
      org_date: { organization: 1, date: 1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresMaster: true },
      addField: { requiresMaster: true },
    },
  },

  AISettings: {
    className: 'AISettings',
    fields: {
      dailyTokenLimit: { type: 'Number', required: true, defaultValue: 100000 },
      organization: { type: 'Pointer', targetClass: 'Organization' },
      provider: { type: 'String', required: true },
      model: { type: 'String', required: true },
      temperature: { type: 'Number', defaultValue: 0.7 },
      maxTokens: { type: 'Number' },
      enabled: { type: 'Boolean', required: true, defaultValue: true },
    },
    indexes: {
      organization: { organization: 1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresMaster: true },
      update: { requiresMaster: true },
      delete: { requiresMaster: true },
      addField: { requiresMaster: true },
    },
  },

  AIConversation: {
    className: 'AIConversation',
    fields: {
      user: { type: 'Pointer', targetClass: '_User', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization' },
      messages: { type: 'Array', required: false, defaultValue: [] },
      provider: { type: 'String', required: false },
      model: { type: 'String', required: false },
      totalTokens: { type: 'Number', defaultValue: 0 },
      status: { type: 'String', defaultValue: 'active' },
    },
    indexes: {
      user_created: { user: 1, createdAt: -1 },
      org_created: { organization: 1, createdAt: -1 },
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

module.exports = aiSchema;
