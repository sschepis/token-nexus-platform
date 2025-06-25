/**
 * _Session schema definition
 */

const SessionSchema = {
  className: '_Session',
  fields: {
    user: {
      type: 'Pointer',
      targetClass: '_User',
      required: true,
    },
    sessionToken: {
      type: 'String',
      required: true,
    },
    expiresAt: {
      type: 'Date',
    },
    createdWith: {
      type: 'Object',
    },
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    count: { requiresAuthentication: true },
    get: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true },
    addField: { requiresAuthentication: true },
  },
};

module.exports = SessionSchema;