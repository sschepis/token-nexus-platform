const { ethers } = require('ethers');

/**
 * Deploy Organization Diamond Contract
 * Creates a new EIP-2535 diamond contract for an organization
 */
Parse.Cloud.define('deployOrganizationDiamond', async (request) => {
  const { organizationId, diamondId, config } = request.params;
  const { user } = request;

  if (!user) {
    throw new Error('Authentication required');
  }

  // Validate organization access
  const orgQuery = new Parse.Query('Organization');
  orgQuery.equalTo('objectId', organizationId);
  const organization = await orgQuery.first({ useMasterKey: true });
  
  if (!organization) {
    throw new Error('Organization not found');
  }

  // Check if user has permission to deploy contracts for this org
  const userOrgQuery = new Parse.Query('UserOrganization');
  userOrgQuery.equalTo('user', user);
  userOrgQuery.equalTo('organization', organization);
  userOrgQuery.equalTo('role', 'admin'); // Only admins can deploy
  const userOrg = await userOrgQuery.first({ useMasterKey: true });
  
  if (!userOrg) {
    throw new Error('Insufficient permissions to deploy contracts');
  }

  try {
    // Get network configuration
    const networkConfig = getNetworkConfig(config.blockchain, config.network);
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(networkConfig.privateKey, provider);

    // Deploy diamond contract
    const deploymentResult = await deployDiamondContract(wallet, {
      name: config.name,
      symbol: config.symbol,
      organizationId
    });

    // Update diamond record with deployment details
    const diamondQuery = new Parse.Query('OrganizationDiamond');
    diamondQuery.equalTo('objectId', diamondId);
    const diamond = await diamondQuery.first({ useMasterKey: true });
    
    if (diamond) {
      diamond.set('contractAddress', deploymentResult.contractAddress);
      diamond.set('deploymentTxHash', deploymentResult.txHash);
      diamond.set('status', 'active');
      diamond.set('deployedAt', new Date());
      await diamond.save(null, { useMasterKey: true });
    }

    // Log deployment event
    await logDeploymentEvent(organizationId, user.id, 'diamond_deployed', {
      contractAddress: deploymentResult.contractAddress,
      txHash: deploymentResult.txHash,
      network: config.network,
      blockchain: config.blockchain
    });

    return {
      contractAddress: deploymentResult.contractAddress,
      txHash: deploymentResult.txHash,
      blockNumber: deploymentResult.blockNumber
    };

  } catch (error) {
    console.error('Diamond deployment failed:', error);
    
    // Update diamond status to failed
    const diamondQuery = new Parse.Query('OrganizationDiamond');
    diamondQuery.equalTo('objectId', diamondId);
    const diamond = await diamondQuery.first({ useMasterKey: true });
    
    if (diamond) {
      diamond.set('status', 'failed');
      diamond.set('error', error.message);
      await diamond.save(null, { useMasterKey: true });
    }

    throw new Error(`Diamond deployment failed: ${error.message}`);
  }
});

/**
 * Install Facet to Diamond
 * Adds a new facet to an existing diamond contract
 */
Parse.Cloud.define('installFacetToDiamond', async (request) => {
  const { organizationId, diamondAddress, facetInstanceId, facetId, configuration } = request.params;
  const { user } = request;

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    // Get facet deployment artifact
    const artifactQuery = new Parse.Query('DeploymentArtifact');
    artifactQuery.equalTo('objectId', facetId);
    const artifact = await artifactQuery.first({ useMasterKey: true });
    
    if (!artifact) {
      throw new Error('Facet artifact not found');
    }

    // Get organization diamond
    const diamondQuery = new Parse.Query('OrganizationDiamond');
    diamondQuery.equalTo('contractAddress', diamondAddress);
    diamondQuery.equalTo('organization', organizationId);
    const diamond = await diamondQuery.first({ useMasterKey: true });
    
    if (!diamond) {
      throw new Error('Diamond contract not found');
    }

    // Get network configuration
    const networkConfig = getNetworkConfig(diamond.get('blockchain'), diamond.get('network'));
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(networkConfig.privateKey, provider);

    // Install facet to diamond
    const installResult = await installFacetToDiamond(wallet, {
      diamondAddress,
      facetArtifact: artifact.toJSON(),
      configuration
    });

    // Log installation event
    await logDeploymentEvent(organizationId, user.id, 'facet_installed', {
      diamondAddress,
      facetName: artifact.get('name'),
      txHash: installResult.txHash,
      facetInstanceId
    });

    return {
      txHash: installResult.txHash,
      blockNumber: installResult.blockNumber,
      facetAddress: installResult.facetAddress
    };

  } catch (error) {
    console.error('Facet installation failed:', error);
    
    // Update facet instance status to failed
    const facetQuery = new Parse.Query('DiamondFacetInstance');
    facetQuery.equalTo('objectId', facetInstanceId);
    const facetInstance = await facetQuery.first({ useMasterKey: true });
    
    if (facetInstance) {
      facetInstance.set('status', 'failed');
      facetInstance.set('error', error.message);
      await facetInstance.save(null, { useMasterKey: true });
    }

    throw new Error(`Facet installation failed: ${error.message}`);
  }
});

/**
 * Remove Facet from Diamond
 * Removes a facet from an existing diamond contract
 */
Parse.Cloud.define('removeFacetFromDiamond', async (request) => {
  const { organizationId, facetInstanceId } = request.params;
  const { user } = request;

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    // Get facet instance
    const facetQuery = new Parse.Query('DiamondFacetInstance');
    facetQuery.equalTo('objectId', facetInstanceId);
    facetQuery.include(['organizationDiamond', 'deploymentArtifact']);
    const facetInstance = await facetQuery.first({ useMasterKey: true });
    
    if (!facetInstance) {
      throw new Error('Facet instance not found');
    }

    const diamond = facetInstance.get('organizationDiamond');
    const artifact = facetInstance.get('deploymentArtifact');

    // Get network configuration
    const networkConfig = getNetworkConfig(diamond.get('blockchain'), diamond.get('network'));
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(networkConfig.privateKey, provider);

    // Remove facet from diamond
    const removeResult = await removeFacetFromDiamond(wallet, {
      diamondAddress: diamond.get('contractAddress'),
      facetArtifact: artifact.toJSON()
    });

    // Log removal event
    await logDeploymentEvent(organizationId, user.id, 'facet_removed', {
      diamondAddress: diamond.get('contractAddress'),
      facetName: artifact.get('name'),
      txHash: removeResult.txHash,
      facetInstanceId
    });

    return {
      txHash: removeResult.txHash,
      blockNumber: removeResult.blockNumber
    };

  } catch (error) {
    console.error('Facet removal failed:', error);
    throw new Error(`Facet removal failed: ${error.message}`);
  }
});

// Helper Functions

function getNetworkConfig(blockchain, network) {
  const configs = {
    ethereum: {
      mainnet: {
        rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL,
        privateKey: process.env.ETHEREUM_MAINNET_PRIVATE_KEY
      },
      sepolia: {
        rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
        privateKey: process.env.ETHEREUM_SEPOLIA_PRIVATE_KEY
      }
    },
    polygon: {
      polygon: {
        rpcUrl: process.env.POLYGON_MAINNET_RPC_URL,
        privateKey: process.env.POLYGON_MAINNET_PRIVATE_KEY
      },
      mumbai: {
        rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL,
        privateKey: process.env.POLYGON_MUMBAI_PRIVATE_KEY
      }
    }
  };

  const config = configs[blockchain]?.[network];
  if (!config) {
    throw new Error(`Unsupported network: ${blockchain}/${network}`);
  }

  if (!config.privateKey) {
    throw new Error(`Private key not configured for ${blockchain}/${network}`);
  }

  return config;
}

async function deployDiamondContract(wallet, options) {
  // This is a simplified implementation
  // In a real implementation, you would:
  // 1. Deploy the Diamond contract
  // 2. Deploy core facets (DiamondCutFacet, DiamondLoupeFacet)
  // 3. Initialize the diamond with core facets
  
  // For now, return mock data
  const mockTx = {
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000
  };

  const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);

  return {
    contractAddress: mockAddress,
    txHash: mockTx.hash,
    blockNumber: mockTx.blockNumber
  };
}

async function installFacetToDiamond(wallet, options) {
  // This is a simplified implementation
  // In a real implementation, you would:
  // 1. Deploy the facet contract if not already deployed
  // 2. Use DiamondCutFacet to add the new facet to the diamond
  // 3. Initialize the facet if needed
  
  const mockTx = {
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000
  };

  const mockFacetAddress = '0x' + Math.random().toString(16).substr(2, 40);

  return {
    txHash: mockTx.hash,
    blockNumber: mockTx.blockNumber,
    facetAddress: mockFacetAddress
  };
}

async function removeFacetFromDiamond(wallet, options) {
  // This is a simplified implementation
  // In a real implementation, you would:
  // 1. Use DiamondCutFacet to remove the facet from the diamond
  // 2. Handle any cleanup required
  
  const mockTx = {
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000
  };

  return {
    txHash: mockTx.hash,
    blockNumber: mockTx.blockNumber
  };
}

async function logDeploymentEvent(organizationId, userId, eventType, data) {
  const AuditEvent = Parse.Object.extend('AuditEvent');
  const auditEvent = new AuditEvent();
  
  auditEvent.set('organizationId', organizationId);
  auditEvent.set('userId', userId);
  auditEvent.set('eventType', eventType);
  auditEvent.set('category', 'smart_contracts');
  auditEvent.set('severity', 'info');
  auditEvent.set('data', data);
  auditEvent.set('timestamp', new Date());
  
  await auditEvent.save(null, { useMasterKey: true });
}

module.exports = {
  deployOrganizationDiamond: Parse.Cloud.getFunction('deployOrganizationDiamond'),
  installFacetToDiamond: Parse.Cloud.getFunction('installFacetToDiamond'),
  removeFacetFromDiamond: Parse.Cloud.getFunction('removeFacetFromDiamond')
};