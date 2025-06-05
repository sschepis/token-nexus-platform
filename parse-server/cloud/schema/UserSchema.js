/**
 * Schema definition for _User class extensions
 * This file defines additional fields for the built-in _User class
 * to support multi-organization functionality.
 */

const UserSchema = {
  className: '_User',
  fields: {
    // Pointer to the user's currently selected or primary active organization
    currentOrganization: {
      type: 'Pointer',
      targetClass: 'Organization',
      required: false, // Not required as a user might not have an organization initially
      // For initial setup/login, the orgId should be set post-login/setup
    },
    // Relation to all organizations the user is a member of
    organizations: {
      type: 'Relation',
      targetClass: 'Organization',
      required: false,
      // This relation will store references to Organization objects
      // Use relation().add() and relation().remove() to manage memberships
      // Use relation().query().find() to retrieve organizations
    },
    // Add other relevant user fields here if they are custom extensions
    // For example, if you add 'isAdmin' boolean to _User
    // isAdmin: { type: 'Boolean', required: false, defaultValue: false },
  },
  classLevelPermissions: {
    // Default CLP for _User is often restrictive.
    // Ensure these permissions align with your application's security model.
    // Master Key access is typically used for server-side updates of these fields.
    find: { "requiresAuthentication": true },
    get: { "requiresAuthentication": true },
    create: { "*": true }, // Allow public signup
    update: { "requiresAuthentication": true },
    delete: { "requiresAuthentication": true },
  },
  // Indexes can be added if these fields are frequently queried
  indexes: {
    currentOrganization: {
      currentOrganization: 1,
    },
    organizations: {
      organizations: 1, // Index for queries on organizations array
    },
  },
};

module.exports = UserSchema;