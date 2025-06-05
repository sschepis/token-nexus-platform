const Parse = require('parse/node');

/**
 * Get detailed information about a specific token
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.tokenId - Token ID
 * @returns {Object} Response with detailed token information
 */
Parse.Cloud.define('getTokenDetails', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.tokenId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: tokenId');
    }

    // Query the token
    const tokenQuery = new Parse.Query('Token');
    tokenQuery.include('createdBy');
    tokenQuery.include('updatedBy');
    
    const token = await tokenQuery.get(params.tokenId, { sessionToken: user.getSessionToken() });
    
    if (!token) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Token not found');
    }

    const tokenOrgId = token.get('orgId');
    
    // Verify user has access to this token's organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', tokenOrgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this token');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const hasTokenReadPermission = userRoles.some(role => 
      ['org_admin', 'token_manager', 'developer'].includes(role)
    );
    
    if (!hasTokenReadPermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to read token details');
    }

    // Get token transactions/activities (if any)
    const transactionQuery = new Parse.Query('TokenTransaction');
    transactionQuery.equalTo('tokenId', params.tokenId);
    transactionQuery.descending('createdAt');
    transactionQuery.limit(10); // Latest 10 transactions
    transactionQuery.include('fromUser');
    transactionQuery.include('toUser');
    
    const transactions = await transactionQuery.find({ sessionToken: user.getSessionToken() });

    // Get token holders (if any)
    const holderQuery = new Parse.Query('TokenHolder');
    holderQuery.equalTo('tokenId', params.tokenId);
    holderQuery.greaterThan('balance', 0);
    holderQuery.descending('balance');
    holderQuery.limit(20); // Top 20 holders
    holderQuery.include('userId');
    
    const holders = await holderQuery.find({ sessionToken: user.getSessionToken() });

    // Get audit logs for this token
    const auditQuery = new Parse.Query('AuditLog');
    auditQuery.equalTo('resourceType', 'Token');
    auditQuery.equalTo('resourceId', params.tokenId);
    auditQuery.descending('createdAt');
    auditQuery.limit(20); // Latest 20 audit entries
    auditQuery.include('userId');
    
    const auditLogs = await auditQuery.find({ useMasterKey: true });

    // Format creator information
    const createdBy = token.get('createdBy');
    const creatorInfo = createdBy ? {
      id: createdBy.id,
      firstName: createdBy.get('firstName'),
      lastName: createdBy.get('lastName'),
      email: createdBy.get('email')
    } : null;

    // Format updater information
    const updatedBy = token.get('updatedBy');
    const updaterInfo = updatedBy ? {
      id: updatedBy.id,
      firstName: updatedBy.get('firstName'),
      lastName: updatedBy.get('lastName'),
      email: updatedBy.get('email')
    } : null;

    // Format transactions
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      type: tx.get('type'),
      amount: tx.get('amount'),
      fromUser: tx.get('fromUser') ? {
        id: tx.get('fromUser').id,
        firstName: tx.get('fromUser').get('firstName'),
        lastName: tx.get('fromUser').get('lastName')
      } : null,
      toUser: tx.get('toUser') ? {
        id: tx.get('toUser').id,
        firstName: tx.get('toUser').get('firstName'),
        lastName: tx.get('toUser').get('lastName')
      } : null,
      status: tx.get('status'),
      transactionHash: tx.get('transactionHash'),
      createdAt: tx.get('createdAt')?.toISOString()
    }));

    // Format holders
    const formattedHolders = holders.map(holder => ({
      id: holder.id,
      user: holder.get('userId') ? {
        id: holder.get('userId').id,
        firstName: holder.get('userId').get('firstName'),
        lastName: holder.get('userId').get('lastName'),
        email: holder.get('userId').get('email')
      } : null,
      balance: holder.get('balance'),
      percentage: holder.get('percentage'),
      updatedAt: holder.get('updatedAt')?.toISOString()
    }));

    // Format audit logs
    const formattedAuditLogs = auditLogs.map(log => ({
      id: log.id,
      action: log.get('action'),
      user: log.get('userId') ? {
        id: log.get('userId').id,
        firstName: log.get('userId').get('firstName'),
        lastName: log.get('userId').get('lastName')
      } : null,
      details: log.get('details'),
      createdAt: log.get('createdAt')?.toISOString()
    }));

    // Calculate token statistics
    const totalHolders = holders.length;
    const totalCirculating = holders.reduce((sum, holder) => sum + (holder.get('balance') || 0), 0);

    // Format detailed token response
    const tokenDetails = {
      id: token.id,
      name: token.get('name'),
      symbol: token.get('symbol'),
      type: token.get('type'),
      blockchain: token.get('blockchain'),
      supply: token.get('supply'),
      totalSupply: token.get('totalSupply'),
      circulatingSupply: token.get('circulatingSupply') || totalCirculating,
      decimals: token.get('decimals'),
      status: token.get('status'),
      description: token.get('description'),
      contractAddress: token.get('contractAddress'),
      price: token.get('price'),
      marketCap: token.get('marketCap'),
      createdAt: token.get('createdAt')?.toISOString(),
      updatedAt: token.get('updatedAt')?.toISOString(),
      createdBy: creatorInfo,
      updatedBy: updaterInfo,
      orgId: tokenOrgId,
      
      // Statistics
      statistics: {
        totalHolders: totalHolders,
        totalTransactions: transactions.length,
        circulatingSupply: totalCirculating,
        supplyUtilization: token.get('totalSupply') ? (totalCirculating / token.get('totalSupply') * 100) : 0
      },
      
      // Related data
      recentTransactions: formattedTransactions,
      topHolders: formattedHolders,
      auditLog: formattedAuditLogs
    };

    return {
      success: true,
      token: tokenDetails
    };

  } catch (error) {
    console.error('Error in getTokenDetails:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch token details');
  }
});