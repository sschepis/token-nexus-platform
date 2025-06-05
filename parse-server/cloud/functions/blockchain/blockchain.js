const BlockchainService = require('../../services/blockchainService');

// Initialize the blockchain service
const blockchainService = new BlockchainService();

/**
 * Scan available networks from deployment directories
 */
Parse.Cloud.define('scanAvailableNetworks', async (request) => {
  try {
    // Verify user is system admin
    const user = request.user;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const isAdmin = user.get('isAdmin') === true;
    if (!isAdmin) {
      // Check for system:admin permission
      const permissions = user.get('permissions') || [];
      if (!permissions.includes('system:admin')) {
        throw new Error('Insufficient permissions. System admin access required.');
      }
    }

    const result = await blockchainService.scanAvailableNetworks();
    return result;
  } catch (error) {
    console.error('Error in scanAvailableNetworks:', error);
    throw error;
  }
});

/**
 * Import factory contracts into the system
 */
Parse.Cloud.define('importFactoryContracts', async (request) => {
  try {
    const { networkId, contracts } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const isAdmin = user.get('isAdmin') === true;
    if (!isAdmin) {
      const permissions = user.get('permissions') || [];
      if (!permissions.includes('system:admin')) {
        throw new Error('Insufficient permissions. System admin access required.');
      }
    }

    if (!networkId || !contracts || !Array.isArray(contracts)) {
      throw new Error('Invalid parameters. NetworkId and contracts array are required.');
    }

    const result = await blockchainService.importFactoryContracts(networkId, contracts, user);
    return result;
  } catch (error) {
    console.error('Error in importFactoryContracts:', error);
    throw error;
  }
});

/**
 * Get system factory contracts with optional filtering
 */
Parse.Cloud.define('getSystemFactoryContracts', async (request) => {
  try {
    const { networkId, searchTerm } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const isAdmin = user.get('isAdmin') === true;
    if (!isAdmin) {
      const permissions = user.get('permissions') || [];
      if (!permissions.includes('system:admin')) {
        throw new Error('Insufficient permissions. System admin access required.');
      }
    }

    const result = await blockchainService.getSystemFactoryContracts(networkId, searchTerm);
    return result;
  } catch (error) {
    console.error('Error in getSystemFactoryContracts:', error);
    throw error;
  }
});

/**
 * Delete a factory contract from the registry
 */
Parse.Cloud.define('deleteFactoryContract', async (request) => {
  try {
    const { factoryId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const isAdmin = user.get('isAdmin') === true;
    if (!isAdmin) {
      const permissions = user.get('permissions') || [];
      if (!permissions.includes('system:admin')) {
        throw new Error('Insufficient permissions. System admin access required.');
      }
    }

    if (!factoryId) {
      throw new Error('Factory contract ID is required');
    }

    await blockchainService.deleteFactoryContract(factoryId, user);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteFactoryContract:', error);
    throw error;
  }
});

/**
 * Export the factory registry
 */
Parse.Cloud.define('exportFactoryRegistry', async (request) => {
  try {
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const isAdmin = user.get('isAdmin') === true;
    if (!isAdmin) {
      const permissions = user.get('permissions') || [];
      if (!permissions.includes('system:admin')) {
        throw new Error('Insufficient permissions. System admin access required.');
      }
    }

    const result = await blockchainService.exportFactoryRegistry();
    return result;
  } catch (error) {
    console.error('Error in exportFactoryRegistry:', error);
    throw error;
  }
});

/**
 * Get available networks for organization use
 * This is for org-level users to see which networks they can deploy to
 */
Parse.Cloud.define('getAvailableNetworks', async (request) => {
  try {
    const user = request.user;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    // Get active networks
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const query = new Parse.Query(NetworkConfig);
    query.equalTo('isActive', true);
    const networks = await query.find({ useMasterKey: true });

    // Get factory contracts for each network
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const networkData = [];

    for (const network of networks) {
      const networkId = network.get('networkId');
      const factoryQuery = new Parse.Query(FactoryContract);
      factoryQuery.equalTo('networkId', networkId);
      factoryQuery.equalTo('isFactory', true);
      const factoryCount = await factoryQuery.count({ useMasterKey: true });

      if (factoryCount > 0) {
        networkData.push({
          id: networkId,
          displayName: network.get('displayName'),
          chainId: network.get('chainId'),
          currency: network.get('currency'),
          explorerUrl: network.get('explorerUrl'),
          factoryCount: factoryCount,
        });
      }
    }

    return { networks: networkData };
  } catch (error) {
    console.error('Error in getAvailableNetworks:', error);
    throw error;
  }
});

/**
 * Get factory contracts available for organization deployment
 */
Parse.Cloud.define('getOrgFactoryContracts', async (request) => {
  try {
    const { networkId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    if (!networkId) {
      throw new Error('Network ID is required');
    }

    const FactoryContract = Parse.Object.extend('FactoryContract');
    const query = new Parse.Query(FactoryContract);
    query.equalTo('networkId', networkId);
    query.equalTo('isFactory', true);
    query.select(['contractName', 'address', 'contractType']);
    
    const factories = await query.find({ useMasterKey: true });

    return {
      factories: factories.map(f => ({
        id: f.id,
        contractName: f.get('contractName'),
        address: f.get('address'),
        contractType: f.get('contractType'),
      })),
    };
  } catch (error) {
    console.error('Error in getOrgFactoryContracts:', error);
    throw error;
  }
});

module.exports = {};