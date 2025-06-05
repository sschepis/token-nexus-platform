// Cloud functions for Chain Configuration Management

// Get all chain configurations
Parse.Cloud.define('getChainConfigurations', async (request) => {
  const { user } = request;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can access chain configurations');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    const query = new Parse.Query(ChainConfig);
    query.include('networks');
    
    const configs = await query.find({ useMasterKey: true });
    
    const configData = configs.map(config => ({
      id: config.id,
      chainId: config.get('chainId'),
      chainName: config.get('chainName'),
      displayName: config.get('displayName'),
      nativeCurrency: config.get('nativeCurrency'),
      isActive: config.get('isActive'),
      networks: config.get('networks') || [],
      createdAt: config.get('createdAt'),
      updatedAt: config.get('updatedAt')
    }));

    return {
      success: true,
      configurations: configData
    };

  } catch (error) {
    console.error('Get chain configurations error:', error);
    throw error;
  }
});

// Create or update chain configuration
Parse.Cloud.define('saveChainConfiguration', async (request) => {
  const { user } = request;
  const { configId, chainId, chainName, displayName, nativeCurrency, networks } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  if (!chainId || !chainName || !displayName) {
    throw new Error('Chain ID, name, and display name are required');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    let config;

    if (configId) {
      // Update existing configuration
      const query = new Parse.Query(ChainConfig);
      config = await query.get(configId, { useMasterKey: true });
    } else {
      // Create new configuration
      config = new ChainConfig();
      
      // Check if chain already exists
      const existingQuery = new Parse.Query(ChainConfig);
      existingQuery.equalTo('chainId', chainId);
      const existing = await existingQuery.first({ useMasterKey: true });
      
      if (existing) {
        throw new Error(`Chain configuration for ${chainId} already exists`);
      }
    }

    config.set('chainId', chainId);
    config.set('chainName', chainName);
    config.set('displayName', displayName);
    config.set('nativeCurrency', nativeCurrency || { name: 'ETH', symbol: 'ETH', decimals: 18 });
    config.set('networks', networks || []);
    config.set('isActive', true);

    await config.save(null, { useMasterKey: true });

    // Log the action
    await logAuditAction(user, 'chainConfig.saved', 'ChainConfig', config.id, {
      chainId,
      chainName,
      action: configId ? 'updated' : 'created'
    });

    return {
      success: true,
      message: `Chain configuration ${configId ? 'updated' : 'created'} successfully`,
      configId: config.id
    };

  } catch (error) {
    console.error('Save chain configuration error:', error);
    throw error;
  }
});

// Update network within a chain configuration
Parse.Cloud.define('updateChainNetwork', async (request) => {
  const { user } = request;
  const { configId, networkId, updates } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  if (!configId || !networkId || !updates) {
    throw new Error('Configuration ID, network ID, and updates are required');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    const query = new Parse.Query(ChainConfig);
    const config = await query.get(configId, { useMasterKey: true });

    const networks = config.get('networks') || [];
    const networkIndex = networks.findIndex(n => n.id === networkId);

    if (networkIndex === -1) {
      throw new Error('Network not found in configuration');
    }

    // Update the specific network
    networks[networkIndex] = {
      ...networks[networkIndex],
      ...updates,
      id: networkId // Ensure ID doesn't change
    };

    config.set('networks', networks);
    await config.save(null, { useMasterKey: true });

    // Log the action
    await logAuditAction(user, 'chainNetwork.updated', 'ChainConfig', config.id, {
      networkId,
      updates
    });

    return {
      success: true,
      message: 'Network configuration updated successfully'
    };

  } catch (error) {
    console.error('Update chain network error:', error);
    throw error;
  }
});

// Add new network to chain configuration
Parse.Cloud.define('addChainNetwork', async (request) => {
  const { user } = request;
  const { configId, network } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  if (!configId || !network || !network.name || !network.rpcUrl) {
    throw new Error('Configuration ID and network details are required');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    const query = new Parse.Query(ChainConfig);
    const config = await query.get(configId, { useMasterKey: true });

    const networks = config.get('networks') || [];
    
    // Generate network ID
    const networkId = network.id || `${config.get('chainId')}-${network.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if network already exists
    if (networks.some(n => n.id === networkId)) {
      throw new Error('Network with this ID already exists');
    }

    networks.push({
      id: networkId,
      name: network.name,
      rpcUrl: network.rpcUrl,
      blockExplorerUrl: network.blockExplorerUrl,
      chainId: network.chainId,
      isTestnet: network.isTestnet || false,
      enabled: network.enabled !== false,
      gasSettings: network.gasSettings || {}
    });

    config.set('networks', networks);
    await config.save(null, { useMasterKey: true });

    // Log the action
    await logAuditAction(user, 'chainNetwork.added', 'ChainConfig', config.id, {
      networkId,
      networkName: network.name
    });

    return {
      success: true,
      message: 'Network added successfully',
      networkId
    };

  } catch (error) {
    console.error('Add chain network error:', error);
    throw error;
  }
});

// Remove network from chain configuration
Parse.Cloud.define('removeChainNetwork', async (request) => {
  const { user } = request;
  const { configId, networkId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  if (!configId || !networkId) {
    throw new Error('Configuration ID and network ID are required');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    const query = new Parse.Query(ChainConfig);
    const config = await query.get(configId, { useMasterKey: true });

    const networks = config.get('networks') || [];
    const filteredNetworks = networks.filter(n => n.id !== networkId);

    if (networks.length === filteredNetworks.length) {
      throw new Error('Network not found in configuration');
    }

    config.set('networks', filteredNetworks);
    await config.save(null, { useMasterKey: true });

    // Log the action
    await logAuditAction(user, 'chainNetwork.removed', 'ChainConfig', config.id, {
      networkId
    });

    return {
      success: true,
      message: 'Network removed successfully'
    };

  } catch (error) {
    console.error('Remove chain network error:', error);
    throw error;
  }
});

// Toggle chain configuration active status
Parse.Cloud.define('toggleChainStatus', async (request) => {
  const { user } = request;
  const { configId, isActive } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  if (!configId || typeof isActive !== 'boolean') {
    throw new Error('Configuration ID and active status are required');
  }

  try {
    const ChainConfig = Parse.Object.extend('ChainConfig');
    const query = new Parse.Query(ChainConfig);
    const config = await query.get(configId, { useMasterKey: true });

    config.set('isActive', isActive);
    await config.save(null, { useMasterKey: true });

    // Log the action
    await logAuditAction(user, 'chainConfig.statusChanged', 'ChainConfig', config.id, {
      chainName: config.get('chainName'),
      isActive
    });

    return {
      success: true,
      message: `Chain configuration ${isActive ? 'activated' : 'deactivated'} successfully`
    };

  } catch (error) {
    console.error('Toggle chain status error:', error);
    throw error;
  }
});

// Test RPC connection
Parse.Cloud.define('testRpcConnection', async (request) => {
  const { user } = request;
  const { rpcUrl } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can test RPC connections');
  }

  if (!rpcUrl) {
    throw new Error('RPC URL is required');
  }

  try {
    // In a real implementation, you would use ethers.js or web3.js to test the connection
    // For now, we'll simulate the test with a basic fetch
    const testPayload = {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      throw new Error('Failed to connect to RPC endpoint');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    return {
      success: true,
      message: 'RPC connection successful',
      blockNumber: parseInt(data.result, 16)
    };

  } catch (error) {
    console.error('Test RPC connection error:', error);
    return {
      success: false,
      message: error.message || 'Failed to connect to RPC endpoint'
    };
  }
});

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
    log.set('organizationId', 'system'); // Chain config is system-level
    log.set('timestamp', new Date());
    
    await log.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

module.exports = {};