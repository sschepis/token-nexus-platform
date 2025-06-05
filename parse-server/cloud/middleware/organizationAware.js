/**
 * Organization-Aware Cloud Functions
 * Provides organization-aware operations for Parse Server integration
 */

const ParseServerIntegration = require('../../src/services/ParseServerIntegration');
const { withOrganizationContext } = require('../middleware/organizationContextMiddleware');

// Initialize integration service (will be set up during server initialization)
let parseIntegration = null;

/**
 * Initialize organization-aware Parse integration
 */
Parse.Cloud.define('initializeOrganizationIntegration', async (request) => {
  if (!request.master) {
    throw new Error('Master key required');
  }

  try {
    // This will be called during server startup to initialize the integration
    const config = request.params.config;
    const databaseManager = request.params.databaseManager;
    const organizationContext = request.params.organizationContext;

    if (databaseManager && organizationContext) {
      parseIntegration = new ParseServerIntegration(databaseManager, organizationContext);
      await parseIntegration.initialize(config);
    }

    return {
      success: true,
      message: 'Organization-aware Parse integration initialized'
    };
  } catch (error) {
    console.error('Error initializing organization integration:', error);
    throw new Error(`Failed to initialize organization integration: ${error.message}`);
  }
});

/**
 * Check if a smart contract exists for the current organization
 * This function can be called without authentication during app initialization
 */
Parse.Cloud.define('hasSmartContract', async (request) => {
  try {
    const { contractName, organizationId } = request.params;

    if (!contractName) {
      throw new Error('Contract name is required');
    }

    // Try to get organization context from middleware if user is authenticated
    let organization = null;
    let orgId = organizationId;

    if (request.user) {
      // User is authenticated, try to get their organization
      try {
        const { getUserOrganization } = require('../middleware/organizationContextMiddleware');
        const userOrg = await getUserOrganization(request.user);
        if (userOrg) {
          organization = userOrg;
          orgId = userOrg.id;
        }
      } catch (error) {
        console.warn('Could not get user organization:', error.message);
      }
    }

    // Use Parse integration if available, otherwise fall back to direct Parse query
    if (parseIntegration && orgId) {
      const exists = await parseIntegration.hasSmartContract(contractName, orgId);
      return { exists, organizationId: orgId, contractName };
    }

    // Fallback to direct Parse query
    const query = new Parse.Query('SmartContract');
    query.equalTo('name', contractName);
    
    // If we have organization context, filter by it
    if (organization) {
      query.equalTo('organization', organization);
    } else if (orgId) {
      // Try to get organization by ID
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      try {
        const org = await orgQuery.get(orgId, { useMasterKey: true });
        query.equalTo('organization', org);
      } catch (error) {
        console.warn('Could not find organization with ID:', orgId);
        // Continue without organization filter for basic platform checks
      }
    }
    
    query.limit(1);
    const results = await query.find({ useMasterKey: true });
    
    return {
      exists: results.length > 0,
      organizationId: orgId,
      contractName
    };
  } catch (error) {
    console.error('Error checking smart contract:', error);
    // Return false instead of throwing error to not block app initialization
    return {
      exists: false,
      organizationId: null,
      contractName,
      error: error.message
    };
  }
});

/**
 * Get smart contracts for the current organization
 */
Parse.Cloud.define('getSmartContracts', withOrganizationContext(async (request) => {
  try {
    const { organization, organizationId } = request; // From middleware

    // Use Parse integration if available
    if (parseIntegration) {
      const contracts = await parseIntegration.getSmartContracts(organizationId); // Pass organizationId from middleware
      return { contracts, organizationId };
    }

    // Fallback to direct Parse query
    const query = new Parse.Query('SmartContract');
    
    // Use organization object from middleware
    query.equalTo('organization', organization);
    
    query.equalTo('isActive', true);
    const results = await query.find({ useMasterKey: true });
    
    const contracts = results.map(contract => ({
      id: contract.id,
      name: contract.get('name'),
      address: contract.get('address'),
      network: contract.get('network'),
      abi: contract.get('abi'),
      deployedAt: contract.get('deployedAt'),
      isActive: contract.get('isActive'), // Added missing isActive
      organizationId: contract.get('organization')?.id
    }));

    return { contracts, organizationId };
  } catch (error) {
    console.error('Error getting smart contracts:', error);
    throw new Error(`Failed to get smart contracts: ${error.message}`);
  }
}));

/**
 * Import smart contract for the current organization
 */
Parse.Cloud.define('importSmartContract', withOrganizationContext(async (request) => {
  if (!request.master) { // This check remains valid for master key operations
    throw new Error('Master key required');
  }

  try {
    const { contractData } = request.params;
    const { organization, organizationId } = request; // From middleware

    if (!contractData) {
      throw new Error('Contract data is required');
    }

    // Validate required fields
    const requiredFields = ['name', 'address', 'network', 'abi'];
    for (const field of requiredFields) {
      if (!contractData[field]) {
        throw new Error(`Contract ${field} is required`);
      }
    }

    // Use Parse integration if available
    if (parseIntegration) {
      const contract = await parseIntegration.importSmartContract(contractData, organizationId); // Pass organizationId from middleware
      return {
        success: true,
        contractId: contract.id,
        organizationId: organizationId
      };
    }

    // Fallback to direct Parse object creation
    const SmartContract = Parse.Object.extend('SmartContract');
    const contract = new SmartContract();
    
    contract.set('name', contractData.name);
    contract.set('address', contractData.address);
    contract.set('network', contractData.network);
    contract.set('abi', contractData.abi);
    contract.set('deployedAt', contractData.deployedAt || new Date());
    contract.set('isActive', true);
    
    // Set organization pointer using object from middleware
    contract.set('organization', organization);

    await contract.save(null, { useMasterKey: true });

    return {
      success: true,
      contractId: contract.id,
      organizationId: organizationId
    };
  } catch (error) {
    console.error('Error importing smart contract:', error);
    throw new Error(`Failed to import smart contract: ${error.message}`);
  }
}));

/**
 * Get tenant-specific organization data
 */
Parse.Cloud.define('getTenantOrganization', async (request) => {
  try {
    const tenantId = request.headers['x-tenant-id'] || global.currentTenantId;

    if (!tenantId) {
      throw new Error('Tenant ID not found in request context');
    }

    const query = new Parse.Query('Organization');
    
    if (tenantId !== 'default') {
      query.equalTo('tenantId', tenantId);
    }
    
    query.limit(1);
    const results = await query.find({ useMasterKey: true });
    
    if (results.length === 0) {
      return { organization: null, tenantId };
    }

    const org = results[0];
    return {
      organization: {
        id: org.id,
        name: org.get('name'),
        slug: org.get('slug'),
        status: org.get('status'),
        settings: org.get('settings'),
        tenantId: org.get('tenantId')
      },
      tenantId
    };
  } catch (error) {
    console.error('Error getting tenant organization:', error);
    throw error;
  }
});

/**
 * Initialize tenant schemas
 */
Parse.Cloud.define('initializeTenantSchemas', async (request) => {
  if (!request.master) {
    throw new Error('Master key required');
  }

  try {
    const { tenantId } = request.params;

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Use Parse integration if available
    if (parseIntegration) {
      await parseIntegration.initializeTenantSchema(tenantId);
      return {
        success: true,
        message: `Schemas initialized for tenant ${tenantId}`
      };
    }

    // Fallback: Create basic schemas manually
    const schemas = [
      {
        className: 'SmartContract',
        fields: {
          name: 'String',
          address: 'String',
          abi: 'Array',
          network: 'String',
          deployedAt: 'Date',
          isActive: 'Boolean',
          tenantId: 'String'
        }
      },
      {
        className: 'Organization',
        fields: {
          name: 'String',
          slug: 'String',
          status: 'String',
          settings: 'Object',
          tenantId: 'String'
        }
      }
    ];

    for (const schemaConfig of schemas) {
      try {
        const schema = new Parse.Schema(schemaConfig.className);
        
        for (const [fieldName, fieldType] of Object.entries(schemaConfig.fields)) {
          if (fieldType === 'String') {
            schema.addString(fieldName);
          } else if (fieldType === 'Array') {
            schema.addArray(fieldName);
          } else if (fieldType === 'Date') {
            schema.addDate(fieldName);
          } else if (fieldType === 'Boolean') {
            schema.addBoolean(fieldName);
          } else if (fieldType === 'Object') {
            schema.addObject(fieldName);
          }
        }

        await schema.save();
      } catch (error) {
        if (error.code !== Parse.Error.INVALID_CLASS_NAME) {
          console.error(`Error creating schema ${schemaConfig.className}:`, error);
        }
      }
    }

    return {
      success: true,
      message: `Basic schemas initialized for tenant ${tenantId}`
    };
  } catch (error) {
    console.error('Error initializing tenant schemas:', error);
    throw error;
  }
});

/**
 * Health check for tenant-aware Parse Server
 */
Parse.Cloud.define('tenantHealthCheck', async (request) => {
  try {
    const tenantId = request.headers['x-tenant-id'] || global.currentTenantId;
    
    return {
      success: true,
      tenantId: tenantId || 'default',
      parseIntegrationAvailable: !!parseIntegration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in tenant health check:', error);
    throw error;
  }
});

/**
 * Cleanup tenant data (for testing/development)
 */
Parse.Cloud.define('cleanupTenantData', async (request) => {
  if (!request.master) {
    throw new Error('Master key required');
  }

  try {
    const { tenantId } = request.params;

    if (!tenantId || tenantId === 'default') {
      throw new Error('Valid tenant ID is required for cleanup');
    }

    // Use Parse integration if available
    if (parseIntegration) {
      await parseIntegration.cleanupTenantData(tenantId);
      return {
        success: true,
        message: `Data cleaned up for tenant ${tenantId}`
      };
    }

    // Fallback: Manual cleanup
    const classesToCleanup = ['SmartContract', 'Organization'];
    let totalDeleted = 0;

    for (const className of classesToCleanup) {
      const query = new Parse.Query(className);
      query.equalTo('tenantId', tenantId);
      
      const objects = await query.find({ useMasterKey: true });
      if (objects.length > 0) {
        await Parse.Object.destroyAll(objects, { useMasterKey: true });
        totalDeleted += objects.length;
      }
    }

    return {
      success: true,
      message: `Cleaned up ${totalDeleted} objects for tenant ${tenantId}`
    };
  } catch (error) {
    console.error('Error cleaning up tenant data:', error);
    throw error;
  }
});

module.exports = {
  setParseIntegration: (integration) => {
    parseIntegration = integration;
  }
};