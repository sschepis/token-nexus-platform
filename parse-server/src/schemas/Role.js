/**
 * _Role schema definition
 */

const RoleSchema = {
  className: '_Role',
  fields: {
    name: {
      type: 'String',
      required: true,
    },
    users: {
      type: 'Relation',
      targetClass: '_User',
    },
    roles: {
      type: 'Relation',
      targetClass: '_Role',
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

module.exports = RoleSchema;