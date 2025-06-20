/**
 * Update token status (e.g., pending -> confirmed, confirmed -> suspended)
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.tokenId - Token ID
 * @param {string} request.params.status - New status ('pending', 'confirmed', 'suspended', 'cancelled')
 * @param {string} request.params.reason - Reason for status change (optional)
 * @param {string} request.params.contractAddress - Contract address (required when confirming)
 * @returns {Object} Response with updated token
 */
Parse.Cloud.define('updateTokenStatus', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.tokenId || !params.status) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: tokenId and status');
    }

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'suspended', 'cancelled'];
    if (!validStatuses.includes(params.status)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Query the token
    const tokenQuery = new Parse.Query('Token');
    const token = await tokenQuery.get(params.tokenId, { sessionToken: user.getSessionToken() });
    
    if (!token) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Token not found');
    }

    const tokenOrgId = token.get('orgId');
    const currentStatus = token.get('status');
    
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
    const hasTokenWritePermission = userRoles.some(role => 
      ['org_admin', 'token_manager'].includes(role)
    );
    
    if (!hasTokenWritePermission) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission to update token status');
    }

    // Validate status transitions
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['suspended'],
      'suspended': ['confirmed', 'cancelled'],
      'cancelled': [] // Cannot transition from cancelled
    };

    if (!validTransitions[currentStatus]?.includes(params.status)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 
        `Invalid status transition from '${currentStatus}' to '${params.status}'`);
    }

    // Special validation for confirming tokens
    if (params.status === 'confirmed') {
      if (!params.contractAddress) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 
          'Contract address is required when confirming a token');
      }
      
      // Validate contract address format (basic validation)
      const contractAddress = params.contractAddress.trim();
      if (contractAddress.length < 10) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid contract address format');
      }
      
      // Check if contract address is already used by another token
      const existingContractQuery = new Parse.Query('Token');
      existingContractQuery.equalTo('contractAddress', contractAddress);
      existingContractQuery.notEqualTo('objectId', params.tokenId);
      
      const existingContract = await existingContractQuery.first({ useMasterKey: true });
      if (existingContract) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 
          'Contract address is already used by another token');
      }
    }

    // Store previous status for audit log
    const previousStatus = currentStatus;
    
    // Update token status
    token.set('status', params.status);
    token.set('updatedBy', user);
    
    // Set contract address if confirming
    if (params.status === 'confirmed' && params.contractAddress) {
      token.set('contractAddress', params.contractAddress.trim());
    }
    
    // Set status change metadata
    token.set('statusChangedAt', new Date());
    token.set('statusChangedBy', user);
    
    if (params.reason) {
      token.set('statusChangeReason', params.reason.trim());
    }

    // Save the token
    const savedToken = await token.save(null, { sessionToken: user.getSessionToken() });

    // Create audit log entry
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'token_status_updated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', tokenOrgId);
    auditLog.set('resourceType', 'Token');
    auditLog.set('resourceId', savedToken.id);
    auditLog.set('details', {
      tokenName: savedToken.get('name'),
      tokenSymbol: savedToken.get('symbol'),
      previousStatus: previousStatus,
      newStatus: params.status,
      reason: params.reason,
      contractAddress: params.contractAddress
    });
    await auditLog.save(null, { useMasterKey: true });

    // Send notification to relevant users (token creator, org admins)
    try {
      const Notification = Parse.Object.extend('Notification');
      
      // Notify token creator if different from current user
      const createdBy = savedToken.get('createdBy');
      if (createdBy && createdBy.id !== user.id) {
        const creatorNotification = new Notification();
        creatorNotification.set('userId', createdBy.id);
        creatorNotification.set('type', 'token_status_changed');
        creatorNotification.set('title', `Token Status Updated`);
        creatorNotification.set('message', 
          `Your token "${savedToken.get('name')}" status changed from ${previousStatus} to ${params.status}`);
        creatorNotification.set('data', {
          tokenId: savedToken.id,
          tokenName: savedToken.get('name'),
          previousStatus: previousStatus,
          newStatus: params.status
        });
        creatorNotification.set('isRead', false);
        await creatorNotification.save(null, { useMasterKey: true });
      }
      
      // Notify org admins
      const orgAdminQuery = new Parse.Query('OrgUser');
      orgAdminQuery.equalTo('orgId', tokenOrgId);
      orgAdminQuery.containsAll('roles', ['org_admin']);
      orgAdminQuery.equalTo('isActive', true);
      orgAdminQuery.notEqualTo('userId', user.id); // Don't notify the user who made the change
      
      const orgAdmins = await orgAdminQuery.find({ useMasterKey: true });
      
      for (const orgAdmin of orgAdmins) {
        const adminNotification = new Notification();
        adminNotification.set('userId', orgAdmin.get('userId'));
        adminNotification.set('type', 'token_status_changed');
        adminNotification.set('title', `Token Status Updated`);
        adminNotification.set('message', 
          `Token "${savedToken.get('name')}" status changed from ${previousStatus} to ${params.status}`);
        adminNotification.set('data', {
          tokenId: savedToken.id,
          tokenName: savedToken.get('name'),
          previousStatus: previousStatus,
          newStatus: params.status,
          changedBy: user.id
        });
        adminNotification.set('isRead', false);
        await adminNotification.save(null, { useMasterKey: true });
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

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
      contractAddress: savedToken.get('contractAddress'),
      createdAt: savedToken.get('createdAt')?.toISOString(),
      updatedAt: savedToken.get('updatedAt')?.toISOString(),
      createdBy: savedToken.get('createdBy')?.id,
      updatedBy: user.id,
      statusChangedAt: savedToken.get('statusChangedAt')?.toISOString(),
      statusChangedBy: user.id,
      statusChangeReason: savedToken.get('statusChangeReason'),
      orgId: tokenOrgId
    };

    return {
      success: true,
      token: formattedToken,
      message: `Token status updated from ${previousStatus} to ${params.status}`
    };

  } catch (error) {
    console.error('Error in updateTokenStatus:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update token status');
  }
});