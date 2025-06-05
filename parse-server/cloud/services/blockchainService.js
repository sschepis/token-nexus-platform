const fs = require('fs').promises;
const path = require('path');

class BlockchainService {
  constructor() {
    this.deploymentBasePath = path.join(process.cwd(), '../src/config/evm-deployments');
    this.networkConfig = {
      basesep: {
        displayName: 'Base Sepolia',
        chainId: 84532,
        currency: 'ETH',
        explorerUrl: 'https://sepolia.basescan.org',
      },
      mainnet: {
        displayName: 'Ethereum Mainnet',
        chainId: 1,
        currency: 'ETH',
        explorerUrl: 'https://etherscan.io',
      },
      polygon: {
        displayName: 'Polygon',
        chainId: 137,
        currency: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
      },
      mumbai: {
        displayName: 'Polygon Mumbai',
        chainId: 80001,
        currency: 'MATIC',
        explorerUrl: 'https://mumbai.polygonscan.com',
      },
      arbitrum: {
        displayName: 'Arbitrum One',
        chainId: 42161,
        currency: 'ETH',
        explorerUrl: 'https://arbiscan.io',
      },
      optimism: {
        displayName: 'Optimism',
        chainId: 10,
        currency: 'ETH',
        explorerUrl: 'https://optimistic.etherscan.io',
      },
    };
    
    this.factoryContractPatterns = [
      'Factory',
      'Registry',
      'Diamond',
      'Deployer',
      'Creator',
    ];
  }

  async scanAvailableNetworks() {
    try {
      const networks = [];
      
      // Check if deployment directory exists
      try {
        await fs.access(this.deploymentBasePath);
      } catch (error) {
        console.log('Deployment directory not found:', this.deploymentBasePath);
        return { networks: [] };
      }

      // Read all directories in the deployment path
      const entries = await fs.readdir(this.deploymentBasePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const networkId = entry.name;
          const networkPath = path.join(this.deploymentBasePath, networkId);
          
          // Read contracts in network directory
          const contracts = await this.scanNetworkContracts(networkPath);
          
          if (contracts.length > 0) {
            const factoryCount = contracts.filter(c => c.isFactory).length;
            
            networks.push({
              id: networkId,
              displayName: this.networkConfig[networkId]?.displayName || networkId,
              contractCount: contracts.length,
              factoryCount,
              contracts,
            });
          }
        }
      }
      
      return { networks };
    } catch (error) {
      console.error('Error scanning networks:', error);
      throw new Error(`Failed to scan deployment networks: ${error.message}`);
    }
  }

  async scanNetworkContracts(networkPath) {
    const contracts = [];
    
    try {
      const files = await fs.readdir(networkPath);
      
      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('solcInputs')) {
          const filePath = path.join(networkPath, file);
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Extract contract info
            if (data.address && data.abi) {
              const contractName = file.replace('.json', '');
              const isFactory = this.isFactoryContract(contractName);
              
              contracts.push({
                name: contractName,
                address: data.address,
                isFactory,
                abi: data.abi,
              });
            }
          } catch (error) {
            console.error(`Error reading contract file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning network contracts in ${networkPath}:`, error);
    }
    
    return contracts;
  }

  isFactoryContract(contractName) {
    return this.factoryContractPatterns.some(pattern => 
      contractName.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async importFactoryContracts(networkId, contracts, user) {
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const imported = [];
    const failed = [];
    const errors = [];

    for (const contract of contracts) {
      try {
        // Check if contract already exists
        const query = new Parse.Query(FactoryContract);
        query.equalTo('networkId', networkId);
        query.equalTo('address', contract.address.toLowerCase());
        const existing = await query.first({ useMasterKey: true });

        if (existing) {
          // Update existing contract
          existing.set('contractName', contract.name);
          existing.set('abi', contract.abi);
          existing.set('contractType', this.getContractType(contract.name));
          existing.set('updatedBy', user.get('username'));
          await existing.save(null, { useMasterKey: true });
          imported.push(contract.name);
        } else {
          // Create new contract
          const factoryContract = new FactoryContract();
          factoryContract.set('networkId', networkId);
          factoryContract.set('contractName', contract.name);
          factoryContract.set('address', contract.address.toLowerCase());
          factoryContract.set('abi', contract.abi);
          factoryContract.set('contractType', this.getContractType(contract.name));
          factoryContract.set('isFactory', contract.isFactory);
          factoryContract.set('importedAt', new Date());
          factoryContract.set('importedBy', user.get('username'));
          
          await factoryContract.save(null, { useMasterKey: true });
          imported.push(contract.name);
        }
      } catch (error) {
        console.error(`Error importing contract ${contract.name}:`, error);
        failed.push(contract.name);
        errors.push(`${contract.name}: ${error.message}`);
      }
    }

    // Update network configuration
    await this.updateNetworkConfig(networkId);

    return {
      imported: imported.length,
      failed: failed.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  getContractType(contractName) {
    if (contractName.includes('Diamond')) return 'Diamond';
    if (contractName.includes('Factory')) return 'Factory';
    if (contractName.includes('Registry')) return 'Registry';
    if (contractName.includes('Facet')) return 'Facet';
    if (contractName.includes('Identity')) return 'Identity';
    return 'Contract';
  }

  async updateNetworkConfig(networkId) {
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const query = new Parse.Query(NetworkConfig);
    query.equalTo('networkId', networkId);
    let network = await query.first({ useMasterKey: true });

    if (!network) {
      network = new NetworkConfig();
      network.set('networkId', networkId);
    }

    const config = this.networkConfig[networkId] || {};
    network.set('displayName', config.displayName || networkId);
    network.set('chainId', config.chainId);
    network.set('currency', config.currency || 'ETH');
    network.set('explorerUrl', config.explorerUrl);
    network.set('isActive', true);
    
    await network.save(null, { useMasterKey: true });
  }

  async getSystemFactoryContracts(networkId, searchTerm) {
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const query = new Parse.Query(FactoryContract);
    
    if (networkId) {
      query.equalTo('networkId', networkId);
    }
    
    if (searchTerm) {
      const nameQuery = new Parse.Query(FactoryContract);
      nameQuery.matches('contractName', searchTerm, 'i');
      
      const addressQuery = new Parse.Query(FactoryContract);
      addressQuery.startsWith('address', searchTerm.toLowerCase());
      
      query._orQuery([nameQuery, addressQuery]);
    }
    
    query.descending('importedAt');
    query.limit(1000);
    
    const factories = await query.find({ useMasterKey: true });
    
    // Get all networks
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const networkQuery = new Parse.Query(NetworkConfig);
    const networks = await networkQuery.find({ useMasterKey: true });
    
    return {
      factories: factories.map(f => ({
        id: f.id,
        networkId: f.get('networkId'),
        contractName: f.get('contractName'),
        address: f.get('address'),
        contractType: f.get('contractType'),
        importedAt: f.get('importedAt'),
        importedBy: f.get('importedBy'),
      })),
      networks: networks.map(n => ({
        id: n.get('networkId'),
        displayName: n.get('displayName'),
        explorerUrl: n.get('explorerUrl'),
      })),
    };
  }

  async deleteFactoryContract(factoryId, user) {
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const query = new Parse.Query(FactoryContract);
    const factory = await query.get(factoryId, { useMasterKey: true });
    
    if (!factory) {
      throw new Error('Factory contract not found');
    }
    
    // Log deletion
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    log.set('action', 'DELETE_FACTORY_CONTRACT');
    log.set('objectId', factoryId);
    log.set('objectData', {
      contractName: factory.get('contractName'),
      address: factory.get('address'),
      networkId: factory.get('networkId'),
    });
    log.set('user', user);
    log.set('timestamp', new Date());
    await log.save(null, { useMasterKey: true });
    
    await factory.destroy({ useMasterKey: true });
  }

  async exportFactoryRegistry() {
    const FactoryContract = Parse.Object.extend('FactoryContract');
    const query = new Parse.Query(FactoryContract);
    query.limit(10000);
    const factories = await query.find({ useMasterKey: true });
    
    const NetworkConfig = Parse.Object.extend('NetworkConfig');
    const networkQuery = new Parse.Query(NetworkConfig);
    const networks = await networkQuery.find({ useMasterKey: true });
    
    const networkMap = {};
    networks.forEach(n => {
      networkMap[n.get('networkId')] = {
        displayName: n.get('displayName'),
        chainId: n.get('chainId'),
        currency: n.get('currency'),
        explorerUrl: n.get('explorerUrl'),
      };
    });
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      networks: networkMap,
      factories: factories.map(f => ({
        networkId: f.get('networkId'),
        contractName: f.get('contractName'),
        address: f.get('address'),
        contractType: f.get('contractType'),
        isFactory: f.get('isFactory'),
        importedAt: f.get('importedAt'),
        importedBy: f.get('importedBy'),
        abi: f.get('abi'),
      })),
    };
    
    return exportData;
  }
}

module.exports = BlockchainService;