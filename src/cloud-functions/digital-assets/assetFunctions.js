/**
 * Digital Assets Parse Cloud Functions
 * Backend services for the Digital Assets standard application
 */

// Create a new digital asset
Parse.Cloud.define('createDigitalAsset', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const {
    name,
    symbol,
    description,
    assetType,
    totalSupply,
    decimals,
    metadata,
    contractType,
    isTransferable,
    isBurnable,
    isMintable
  } = params;
  
  // Validate required fields
  if (!name || !symbol || !assetType) {
    throw new Error('Name, symbol, and asset type are required');
  }
  
  try {
    // Create asset object
    const DigitalAsset = Parse.Object.extend('DigitalAsset');
    const asset = new DigitalAsset();
    
    asset.set('name', name);
    asset.set('symbol', symbol);
    asset.set('description', description || '');
    asset.set('assetType', assetType);
    asset.set('totalSupply', totalSupply || 0);
    asset.set('decimals', decimals || 18);
    asset.set('metadata', metadata || {});
    asset.set('contractType', contractType || 'ERC20');
    asset.set('isTransferable', isTransferable !== false);
    asset.set('isBurnable', isBurnable === true);
    asset.set('isMintable', isMintable === true);
    asset.set('status', 'draft');
    asset.set('owner', user);
    asset.set('createdBy', user);
    
    // Set initial supply tracking
    asset.set('currentSupply', 0);
    asset.set('burnedSupply', 0);
    asset.set('circulatingSupply', 0);
    
    await asset.save(null, { useMasterKey: true });
    
    // Log audit event
    await Parse.Cloud.run('logAuditEvent', {
      action: 'asset_created',
      entityType: 'DigitalAsset',
      entityId: asset.id,
      userId: user.id,
      details: {
        name,
        symbol,
        assetType,
        contractType
      }
    });
    
    return asset;
    
  } catch (error) {
    console.error('Error creating digital asset:', error);
    throw error;
  }
});

// Deploy asset to blockchain
Parse.Cloud.define('deployAsset', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const { assetId, network, gasPrice } = params;
  
  try {
    // Get asset
    const asset = await new Parse.Query('DigitalAsset').get(assetId, { useMasterKey: true });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Check ownership
    if (asset.get('owner').id !== user.id) {
      throw new Error('Only asset owner can deploy');
    }
    
    // Check status
    if (asset.get('status') !== 'draft') {
      throw new Error('Asset must be in draft status to deploy');
    }
    
    // Create deployment record
    const AssetDeployment = Parse.Object.extend('AssetDeployment');
    const deployment = new AssetDeployment();
    
    deployment.set('asset', asset);
    deployment.set('network', network || 'ethereum');
    deployment.set('status', 'pending');
    deployment.set('gasPrice', gasPrice);
    deployment.set('deployedBy', user);
    
    await deployment.save(null, { useMasterKey: true });
    
    // Update asset status
    asset.set('status', 'deploying');
    asset.set('currentDeployment', deployment);
    await asset.save(null, { useMasterKey: true });
    
    // Trigger blockchain deployment (would integrate with actual deployment service)
    await triggerBlockchainDeployment(asset, deployment);
    
    // Log audit event
    await Parse.Cloud.run('logAuditEvent', {
      action: 'asset_deployment_initiated',
      entityType: 'DigitalAsset',
      entityId: assetId,
      userId: user.id,
      details: {
        network,
        deploymentId: deployment.id
      }
    });
    
    return deployment;
    
  } catch (error) {
    console.error('Error deploying asset:', error);
    throw error;
  }
});

// Mint tokens
Parse.Cloud.define('mintTokens', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const { assetId, recipient, amount, reason } = params;
  
  try {
    // Get asset
    const asset = await new Parse.Query('DigitalAsset').get(assetId, { useMasterKey: true });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Check permissions
    if (!asset.get('isMintable')) {
      throw new Error('Asset is not mintable');
    }
    
    // Check if user has minting permissions
    const hasPermission = await checkMintingPermission(user, asset);
    if (!hasPermission) {
      throw new Error('User does not have minting permissions');
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check supply limits
    const currentSupply = asset.get('currentSupply') || 0;
    const totalSupply = asset.get('totalSupply') || 0;
    
    if (totalSupply > 0 && currentSupply + amount > totalSupply) {
      throw new Error('Minting would exceed total supply');
    }
    
    // Create minting transaction
    const AssetTransaction = Parse.Object.extend('AssetTransaction');
    const transaction = new AssetTransaction();
    
    transaction.set('asset', asset);
    transaction.set('transactionType', 'mint');
    transaction.set('from', null);
    transaction.set('to', recipient);
    transaction.set('amount', amount);
    transaction.set('reason', reason || 'Token minting');
    transaction.set('status', 'pending');
    transaction.set('initiatedBy', user);
    
    await transaction.save(null, { useMasterKey: true });
    
    // Update asset supply
    asset.set('currentSupply', currentSupply + amount);
    asset.set('circulatingSupply', (asset.get('circulatingSupply') || 0) + amount);
    await asset.save(null, { useMasterKey: true });
    
    // Update or create asset holding
    await updateAssetHolding(recipient, asset, amount, 'mint');
    
    // Execute blockchain transaction if deployed
    if (asset.get('contractAddress')) {
      await executeBlockchainMint(asset, recipient, amount, transaction);
    }
    
    // Update transaction status
    transaction.set('status', 'completed');
    transaction.set('completedAt', new Date());
    await transaction.save(null, { useMasterKey: true });
    
    // Log audit event
    await Parse.Cloud.run('logAuditEvent', {
      action: 'tokens_minted',
      entityType: 'DigitalAsset',
      entityId: assetId,
      userId: user.id,
      details: {
        recipient,
        amount,
        reason,
        transactionId: transaction.id
      }
    });
    
    return transaction;
    
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
});

// Transfer tokens
Parse.Cloud.define('transferTokens', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const { assetId, from, to, amount, reason } = params;
  
  try {
    // Get asset
    const asset = await new Parse.Query('DigitalAsset').get(assetId, { useMasterKey: true });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Check if asset is transferable
    if (!asset.get('isTransferable')) {
      throw new Error('Asset is not transferable');
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check sender balance
    const senderBalance = await getAssetBalance(from, asset);
    if (senderBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Check transfer permissions
    const hasPermission = await checkTransferPermission(user, from, asset);
    if (!hasPermission) {
      throw new Error('User does not have transfer permissions');
    }
    
    // Create transfer transaction
    const AssetTransaction = Parse.Object.extend('AssetTransaction');
    const transaction = new AssetTransaction();
    
    transaction.set('asset', asset);
    transaction.set('transactionType', 'transfer');
    transaction.set('from', from);
    transaction.set('to', to);
    transaction.set('amount', amount);
    transaction.set('reason', reason || 'Token transfer');
    transaction.set('status', 'pending');
    transaction.set('initiatedBy', user);
    
    await transaction.save(null, { useMasterKey: true });
    
    // Update asset holdings
    await updateAssetHolding(from, asset, -amount, 'transfer_out');
    await updateAssetHolding(to, asset, amount, 'transfer_in');
    
    // Execute blockchain transaction if deployed
    if (asset.get('contractAddress')) {
      await executeBlockchainTransfer(asset, from, to, amount, transaction);
    }
    
    // Update transaction status
    transaction.set('status', 'completed');
    transaction.set('completedAt', new Date());
    await transaction.save(null, { useMasterKey: true });
    
    // Log audit event
    await Parse.Cloud.run('logAuditEvent', {
      action: 'tokens_transferred',
      entityType: 'DigitalAsset',
      entityId: assetId,
      userId: user.id,
      details: {
        from,
        to,
        amount,
        reason,
        transactionId: transaction.id
      }
    });
    
    return transaction;
    
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
});

// Burn tokens
Parse.Cloud.define('burnTokens', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const { assetId, from, amount, reason } = params;
  
  try {
    // Get asset
    const asset = await new Parse.Query('DigitalAsset').get(assetId, { useMasterKey: true });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Check if asset is burnable
    if (!asset.get('isBurnable')) {
      throw new Error('Asset is not burnable');
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Check balance
    const balance = await getAssetBalance(from, asset);
    if (balance < amount) {
      throw new Error('Insufficient balance to burn');
    }
    
    // Check burn permissions
    const hasPermission = await checkBurnPermission(user, from, asset);
    if (!hasPermission) {
      throw new Error('User does not have burn permissions');
    }
    
    // Create burn transaction
    const AssetTransaction = Parse.Object.extend('AssetTransaction');
    const transaction = new AssetTransaction();
    
    transaction.set('asset', asset);
    transaction.set('transactionType', 'burn');
    transaction.set('from', from);
    transaction.set('to', null);
    transaction.set('amount', amount);
    transaction.set('reason', reason || 'Token burn');
    transaction.set('status', 'pending');
    transaction.set('initiatedBy', user);
    
    await transaction.save(null, { useMasterKey: true });
    
    // Update asset supply
    const currentSupply = asset.get('currentSupply') || 0;
    const burnedSupply = asset.get('burnedSupply') || 0;
    const circulatingSupply = asset.get('circulatingSupply') || 0;
    
    asset.set('currentSupply', currentSupply - amount);
    asset.set('burnedSupply', burnedSupply + amount);
    asset.set('circulatingSupply', circulatingSupply - amount);
    await asset.save(null, { useMasterKey: true });
    
    // Update asset holding
    await updateAssetHolding(from, asset, -amount, 'burn');
    
    // Execute blockchain transaction if deployed
    if (asset.get('contractAddress')) {
      await executeBlockchainBurn(asset, from, amount, transaction);
    }
    
    // Update transaction status
    transaction.set('status', 'completed');
    transaction.set('completedAt', new Date());
    await transaction.save(null, { useMasterKey: true });
    
    // Log audit event
    await Parse.Cloud.run('logAuditEvent', {
      action: 'tokens_burned',
      entityType: 'DigitalAsset',
      entityId: assetId,
      userId: user.id,
      details: {
        from,
        amount,
        reason,
        transactionId: transaction.id
      }
    });
    
    return transaction;
    
  } catch (error) {
    console.error('Error burning tokens:', error);
    throw error;
  }
});

// Get asset portfolio for user
Parse.Cloud.define('getAssetPortfolio', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  const { userId } = params;
  const targetUserId = userId || user.id;
  
  try {
    // Get asset holdings
    const holdingsQuery = new Parse.Query('AssetHolding');
    holdingsQuery.equalTo('holder', targetUserId);
    holdingsQuery.greaterThan('balance', 0);
    holdingsQuery.include('asset');
    holdingsQuery.limit(1000);
    
    const holdings = await holdingsQuery.find({ useMasterKey: true });
    
    // Calculate portfolio metrics
    let totalValue = 0;
    const assetBreakdown = [];
    
    for (const holding of holdings) {
      const asset = holding.get('asset');
      const balance = holding.get('balance');
      const value = holding.get('estimatedValue') || 0;
      
      totalValue += value;
      
      assetBreakdown.push({
        assetId: asset.id,
        name: asset.get('name'),
        symbol: asset.get('symbol'),
        assetType: asset.get('assetType'),
        balance: balance,
        value: value,
        percentage: 0 // Will be calculated after total
      });
    }
    
    // Calculate percentages
    assetBreakdown.forEach(item => {
      item.percentage = totalValue > 0 ? (item.value / totalValue * 100).toFixed(2) : 0;
    });
    
    // Get recent transactions
    const transactionsQuery = new Parse.Query('AssetTransaction');
    const fromQuery = new Parse.Query('AssetTransaction');
    fromQuery.equalTo('from', targetUserId);
    const toQuery = new Parse.Query('AssetTransaction');
    toQuery.equalTo('to', targetUserId);
    
    transactionsQuery._orQuery([fromQuery, toQuery]);
    transactionsQuery.descending('createdAt');
    transactionsQuery.include('asset');
    transactionsQuery.limit(50);
    
    const recentTransactions = await transactionsQuery.find({ useMasterKey: true });
    
    return {
      totalValue,
      assetCount: holdings.length,
      assetBreakdown,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        assetName: tx.get('asset').get('name'),
        assetSymbol: tx.get('asset').get('symbol'),
        type: tx.get('transactionType'),
        amount: tx.get('amount'),
        from: tx.get('from'),
        to: tx.get('to'),
        status: tx.get('status'),
        createdAt: tx.get('createdAt')
      }))
    };
    
  } catch (error) {
    console.error('Error getting asset portfolio:', error);
    throw error;
  }
});

// Helper functions
async function checkMintingPermission(user, asset) {
  // Check if user is asset owner or has minting role
  if (asset.get('owner').id === user.id) {
    return true;
  }
  
  // Check for minting permissions in asset permissions
  const permissionsQuery = new Parse.Query('AssetPermission');
  permissionsQuery.equalTo('asset', asset);
  permissionsQuery.equalTo('user', user);
  permissionsQuery.equalTo('permission', 'mint');
  
  const permission = await permissionsQuery.first({ useMasterKey: true });
  return !!permission;
}

async function checkTransferPermission(user, from, asset) {
  // Users can always transfer their own tokens
  if (from === user.id) {
    return true;
  }
  
  // Check for transfer permissions
  const permissionsQuery = new Parse.Query('AssetPermission');
  permissionsQuery.equalTo('asset', asset);
  permissionsQuery.equalTo('user', user);
  permissionsQuery.equalTo('permission', 'transfer');
  
  const permission = await permissionsQuery.first({ useMasterKey: true });
  return !!permission;
}

async function checkBurnPermission(user, from, asset) {
  // Users can burn their own tokens
  if (from === user.id) {
    return true;
  }
  
  // Asset owner can burn any tokens
  if (asset.get('owner').id === user.id) {
    return true;
  }
  
  // Check for burn permissions
  const permissionsQuery = new Parse.Query('AssetPermission');
  permissionsQuery.equalTo('asset', asset);
  permissionsQuery.equalTo('user', user);
  permissionsQuery.equalTo('permission', 'burn');
  
  const permission = await permissionsQuery.first({ useMasterKey: true });
  return !!permission;
}

async function getAssetBalance(userId, asset) {
  const holdingQuery = new Parse.Query('AssetHolding');
  holdingQuery.equalTo('holder', userId);
  holdingQuery.equalTo('asset', asset);
  
  const holding = await holdingQuery.first({ useMasterKey: true });
  return holding ? holding.get('balance') : 0;
}

async function updateAssetHolding(userId, asset, amount, transactionType) {
  let holding;
  
  // Find existing holding
  const holdingQuery = new Parse.Query('AssetHolding');
  holdingQuery.equalTo('holder', userId);
  holdingQuery.equalTo('asset', asset);
  
  holding = await holdingQuery.first({ useMasterKey: true });
  
  if (!holding) {
    // Create new holding
    const AssetHolding = Parse.Object.extend('AssetHolding');
    holding = new AssetHolding();
    holding.set('holder', userId);
    holding.set('asset', asset);
    holding.set('balance', 0);
    holding.set('totalReceived', 0);
    holding.set('totalSent', 0);
  }
  
  // Update balance
  const currentBalance = holding.get('balance') || 0;
  const newBalance = currentBalance + amount;
  
  holding.set('balance', Math.max(0, newBalance));
  holding.set('lastTransactionAt', new Date());
  
  // Update totals
  if (amount > 0) {
    holding.set('totalReceived', (holding.get('totalReceived') || 0) + amount);
  } else {
    holding.set('totalSent', (holding.get('totalSent') || 0) + Math.abs(amount));
  }
  
  await holding.save(null, { useMasterKey: true });
  return holding;
}

// Blockchain integration functions (mock implementations)
async function triggerBlockchainDeployment(asset, deployment) {
  // This would integrate with actual blockchain deployment service
  console.log(`Deploying asset ${asset.get('name')} to blockchain`);
  
  // Simulate deployment
  setTimeout(async () => {
    try {
      // Mock contract address
      const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      // Update asset with contract info
      asset.set('contractAddress', contractAddress);
      asset.set('status', 'deployed');
      asset.set('deployedAt', new Date());
      await asset.save(null, { useMasterKey: true });
      
      // Update deployment
      deployment.set('status', 'completed');
      deployment.set('contractAddress', contractAddress);
      deployment.set('completedAt', new Date());
      await deployment.save(null, { useMasterKey: true });
      
    } catch (error) {
      console.error('Deployment failed:', error);
      deployment.set('status', 'failed');
      deployment.set('error', error.message);
      await deployment.save(null, { useMasterKey: true });
    }
  }, 5000);
}

async function executeBlockchainMint(asset, recipient, amount, transaction) {
  // Mock blockchain mint
  console.log(`Minting ${amount} tokens to ${recipient}`);
  return true;
}

async function executeBlockchainTransfer(asset, from, to, amount, transaction) {
  // Mock blockchain transfer
  console.log(`Transferring ${amount} tokens from ${from} to ${to}`);
  return true;
}

async function executeBlockchainBurn(asset, from, amount, transaction) {
  // Mock blockchain burn
  console.log(`Burning ${amount} tokens from ${from}`);
  return true;
}

module.exports = {
  checkMintingPermission,
  checkTransferPermission,
  checkBurnPermission,
  getAssetBalance,
  updateAssetHolding,
  triggerBlockchainDeployment
};