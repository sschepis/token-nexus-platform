/**
 * Get tokens for the current organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.orgId - Organization ID (optional, uses current org if not provided)
 * @param {string} request.params.status - Filter by status (optional)
 * @param {number} request.params.limit - Limit number of results (optional, default 100)
 * @param {number} request.params.skip - Skip number of results (optional, default 0)
 * @returns {Object} Response with tokens array
 */
Parse.Cloud.define('getTokens', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Get organization context
    let orgId = params.orgId;
    if (!orgId) {
      // Get user's current organization
      const userQuery = new Parse.Query(Parse.User);
      const currentUser = await userQuery.get(user.id, { useMasterKey: true });
      orgId = currentUser.get('currentOrgId');
      
      if (!orgId) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No current organization set for user');
      }
    }

    // Verify user has access to this organization
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this organization');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const hasTokenReadPermission = userRoles.some(role => 
      ['org_admin', 'token_manager', 'developer'].includes(role)
    );
    
    if (!hasTokenReadPermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to read tokens');
    }

    // Query tokens for the organization
    const tokenQuery = new Parse.Query('Token');
    tokenQuery.equalTo('orgId', orgId);
    
    // Apply status filter if provided
    if (params.status) {
      tokenQuery.equalTo('status', params.status);
    }
    
    // Apply pagination
    const limit = Math.min(params.limit || 100, 1000); // Max 1000 tokens per request
    const skip = params.skip || 0;
    tokenQuery.limit(limit);
    tokenQuery.skip(skip);
    
    // Order by creation date (newest first)
    tokenQuery.descending('createdAt');
    
    // Include creator information
    tokenQuery.include('createdBy');

    const tokens = await tokenQuery.find({ sessionToken: user.getSessionToken() });

    // Format response to match frontend expectations
    const formattedTokens = tokens.map(token => ({
      id: token.id,
      name: token.get('name'),
      symbol: token.get('symbol'),
      type: token.get('type'),
      blockchain: token.get('blockchain'),
      supply: token.get('supply'),
      status: token.get('status'),
      createdAt: token.get('createdAt')?.toISOString(),
      createdBy: token.get('createdBy')?.id,
      contractAddress: token.get('contractAddress'),
      // Additional fields that might be useful
      description: token.get('description'),
      decimals: token.get('decimals'),
      totalSupply: token.get('totalSupply'),
      circulatingSupply: token.get('circulatingSupply'),
      marketCap: token.get('marketCap'),
      price: token.get('price'),
      updatedAt: token.get('updatedAt')?.toISOString()
    }));

    return {
      success: true,
      tokens: formattedTokens,
      total: formattedTokens.length,
      hasMore: formattedTokens.length === limit
    };

  } catch (error) {
    console.error('Error in getTokens:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch tokens');
  }
});