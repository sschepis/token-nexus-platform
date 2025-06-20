/**
 * Digital Assets Cloud Functions
 * Parse Cloud Functions for the Digital Assets standard application
 * Integrates with MarketplaceFacet and ERC721PermissionedTokenFacet smart contracts
 */

// Contract addresses from basesep deployment
const MARKETPLACE_FACET_ADDRESS = '0x5F7f4140D8A316035e372aBA11F37cE9E414e94E';
const ERC721_TOKEN_FACET_ADDRESS = '0x3c06E1EB88217964799566E85773C2E9c03DEB4b';

// Digital Asset Management Functions
Parse.Cloud.define('createDigitalAsset', async (request) => {
  const { user, params } = request;
  
  try {
    // Validate user permissions
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    // Validate required parameters
    const { 
      name,
      description,
      assetType,
      metadata,
      organizationId,
      mintToAddress
    } = params;
    
    if (!name || !description || !assetType) {
      throw new Error('Name, description, and asset type are required');
    }
    
    // Create new digital asset record
    const DigitalAsset = Parse.Object.extend('DigitalAsset');
    const asset = new DigitalAsset();
    
    // Set basic information
    asset.set('user', user);
    asset.set('organizationId', organizationId || 'default');
    asset.set('name', name);
    asset.set('description', description);
    asset.set('assetType', assetType); // e.g., 'invoice', 'carbon-credit', 'trade-document'
    asset.set('metadata', metadata || {});
    asset.set('status', 'pending_mint');
    asset.set('contractAddress', ERC721_TOKEN_FACET_ADDRESS);
    asset.set('mintToAddress', mintToAddress);
    
    // Set metadata
    asset.set('createdBy', user);
    asset.set('lastModifiedBy', user);
    
    // Save digital asset
    const savedAsset = await asset.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'digital_asset_created',
      entityType: 'DigitalAsset',
      entityId: savedAsset.id,
      userId: user.id,
      details: {
        name,
        assetType,
        contractAddress: ERC721_TOKEN_FACET_ADDRESS
      }
    });
    
    return {
      success: true,
      assetId: savedAsset.id,
      status: 'pending_mint',
      contractAddress: ERC721_TOKEN_FACET_ADDRESS,
      message: 'Digital asset created successfully, ready for minting'
    };
    
  } catch (error) {
    console.error('Error creating digital asset:', error);
    throw new Error(`Failed to create digital asset: ${error.message}`);
  }
});

Parse.Cloud.define('updateAssetMinting', async (request) => {
  const { user, params } = request;
  
  try {
    const { assetId, tokenId, transactionHash, blockNumber, tokenURI } = params;
    
    if (!assetId || !tokenId || !transactionHash) {
      throw new Error('Missing required parameters');
    }
    
    // Get existing digital asset
    const asset = await new Parse.Query('DigitalAsset')
      .equalTo('objectId', assetId)
      .first({ useMasterKey: true });
      
    if (!asset) {
      throw new Error('Digital asset not found');
    }
    
    // Check permissions
    if (asset.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to update this digital asset');
    }
    
    // Update minting information
    asset.set('status', 'minted');
    asset.set('tokenId', tokenId);
    asset.set('mintTxHash', transactionHash);
    asset.set('mintBlock', blockNumber);
    asset.set('tokenURI', tokenURI);
    asset.set('mintedAt', new Date());
    asset.set('lastModifiedBy', user);
    asset.set('lastModifiedAt', new Date());
    
    const savedAsset = await asset.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'digital_asset_minted',
      entityType: 'DigitalAsset',
      entityId: savedAsset.id,
      userId: user.id,
      details: {
        tokenId,
        transactionHash,
        blockNumber
      }
    });
    
    return {
      success: true,
      asset: savedAsset.toJSON(),
      message: 'Digital asset minting updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating asset minting:', error);
    throw new Error(`Failed to update asset minting: ${error.message}`);
  }
});

Parse.Cloud.define('listAssetOnMarketplace', async (request) => {
  const { user, params } = request;
  
  try {
    const { assetId, price, paymentToken, organizationId } = params;
    
    if (!assetId || !price) {
      throw new Error('Asset ID and price are required');
    }
    
    // Get existing digital asset
    const asset = await new Parse.Query('DigitalAsset')
      .equalTo('objectId', assetId)
      .first({ useMasterKey: true });
      
    if (!asset) {
      throw new Error('Digital asset not found');
    }
    
    // Check permissions
    if (asset.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to list this digital asset');
    }
    
    // Check if asset is minted
    if (asset.get('status') !== 'minted') {
      throw new Error('Asset must be minted before listing on marketplace');
    }
    
    // Create marketplace listing record
    const MarketplaceListing = Parse.Object.extend('MarketplaceListing');
    const listing = new MarketplaceListing();
    
    listing.set('user', user);
    listing.set('organizationId', organizationId || 'default');
    listing.set('asset', asset);
    listing.set('tokenId', asset.get('tokenId'));
    listing.set('contractAddress', asset.get('contractAddress'));
    listing.set('price', price);
    listing.set('paymentToken', paymentToken || 'ETH');
    listing.set('status', 'pending_listing');
    listing.set('marketplaceAddress', MARKETPLACE_FACET_ADDRESS);
    listing.set('createdBy', user);
    
    const savedListing = await listing.save(null, { useMasterKey: true });
    
    // Update asset status
    asset.set('status', 'listed');
    asset.set('currentListing', savedListing);
    await asset.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'asset_listed_marketplace',
      entityType: 'MarketplaceListing',
      entityId: savedListing.id,
      userId: user.id,
      details: {
        assetId,
        tokenId: asset.get('tokenId'),
        price,
        paymentToken: paymentToken || 'ETH'
      }
    });
    
    return {
      success: true,
      listingId: savedListing.id,
      marketplaceAddress: MARKETPLACE_FACET_ADDRESS,
      status: 'pending_listing',
      message: 'Asset listing created successfully, ready for marketplace deployment'
    };
    
  } catch (error) {
    console.error('Error listing asset on marketplace:', error);
    throw new Error(`Failed to list asset on marketplace: ${error.message}`);
  }
});

Parse.Cloud.define('updateMarketplaceListing', async (request) => {
  const { user, params } = request;
  
  try {
    const { listingId, marketplaceItemId, transactionHash, blockNumber, status } = params;
    
    if (!listingId || !transactionHash) {
      throw new Error('Missing required parameters');
    }
    
    // Get existing marketplace listing
    const listing = await new Parse.Query('MarketplaceListing')
      .equalTo('objectId', listingId)
      .include('asset')
      .first({ useMasterKey: true });
      
    if (!listing) {
      throw new Error('Marketplace listing not found');
    }
    
    // Check permissions
    if (listing.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to update this marketplace listing');
    }
    
    // Update listing information
    listing.set('status', status || 'active');
    listing.set('marketplaceItemId', marketplaceItemId);
    listing.set('listingTxHash', transactionHash);
    listing.set('listingBlock', blockNumber);
    listing.set('listedAt', new Date());
    listing.set('lastModifiedBy', user);
    listing.set('lastModifiedAt', new Date());
    
    const savedListing = await listing.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'marketplace_listing_updated',
      entityType: 'MarketplaceListing',
      entityId: savedListing.id,
      userId: user.id,
      details: {
        marketplaceItemId,
        transactionHash,
        blockNumber,
        status: status || 'active'
      }
    });
    
    return {
      success: true,
      listing: savedListing.toJSON(),
      message: 'Marketplace listing updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating marketplace listing:', error);
    throw new Error(`Failed to update marketplace listing: ${error.message}`);
  }
});

Parse.Cloud.define('getDigitalAsset', async (request) => {
  const { user, params } = request;
  
  try {
    const { assetId, tokenId, organizationId } = params;
    
    let query = new Parse.Query('DigitalAsset');
    
    if (assetId) {
      query.equalTo('objectId', assetId);
    } else if (tokenId) {
      query.equalTo('tokenId', tokenId);
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }
    } else {
      throw new Error('Asset ID or Token ID is required');
    }
    
    const asset = await query
      .include('user')
      .include('currentListing')
      .first({ useMasterKey: true });
      
    if (!asset) {
      return { 
        success: false, 
        message: 'Digital asset not found' 
      };
    }
    
    // Check permissions for private assets
    if (asset.get('user').id !== user.id && !user.get('isAdmin') && asset.get('visibility') === 'private') {
      throw new Error('Insufficient permissions to view this digital asset');
    }
    
    return {
      success: true,
      asset: asset.toJSON(),
      message: 'Digital asset details retrieved successfully'
    };
    
  } catch (error) {
    console.error('Error getting digital asset details:', error);
    throw new Error(`Failed to get digital asset details: ${error.message}`);
  }
});

Parse.Cloud.define('getMarketplaceListings', async (request) => {
  const { user, params } = request;
  
  try {
    const { organizationId, assetType, status, limit = 50, skip = 0 } = params;
    
    let query = new Parse.Query('MarketplaceListing');
    
    if (organizationId) {
      query.equalTo('organizationId', organizationId);
    }
    
    if (status) {
      query.equalTo('status', status);
    } else {
      query.equalTo('status', 'active'); // Default to active listings
    }
    
    if (assetType) {
      const assetQuery = new Parse.Query('DigitalAsset');
      assetQuery.equalTo('assetType', assetType);
      query.matchesQuery('asset', assetQuery);
    }
    
    query.include('asset');
    query.include('user');
    query.descending('createdAt');
    query.limit(Math.min(limit, 100)); // Cap at 100
    query.skip(skip);
    
    const listings = await query.find({ useMasterKey: true });
    
    return {
      success: true,
      listings: listings.map(listing => listing.toJSON()),
      count: listings.length,
      message: 'Marketplace listings retrieved successfully'
    };
    
  } catch (error) {
    console.error('Error getting marketplace listings:', error);
    throw new Error(`Failed to get marketplace listings: ${error.message}`);
  }
});

Parse.Cloud.define('getAssetStats', async (request) => {
  const { user, params } = request;
  
  try {
    // Check admin permissions
    if (!user.get('isAdmin')) {
      throw new Error('Insufficient permissions to view asset statistics');
    }
    
    const { organizationId } = params;
    
    // Build base queries
    let assetQuery = new Parse.Query('DigitalAsset');
    let listingQuery = new Parse.Query('MarketplaceListing');
    
    if (organizationId) {
      assetQuery.equalTo('organizationId', organizationId);
      listingQuery.equalTo('organizationId', organizationId);
    }
    
    // Get total assets
    const totalAssets = await assetQuery.count({ useMasterKey: true });
    
    // Get minted assets
    const mintedAssets = await assetQuery.equalTo('status', 'minted').count({ useMasterKey: true });
    
    // Get listed assets
    const listedAssets = await assetQuery.equalTo('status', 'listed').count({ useMasterKey: true });
    
    // Get active listings
    const activeListings = await listingQuery.equalTo('status', 'active').count({ useMasterKey: true });
    
    // Get assets by type
    const assetTypes = ['invoice', 'carbon-credit', 'trade-document', 'other'];
    const assetsByType = {};
    
    for (const type of assetTypes) {
      assetsByType[type] = await assetQuery.equalTo('assetType', type).count({ useMasterKey: true });
    }
    
    return {
      success: true,
      stats: {
        totalAssets,
        mintedAssets,
        listedAssets,
        activeListings,
        assetsByType,
        contractAddresses: {
          erc721: ERC721_TOKEN_FACET_ADDRESS,
          marketplace: MARKETPLACE_FACET_ADDRESS
        }
      }
    };
    
  } catch (error) {
    console.error('Error getting asset stats:', error);
    throw new Error(`Failed to get asset statistics: ${error.message}`);
  }
});

// Helper function for audit logging (if not already defined)
if (!Parse.Cloud.get('createAuditEntry')) {
  Parse.Cloud.define('createAuditEntry', async (request) => {
    const { params } = request;
    
    try {
      const { action, entityType, entityId, userId, details } = params;
      
      const AuditLog = Parse.Object.extend('AuditLog');
      const auditEntry = new AuditLog();
      
      auditEntry.set('action', action);
      auditEntry.set('entityType', entityType);
      auditEntry.set('entityId', entityId);
      auditEntry.set('userId', userId);
      auditEntry.set('details', details || {});
      auditEntry.set('timestamp', new Date());
      auditEntry.set('ipAddress', request.ip);
      auditEntry.set('userAgent', request.headers['user-agent']);
      
      await auditEntry.save(null, { useMasterKey: true });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error creating audit entry:', error);
      // Don't throw error for audit logging failures
      return { success: false, error: error.message };
    }
  });
}

console.log('✓ Digital assets cloud functions loaded');