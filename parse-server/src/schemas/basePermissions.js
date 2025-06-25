/**
 * Base permissions for schema definitions
 */

const basePermissions = {
  find: { '*': true },
  count: { '*': true },
  get: { '*': true },
  create: { '*': true },
  update: { requiresAuthentication: true },
  delete: { requiresAuthentication: true },
  addField: { '*': true },
};

module.exports = { basePermissions };