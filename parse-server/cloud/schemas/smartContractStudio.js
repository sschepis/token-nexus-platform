/**
 * Smart Contract Studio Schema Definitions
 * Defines Parse classes for diamond contract management
 */

const smartContractStudioSchemas = [
  {
    className: 'OrganizationDiamond',
    fields: {
      // Core fields
      organization: { type: 'Pointer', targetClass: '_User' },
      name: { type: 'String', required: true },
      symbol: { type: 'String', required: true },
      
      // Blockchain details
      blockchain: { type: 'String', required: true }, // ethereum, polygon, etc.
      network: { type: 'String', required: true }, // mainnet, sepolia, mumbai, etc.
      contractAddress: { type: 'String' },
      
      // Deployment tracking
      status: { type: 'String', required: true, defaultValue: 'pending' }, // pending, deploying, active, failed, paused
      deploymentTxHash: { type: 'String' },
      deployedAt: { type: 'Date' },
      
      // Error handling
      error: { type: 'String' },
      
      // Metadata
      description: { type: 'String' },
      tags: { type: 'Array' },
      
      // Timestamps
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' }
    },
    classLevelPermissions: {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      update: { 'role:admin': true },
      create: { 'role:admin': true },
      delete: { 'role:admin': true }
    },
    indexes: {
      organization_1: { organization: 1 },
      contractAddress_1: { contractAddress: 1 },
      status_1: { status: 1 },
      blockchain_network_1: { blockchain: 1, network: 1 }
    }
  },

  {
    className: 'DiamondFacetInstance',
    fields: {
      // Relationships
      organizationDiamond: { type: 'Pointer', targetClass: 'OrganizationDiamond', required: true },
      deploymentArtifact: { type: 'Pointer', targetClass: 'DeploymentArtifact', required: true },
      
      // Installation details
      status: { type: 'String', required: true, defaultValue: 'installing' }, // installing, active, failed, removing
      configuration: { type: 'Object', defaultValue: {} },
      
      // Facet metadata
      isCore: { type: 'Boolean', defaultValue: false },
      category: { type: 'String' }, // token, identity, marketplace, governance, utility, core
      
      // Installation tracking
      installedBy: { type: 'String' },
      installedAt: { type: 'Date' },
      deploymentTxHash: { type: 'String' },
      
      // Error handling
      error: { type: 'String' },
      
      // Timestamps
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' }
    },
    classLevelPermissions: {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      update: { 'role:admin': true },
      create: { 'role:admin': true },
      delete: { 'role:admin': true }
    },
    indexes: {
      organizationDiamond_1: { organizationDiamond: 1 },
      deploymentArtifact_1: { deploymentArtifact: 1 },
      status_1: { status: 1 },
      category_1: { category: 1 },
      isCore_1: { isCore: 1 }
    }
  },

  {
    className: 'FacetRegistry',
    fields: {
      // Facet identification
      name: { type: 'String', required: true },
      version: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Categorization
      category: { type: 'String', required: true }, // token, identity, marketplace, governance, utility, core
      tags: { type: 'Array', defaultValue: [] },
      
      // Technical details
      abi: { type: 'Array', required: true },
      bytecode: { type: 'String', required: true },
      
      // Compatibility
      diamondStandard: { type: 'String', defaultValue: 'EIP-2535' },
      solidityVersion: { type: 'String' },
      dependencies: { type: 'Array', defaultValue: [] },
      
      // Publishing details
      publisher: { type: 'Pointer', targetClass: '_User' },
      publishedAt: { type: 'Date' },
      isVerified: { type: 'Boolean', defaultValue: false },
      
      // Usage tracking
      installCount: { type: 'Number', defaultValue: 0 },
      rating: { type: 'Number', defaultValue: 0 },
      
      // Status
      status: { type: 'String', defaultValue: 'active' }, // active, deprecated, removed
      
      // Timestamps
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' }
    },
    classLevelPermissions: {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      update: { 'role:admin': true },
      create: { 'role:admin': true },
      delete: { 'role:admin': true }
    },
    indexes: {
      name_1: { name: 1 },
      category_1: { category: 1 },
      status_1: { status: 1 },
      publisher_1: { publisher: 1 },
      name_version_1: { name: 1, version: 1 }
    }
  },

  {
    className: 'DiamondUpgrade',
    fields: {
      // Relationships
      organizationDiamond: { type: 'Pointer', targetClass: 'OrganizationDiamond', required: true },
      
      // Upgrade details
      upgradeType: { type: 'String', required: true }, // add_facet, remove_facet, replace_facet, upgrade_diamond
      facetChanges: { type: 'Array', defaultValue: [] }, // Array of facet changes
      
      // Execution details
      status: { type: 'String', required: true, defaultValue: 'pending' }, // pending, executing, completed, failed, reverted
      txHash: { type: 'String' },
      blockNumber: { type: 'Number' },
      
      // Metadata
      description: { type: 'String' },
      initiatedBy: { type: 'Pointer', targetClass: '_User' },
      
      // Error handling
      error: { type: 'String' },
      
      // Timestamps
      scheduledAt: { type: 'Date' },
      executedAt: { type: 'Date' },
      createdAt: { type: 'Date' },
      updatedAt: { type: 'Date' }
    },
    classLevelPermissions: {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      update: { 'role:admin': true },
      create: { 'role:admin': true },
      delete: { 'role:admin': true }
    },
    indexes: {
      organizationDiamond_1: { organizationDiamond: 1 },
      status_1: { status: 1 },
      upgradeType_1: { upgradeType: 1 },
      initiatedBy_1: { initiatedBy: 1 }
    }
  }
];

/**
 * Initialize Smart Contract Studio schemas
 */
async function initializeSmartContractStudioSchemas() {
  console.log('Initializing Smart Contract Studio schemas...');
  
  for (const schemaConfig of smartContractStudioSchemas) {
    try {
      const schema = new Parse.Schema(schemaConfig.className);
      
      // Add fields
      Object.entries(schemaConfig.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
          return; // Skip built-in fields
        }
        
        switch (fieldConfig.type) {
          case 'String':
            schema.addString(fieldName, fieldConfig.required);
            break;
          case 'Number':
            schema.addNumber(fieldName, fieldConfig.required);
            break;
          case 'Boolean':
            schema.addBoolean(fieldName, fieldConfig.required);
            break;
          case 'Date':
            schema.addDate(fieldName, fieldConfig.required);
            break;
          case 'Array':
            schema.addArray(fieldName, fieldConfig.required);
            break;
          case 'Object':
            schema.addObject(fieldName, fieldConfig.required);
            break;
          case 'Pointer':
            schema.addPointer(fieldName, fieldConfig.targetClass, fieldConfig.required);
            break;
          default:
            console.warn(`Unknown field type: ${fieldConfig.type} for field: ${fieldName}`);
        }
        
        // Set default values
        if (fieldConfig.defaultValue !== undefined) {
          schema.addField(fieldName, fieldConfig.type, {
            defaultValue: fieldConfig.defaultValue
          });
        }
      });
      
      // Set class level permissions
      if (schemaConfig.classLevelPermissions) {
        Object.entries(schemaConfig.classLevelPermissions).forEach(([operation, permissions]) => {
          schema.setCLP(operation, permissions);
        });
      }
      
      // Add indexes
      if (schemaConfig.indexes) {
        Object.entries(schemaConfig.indexes).forEach(([indexName, indexFields]) => {
          schema.addIndex(indexName, indexFields);
        });
      }
      
      // Save schema
      await schema.save();
      console.log(`✓ Schema created/updated: ${schemaConfig.className}`);
      
    } catch (error) {
      if (error.code === Parse.Error.INVALID_CLASS_NAME) {
        console.log(`✓ Schema already exists: ${schemaConfig.className}`);
      } else {
        console.error(`✗ Failed to create schema ${schemaConfig.className}:`, error);
      }
    }
  }
  
  console.log('Smart Contract Studio schemas initialization complete.');
}

/**
 * Seed initial facet registry data
 */
async function seedFacetRegistry() {
  console.log('Seeding facet registry...');
  
  const coreFacets = [
    {
      name: 'DiamondCutFacet',
      version: '1.0.0',
      description: 'Core facet for managing diamond upgrades and facet modifications',
      category: 'core',
      tags: ['core', 'diamond', 'upgrade'],
      abi: [
        {
          "type": "function",
          "name": "diamondCut",
          "inputs": [
            {"name": "_diamondCut", "type": "tuple[]"},
            {"name": "_init", "type": "address"},
            {"name": "_calldata", "type": "bytes"}
          ],
          "outputs": []
        }
      ],
      bytecode: '0x608060405234801561001057600080fd5b50...', // Truncated for brevity
      solidityVersion: '0.8.19',
      isVerified: true
    },
    {
      name: 'DiamondLoupeFacet',
      version: '1.0.0',
      description: 'Core facet for diamond introspection and interface discovery',
      category: 'core',
      tags: ['core', 'diamond', 'introspection'],
      abi: [
        {
          "type": "function",
          "name": "facets",
          "inputs": [],
          "outputs": [{"name": "", "type": "tuple[]"}]
        },
        {
          "type": "function",
          "name": "facetFunctionSelectors",
          "inputs": [{"name": "_facet", "type": "address"}],
          "outputs": [{"name": "", "type": "bytes4[]"}]
        }
      ],
      bytecode: '0x608060405234801561001057600080fd5b50...',
      solidityVersion: '0.8.19',
      isVerified: true
    }
  ];
  
  for (const facetData of coreFacets) {
    try {
      const FacetRegistry = Parse.Object.extend('FacetRegistry');
      const query = new Parse.Query(FacetRegistry);
      query.equalTo('name', facetData.name);
      query.equalTo('version', facetData.version);
      
      const existing = await query.first({ useMasterKey: true });
      if (!existing) {
        const facet = new FacetRegistry();
        Object.entries(facetData).forEach(([key, value]) => {
          facet.set(key, value);
        });
        facet.set('publishedAt', new Date());
        facet.set('status', 'active');
        
        await facet.save(null, { useMasterKey: true });
        console.log(`✓ Seeded facet: ${facetData.name}`);
      } else {
        console.log(`✓ Facet already exists: ${facetData.name}`);
      }
    } catch (error) {
      console.error(`✗ Failed to seed facet ${facetData.name}:`, error);
    }
  }
  
  console.log('Facet registry seeding complete.');
}

module.exports = {
  initializeSmartContractStudioSchemas,
  seedFacetRegistry,
  smartContractStudioSchemas
};