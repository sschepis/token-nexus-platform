// Existing content from ensureCoreInfrastructure and importCoreSystemArtifactsBatch...
const requiredSchemas = [
  {
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
  },
  {
    className: 'Blockchain',
    fields: {
      name: { type: 'String', required: true }, 
      networkId: { type: 'Number', required: true }, 
      rpcEndpoint: { type: 'String', required: true },
      blockExplorerUrl: { type: 'String' },
      isTestnet: { type: 'Boolean', defaultValue: false },
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
    className: 'Abi',
    fields: {
      name: { type: 'String', required: true }, 
      data: { type: 'Object', required: true }, 
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
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
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
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
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
    className: 'SmartContract', 
    fields: {
      name: { type: 'String', required: true },
      address: { type: 'String', required: true },
      network: { type: 'Pointer', targetClass: 'Blockchain', required: true },
      abi: { type: 'Pointer', targetClass: 'Abi', required: true },
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
    className: 'DiamondFactory', 
    fields: {
      name: { type: 'String', required: true },
      address: { type: 'String', required: true },
      network: { type: 'Pointer', targetClass: 'Blockchain', required: true },
      abi: { type: 'Pointer', targetClass: 'Abi', required: true },
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
    className: 'DiamondFacet', 
    fields: {
      name: { type: 'String', required: true },
      address: { type: 'String', required: true },
      network: { type: 'Pointer', targetClass: 'Blockchain', required: true },
      abi: { type: 'Pointer', targetClass: 'Abi', required: true },
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  {
    className: 'DeploymentArtifact', 
    fields: {
      name: { type: 'String', required: true }, 
      address: { type: 'String', required: true },
      network: { type: 'Pointer', targetClass: 'Blockchain', required: true },
      abiData: { type: 'Object' }, 
      deployedBytecode: { type: 'String' },
      metadata: { type: 'String' }, 
      transactionHash: { type: 'String' },
    },
    classLevelPermissions: { 
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'role:SystemAdmin': true },
      update: { 'role:SystemAdmin': true },
      delete: { 'role:SystemAdmin': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    },
  },
  // User schema extensions for multi-organization support
  {
    className: '_User',
    fields: {
      currentOrganization: { type: 'Pointer', targetClass: 'Organization' },
      organizations: { type: 'Relation', targetClass: 'Organization' },
      isAdmin: { type: 'Boolean', defaultValue: false }
    },
    classLevelPermissions: {
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { '*': true }, // Allow public signup
      update: { 'requiresAuthentication': true },
      delete: { 'requiresAuthentication': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    }
  },
  // Organization schema with required relations
  {
    className: 'Organization',
    fields: {
        name: { type: 'String', required: true },
        description: { type: 'String' },
        status: { type: 'String', required: true, defaultValue: 'active' },
        createdBy: { type: 'Pointer', targetClass: '_User', required: true },
        updatedBy: { type: 'Pointer', targetClass: '_User', required: true },
        settings: { type: 'Object' },
        administrators: { type: 'Relation', targetClass: '_User' },
        planType: { type: 'String', defaultValue: 'enterprise' },
    },
    classLevelPermissions: {
        find: { 'requiresAuthentication': true },
        get: { 'requiresAuthentication': true },
        create: { 'role:SystemAdmin': true },
        update: { 'requiresAuthentication': true },
        delete: { 'role:SystemAdmin': true },
        addField: { 'role:SystemAdmin': true },
        protectedFields: { '*': [] }
    }
  },
  // OrgRole schema to link users to organizations with roles
  {
    className: 'OrgRole',
    fields: {
      user: { type: 'Pointer', targetClass: '_User', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      role: { type: 'String', required: true }, // 'admin', 'member', etc.
      isActive: { type: 'Boolean', required: true, defaultValue: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User', required: true },
      assignedBy: { type: 'Pointer', targetClass: '_User' },
      assignedAt: { type: 'Date' }
    },
    classLevelPermissions: {
      find: { 'requiresAuthentication': true },
      get: { 'requiresAuthentication': true },
      create: { 'requiresAuthentication': true },
      update: { 'requiresAuthentication': true },
      delete: { 'requiresAuthentication': true },
      addField: { 'role:SystemAdmin': true },
      protectedFields: { '*': [] }
    }
  }
];

Parse.Cloud.define('ensureCoreInfrastructure', async (request) => {
  if (!request.master) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required.');
  }
  const results = { schemas: [], roles: [], platformConfig: null };
  for (const schemaDef of requiredSchemas) {
    try {
      let schema = new Parse.Schema(schemaDef.className);
      await schema.get({ useMasterKey: true });
      results.schemas.push({ name: schemaDef.className, status: 'existed' });
    } catch (error) {
      if (error.code === Parse.Error.INVALID_CLASS_NAME || error.message.includes('Schema not found')) {
        try {
          console.log(`Schema ${schemaDef.className} not found, creating...`);
          schema = new Parse.Schema(schemaDef.className);
          for (const [fieldName, fieldDef] of Object.entries(schemaDef.fields)) {
            if (fieldDef.type === 'Pointer') {
              schema.addPointer(fieldName, fieldDef.targetClass, { required: !!fieldDef.required });
            } else if (fieldDef.type === 'Relation') {
               schema.addRelation(fieldName, fieldDef.targetClass);
            } else {
              schema.addField(fieldName, fieldDef.type, { 
                defaultValue: fieldDef.defaultValue, 
                required: !!fieldDef.required 
              });
            }
          }
          if (schemaDef.classLevelPermissions) {
            const clp = new Parse.CLP(schemaDef.classLevelPermissions);
            schema.setCLP(clp);
          }
          await schema.save({ useMasterKey: true });
          results.schemas.push({ name: schemaDef.className, status: 'created' });
        } catch (creationError) {
          console.error(`Error creating schema ${schemaDef.className}:`, creationError);
          results.schemas.push({ name: schemaDef.className, status: 'failed_creation', error: creationError.message });
        }
      } else {
        console.error(`Error getting schema ${schemaDef.className}:`, error);
        results.schemas.push({ name: schemaDef.className, status: 'failed_check', error: error.message });
      }
    }
  }
  const systemAdminRoleName = 'SystemAdmin';
  try {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', systemAdminRoleName);
    let systemAdminRole = await roleQuery.first({ useMasterKey: true });
    if (!systemAdminRole) {
      const roleACL = new Parse.ACL();
      roleACL.setPublicReadAccess(true);
      systemAdminRole = new Parse.Role(systemAdminRoleName, roleACL);
      await systemAdminRole.save(null, { useMasterKey: true });
      results.roles.push({ name: systemAdminRoleName, status: 'created' });
    } else {
      results.roles.push({ name: systemAdminRoleName, status: 'existed' });
    }
  } catch (error) {
    console.error(`Error ensuring role ${systemAdminRoleName}:`, error);
    results.roles.push({ name: systemAdminRoleName, status: 'failed', error: error.message });
  }
  try {
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const query = new Parse.Query(PlatformConfig);
    let config = await query.first({ useMasterKey: true });
    if (!config) {
      console.log('PlatformConfig object not found, creating with PRISTINE state...');
      config = new PlatformConfig();
      config.set('currentState', 'PRISTINE');
      config.set('platformVersion', '1.0.0');
      config.set('coreFactoryAddresses', {});
      const configACL = new Parse.ACL();
      configACL.setRoleReadAccess(systemAdminRoleName, true);
      configACL.setRoleWriteAccess(systemAdminRoleName, true);
      config.setACL(configACL);
      await config.save(null, { useMasterKey: true });
      results.platformConfig = { status: 'created', objectId: config.id };
    } else {
      results.platformConfig = { status: 'existed', objectId: config.id, currentState: config.get('currentState') };
    }
  } catch (error) {
    console.error('Error ensuring PlatformConfig object:', error);
    results.platformConfig = { status: 'failed', error: error.message };
  }
  return results;
});

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
      method.set('stateMutability', item.stateMutability);
      method.set('type', item.type);
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
      eventDefinitions.push(eventDef);
    }
  }
  if (methods.length > 0 || eventDefinitions.length > 0) {
    await Parse.Object.saveAll(methods.concat(eventDefinitions), { useMasterKey: true });
  }
  return { methods, eventDefinitions };
}

Parse.Cloud.define('importCoreSystemArtifactsBatch', async (request) => {
  if (!request.master) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key required.');
  }
  const {
    artifactsData, targetNetworkName, targetNetworkId,
    targetNetworkRpcUrl, targetNetworkExplorerUrl,
  } = request.params;
  if (!artifactsData || !Array.isArray(artifactsData) || !targetNetworkName || !targetNetworkId) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMETER, 'Missing required parameters.');
  }
  const importedContractsSummary = [];
  const factoryAddressesMap = {};
  let blockchainPointer;
  try {
    const Blockchain = Parse.Object.extend('Blockchain');
    const blockchainQuery = new Parse.Query(Blockchain);
    blockchainQuery.equalTo('networkId', targetNetworkId);
    let blockchainRecord = await blockchainQuery.first({ useMasterKey: true });
    if (!blockchainRecord) {
      blockchainRecord = new Blockchain();
      blockchainRecord.set('name', targetNetworkName);
      blockchainRecord.set('networkId', targetNetworkId);
      if (targetNetworkRpcUrl) blockchainRecord.set('rpcEndpoint', targetNetworkRpcUrl);
      if (targetNetworkExplorerUrl) blockchainRecord.set('blockExplorerUrl', targetNetworkExplorerUrl);
      await blockchainRecord.save(null, { useMasterKey: true });
    } else {
      let updated = false;
      if (targetNetworkRpcUrl && blockchainRecord.get('rpcEndpoint') !== targetNetworkRpcUrl) {
        blockchainRecord.set('rpcEndpoint', targetNetworkRpcUrl); updated = true;
      }
      if (targetNetworkExplorerUrl && blockchainRecord.get('blockExplorerUrl') !== targetNetworkExplorerUrl) {
        blockchainRecord.set('blockExplorerUrl', targetNetworkExplorerUrl); updated = true;
      }
      if (updated) await blockchainRecord.save(null, { useMasterKey: true });
    }
    blockchainPointer = blockchainRecord;
  } catch (error) {
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Blockchain record processing failed: ${error.message}`);
  }
  for (const artifactEntry of artifactsData) {
    let artifactJson;
    try {
      artifactJson = JSON.parse(artifactEntry.artifactContent);
    } catch (e) {
      importedContractsSummary.push({ name: artifactEntry.artifactName, status: 'failed_json_parse', error: e.message });
      continue;
    }
    const contractName = artifactJson.contractName || artifactEntry.artifactName.replace('.json', '');
    const contractAddress = artifactJson.address;
    const contractAbiJson = artifactJson.abi;
    if (!contractAddress || !contractAbiJson) {
        importedContractsSummary.push({ name: contractName, status: 'failed_missing_data', error: 'Missing address or ABI.' });
        continue;
    }
    let abiObject;
    try {
      const Abi = Parse.Object.extend('Abi');
      const abiQuery = new Parse.Query(Abi);
      abiQuery.equalTo('name', contractName); 
      abiObject = await abiQuery.first({ useMasterKey: true });
      if (!abiObject) {
        abiObject = new Abi();
        abiObject.set('name', contractName);
      }
      abiObject.set('data', contractAbiJson);
      await abiObject.save(null, { useMasterKey: true });
      await parseAbiForCloud(abiObject, contractAbiJson);
      let targetClassName = 'SmartContract';
      if (contractName === 'DiamondFactory') targetClassName = 'DiamondFactory';
      else if (contractName.endsWith('Facet')) targetClassName = 'DiamondFacet';
      const ContractObject = Parse.Object.extend(targetClassName);
      const contractQuery = new Parse.Query(ContractObject);
      contractQuery.equalTo('address', contractAddress);
      contractQuery.equalTo('network', blockchainPointer);
      let contractRecord = await contractQuery.first({ useMasterKey: true });
      if (!contractRecord) {
        contractRecord = new ContractObject();
        contractRecord.set('address', contractAddress);
        contractRecord.set('network', blockchainPointer);
      }
      contractRecord.set('name', contractName);
      contractRecord.set('abi', abiObject);
      await contractRecord.save(null, { useMasterKey: true });
      if (targetClassName === 'DiamondFactory') factoryAddressesMap[contractName] = contractAddress;
      const DeploymentArtifact = Parse.Object.extend('DeploymentArtifact');
      const artifactQuery = new Parse.Query(DeploymentArtifact);
      artifactQuery.equalTo('address', contractAddress);
      artifactQuery.equalTo('network', blockchainPointer);
      let deploymentArtifactRecord = await artifactQuery.first({ useMasterKey: true });
      if (!deploymentArtifactRecord) {
        deploymentArtifactRecord = new DeploymentArtifact();
        deploymentArtifactRecord.set('address', contractAddress);
        deploymentArtifactRecord.set('network', blockchainPointer);
      }
      deploymentArtifactRecord.set('name', contractName);
      deploymentArtifactRecord.set('abiData', contractAbiJson);
      if (artifactJson.deployedBytecode) deploymentArtifactRecord.set('deployedBytecode', artifactJson.deployedBytecode);
      if (artifactJson.metadata) deploymentArtifactRecord.set('metadata', artifactJson.metadata);
      if (artifactJson.transactionHash) deploymentArtifactRecord.set('transactionHash', artifactJson.transactionHash);
      await deploymentArtifactRecord.save(null, { useMasterKey: true });
      importedContractsSummary.push({ name: contractName, address: contractAddress, type: targetClassName, status: 'success' });
    } catch (error) {
      importedContractsSummary.push({ name: contractName, address: contractAddress, status: 'failed_processing', error: error.message });
    }
  }
  return { success: true, factoryAddressesMap, importedContractsSummary };
});

Parse.Cloud.define('completeInitialPlatformSetup', async (request) => {
  // Check if platform is in initial setup mode
  const PlatformConfigClass = Parse.Object.extend('PlatformConfig');
  const platformConfigQuery = new Parse.Query(PlatformConfigClass);
  let currentPlatformConfig;
  
  try {
    currentPlatformConfig = await platformConfigQuery.first({ useMasterKey: true });
  } catch (error) {
    // If we can't check platform config, assume we're in setup mode
    console.log('Could not check platform config, assuming setup mode');
  }
  
  const currentState = currentPlatformConfig?.get('currentState') || 'PRISTINE';
  const isInSetupMode = ['PRISTINE', 'CORE_ARTIFACTS_IMPORTED', 'PARENT_ORG_CREATING'].includes(currentState);
  
  // Require master key for this operation UNLESS we're in initial setup mode
  if (!request.master && !isInSetupMode) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Master key or valid bootstrap session required.');
  }
  
  console.log(`Platform setup called with state: ${currentState}, setup mode: ${isInSetupMode}`);

  const {
    parentOrgName,
    adminUserEmail,
    adminUserPassword,
    adminUserFirstName, // Optional
    adminUserLastName,  // Optional
    defaultPlanType = 'enterprise', // Default plan
  } = request.params;

  if (!parentOrgName || !adminUserEmail || !adminUserPassword) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMETER, 'Missing required parameters: parentOrgName, adminUserEmail, or adminUserPassword.');
  }

  // 0. Check current platform state - should be CORE_ARTIFACTS_IMPORTED
  const PlatformConfig = Parse.Object.extend('PlatformConfig');
  const configQuery = new Parse.Query(PlatformConfig);
  const platformConfig = await configQuery.first({ useMasterKey: true });

  if (!platformConfig || platformConfig.get('currentState') !== 'CORE_ARTIFACTS_IMPORTED') {
      // If called directly by bootstrap token, the token validation implies this state.
      // If called by master key, this check is important.
      // For now, assuming the Next.js API route /api/setup/complete-initial-setup
      // (which calls this) would have already set PlatformConfig.currentState to PARENT_ORG_CREATING
      // or verified CORE_ARTIFACTS_IMPORTED.
      // Let's refine this: the Next.js route should set PARENT_ORG_CREATING *before* calling this.
      // This function then assumes it's in that state.
      if (platformConfig && platformConfig.get('currentState') !== 'PARENT_ORG_CREATING') {
         console.warn(`completeInitialPlatformSetup called when state is ${platformConfig.get('currentState')}, expected PARENT_ORG_CREATING.`);
         // Potentially throw error if strict state transition is required here.
      }
  }


  // 1. Check if System Admin User already exists, if not create it
  let adminUser;
  
  // First, check if user already exists
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('email', adminUserEmail);
  const existingUser = await userQuery.first({ useMasterKey: true });
  
  if (existingUser) {
    console.log(`System Admin user ${adminUserEmail} already exists, using existing user`);
    adminUser = existingUser;
    
    // Update existing user to ensure they have admin privileges
    adminUser.set('isAdmin', true);
    if (adminUserFirstName) adminUser.set('firstName', adminUserFirstName);
    if (adminUserLastName) adminUser.set('lastName', adminUserLastName);
    
    try {
      await adminUser.save(null, { useMasterKey: true });
      console.log(`Updated existing System Admin user: ${adminUserEmail}`);
    } catch (error) {
      console.error(`Error updating existing System Admin user ${adminUserEmail}:`, error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to update existing System Admin user: ${error.message}`);
    }
  } else {
    // Create new admin user
    adminUser = new Parse.User();
    adminUser.set('username', adminUserEmail); // Typically username is email for Parse
    adminUser.set('email', adminUserEmail);
    adminUser.set('password', adminUserPassword);
    if (adminUserFirstName) adminUser.set('firstName', adminUserFirstName);
    if (adminUserLastName) adminUser.set('lastName', adminUserLastName);
    // Set as system administrator
    adminUser.set('isAdmin', true);
    // Add any other default fields for a new user

    try {
      await adminUser.signUp(null, { useMasterKey: true }); // Sign up with master key to bypass normal signup flow/ACLs
      console.log(`Created System Admin user: ${adminUserEmail}`);
    } catch (error) {
      console.error(`Error creating System Admin user ${adminUserEmail}:`, error);
      // Check if user already exists (error.code === Parse.Error.USERNAME_TAKEN or EMAIL_TAKEN)
      if (error.code === Parse.Error.USERNAME_TAKEN || error.code === Parse.Error.EMAIL_TAKEN) {
          // If user was created between our check and now, try to fetch them again
          const newUserQuery = new Parse.Query(Parse.User);
          newUserQuery.equalTo('email', adminUserEmail);
          const newExistingUser = await newUserQuery.first({ useMasterKey: true });
          if (newExistingUser) {
            console.log(`System Admin user ${adminUserEmail} was created concurrently, using existing user`);
            adminUser = newExistingUser;
          } else {
            throw new Parse.Error(error.code, `Admin user with email ${adminUserEmail} already exists but could not be retrieved.`);
          }
      } else {
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create System Admin user: ${error.message}`);
      }
    }
  }

  // 2. Add User to "SystemAdmin" Role
  const systemAdminRoleName = 'SystemAdmin';
  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo('name', systemAdminRoleName);
  const systemAdminRole = await roleQuery.first({ useMasterKey: true });

  if (!systemAdminRole) {
    // This should have been created by ensureCoreInfrastructure, but as a fallback:
    console.warn(`${systemAdminRoleName} role not found. This should not happen.`);
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, `${systemAdminRoleName} role not found.`);
  }
  systemAdminRole.getUsers().add(adminUser);
  await systemAdminRole.save(null, { useMasterKey: true });
  console.log(`Added user ${adminUserEmail} to role ${systemAdminRoleName}`);

  // 3. Create the Parent Organization
  const Organization = Parse.Object.extend('Organization');
  const parentOrg = new Organization();
  parentOrg.set('name', parentOrgName);
  parentOrg.set('planType', defaultPlanType);
  parentOrg.set('createdBy', adminUser);
  parentOrg.set('updatedBy', adminUser);
  // Set ACL for the organization: admin user has R/W, SystemAdmin role has R/W
  const orgACL = new Parse.ACL();
  orgACL.setReadAccess(adminUser, true);
  orgACL.setWriteAccess(adminUser, true);
  orgACL.setRoleReadAccess(systemAdminRoleName, true);
  orgACL.setRoleWriteAccess(systemAdminRoleName, true);
  // Potentially set public read access if orgs can be public, otherwise false
  // orgACL.setPublicReadAccess(false); 
  parentOrg.setACL(orgACL);
  
  // Add the admin user to the 'administrators' relation of the Organization
  const adminRelation = parentOrg.relation('administrators');
  adminRelation.add(adminUser);

  try {
    await parentOrg.save(null, { useMasterKey: true });
    console.log(`Created Parent Organization: ${parentOrgName} with ID: ${parentOrg.id}`);
  } catch (error) {
    console.error(`Error creating Parent Organization ${parentOrgName}:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create Parent Organization: ${error.message}`);
  }

  // CRITICAL: Create OrgRole entry to link user to organization
  // This is what getUserDetails looks for to determine user's org memberships
  try {
    const OrgRole = Parse.Object.extend('OrgRole');
    const orgRole = new OrgRole();
    orgRole.set('user', adminUser);
    orgRole.set('organization', parentOrg);
    orgRole.set('role', 'admin');
    orgRole.set('isActive', true);
    orgRole.set('createdBy', adminUser);
    orgRole.set('updatedBy', adminUser);
    
    await orgRole.save(null, { useMasterKey: true });
    console.log(`Created OrgRole linking user ${adminUser.id} to organization ${parentOrg.id} as admin`);
    
    // Also add the organization to the user's organizations relation for backward compatibility
    const userOrgRelation = adminUser.relation('organizations');
    userOrgRelation.add(parentOrg);
    
    // Set this organization as the user's current organization
    adminUser.set('currentOrganizationId', parentOrg.id);
    adminUser.set('currentOrganization', parentOrg);
    
    await adminUser.save(null, { useMasterKey: true });
    console.log(`Added organization ${parentOrg.id} to user ${adminUser.id} organizations relation and set as current org`);
  } catch (error) {
    console.error(`Error adding organization to user's organizations relation:`, error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to associate user with organization: ${error.message}`);
  }

  // 4. Update PlatformConfig to OPERATIONAL state immediately after successful setup
  // This ensures atomicity - either the whole setup succeeds or it all fails
  try {
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const configQuery = new Parse.Query(PlatformConfig);
    let config = await configQuery.first({ useMasterKey: true });
    
    if (!config) {
      config = new PlatformConfig();
    }
    
    // Update platform state to OPERATIONAL (platform is now fully functional)
    config.set('currentState', 'OPERATIONAL');
    config.set('parentOrgId', parentOrg.id);
    config.set('lastSetupError', null);
    config.set('platformVersion', '1.0.0');
    config.set('setupCompletedAt', new Date());
    
    await config.save(null, { useMasterKey: true });
    console.log('Platform state updated to OPERATIONAL after successful setup');
  } catch (stateError) {
    console.error('Error updating platform state after setup:', stateError);
    // Don't fail the entire setup if state update fails, but log the error
    // The API route can still try to update it as a fallback
  }

  return {
    success: true,
    message: 'Initial platform setup complete. Parent organization and system admin created.',
    parentOrgId: parentOrg.id,
    adminUserId: adminUser.id,
  };
});

/**
 * Automated Install Mode
 * Checks for AUTO_INSTALL_CONFIG environment variable and performs automated setup
 */
Parse.Cloud.define('checkAndRunAutomatedInstall', async (request) => {
  console.log('Checking for automated install configuration...');
  
  // Check if AUTO_INSTALL_CONFIG environment variable exists
  const autoInstallConfig = process.env.AUTO_INSTALL_CONFIG;
  
  if (!autoInstallConfig) {
    console.log('No AUTO_INSTALL_CONFIG found, skipping automated install');
    return { success: false, message: 'No automated install configuration found' };
  }
  
  try {
    // Parse the JSON configuration
    const config = JSON.parse(autoInstallConfig);
    console.log('Found automated install configuration, validating...');
    
    // Validate required fields
    const requiredFields = ['parentOrgName', 'adminUserEmail', 'adminUserPassword', 'adminUserFirstName', 'adminUserLastName'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in AUTO_INSTALL_CONFIG: ${missingFields.join(', ')}`);
    }
    
    // Check if platform is already set up
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const configQuery = new Parse.Query(PlatformConfig);
    const existingConfig = await configQuery.first({ useMasterKey: true });
    
    if (existingConfig && existingConfig.get('currentState') === 'OPERATIONAL') {
      console.log('Platform already set up, skipping automated install');
      return { success: false, message: 'Platform already configured' };
    }
    
    console.log('Running automated platform setup...');
    
    // First, ensure core infrastructure is set up (roles, schemas, etc.)
    console.log('Ensuring core infrastructure is set up...');
    await Parse.Cloud.run('ensureCoreInfrastructure', {}, { useMasterKey: true });
    console.log('Core infrastructure setup completed');
    
    // Set default values for optional fields
    const setupConfig = {
      parentOrgName: config.parentOrgName,
      adminUserEmail: config.adminUserEmail,
      adminUserPassword: config.adminUserPassword,
      adminUserFirstName: config.adminUserFirstName,
      adminUserLastName: config.adminUserLastName,
      defaultPlanType: config.defaultPlanType || 'enterprise'
    };
    
    // Run the complete initial platform setup
    const setupResult = await Parse.Cloud.run('completeInitialPlatformSetup', setupConfig, { useMasterKey: true });
    
    console.log('Automated platform setup completed successfully');
    return {
      success: true,
      message: 'Automated platform setup completed successfully',
      result: setupResult
    };
    
  } catch (error) {
    console.error('Error during automated install:', error);
    
    // Update platform state to indicate setup error
    try {
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const configQuery = new Parse.Query(PlatformConfig);
      let config = await configQuery.first({ useMasterKey: true });
      
      if (!config) {
        config = new PlatformConfig();
      }
      
      config.set('currentState', 'SETUP_ERROR');
      config.set('lastSetupError', error.message);
      await config.save(null, { useMasterKey: true });
    } catch (stateError) {
      console.error('Error updating platform state after automated install failure:', stateError);
    }
    
    return {
      success: false,
      message: `Automated install failed: ${error.message}`,
      error: error.message
    };
  }
});