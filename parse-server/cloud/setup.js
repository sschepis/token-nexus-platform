/**
 * Modular Setup System
 * This file provides cloud functions for platform setup using a well-structured modular approach
 */

const SetupOrchestrator = require('./setup/SetupOrchestrator');

/**
 * Ensure core infrastructure is set up
 * Creates schemas, roles, and platform configuration
 */
Parse.Cloud.define('ensureCoreInfrastructure', async (request) => {
  if (!request.master) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required.');
  }
  
  return await SetupOrchestrator.ensureCoreInfrastructure();
});

/**
 * Get current setup status
 */
Parse.Cloud.define('getSetupStatus', async (request) => {
  if (!request.master) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required.');
  }
  
  return await SetupOrchestrator.getSetupStatus();
});

/**
 * Validate setup integrity
 */
Parse.Cloud.define('validateSetup', async (request) => {
  if (!request.master) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required.');
  }
  
  return await SetupOrchestrator.validateSetup();
});

// Legacy function support - keeping the original parseAbiForCloud function
// TODO: This should be moved to a dedicated ABI service module
async function parseAbiForCloud(abiObject, abiJsonData) {
  if (!abiObject || !abiJsonData || !Array.isArray(abiJsonData)) {
    console.warn('parseAbiForCloud: Invalid abiObject or abiJsonData provided.');
    return { methods: [], eventDefinitions: [] };
  }
  
  const abiName = abiObject.get('name');
  const methods = [];
  const eventDefinitions = [];
  
  for (const item of abiJsonData) {
    if (item.type === 'function') {
      const Method = Parse.Object.extend('Method');
      const method = new Method();
      method.set('name', item.name);
      method.set('code', `${abiName}.${item.name}`);
      method.set('contractName', abiName);
      method.set('abi', abiObject);
      method.set('inputs', item.inputs || []);
      method.set('outputs', item.outputs || []);
      method.set('stateMutability', item.stateMutability || 'nonpayable');
      method.set('type', item.type);
      
      const methodACL = new Parse.ACL();
      methodACL.setRoleReadAccess('SystemAdmin', true);
      methodACL.setRoleWriteAccess('SystemAdmin', true);
      method.setACL(methodACL);
      
      methods.push(method);
    } else if (item.type === 'event') {
      const EventDefinition = Parse.Object.extend('EventDefinition');
      const eventDef = new EventDefinition();
      eventDef.set('name', item.name);
      eventDef.set('code', `${abiName}.${item.name}`);
      eventDef.set('contractName', abiName);
      eventDef.set('abi', abiObject);
      eventDef.set('data', item);
      eventDef.set('inputs', item.inputs || []);
      eventDef.set('type', item.type);
      
      const eventACL = new Parse.ACL();
      eventACL.setRoleReadAccess('SystemAdmin', true);
      eventACL.setRoleWriteAccess('SystemAdmin', true);
      eventDef.setACL(eventACL);
      
      eventDefinitions.push(eventDef);
    }
  }
  
  return { methods, eventDefinitions };
}

// Export for use in other modules
module.exports = {
  SetupOrchestrator,
  parseAbiForCloud
};

console.log('✓ Modular setup system loaded');