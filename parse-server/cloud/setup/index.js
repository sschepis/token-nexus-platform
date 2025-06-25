/**
 * Setup Module Index
 * Exports all setup-related services and utilities
 */

const SetupOrchestrator = require('./SetupOrchestrator');
const SchemaService = require('./services/SchemaService');
const RoleService = require('./services/RoleService');
const ConfigService = require('./services/ConfigService');
const setupSchemas = require('./schemas');

module.exports = {
  SetupOrchestrator,
  SchemaService,
  RoleService,
  ConfigService,
  setupSchemas
};