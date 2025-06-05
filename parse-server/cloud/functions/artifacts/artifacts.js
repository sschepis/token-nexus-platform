// Cloud functions for managing deployment artifacts

Parse.Cloud.define('importCoreSystemArtifactsBatch', async (request) => {
  // Require master key for this operation
  if (!request.master) {
    throw new Error('Master key required');
  }

  const { 
    artifactsData, 
    targetNetworkName, 
    targetNetworkId, 
    rpcUrl, 
    explorerUrl 
  } = request.params;

  if (!artifactsData || !Array.isArray(artifactsData) || artifactsData.length === 0) {
    throw new Error('No artifacts data provided');
  }

  if (!targetNetworkName || !targetNetworkId) {
    throw new Error('Target network information required');
  }

  try {
    const results = {
      imported: [],
      failed: [],
      factoryAddresses: {}
    };

    // First, ensure the blockchain/network exists
    const Blockchain = Parse.Object.extend('Blockchain');
    const blockchainQuery = new Parse.Query(Blockchain);
    blockchainQuery.equalTo('networkName', targetNetworkName);
    let blockchain = await blockchainQuery.first({ useMasterKey: true });

    if (!blockchain) {
      blockchain = new Blockchain();
      blockchain.set('name', targetNetworkName);
      blockchain.set('networkName', targetNetworkName);
      blockchain.set('chainId', targetNetworkId);
      blockchain.set('rpcUrl', rpcUrl || '');
      blockchain.set('explorerUrl', explorerUrl || '');
      blockchain.set('isActive', true);
      await blockchain.save(null, { useMasterKey: true });
    }

    // Also ensure NetworkConfig exists (for new blockchain import system)
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const networkQuery = new Parse.Query(NetworkConfig);
    networkQuery.equalTo('networkId', targetNetworkName);
    let networkConfig = await networkQuery.first({ useMasterKey: true });

    if (!networkConfig) {
      networkConfig = new NetworkConfig();
      networkConfig.set('networkId', targetNetworkName);
      networkConfig.set('displayName', targetNetworkName);
      networkConfig.set('chainId', targetNetworkId);
      networkConfig.set('explorerUrl', explorerUrl || '');
      networkConfig.set('isActive', true);
      await networkConfig.save(null, { useMasterKey: true });
    }

    // Process each artifact
    for (const artifactInfo of artifactsData) {
      try {
        const { artifactName, artifactContent } = artifactInfo;
        const artifact = JSON.parse(artifactContent);

        if (!artifact.address || !artifact.abi) {
          results.failed.push({
            artifactName,
            error: 'Missing address or ABI in artifact'
          });
          continue;
        }

        // Determine contract type
        const contractType = determineContractType(artifactName, artifact.abi);
        const isFactory = contractType.includes('Factory');

        // Create/Update DeploymentArtifact
        const DeploymentArtifact = Parse.Object.extend('DeploymentArtifact');
        const artifactQuery = new Parse.Query(DeploymentArtifact);
        artifactQuery.equalTo('contractName', artifactName);
        artifactQuery.equalTo('network', targetNetworkName);
        artifactQuery.equalTo('address', artifact.address);
        
        let deploymentArtifact = await artifactQuery.first({ useMasterKey: true });
        
        if (!deploymentArtifact) {
          deploymentArtifact = new DeploymentArtifact();
          deploymentArtifact.set('contractName', artifactName);
          deploymentArtifact.set('network', targetNetworkName);
          deploymentArtifact.set('address', artifact.address);
        }
        
        deploymentArtifact.set('artifact', artifact);
        deploymentArtifact.set('importedAt', new Date());
        deploymentArtifact.set('isSystemContract', true);
        await deploymentArtifact.save(null, { useMasterKey: true });

        // Create/Update ABI record
        const ABI = Parse.Object.extend('ABI');
        const abiQuery = new Parse.Query(ABI);
        abiQuery.equalTo('name', artifactName);
        
        let abiRecord = await abiQuery.first({ useMasterKey: true });
        
        if (!abiRecord) {
          abiRecord = new ABI();
          abiRecord.set('name', artifactName);
        }
        
        abiRecord.set('abi', artifact.abi);
        abiRecord.set('contractType', contractType);
        abiRecord.set('metadata', { network: targetNetworkName });
        await abiRecord.save(null, { useMasterKey: true });

        // Handle specific contract types
        if (contractType === 'DiamondFactory') {
          const DiamondFactory = Parse.Object.extend('DiamondFactory');
          const factoryQuery = new Parse.Query(DiamondFactory);
          factoryQuery.equalTo('address', artifact.address);
          factoryQuery.equalTo('network', targetNetworkName);
          
          let factory = await factoryQuery.first({ useMasterKey: true });
          
          if (!factory) {
            factory = new DiamondFactory();
            factory.set('address', artifact.address);
            factory.set('network', targetNetworkName);
          }
          
          factory.set('abi', artifact.abi);
          factory.set('metadata', { contractName: artifactName });
          await factory.save(null, { useMasterKey: true });
          
          results.factoryAddresses['DiamondFactory'] = artifact.address;
        } else if (contractType === 'DiamondFacet' || artifactName.includes('Facet')) {
          const DiamondFacet = Parse.Object.extend('DiamondFacet');
          const facetQuery = new Parse.Query(DiamondFacet);
          facetQuery.equalTo('address', artifact.address);
          facetQuery.equalTo('network', targetNetworkName);
          
          let facet = await facetQuery.first({ useMasterKey: true });
          
          if (!facet) {
            facet = new DiamondFacet();
            facet.set('name', artifactName);
            facet.set('address', artifact.address);
            facet.set('network', targetNetworkName);
          }
          
          facet.set('abi', artifact.abi);
          facet.set('selectors', extractSelectors(artifact.abi));
          await facet.save(null, { useMasterKey: true });
        } else {
          // Generic SmartContract
          const SmartContract = Parse.Object.extend('SmartContract');
          const contractQuery = new Parse.Query(SmartContract);
          contractQuery.equalTo('address', artifact.address);
          contractQuery.equalTo('network', targetNetworkName);
          
          let contract = await contractQuery.first({ useMasterKey: true });
          
          if (!contract) {
            contract = new SmartContract();
            contract.set('name', artifactName);
            contract.set('address', artifact.address);
            contract.set('network', targetNetworkName);
          }
          
          contract.set('abi', artifact.abi);
          contract.set('contractType', contractType);
          contract.set('metadata', { isSystemContract: true });
          await contract.save(null, { useMasterKey: true });
        }

        // Also create FactoryContract record if it's a factory
        if (isFactory) {
          const FactoryContract = Parse.Object.extend('FactoryContract');
          const factoryQuery = new Parse.Query(FactoryContract);
          factoryQuery.equalTo('address', artifact.address);
          factoryQuery.equalTo('network', networkConfig);
          
          let factoryContract = await factoryQuery.first({ useMasterKey: true });
          
          if (!factoryContract) {
            factoryContract = new FactoryContract();
            factoryContract.set('contractName', artifactName);
            factoryContract.set('address', artifact.address);
            factoryContract.set('network', networkConfig);
            factoryContract.set('abi', artifact.abi);
            factoryContract.set('contractType', contractType);
            factoryContract.set('importedAt', new Date());
            await factoryContract.save(null, { useMasterKey: true });
          }

          results.factoryAddresses[artifactName] = artifact.address;
        }

        results.imported.push({
          artifactName,
          address: artifact.address,
          contractType
        });

      } catch (error) {
        results.failed.push({
          artifactName: artifactInfo.artifactName,
          error: error.message
        });
      }
    }

    return {
      success: results.failed.length === 0,
      imported: results.imported,
      failed: results.failed,
      factoryAddresses: results.factoryAddresses,
      totalProcessed: artifactsData.length
    };

  } catch (error) {
    console.error('Batch import failed:', error);
    throw error;
  }
});

// Helper function to determine contract type from name and ABI
function determineContractType(contractName, abi) {
  const name = contractName.toLowerCase();
  
  if (name.includes('diamondfactory')) return 'DiamondFactory';
  if (name.includes('identityfactory')) return 'IdentityFactory';
  if (name.includes('tokenfactory')) return 'TokenFactory';
  if (name.includes('factory')) return 'Factory';
  if (name.includes('facet')) return 'DiamondFacet';
  if (name.includes('diamond') && !name.includes('factory')) return 'Diamond';
  if (name.includes('token')) return 'Token';
  if (name.includes('identity')) return 'Identity';
  
  // Try to determine from ABI
  const functionNames = abi
    .filter(item => item.type === 'function')
    .map(item => item.name.toLowerCase());
  
  if (functionNames.includes('deploycontract') || functionNames.includes('deploy')) {
    return 'Factory';
  }
  
  return 'Contract';
}

// Helper function to extract function selectors from ABI
function extractSelectors(abi) {
  const ethers = require('ethers');
  const selectors = [];
  
  for (const item of abi) {
    if (item.type === 'function') {
      const signature = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
      const selector = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(signature)).slice(0, 10);
      selectors.push({
        signature,
        selector,
        name: item.name
      });
    }
  }
  
  return selectors;
}

module.exports = {};