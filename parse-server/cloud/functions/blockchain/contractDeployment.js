// Cloud functions for Contract Deployment

const { ethers } = require('ethers');

// Estimate gas for contract deployment
Parse.Cloud.define('estimateDeploymentGas', async (request) => {
  const { user } = request;
  const { chainId, networkId, factoryContractId, appBundleId, deploymentParams } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can deploy contracts');
  }

  if (!chainId || !networkId || !factoryContractId || !appBundleId) {
    throw new Error('Chain, network, factory contract, and app bundle are required');
  }

  try {
    // Get chain configuration
    const chainConfig = await getChainConfig(chainId);
    const network = chainConfig.networks.find(n => n.id === networkId);
    
    if (!network || !network.enabled) {
      throw new Error('Network not found or disabled');
    }

    // Get factory contract details
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const factoryQuery = new Parse.Query(FactoryContract);
    const factory = await factoryQuery.get(factoryContractId, { useMasterKey: true });

    // Get app bundle details
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const appQuery = new Parse.Query(AppDefinition);
    const appBundle = await appQuery.get(appBundleId, { useMasterKey: true });

    // Create provider
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);

    // Get gas price
    const gasPrice = await provider.getFeeData();

    // Estimate gas (simplified - in real implementation would use actual contract ABI)
    const estimatedGas = 3000000; // Default estimation for contract deployment

    const estimatedCost = {
      gasLimit: estimatedGas,
      gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice.toString() : '0',
      maxFeePerGas: gasPrice.maxFeePerGas ? gasPrice.maxFeePerGas.toString() : '0',
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? gasPrice.maxPriorityFeePerGas.toString() : '0',
      estimatedCostWei: gasPrice.gasPrice ? (BigInt(estimatedGas) * gasPrice.gasPrice).toString() : '0',
      estimatedCostEth: gasPrice.gasPrice ? 
        ethers.formatEther(BigInt(estimatedGas) * gasPrice.gasPrice) : '0'
    };

    return {
      success: true,
      estimation: estimatedCost,
      network: {
        name: network.name,
        chainId: chainId
      }
    };

  } catch (error) {
    console.error('Estimate deployment gas error:', error);
    throw error;
  }
});

// Deploy contract
Parse.Cloud.define('deployContract', async (request) => {
  const { user } = request;
  const { 
    chainId, 
    networkId, 
    factoryContractId, 
    appBundleId, 
    deploymentParams,
    privateKey // In production, use secure key management
  } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can deploy contracts');
  }

  if (!chainId || !networkId || !factoryContractId || !appBundleId || !privateKey) {
    throw new Error('All deployment parameters are required');
  }

  try {
    // Get chain configuration
    const chainConfig = await getChainConfig(chainId);
    const network = chainConfig.networks.find(n => n.id === networkId);
    
    if (!network || !network.enabled) {
      throw new Error('Network not found or disabled');
    }

    // Get factory contract details
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const factoryQuery = new Parse.Query(FactoryContract);
    const factory = await factoryQuery.get(factoryContractId, { useMasterKey: true });

    // Get app bundle details
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const appQuery = new Parse.Query(AppDefinition);
    const appBundle = await appQuery.get(appBundleId, { useMasterKey: true });

    // Create deployment record
    const ContractDeployment = Parse.Object.extend('ContractDeployment');
    const deployment = new ContractDeployment();
    
    deployment.set('chainId', chainId);
    deployment.set('networkId', networkId);
    deployment.set('factoryContract', factory);
    deployment.set('appBundle', appBundle);
    deployment.set('deploymentParams', deploymentParams);
    deployment.set('status', 'pending');
    deployment.set('deployedBy', user);
    
    await deployment.save(null, { useMasterKey: true });

    // In a real implementation, you would:
    // 1. Create provider and wallet
    // 2. Load contract ABI and bytecode
    // 3. Deploy the contract
    // 4. Wait for confirmation
    // 5. Update deployment record with results

    // For now, simulate deployment
    setTimeout(async () => {
      try {
        // Simulate successful deployment
        const contractAddress = '0x' + Math.random().toString(16).substring(2, 42);
        const txHash = '0x' + Math.random().toString(16).substring(2, 66);
        
        deployment.set('status', 'deployed');
        deployment.set('contractAddress', contractAddress);
        deployment.set('transactionHash', txHash);
        deployment.set('deployedAt', new Date());
        deployment.set('gasUsed', '2500000');
        
        await deployment.save(null, { useMasterKey: true });

        // Create OrgContract record
        const OrgContract = Parse.Object.extend('OrgContract');
        const orgContract = new OrgContract();
        
        orgContract.set('contractAddress', contractAddress);
        orgContract.set('chainId', chainId);
        orgContract.set('networkId', networkId);
        orgContract.set('factoryContract', factory);
        orgContract.set('appBundle', appBundle);
        orgContract.set('deploymentId', deployment.id);
        orgContract.set('isActive', true);
        orgContract.set('organization', {
          __type: 'Pointer',
          className: 'Organization',
          objectId: 'parent-org' // Would be actual org ID
        });
        
        await orgContract.save(null, { useMasterKey: true });

        // Log audit action
        await logAuditAction(user, 'contract.deployed', 'ContractDeployment', deployment.id, {
          contractAddress,
          chainId,
          networkId,
          appBundle: appBundle.get('name')
        });

      } catch (error) {
        deployment.set('status', 'failed');
        deployment.set('error', error.message);
        await deployment.save(null, { useMasterKey: true });
      }
    }, 5000); // Simulate 5 second deployment

    return {
      success: true,
      message: 'Contract deployment initiated',
      deploymentId: deployment.id
    };

  } catch (error) {
    console.error('Deploy contract error:', error);
    throw error;
  }
});

// Get deployment status
Parse.Cloud.define('getDeploymentStatus', async (request) => {
  const { user } = request;
  const { deploymentId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!deploymentId) {
    throw new Error('Deployment ID is required');
  }

  try {
    const ContractDeployment = Parse.Object.extend('ContractDeployment');
    const query = new Parse.Query(ContractDeployment);
    query.include(['factoryContract', 'appBundle', 'deployedBy']);
    
    const deployment = await query.get(deploymentId, { useMasterKey: true });

    return {
      success: true,
      deployment: {
        id: deployment.id,
        status: deployment.get('status'),
        chainId: deployment.get('chainId'),
        networkId: deployment.get('networkId'),
        contractAddress: deployment.get('contractAddress'),
        transactionHash: deployment.get('transactionHash'),
        gasUsed: deployment.get('gasUsed'),
        error: deployment.get('error'),
        deployedAt: deployment.get('deployedAt'),
        factoryContract: {
          id: deployment.get('factoryContract').id,
          name: deployment.get('factoryContract').get('name'),
          address: deployment.get('factoryContract').get('address')
        },
        appBundle: {
          id: deployment.get('appBundle').id,
          name: deployment.get('appBundle').get('name')
        },
        deployedBy: {
          id: deployment.get('deployedBy').id,
          email: deployment.get('deployedBy').get('email')
        }
      }
    };

  } catch (error) {
    console.error('Get deployment status error:', error);
    throw error;
  }
});

// List deployments
Parse.Cloud.define('listDeployments', async (request) => {
  const { user } = request;
  const { chainId, networkId, status, page = 1, limit = 20 } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can view deployments');
  }

  try {
    const ContractDeployment = Parse.Object.extend('ContractDeployment');
    const query = new Parse.Query(ContractDeployment);
    
    if (chainId) {
      query.equalTo('chainId', chainId);
    }
    
    if (networkId) {
      query.equalTo('networkId', networkId);
    }
    
    if (status) {
      query.equalTo('status', status);
    }
    
    query.include(['factoryContract', 'appBundle', 'deployedBy']);
    query.descending('createdAt');
    query.limit(limit);
    query.skip((page - 1) * limit);
    
    const [deployments, total] = await Promise.all([
      query.find({ useMasterKey: true }),
      query.count({ useMasterKey: true })
    ]);

    const deploymentData = deployments.map(deployment => ({
      id: deployment.id,
      status: deployment.get('status'),
      chainId: deployment.get('chainId'),
      networkId: deployment.get('networkId'),
      contractAddress: deployment.get('contractAddress'),
      transactionHash: deployment.get('transactionHash'),
      gasUsed: deployment.get('gasUsed'),
      error: deployment.get('error'),
      deployedAt: deployment.get('deployedAt'),
      createdAt: deployment.get('createdAt'),
      factoryContract: deployment.get('factoryContract') ? {
        id: deployment.get('factoryContract').id,
        name: deployment.get('factoryContract').get('name')
      } : null,
      appBundle: deployment.get('appBundle') ? {
        id: deployment.get('appBundle').id,
        name: deployment.get('appBundle').get('name')
      } : null,
      deployedBy: deployment.get('deployedBy') ? {
        id: deployment.get('deployedBy').id,
        email: deployment.get('deployedBy').get('email')
      } : null
    }));

    return {
      success: true,
      deployments: deploymentData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

  } catch (error) {
    console.error('List deployments error:', error);
    throw error;
  }
});

// Get available factory contracts for deployment
Parse.Cloud.define('getDeployableContracts', async (request) => {
  const { user } = request;
  const { chainId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can view deployable contracts');
  }

  try {
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const query = new Parse.Query(FactoryContract);
    
    if (chainId) {
      query.equalTo('chainId', chainId);
    }
    
    query.equalTo('isActive', true);
    query.ascending('name');
    
    const factories = await query.find({ useMasterKey: true });

    const factoryData = factories.map(factory => ({
      id: factory.id,
      name: factory.get('name'),
      version: factory.get('version'),
      address: factory.get('address'),
      chainId: factory.get('chainId'),
      type: factory.get('type'),
      description: factory.get('description')
    }));

    // Also get deployable app bundles
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const appQuery = new Parse.Query(AppDefinition);
    
    // Get latest published version of each app
    const appVersionQuery = new Parse.Query('AppVersion');
    appVersionQuery.equalTo('status', 'published');
    appVersionQuery.descending('version');
    
    const publishedVersions = await appVersionQuery.find({ useMasterKey: true });
    const appIds = [...new Set(publishedVersions.map(v => v.get('appDefinition').id))];
    
    appQuery.containedIn('objectId', appIds);
    const apps = await appQuery.find({ useMasterKey: true });

    const appData = apps.map(app => {
      const latestVersion = publishedVersions.find(v => 
        v.get('appDefinition').id === app.id
      );
      
      return {
        id: app.id,
        name: app.get('name'),
        category: app.get('category'),
        version: latestVersion ? latestVersion.get('version') : '1.0.0',
        description: app.get('description')
      };
    });

    return {
      success: true,
      factories: factoryData,
      appBundles: appData
    };

  } catch (error) {
    console.error('Get deployable contracts error:', error);
    throw error;
  }
});

// Helper function to get chain configuration
async function getChainConfig(chainId) {
  const ChainConfig = Parse.Object.extend('ChainConfig');
  const query = new Parse.Query(ChainConfig);
  query.equalTo('chainId', chainId);
  query.equalTo('isActive', true);
  
  const config = await query.first({ useMasterKey: true });
  
  if (!config) {
    throw new Error('Chain configuration not found or inactive');
  }
  
  return {
    id: config.id,
    chainId: config.get('chainId'),
    chainName: config.get('chainName'),
    networks: config.get('networks') || [],
    nativeCurrency: config.get('nativeCurrency')
  };
}

// Helper function to log audit actions
async function logAuditAction(user, action, targetType, targetId, details) {
  try {
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', action);
    log.set('targetType', targetType);
    log.set('targetId', targetId);
    log.set('actor', user);
    log.set('actorId', user.id);
    log.set('details', details);
    log.set('organizationId', 'system');
    log.set('timestamp', new Date());
    
    await log.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

module.exports = {};