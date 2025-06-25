/**
 * Setup-specific schema definitions index
 */

const PlatformConfigSchema = require('./PlatformConfig');
const BlockchainSchema = require('./Blockchain');

// System admin permissions for blockchain-related schemas
const systemAdminPermissions = {
  find: { 'requiresAuthentication': true },
  get: { 'requiresAuthentication': true },
  create: { 'role:SystemAdmin': true },
  update: { 'role:SystemAdmin': true },
  delete: { 'role:SystemAdmin': true },
  addField: { 'role:SystemAdmin': true },
  protectedFields: { '*': [] }
};

// Additional blockchain-related schemas
const AbiSchema = {
  className: 'Abi',
  fields: {
    name: { type: 'String', required: true }, 
    data: { type: 'Object', required: true }, 
  },
  classLevelPermissions: systemAdminPermissions,
};

const MethodSchema = {
  className: 'Method', 
  fields: {
    name: { type: 'String', required: true },
    code: { type: 'String' }, 
    contractName: { type: 'String' },
    abi: { type: 'Pointer', targetClass: 'Abi', required: true },
    inputs: { type: 'Array' },
    outputs: { type: 'Array' },
    stateMutability: { type: 'String' },
    type: { type: 'String', defaultValue: 'function' },
  },
  classLevelPermissions: systemAdminPermissions,
};

const EventDefinitionSchema = {
  className: 'EventDefinition', 
  fields: {
    name: { type: 'String', required: true },
    code: { type: 'String' }, 
    contractName: { type: 'String' },
    abi: { type: 'Pointer', targetClass: 'Abi', required: true },
    data: { type: 'Object' }, 
    inputs: { type: 'Array' },
    type: { type: 'String', defaultValue: 'event' },
  },
  classLevelPermissions: systemAdminPermissions,
};

const setupSchemas = [
  PlatformConfigSchema,
  BlockchainSchema,
  AbiSchema,
  MethodSchema,
  EventDefinitionSchema,
];

module.exports = setupSchemas;