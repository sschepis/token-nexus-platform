const alertSchema = {
  AIAlert: {
    className: 'AIAlert',
    fields: {
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      type: { type: 'String', required: true },
      message: { type: 'String', required: true },
      level: { type: 'String', required: true },
      status: { type: 'String', required: true, defaultValue: 'new' },
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
    },
    indexes: {
      org_status: { organization: 1, status: 1 },
      org_type: { organization: 1, type: 1 },
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

  Notification: {
    className: 'Notification',
    fields: {
      user: { type: 'Pointer', targetClass: '_User', required: true },
      type: { type: 'String', required: true },
      message: { type: 'String', required: true },
      level: { type: 'String', required: true },
      status: { type: 'String', required: true, defaultValue: 'unread' },
      alert: { type: 'Pointer', targetClass: 'AIAlert' },
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
    },
    indexes: {
      user_status: { user: 1, status: 1 },
      user_type: { user: 1, type: 1 },
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
};

module.exports = alertSchema;
