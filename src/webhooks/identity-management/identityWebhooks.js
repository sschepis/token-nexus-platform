/**
 * Identity Management Webhooks
 * Webhook handlers for external integrations and real-time events
 */

const express = require('express');
const crypto = require('crypto');

// Webhook verification utilities
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// KYC Provider Webhook Handler
Parse.Cloud.define('handleKYCWebhook', async (request) => {
  const { provider, payload, signature } = request.params;
  
  try {
    // Verify webhook signature
    const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
    if (!verifyWebhookSignature(JSON.stringify(payload), signature, webhookSecret)) {
      throw new Error('Invalid webhook signature');
    }
    
    // Process based on provider
    switch (provider.toLowerCase()) {
      case 'jumio':
        return await handleJumioWebhook(payload);
      case 'onfido':
        return await handleOnfidoWebhook(payload);
      case 'sumsub':
        return await handleSumsubWebhook(payload);
      case 'shufti':
        return await handleShuftiWebhook(payload);
      default:
        throw new Error(`Unsupported KYC provider: ${provider}`);
    }
  } catch (error) {
    console.error('KYC Webhook Error:', error);
    throw error;
  }
});

// Jumio Webhook Handler
async function handleJumioWebhook(payload) {
  const { scanReference, verificationStatus, idScanStatus, similarity } = payload;
  
  try {
    // Find verification by external reference
    const verificationQuery = new Parse.Query('IdentityVerification');
    verificationQuery.equalTo('externalVerificationId', scanReference);
    const verification = await verificationQuery.first({ useMasterKey: true });
    
    if (!verification) {
      console.warn(`No verification found for Jumio scan reference: ${scanReference}`);
      return { success: false, message: 'Verification not found' };
    }
    
    // Update verification status
    let status = 'in_review';
    let verificationScore = 0;
    
    if (verificationStatus === 'APPROVED_VERIFIED') {
      status = 'approved';
      verificationScore = similarity || 95;
    } else if (verificationStatus === 'DENIED_FRAUD' || verificationStatus === 'DENIED_UNSUPPORTED_ID_TYPE') {
      status = 'rejected';
      verificationScore = 0;
    }
    
    verification.set('status', status);
    verification.set('verificationScore', verificationScore);
    verification.set('externalResponse', payload);
    verification.set('reviewedAt', new Date());
    
    await verification.save(null, { useMasterKey: true });
    
    // Update identity status if verification is complete
    if (status === 'approved' || status === 'rejected') {
      const identity = await verification.get('identity').fetch({ useMasterKey: true });
      
      if (status === 'approved') {
        identity.set('status', 'verified');
        identity.set('verificationLevel', 'enhanced');
        identity.set('verifiedAt', new Date());
        identity.set('currentVerification', verification);
      } else {
        identity.set('status', 'rejected');
      }
      
      await identity.save(null, { useMasterKey: true });
      
      // Trigger post-verification actions
      await Parse.Cloud.run('triggerPostVerificationActions', {
        identityId: identity.id,
        verificationId: verification.id,
        status: status
      });
    }
    
    return { success: true, status: status };
    
  } catch (error) {
    console.error('Jumio webhook processing error:', error);
    throw error;
  }
}

// Onfido Webhook Handler
async function handleOnfidoWebhook(payload) {
  const { resource_type, action, object } = payload;
  
  if (resource_type !== 'check' || action !== 'check.completed') {
    return { success: true, message: 'Event not processed' };
  }
  
  try {
    const checkId = object.id;
    const result = object.result;
    const status = object.status;
    
    // Find verification by external reference
    const verificationQuery = new Parse.Query('IdentityVerification');
    verificationQuery.equalTo('externalVerificationId', checkId);
    const verification = await verificationQuery.first({ useMasterKey: true });
    
    if (!verification) {
      console.warn(`No verification found for Onfido check ID: ${checkId}`);
      return { success: false, message: 'Verification not found' };
    }
    
    // Update verification status
    let verificationStatus = 'in_review';
    let verificationScore = 0;
    
    if (status === 'complete' && result === 'clear') {
      verificationStatus = 'approved';
      verificationScore = 95;
    } else if (status === 'complete' && (result === 'consider' || result === 'unidentified')) {
      verificationStatus = 'rejected';
      verificationScore = 30;
    }
    
    verification.set('status', verificationStatus);
    verification.set('verificationScore', verificationScore);
    verification.set('externalResponse', payload);
    verification.set('reviewedAt', new Date());
    
    await verification.save(null, { useMasterKey: true });
    
    // Update identity if verification is complete
    if (verificationStatus === 'approved' || verificationStatus === 'rejected') {
      const identity = await verification.get('identity').fetch({ useMasterKey: true });
      
      if (verificationStatus === 'approved') {
        identity.set('status', 'verified');
        identity.set('verificationLevel', 'enhanced');
        identity.set('verifiedAt', new Date());
        identity.set('currentVerification', verification);
      } else {
        identity.set('status', 'rejected');
      }
      
      await identity.save(null, { useMasterKey: true });
      
      // Trigger post-verification actions
      await Parse.Cloud.run('triggerPostVerificationActions', {
        identityId: identity.id,
        verificationId: verification.id,
        status: verificationStatus
      });
    }
    
    return { success: true, status: verificationStatus };
    
  } catch (error) {
    console.error('Onfido webhook processing error:', error);
    throw error;
  }
}

// Sumsub Webhook Handler
async function handleSumsubWebhook(payload) {
  const { type, reviewStatus, applicantId } = payload;
  
  if (type !== 'applicantReviewed') {
    return { success: true, message: 'Event not processed' };
  }
  
  try {
    // Find verification by external reference
    const verificationQuery = new Parse.Query('IdentityVerification');
    verificationQuery.equalTo('externalVerificationId', applicantId);
    const verification = await verificationQuery.first({ useMasterKey: true });
    
    if (!verification) {
      console.warn(`No verification found for Sumsub applicant ID: ${applicantId}`);
      return { success: false, message: 'Verification not found' };
    }
    
    // Update verification status
    let verificationStatus = 'in_review';
    let verificationScore = 0;
    
    if (reviewStatus === 'completed') {
      verificationStatus = 'approved';
      verificationScore = 90;
    } else if (reviewStatus === 'rejected') {
      verificationStatus = 'rejected';
      verificationScore = 0;
    }
    
    verification.set('status', verificationStatus);
    verification.set('verificationScore', verificationScore);
    verification.set('externalResponse', payload);
    verification.set('reviewedAt', new Date());
    
    await verification.save(null, { useMasterKey: true });
    
    // Update identity if verification is complete
    if (verificationStatus === 'approved' || verificationStatus === 'rejected') {
      const identity = await verification.get('identity').fetch({ useMasterKey: true });
      
      if (verificationStatus === 'approved') {
        identity.set('status', 'verified');
        identity.set('verificationLevel', 'enhanced');
        identity.set('verifiedAt', new Date());
        identity.set('currentVerification', verification);
      } else {
        identity.set('status', 'rejected');
      }
      
      await identity.save(null, { useMasterKey: true });
      
      // Trigger post-verification actions
      await Parse.Cloud.run('triggerPostVerificationActions', {
        identityId: identity.id,
        verificationId: verification.id,
        status: verificationStatus
      });
    }
    
    return { success: true, status: verificationStatus };
    
  } catch (error) {
    console.error('Sumsub webhook processing error:', error);
    throw error;
  }
}

// Shufti Pro Webhook Handler
async function handleShuftiWebhook(payload) {
  const { reference, event, verification_result } = payload;
  
  if (event !== 'verification.accepted' && event !== 'verification.declined') {
    return { success: true, message: 'Event not processed' };
  }
  
  try {
    // Find verification by external reference
    const verificationQuery = new Parse.Query('IdentityVerification');
    verificationQuery.equalTo('externalVerificationId', reference);
    const verification = await verificationQuery.first({ useMasterKey: true });
    
    if (!verification) {
      console.warn(`No verification found for Shufti reference: ${reference}`);
      return { success: false, message: 'Verification not found' };
    }
    
    // Update verification status
    let verificationStatus = 'in_review';
    let verificationScore = 0;
    
    if (event === 'verification.accepted') {
      verificationStatus = 'approved';
      verificationScore = verification_result?.confidence || 85;
    } else if (event === 'verification.declined') {
      verificationStatus = 'rejected';
      verificationScore = 0;
    }
    
    verification.set('status', verificationStatus);
    verification.set('verificationScore', verificationScore);
    verification.set('externalResponse', payload);
    verification.set('reviewedAt', new Date());
    
    await verification.save(null, { useMasterKey: true });
    
    // Update identity if verification is complete
    if (verificationStatus === 'approved' || verificationStatus === 'rejected') {
      const identity = await verification.get('identity').fetch({ useMasterKey: true });
      
      if (verificationStatus === 'approved') {
        identity.set('status', 'verified');
        identity.set('verificationLevel', 'enhanced');
        identity.set('verifiedAt', new Date());
        identity.set('currentVerification', verification);
      } else {
        identity.set('status', 'rejected');
      }
      
      await identity.save(null, { useMasterKey: true });
      
      // Trigger post-verification actions
      await Parse.Cloud.run('triggerPostVerificationActions', {
        identityId: identity.id,
        verificationId: verification.id,
        status: verificationStatus
      });
    }
    
    return { success: true, status: verificationStatus };
    
  } catch (error) {
    console.error('Shufti webhook processing error:', error);
    throw error;
  }
}

// Blockchain Event Webhook Handler
Parse.Cloud.define('handleBlockchainWebhook', async (request) => {
  const { network, event, transactionHash, contractAddress, data } = request.params;
  
  try {
    // Process blockchain events related to identity
    switch (event) {
      case 'IdentityCreated':
        return await handleIdentityCreatedEvent(data, transactionHash, network);
      case 'CredentialIssued':
        return await handleCredentialIssuedEvent(data, transactionHash, network);
      case 'CredentialRevoked':
        return await handleCredentialRevokedEvent(data, transactionHash, network);
      default:
        console.log(`Unhandled blockchain event: ${event}`);
        return { success: true, message: 'Event not processed' };
    }
  } catch (error) {
    console.error('Blockchain webhook error:', error);
    throw error;
  }
});

// Handle Identity Created on Blockchain
async function handleIdentityCreatedEvent(data, transactionHash, network) {
  const { identityId, owner, tokenId } = data;
  
  try {
    // Find identity by ID
    const identity = await new Parse.Query('Identity').get(identityId, { useMasterKey: true });
    
    if (identity) {
      // Update identity with blockchain information
      identity.set('blockchainTxHash', transactionHash);
      identity.set('blockchainNetwork', network);
      identity.set('tokenId', tokenId);
      identity.set('blockchainAddress', owner);
      
      await identity.save(null, { useMasterKey: true });
      
      // Log audit event
      await Parse.Cloud.run('logAuditEvent', {
        action: 'identity_blockchain_created',
        entityType: 'Identity',
        entityId: identityId,
        details: {
          transactionHash,
          network,
          tokenId,
          owner
        }
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling IdentityCreated event:', error);
    throw error;
  }
}

// Handle Credential Issued on Blockchain
async function handleCredentialIssuedEvent(data, transactionHash, network) {
  const { credentialId, recipient, tokenId } = data;
  
  try {
    // Find credential by ID
    const credential = await new Parse.Query('VerifiableCredential').get(credentialId, { useMasterKey: true });
    
    if (credential) {
      // Update credential with blockchain information
      credential.set('blockchainTxHash', transactionHash);
      credential.set('blockchainNetwork', network);
      credential.set('tokenId', tokenId);
      
      await credential.save(null, { useMasterKey: true });
      
      // Log audit event
      await Parse.Cloud.run('logAuditEvent', {
        action: 'credential_blockchain_issued',
        entityType: 'VerifiableCredential',
        entityId: credentialId,
        details: {
          transactionHash,
          network,
          tokenId,
          recipient
        }
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling CredentialIssued event:', error);
    throw error;
  }
}

// Handle Credential Revoked on Blockchain
async function handleCredentialRevokedEvent(data, transactionHash, network) {
  const { credentialId, reason } = data;
  
  try {
    // Find credential by ID
    const credential = await new Parse.Query('VerifiableCredential').get(credentialId, { useMasterKey: true });
    
    if (credential) {
      // Update credential status
      credential.set('status', 'revoked');
      credential.set('revokedAt', new Date());
      credential.set('revocationReason', reason);
      
      await credential.save(null, { useMasterKey: true });
      
      // Log audit event
      await Parse.Cloud.run('logAuditEvent', {
        action: 'credential_blockchain_revoked',
        entityType: 'VerifiableCredential',
        entityId: credentialId,
        details: {
          transactionHash,
          network,
          reason
        }
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling CredentialRevoked event:', error);
    throw error;
  }
}

// Document Processing Webhook (for OCR services)
Parse.Cloud.define('handleDocumentProcessingWebhook', async (request) => {
  const { provider, documentId, status, results } = request.params;
  
  try {
    // Find document by ID
    const document = await new Parse.Query('VerificationDocument').get(documentId, { useMasterKey: true });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Update document with processing results
    document.set('status', status);
    
    if (results) {
      document.set('ocrData', results.ocrData || {});
      document.set('analysisResults', results.analysisResults || {});
      document.set('verificationScore', results.verificationScore || 0);
    }
    
    document.set('processedAt', new Date());
    
    await document.save(null, { useMasterKey: true });
    
    // If document processing is complete, check if verification can be updated
    if (status === 'verified' || status === 'rejected') {
      const verification = document.get('verification');
      if (verification) {
        await Parse.Cloud.run('checkVerificationCompletion', {
          verificationId: verification.id
        });
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Document processing webhook error:', error);
    throw error;
  }
});

// Notification Webhook Handler
Parse.Cloud.define('handleNotificationWebhook', async (request) => {
  const { provider, messageId, status, deliveryInfo } = request.params;
  
  try {
    // Log notification delivery status
    console.log(`Notification ${messageId} via ${provider}: ${status}`);
    
    // Update notification status in database if needed
    // This would depend on your notification tracking system
    
    return { success: true };
    
  } catch (error) {
    console.error('Notification webhook error:', error);
    throw error;
  }
});

// Express webhook endpoints for external services
const webhookRouter = express.Router();

// KYC Provider Webhooks
webhookRouter.post('/kyc/:provider', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const provider = req.params.provider;
    const signature = req.headers['x-signature'] || req.headers['authorization'];
    const payload = JSON.parse(req.body.toString());
    
    const result = await Parse.Cloud.run('handleKYCWebhook', {
      provider,
      payload,
      signature
    });
    
    res.json(result);
  } catch (error) {
    console.error('KYC webhook endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Blockchain Event Webhooks
webhookRouter.post('/blockchain/:network', express.json(), async (req, res) => {
  try {
    const network = req.params.network;
    const { event, transactionHash, contractAddress, data } = req.body;
    
    const result = await Parse.Cloud.run('handleBlockchainWebhook', {
      network,
      event,
      transactionHash,
      contractAddress,
      data
    });
    
    res.json(result);
  } catch (error) {
    console.error('Blockchain webhook endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Document Processing Webhooks
webhookRouter.post('/documents/:provider', express.json(), async (req, res) => {
  try {
    const provider = req.params.provider;
    const { documentId, status, results } = req.body;
    
    const result = await Parse.Cloud.run('handleDocumentProcessingWebhook', {
      provider,
      documentId,
      status,
      results
    });
    
    res.json(result);
  } catch (error) {
    console.error('Document processing webhook endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  webhookRouter,
  verifyWebhookSignature,
  handleJumioWebhook,
  handleOnfidoWebhook,
  handleSumsubWebhook,
  handleShuftiWebhook
};