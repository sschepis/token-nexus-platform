const AlchemyService = require('../../services/alchemyService');

// Initialize Alchemy service (we'll create this next)
const alchemyService = new AlchemyService();

/**
 * Get networks available to the organization
 */
Parse.Cloud.define('getOrgNetworks', async (request) => {
  try {
    const user = request.user;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    // Get organization
    const Organization = Parse.Object.extend('Organization');
    const orgQuery = new Parse.Query(Organization);
    const org = await orgQuery.get(orgId, { useMasterKey: true });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get active networks from org settings
    const activeNetworks = org.get('activeNetworks') || [];
    
    // Get network configurations
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const query = new Parse.Query(NetworkConfig);
    
    if (activeNetworks.length > 0) {
      query.containedIn('networkId', activeNetworks);
    }
    
    query.equalTo('isActive', true);
    const networks = await query.find({ useMasterKey: true });

    return {
      networks: networks.map(n => ({
        id: n.get('networkId'),
        displayName: n.get('displayName'),
        chainId: n.get('chainId'),
        currency: n.get('currency'),
        explorerUrl: n.get('explorerUrl'),
      })),
    };
  } catch (error) {
    console.error('Error in getOrgNetworks:', error);
    throw error;
  }
});

/**
 * Get contracts deployed by the organization
 */
Parse.Cloud.define('getOrgContracts', async (request) => {
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

    // Get organization's deployed contracts
    const OrgContract = Parse.Object.extend('OrgContract');
    const query = new Parse.Query(OrgContract);
    query.equalTo('orgId', orgId);
    query.equalTo('networkId', networkId);
    query.include('factory');
    query.descending('createdAt');
    
    const contracts = await query.find({ useMasterKey: true });

    // Also get the factory contract ABIs for interaction
    const contractsWithAbi = [];
    
    for (const contract of contracts) {
      const factory = contract.get('factory');
      contractsWithAbi.push({
        id: contract.id,
        name: contract.get('contractName'),
        address: contract.get('contractAddress'),
        networkId: contract.get('networkId'),
        deployedAt: contract.get('createdAt'),
        abi: factory ? factory.get('abi') : null,
      });
    }

    return { contracts: contractsWithAbi };
  } catch (error) {
    console.error('Error in getOrgContracts:', error);
    throw error;
  }
});

/**
 * Read data from a contract (view/pure functions only)
 */
Parse.Cloud.define('readContract', async (request) => {
  try {
    const { networkId, contractAddress, methodName, methodAbi, params } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    // Validate parameters
    if (!networkId || !contractAddress || !methodName || !methodAbi) {
      throw new Error('Missing required parameters');
    }

    // Check if user has permission to read this contract
    const OrgContract = Parse.Object.extend('OrgContract');
    const query = new Parse.Query(OrgContract);
    query.equalTo('orgId', orgId);
    query.equalTo('networkId', networkId);
    query.equalTo('contractAddress', contractAddress.toLowerCase());
    const contract = await query.first({ useMasterKey: true });

    if (!contract) {
      throw new Error('Contract not found or access denied');
    }

    // Execute the read operation via Alchemy
    const result = await alchemyService.readContract(
      orgId,
      networkId,
      contractAddress,
      methodName,
      methodAbi,
      params || []
    );

    return { result };
  } catch (error) {
    console.error('Error in readContract:', error);
    throw error;
  }
});

/**
 * Log contract interaction for audit trail
 */
Parse.Cloud.define('logContractInteraction', async (request) => {
  try {
    const { contractId, method, params, result } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const ContractInteraction = Parse.Object.extend('ContractInteraction');
    const interaction = new ContractInteraction();
    
    interaction.set('orgId', user.get('orgId'));
    interaction.set('userId', user.id);
    interaction.set('contractId', contractId);
    interaction.set('method', method);
    interaction.set('params', params);
    interaction.set('result', result);
    interaction.set('type', 'read');
    interaction.set('timestamp', new Date());
    
    // Get user's IP if available
    const ip = request.headers['x-forwarded-for'] || request.ip;
    if (ip) {
      interaction.set('ip', ip);
    }

    await interaction.save(null, { useMasterKey: true });

    return { success: true };
  } catch (error) {
    console.error('Error in logContractInteraction:', error);
    // Don't throw - logging shouldn't break the main operation
    return { success: false, error: error.message };
  }
});

/**
 * Deploy a new contract using a factory
 */
Parse.Cloud.define('deployOrgContract', async (request) => {
  try {
    const { networkId, factoryId, deploymentParams, contractName } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    // Check if user has deployment permissions
    const permissions = user.get('permissions') || [];
    const canDeploy = user.get('isAdmin') || 
                     permissions.includes('contracts:deploy') ||
                     permissions.includes('org:admin');
    
    if (!canDeploy) {
      throw new Error('Insufficient permissions to deploy contracts');
    }

    // Get factory contract
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const factoryQuery = new Parse.Query(FactoryContract);
    const factory = await factoryQuery.get(factoryId, { useMasterKey: true });

    if (!factory) {
      throw new Error('Factory contract not found');
    }

    if (factory.get('networkId') !== networkId) {
      throw new Error('Factory contract network mismatch');
    }

    // TODO: Implement actual deployment via Alchemy
    // For now, this is a placeholder that would:
    // 1. Call the factory contract's deployment method
    // 2. Wait for transaction confirmation
    // 3. Get the new contract address
    // 4. Save to database

    throw new Error('Contract deployment not yet implemented. This will be added in Phase 2.');
  } catch (error) {
    console.error('Error in deployOrgContract:', error);
    throw error;
  }
});

/**
 * Get contract interaction audit log
 */
Parse.Cloud.define('getContractAuditLog', async (request) => {
  try {
    const { contractId, startDate, endDate } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const orgId = user.get('orgId');
    if (!orgId) {
      throw new Error('User must belong to an organization');
    }

    const ContractInteraction = Parse.Object.extend('ContractInteraction');
    const query = new Parse.Query(ContractInteraction);
    
    query.equalTo('orgId', orgId);
    
    if (contractId) {
      query.equalTo('contractId', contractId);
    }
    
    if (startDate) {
      query.greaterThanOrEqualTo('timestamp', new Date(startDate));
    }
    
    if (endDate) {
      query.lessThanOrEqualTo('timestamp', new Date(endDate));
    }
    
    query.descending('timestamp');
    query.limit(1000);
    
    const interactions = await query.find({ useMasterKey: true });
    
    // Get user details
    const userIds = [...new Set(interactions.map(i => i.get('userId')))];
    const userQuery = new Parse.Query(Parse.User);
    userQuery.containedIn('objectId', userIds);
    const users = await userQuery.find({ useMasterKey: true });
    
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = {
        username: u.get('username'),
        email: u.get('email'),
        firstName: u.get('firstName'),
        lastName: u.get('lastName'),
      };
    });
    
    return {
      interactions: interactions.map(i => ({
        id: i.id,
        contractId: i.get('contractId'),
        method: i.get('method'),
        params: i.get('params'),
        result: i.get('result'),
        type: i.get('type'),
        timestamp: i.get('timestamp'),
        user: userMap[i.get('userId')] || { username: 'Unknown' },
        ip: i.get('ip'),
      })),
    };
  } catch (error) {
    console.error('Error in getContractAuditLog:', error);
    throw error;
  }
});

module.exports = {};