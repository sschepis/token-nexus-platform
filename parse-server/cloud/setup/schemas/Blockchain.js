/**
 * Blockchain schema definition
 */

const systemAdminPermissions = {
  find: { 'requiresAuthentication': true },
  get: { 'requiresAuthentication': true },
  create: { 'role:SystemAdmin': true },
  update: { 'role:SystemAdmin': true },
  delete: { 'role:SystemAdmin': true },
  addField: { 'role:SystemAdmin': true },
  protectedFields: { '*': [] }
};

const BlockchainSchema = {
  className: 'Blockchain',
  fields: {
    name: { type: 'String', required: true }, 
    networkId: { type: 'Number', required: true }, 
    rpcEndpoint: { type: 'String', required: true },
    blockExplorerUrl: { type: 'String' },
    isTestnet: { type: 'Boolean', defaultValue: false },
  },
  classLevelPermissions: systemAdminPermissions,
};

module.exports = BlockchainSchema;