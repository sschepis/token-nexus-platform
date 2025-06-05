/**
 * Token Management Cloud Functions
 * Handles CRUD operations for digital tokens
 */

Parse.Cloud.define('getTokens', async (request) => {
  try {
    const { orgId, status, limit = 50, skip = 0 } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Create query for Token class
    const query = new Parse.Query('Token');
    
    // Filter by organization if provided
    if (orgId) {
      query.equalTo('organizationId', orgId);
    } else if (user.get('organizationId')) {
      // Default to user's organization
      query.equalTo('organizationId', user.get('organizationId'));
    }

    // Filter by status if provided
    if (status) {
      query.equalTo('status', status);
    }

    // Set pagination
    query.limit(limit);
    query.skip(skip);

    // Order by creation date (newest first)
    query.descending('createdAt');

    // Execute query
    const tokens = await query.find({ useMasterKey: true });

    // Transform results to match expected format
    const tokenData = tokens.map(token => ({
      id: token.id,
      name: token.get('name'),
      symbol: token.get('symbol'),
      type: token.get('type'),
      blockchain: token.get('blockchain'),
      supply: token.get('supply'),
      status: token.get('status'),
      description: token.get('description'),
      decimals: token.get('decimals'),
      contractAddress: token.get('contractAddress'),
      organizationId: token.get('organizationId'),
      createdAt: token.get('createdAt'),
      updatedAt: token.get('updatedAt')
    }));

    return {
      tokens: tokenData,
      totalCount: tokenData.length
    };

  } catch (error) {
    console.error('Error in getTokens cloud function:', error);
    throw new Error(error.message || 'Failed to fetch tokens');
  }
});

Parse.Cloud.define('createToken', async (request) => {
  try {
    const { name, symbol, type, blockchain, supply, description, decimals, orgId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Validate required fields
    if (!name || !symbol || !type || !blockchain || supply === undefined) {
      throw new Error('Missing required fields: name, symbol, type, blockchain, supply');
    }

    // Create new Token object
    const Token = Parse.Object.extend('Token');
    const token = new Token();

    // Set token properties
    token.set('name', name);
    token.set('symbol', symbol);
    token.set('type', type);
    token.set('blockchain', blockchain);
    token.set('supply', supply);
    token.set('status', 'draft'); // Default status
    token.set('organizationId', orgId || user.get('organizationId'));
    token.set('createdBy', user.id);

    // Set optional fields
    if (description) token.set('description', description);
    if (decimals !== undefined) token.set('decimals', decimals);

    // Save the token
    const savedToken = await token.save(null, { useMasterKey: true });

    return {
      token: {
        id: savedToken.id,
        name: savedToken.get('name'),
        symbol: savedToken.get('symbol'),
        type: savedToken.get('type'),
        blockchain: savedToken.get('blockchain'),
        supply: savedToken.get('supply'),
        status: savedToken.get('status'),
        description: savedToken.get('description'),
        decimals: savedToken.get('decimals'),
        organizationId: savedToken.get('organizationId'),
        createdAt: savedToken.get('createdAt'),
        updatedAt: savedToken.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in createToken cloud function:', error);
    throw new Error(error.message || 'Failed to create token');
  }
});

Parse.Cloud.define('getTokenDetails', async (request) => {
  try {
    const { tokenId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    // Query for the specific token
    const query = new Parse.Query('Token');
    query.equalTo('objectId', tokenId);

    const token = await query.first({ useMasterKey: true });

    if (!token) {
      throw new Error('Token not found');
    }

    return {
      token: {
        id: token.id,
        name: token.get('name'),
        symbol: token.get('symbol'),
        type: token.get('type'),
        blockchain: token.get('blockchain'),
        supply: token.get('supply'),
        status: token.get('status'),
        description: token.get('description'),
        decimals: token.get('decimals'),
        contractAddress: token.get('contractAddress'),
        organizationId: token.get('organizationId'),
        createdAt: token.get('createdAt'),
        updatedAt: token.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in getTokenDetails cloud function:', error);
    throw new Error(error.message || 'Failed to fetch token details');
  }
});

Parse.Cloud.define('updateTokenStatus', async (request) => {
  try {
    const { tokenId, status, reason, contractAddress } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!tokenId || !status) {
      throw new Error('Token ID and status are required');
    }

    // Query for the token
    const query = new Parse.Query('Token');
    query.equalTo('objectId', tokenId);

    const token = await query.first({ useMasterKey: true });

    if (!token) {
      throw new Error('Token not found');
    }

    // Update token status
    token.set('status', status);
    if (reason) token.set('statusReason', reason);
    if (contractAddress) token.set('contractAddress', contractAddress);

    const updatedToken = await token.save(null, { useMasterKey: true });

    return {
      token: {
        id: updatedToken.id,
        name: updatedToken.get('name'),
        symbol: updatedToken.get('symbol'),
        type: updatedToken.get('type'),
        blockchain: updatedToken.get('blockchain'),
        supply: updatedToken.get('supply'),
        status: updatedToken.get('status'),
        description: updatedToken.get('description'),
        decimals: updatedToken.get('decimals'),
        contractAddress: updatedToken.get('contractAddress'),
        organizationId: updatedToken.get('organizationId'),
        createdAt: updatedToken.get('createdAt'),
        updatedAt: updatedToken.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in updateTokenStatus cloud function:', error);
    throw new Error(error.message || 'Failed to update token status');
  }
});

Parse.Cloud.define('deleteToken', async (request) => {
  try {
    const { tokenId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    // Query for the token
    const query = new Parse.Query('Token');
    query.equalTo('objectId', tokenId);

    const token = await query.first({ useMasterKey: true });

    if (!token) {
      throw new Error('Token not found');
    }

    // Delete the token
    await token.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `Token ${tokenId} deleted successfully`
    };

  } catch (error) {
    console.error('Error in deleteToken cloud function:', error);
    throw new Error(error.message || 'Failed to delete token');
  }
});