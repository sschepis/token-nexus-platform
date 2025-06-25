/**
 * PlatformConfig schema definition
 */

const PlatformConfigSchema = {
  className: 'PlatformConfig',
  fields: {
    currentState: { type: 'String', defaultValue: 'PRISTINE', required: true },
    coreContractsImportedForNetwork: { type: 'String' },
    coreFactoryAddresses: { type: 'Object', defaultValue: {} },
    parentOrgId: { type: 'String' },
    lastSetupError: { type: 'String' },
    platformVersion: { type: 'String', defaultValue: '1.0.0' },
    setupCompletedAt: { type: 'Date' },
  },
  classLevelPermissions: {
    find: { '*': false }, 
    get: { '*': false },   
    create: { '*': false }, 
    update: { '*': false }, 
    delete: { '*': false }, 
    addField: { '*': false },
    protectedFields: { '*': [] }
  },
};

module.exports = PlatformConfigSchema;