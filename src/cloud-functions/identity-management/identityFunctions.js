/**
 * Identity Management Cloud Functions
 * Parse Cloud Functions for the Identity Management standard application
 * Integrates with IdentityFactory and Identity smart contracts on Base Sepolia
 */

// Contract addresses from basesep deployment
const IDENTITY_FACTORY_ADDRESS = '0x5c970fD1E772548Be3Dc3de62381Fd8b2b3fAb96';
const IDENTITY_CONTRACT_ADDRESS = '0x4C6fE457018d32B9aEc2aA99F655b5aCD7d0D658';

// Identity Management Functions
Parse.Cloud.define('createIdentity', async (request) => {
  const { user, params } = request;
  
  try {
    // Validate user permissions
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    // Validate required parameters
    const { 
      firstName, 
      lastName, 
      email, 
      dateOfBirth, 
      nationality,
      documentType,
      documentNumber,
      issuingCountry,
      expiryDate,
      address,
      city,
      country,
      phoneNumber
    } = params;
    
    if (!firstName || !lastName || !email) {
      throw new Error('First name, last name, and email are required');
    }
    
    // Check if identity already exists for this user
    const existingIdentity = await new Parse.Query('Identity')
      .equalTo('user', user)
      .first({ useMasterKey: true });
      
    if (existingIdentity) {
      throw new Error('Identity already exists for this user');
    }
    
    // Create new identity record
    const Identity = Parse.Object.extend('Identity');
    const identity = new Identity();
    
    // Set basic information
    identity.set('user', user);
    identity.set('firstName', firstName);
    identity.set('lastName', lastName);
    identity.set('email', email);
    identity.set('dateOfBirth', new Date(dateOfBirth));
    identity.set('nationality', nationality);
    identity.set('phoneNumber', phoneNumber);
    identity.set('status', 'pending_verification');
    identity.set('verificationLevel', 'none');
    
    // Set document information
    if (documentType && documentNumber) {
      identity.set('documentType', documentType);
      identity.set('documentNumber', documentNumber);
      identity.set('issuingCountry', issuingCountry);
      identity.set('expiryDate', new Date(expiryDate));
    }
    
    // Set address information
    if (address && city && country) {
      identity.set('address', {
        street: address,
        city: city,
        country: country,
        postalCode: params.postalCode || ''
      });
    }
    
    // Set metadata
    identity.set('createdBy', user);
    identity.set('lastModifiedBy', user);
    
    // Save identity
    const savedIdentity = await identity.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'identity_created',
      entityType: 'Identity',
      entityId: savedIdentity.id,
      userId: user.id,
      details: {
        firstName,
        lastName,
        email,
        documentType
      }
    });
    
    // Trigger verification workflow
    await Parse.Cloud.run('initiateIdentityVerification', {
      identityId: savedIdentity.id
    });
    
    return {
      success: true,
      identityId: savedIdentity.id,
      status: 'pending_verification',
      message: 'Identity created successfully and verification initiated'
    };
    
  } catch (error) {
    console.error('Error creating identity:', error);
    throw new Error(`Failed to create identity: ${error.message}`);
  }
});

// On-chain identity management functions
Parse.Cloud.define('createOnChainIdentity', async (request) => {
  const { user, params } = request;
  
  try {
    // Validate user permissions
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    // Validate required parameters
    const { walletAddress, organizationId } = params;
    
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    
    // Check if on-chain identity already exists for this wallet
    const existingOnChainIdentity = await new Parse.Query('OnChainIdentity')
      .equalTo('walletAddress', walletAddress.toLowerCase())
      .equalTo('organizationId', organizationId || 'default')
      .first({ useMasterKey: true });
      
    if (existingOnChainIdentity) {
      throw new Error('On-chain identity already exists for this wallet');
    }
    
    // Create new on-chain identity record
    const OnChainIdentity = Parse.Object.extend('OnChainIdentity');
    const onChainIdentity = new OnChainIdentity();
    
    // Set basic information
    onChainIdentity.set('user', user);
    onChainIdentity.set('organizationId', organizationId || 'default');
    onChainIdentity.set('walletAddress', walletAddress.toLowerCase());
    onChainIdentity.set('factoryAddress', IDENTITY_FACTORY_ADDRESS);
    onChainIdentity.set('status', 'pending_deployment');
    onChainIdentity.set('claims', []);
    onChainIdentity.set('keys', []);
    onChainIdentity.set('attributes', {});
    onChainIdentity.set('controllers', []);
    
    // Set metadata
    onChainIdentity.set('createdBy', user);
    onChainIdentity.set('lastModifiedBy', user);
    
    // Save on-chain identity
    const savedOnChainIdentity = await onChainIdentity.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'onchain_identity_created',
      entityType: 'OnChainIdentity',
      entityId: savedOnChainIdentity.id,
      userId: user.id,
      details: {
        walletAddress,
        factoryAddress: IDENTITY_FACTORY_ADDRESS,
        organizationId: organizationId || 'default'
      }
    });
    
    return {
      success: true,
      onChainIdentityId: savedOnChainIdentity.id,
      walletAddress: walletAddress.toLowerCase(),
      factoryAddress: IDENTITY_FACTORY_ADDRESS,
      status: 'pending_deployment',
      message: 'On-chain identity created successfully, ready for blockchain deployment'
    };
    
  } catch (error) {
    console.error('Error creating on-chain identity:', error);
    throw new Error(`Failed to create on-chain identity: ${error.message}`);
  }
});

Parse.Cloud.define('updateOnChainIdentityDeployment', async (request) => {
  const { user, params } = request;
  
  try {
    const { onChainIdentityId, contractAddress, transactionHash, blockNumber } = params;
    
    if (!onChainIdentityId || !contractAddress || !transactionHash) {
      throw new Error('Missing required parameters');
    }
    
    // Get existing on-chain identity
    const onChainIdentity = await new Parse.Query('OnChainIdentity')
      .equalTo('objectId', onChainIdentityId)
      .first({ useMasterKey: true });
      
    if (!onChainIdentity) {
      throw new Error('On-chain identity not found');
    }
    
    // Check permissions
    if (onChainIdentity.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to update this on-chain identity');
    }
    
    // Update deployment information
    onChainIdentity.set('status', 'deployed');
    onChainIdentity.set('contractAddress', contractAddress.toLowerCase());
    onChainIdentity.set('deploymentTxHash', transactionHash);
    onChainIdentity.set('deploymentBlock', blockNumber);
    onChainIdentity.set('deployedAt', new Date());
    onChainIdentity.set('lastModifiedBy', user);
    onChainIdentity.set('lastModifiedAt', new Date());
    
    const savedOnChainIdentity = await onChainIdentity.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'onchain_identity_deployed',
      entityType: 'OnChainIdentity',
      entityId: savedOnChainIdentity.id,
      userId: user.id,
      details: {
        contractAddress,
        transactionHash,
        blockNumber
      }
    });
    
    return {
      success: true,
      onChainIdentity: savedOnChainIdentity.toJSON(),
      message: 'On-chain identity deployment updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating on-chain identity deployment:', error);
    throw new Error(`Failed to update on-chain identity deployment: ${error.message}`);
  }
});

Parse.Cloud.define('getOnChainIdentity', async (request) => {
  const { user, params } = request;
  
  try {
    const { walletAddress, onChainIdentityId, organizationId } = params;
    
    let query = new Parse.Query('OnChainIdentity');
    
    if (onChainIdentityId) {
      query.equalTo('objectId', onChainIdentityId);
    } else if (walletAddress) {
      query.equalTo('walletAddress', walletAddress.toLowerCase());
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }
    } else {
      query.equalTo('user', user);
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }
    }
    
    const onChainIdentity = await query
      .include('user')
      .first({ useMasterKey: true });
      
    if (!onChainIdentity) {
      return {
        success: false,
        message: 'On-chain identity not found'
      };
    }
    
    // Check permissions
    if (onChainIdentity.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to view this on-chain identity');
    }
    
    return {
      success: true,
      onChainIdentity: onChainIdentity.toJSON(),
      message: 'On-chain identity details retrieved successfully'
    };
    
  } catch (error) {
    console.error('Error getting on-chain identity details:', error);
    throw new Error(`Failed to get on-chain identity details: ${error.message}`);
  }
});

Parse.Cloud.define('updateIdentity', async (request) => {
  const { user, params } = request;
  
  try {
    const { identityId, updates } = params;
    
    if (!identityId) {
      throw new Error('Identity ID is required');
    }
    
    // Get existing identity
    const identity = await new Parse.Query('Identity')
      .equalTo('objectId', identityId)
      .first({ useMasterKey: true });
      
    if (!identity) {
      throw new Error('Identity not found');
    }
    
    // Check permissions
    if (identity.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to update this identity');
    }
    
    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'address',
      'occupation', 'sourceOfFunds'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        identity.set(field, updates[field]);
      }
    }
    
    identity.set('lastModifiedBy', user);
    identity.set('lastModifiedAt', new Date());
    
    const savedIdentity = await identity.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'identity_updated',
      entityType: 'Identity',
      entityId: savedIdentity.id,
      userId: user.id,
      details: updates
    });
    
    return {
      success: true,
      identity: savedIdentity.toJSON(),
      message: 'Identity updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating identity:', error);
    throw new Error(`Failed to update identity: ${error.message}`);
  }
});

Parse.Cloud.define('getIdentityDetails', async (request) => {
  const { user, params } = request;
  
  try {
    const { identityId } = params;
    
    let query = new Parse.Query('Identity');
    
    if (identityId) {
      query.equalTo('objectId', identityId);
    } else {
      query.equalTo('user', user);
    }
    
    const identity = await query
      .include('user')
      .include('verificationDocuments')
      .include('credentials')
      .first({ useMasterKey: true });
      
    if (!identity) {
      throw new Error('Identity not found');
    }
    
    // Check permissions
    if (identity.get('user').id !== user.id && !user.get('isAdmin')) {
      throw new Error('Insufficient permissions to view this identity');
    }
    
    // Get verification history
    const verificationHistory = await new Parse.Query('IdentityVerification')
      .equalTo('identity', identity)
      .descending('createdAt')
      .limit(10)
      .find({ useMasterKey: true });
    
    return {
      success: true,
      identity: identity.toJSON(),
      verificationHistory: verificationHistory.map(v => v.toJSON()),
      message: 'Identity details retrieved successfully'
    };
    
  } catch (error) {
    console.error('Error getting identity details:', error);
    throw new Error(`Failed to get identity details: ${error.message}`);
  }
});

Parse.Cloud.define('initiateIdentityVerification', async (request) => {
  const { user, params } = request;
  
  try {
    const { identityId } = params;
    
    // Get identity
    const identity = await new Parse.Query('Identity')
      .equalTo('objectId', identityId)
      .first({ useMasterKey: true });
      
    if (!identity) {
      throw new Error('Identity not found');
    }
    
    // Create verification record
    const IdentityVerification = Parse.Object.extend('IdentityVerification');
    const verification = new IdentityVerification();
    
    verification.set('identity', identity);
    verification.set('status', 'pending');
    verification.set('verificationType', 'document_review');
    verification.set('initiatedBy', user);
    verification.set('priority', 'normal');
    
    const savedVerification = await verification.save(null, { useMasterKey: true });
    
    // Update identity status
    identity.set('status', 'verification_in_progress');
    identity.set('currentVerification', savedVerification);
    await identity.save(null, { useMasterKey: true });
    
    // Send notification to verification team
    await Parse.Cloud.run('sendNotification', {
      type: 'identity_verification_requested',
      recipients: ['verification-team'],
      data: {
        identityId: identity.id,
        verificationId: savedVerification.id,
        userEmail: identity.get('email')
      }
    });
    
    return {
      success: true,
      verificationId: savedVerification.id,
      message: 'Identity verification initiated successfully'
    };
    
  } catch (error) {
    console.error('Error initiating verification:', error);
    throw new Error(`Failed to initiate verification: ${error.message}`);
  }
});

Parse.Cloud.define('approveIdentityVerification', async (request) => {
  const { user, params } = request;
  
  try {
    const { verificationId, verificationLevel, notes } = params;
    
    // Check admin permissions
    if (!user.get('isAdmin') && !user.get('roles')?.includes('verifier')) {
      throw new Error('Insufficient permissions to approve verification');
    }
    
    // Get verification record
    const verification = await new Parse.Query('IdentityVerification')
      .equalTo('objectId', verificationId)
      .include('identity')
      .first({ useMasterKey: true });
      
    if (!verification) {
      throw new Error('Verification record not found');
    }
    
    if (verification.get('status') !== 'pending') {
      throw new Error('Verification is not in pending status');
    }
    
    // Update verification record
    verification.set('status', 'approved');
    verification.set('verificationLevel', verificationLevel || 'basic');
    verification.set('reviewedBy', user);
    verification.set('reviewedAt', new Date());
    verification.set('reviewNotes', notes);
    
    await verification.save(null, { useMasterKey: true });
    
    // Update identity
    const identity = verification.get('identity');
    identity.set('status', 'verified');
    identity.set('verificationLevel', verificationLevel || 'basic');
    identity.set('verifiedAt', new Date());
    identity.set('verifiedBy', user);
    
    await identity.save(null, { useMasterKey: true });
    
    // Create audit log entry
    await Parse.Cloud.run('createAuditEntry', {
      action: 'identity_verified',
      entityType: 'Identity',
      entityId: identity.id,
      userId: user.id,
      details: {
        verificationLevel: verificationLevel || 'basic',
        notes
      }
    });
    
    // Send notification to user
    await Parse.Cloud.run('sendNotification', {
      type: 'identity_verified',
      recipients: [identity.get('user').id],
      data: {
        identityId: identity.id,
        verificationLevel: verificationLevel || 'basic'
      }
    });
    
    return {
      success: true,
      message: 'Identity verification approved successfully'
    };
    
  } catch (error) {
    console.error('Error approving verification:', error);
    throw new Error(`Failed to approve verification: ${error.message}`);
  }
});

Parse.Cloud.define('getIdentityStats', async (request) => {
  const { user } = request;
  
  try {
    // Check admin permissions
    if (!user.get('isAdmin')) {
      throw new Error('Insufficient permissions to view identity statistics');
    }
    
    // Get total identities
    const totalIdentities = await new Parse.Query('Identity').count({ useMasterKey: true });
    
    // Get verified identities
    const verifiedIdentities = await new Parse.Query('Identity')
      .equalTo('status', 'verified')
      .count({ useMasterKey: true });
    
    // Get pending verifications
    const pendingVerifications = await new Parse.Query('IdentityVerification')
      .equalTo('status', 'pending')
      .count({ useMasterKey: true });
    
    // Get documents processed (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const documentsProcessed = await new Parse.Query('VerificationDocument')
      .greaterThan('createdAt', thirtyDaysAgo)
      .count({ useMasterKey: true });
    
    // Get credentials issued
    const credentialsIssued = await new Parse.Query('VerifiableCredential')
      .count({ useMasterKey: true });
    
    // Calculate verification rate
    const verificationRate = totalIdentities > 0 ? (verifiedIdentities / totalIdentities) * 100 : 0;
    
    return {
      success: true,
      stats: {
        totalIdentities,
        verifiedIdentities,
        pendingVerifications,
        documentsProcessed,
        credentialsIssued,
        verificationRate: Math.round(verificationRate * 10) / 10
      }
    };
    
  } catch (error) {
    console.error('Error getting identity stats:', error);
    throw new Error(`Failed to get identity statistics: ${error.message}`);
  }
});

// Helper function for audit logging
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

Parse.Cloud.define('getUserCount', async (request) => {
  // Optional: Add permission checks if only certain users should access this
  // const { user } = request;
  // if (!user || !user.get('isAdmin')) { // Example: only admins
  //   throw new Error('Insufficient permissions.');
  // }

  try {
    const query = new Parse.Query(Parse.User);
    const count = await query.count({ useMasterKey: true }); // Use masterKey if necessary for permissions
    return { success: true, count };
  } catch (error) {
    console.error('Error in getUserCount:', error);
    throw new Error(`Failed to get user count: ${error.message}`);
  }
});

// Scheduled job for cleanup
Parse.Cloud.job('cleanupExpiredVerifications', async (request) => {
  const { message } = request;
  
  try {
    // Find verifications older than 30 days that are still pending
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expiredVerifications = await new Parse.Query('IdentityVerification')
      .equalTo('status', 'pending')
      .lessThan('createdAt', thirtyDaysAgo)
      .find({ useMasterKey: true });
    
    let cleanedCount = 0;
    
    for (const verification of expiredVerifications) {
      verification.set('status', 'expired');
      verification.set('expiredAt', new Date());
      await verification.save(null, { useMasterKey: true });
      cleanedCount++;
    }
    
    message(`Cleaned up ${cleanedCount} expired verification requests`);
    
  } catch (error) {
    message(`Error during cleanup: ${error.message}`);
    throw error;
  }
});