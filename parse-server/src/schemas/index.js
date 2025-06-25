/**
 * Schema definitions index
 * This file exports all schema definitions in a modular way
 */

// Import base utilities
const { baseSchema } = require('./baseSchema');
const { basePermissions } = require('./basePermissions');

// Import core schemas
const OrganizationSchema = require('./Organization');
const RoleSchema = require('./Role');
const SessionSchema = require('./Session');

// Import the remaining schemas from the original schema.js file
// We'll need to extract these from the original file
const { getOtherSchemas } = require('./otherSchemas');

/**
 * Get all schema definitions
 * @returns {Array} Array of schema definitions
 */
function getAllSchemas() {
  const coreSchemas = [
    OrganizationSchema,
    RoleSchema,
    SessionSchema,
  ];

  // Get other schemas from the original file
  const otherSchemas = getOtherSchemas(baseSchema, basePermissions);

  return [...coreSchemas, ...otherSchemas];
}

module.exports = getAllSchemas();

// Also export individual schemas for direct access
module.exports.OrganizationSchema = OrganizationSchema;
module.exports.RoleSchema = RoleSchema;
module.exports.SessionSchema = SessionSchema;
module.exports.baseSchema = baseSchema;
module.exports.basePermissions = basePermissions;