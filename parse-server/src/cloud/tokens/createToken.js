const Parse = require('parse/node');

/**
 * Create a new token for the current organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - Token name
 * @param {string} request.params.symbol - Token symbol
 * @param {string} request.params.type - Token type (e.g., 'ERC3643', 'Stellar')
 * @param {string} request.params.blockchain - Blockchain network
 * @param {number} request.params.supply - Initial supply
 * @param {string} request.params.description - Token description (optional)
 * @param {number} request.params.decimals - Token decimals (optional, default 18)
 * @param {string} request.params.orgId - Organization ID (optional, uses current org if not provided)
 * @returns {Object} Response with created token
 */
Parse.Cloud.define('createToken', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    const requiredFields = ['name', 'symbol', 'type', 'blockchain', 'supply'];
    for (const field of requiredFields) {
      if (!params[field]) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Missing required field: ${field}`);
      }
    }

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
    const hasTokenWritePermission = userRoles.some(role => 
      ['org_admin', 'token_manager'].includes(role)
    );
    
    if (!hasTokenWritePermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to create tokens');
    }

    // Validate token symbol uniqueness within organization
    const existingTokenQuery = new Parse.Query('Token');
    existingTokenQuery.equalTo('orgId', orgId);
    existingTokenQuery.equalTo('symbol', params.symbol.toUpperCase());
    
    const existingToken = await existingTokenQuery.first({ useMasterKey: true });
    if (existingToken) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, `Token with symbol '${params.symbol}' already exists in this organization`);
    }

    // Validate supply is a positive number
    const supply = Number(params.supply);
    if (isNaN(supply) || supply <= 0) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Supply must be a positive number');
    }

    // Validate decimals if provided
    let decimals = 18; // Default for most tokens
    if (params.decimals !== undefined) {
      decimals = Number(params.decimals);
      if (isNaN(decimals) || decimals < 0 || decimals > 18) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Decimals must be a number between 0 and 18');
      }
    }

    // Create new token
    const Token = Parse.Object.extend('Token');
    const token = new Token();
    
    // Set token properties
    token.set('name', params.name.trim());
    token.set('symbol', params.symbol.toUpperCase().trim());
    token.set('type', params.type);
    token.set('blockchain', params.blockchain);
    token.set('supply', supply);
    token.set('totalSupply', supply);
    token.set('circulatingSupply', 0); // Initially 0
    token.set('decimals', decimals);
    token.set('status', 'pending'); // New tokens start as pending
    token.set('orgId', orgId);
    token.set('createdBy', user);
    
    // Optional fields
    if (params.description) {
      token.set('description', params.description.trim());
    }
    
    // Set ACL - organization members can read, only token managers and admins can write
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${orgId}_members`, true);
    acl.setRoleWriteAccess(`org_${orgId}_admins`, true);
    acl.setRoleWriteAccess(`org_${orgId}_token_managers`, true);
    token.setACL(acl);

    // Save the token
    const savedToken = await token.save(null, { sessionToken: user.getSessionToken() });

    // Log the token creation for audit purposes
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'token_created');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Token');
    auditLog.set('resourceId', savedToken.id);
    auditLog.set('details', {
      tokenName: params.name,
      tokenSymbol: params.symbol,
      tokenType: params.type,
      blockchain: params.blockchain,
      supply: supply
    });
    await auditLog.save(null, { useMasterKey: true });

    // Format response to match frontend expectations
    const formattedToken = {
      id: savedToken.id,
      name: savedToken.get('name'),
      symbol: savedToken.get('symbol'),
      type: savedToken.get('type'),
      blockchain: savedToken.get('blockchain'),
      supply: savedToken.get('supply'),
      totalSupply: savedToken.get('totalSupply'),
      circulatingSupply: savedToken.get('circulatingSupply'),
      decimals: savedToken.get('decimals'),
      status: savedToken.get('status'),
      description: savedToken.get('description'),
      createdAt: savedToken.get('createdAt')?.toISOString(),
      createdBy: user.id,
      orgId: orgId
    };

    return {
      success: true,
      token: formattedToken,
      message: 'Token created successfully'
    };

  } catch (error) {
    console.error('Error in createToken:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create token');
  }
});