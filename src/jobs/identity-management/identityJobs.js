/**
 * Identity Management Scheduled Jobs
 * Background jobs for periodic tasks and maintenance
 */

// Job: Check and expire pending verifications
Parse.Cloud.job('expireVerifications', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting verification expiry job');
    
    // Find verifications that are past due
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 30); // 30 days ago
    
    const query = new Parse.Query('IdentityVerification');
    query.equalTo('status', 'pending');
    query.lessThan('createdAt', expiryDate);
    query.limit(1000);
    
    const expiredVerifications = await query.find({ useMasterKey: true });
    
    let expiredCount = 0;
    
    for (const verification of expiredVerifications) {
      try {
        verification.set('status', 'expired');
        verification.set('expiredAt', new Date());
        await verification.save(null, { useMasterKey: true });
        
        // Update associated identity if needed
        const identity = await verification.get('identity').fetch({ useMasterKey: true });
        if (identity && identity.get('status') === 'pending_verification') {
          identity.set('status', 'verification_expired');
          await identity.save(null, { useMasterKey: true });
        }
        
        // Log audit event
        await Parse.Cloud.run('logAuditEvent', {
          action: 'verification_expired',
          entityType: 'IdentityVerification',
          entityId: verification.id,
          userId: 'system',
          details: {
            reason: 'Automatic expiry after 30 days',
            originalStatus: 'pending'
          }
        });
        
        expiredCount++;
        
      } catch (error) {
        log.error(`Error expiring verification ${verification.id}:`, error);
      }
    }
    
    log.info(`Expired ${expiredCount} verifications`);
    message(`Successfully expired ${expiredCount} pending verifications`);
    
  } catch (error) {
    log.error('Verification expiry job failed:', error);
    throw error;
  }
});

// Job: Check document expiry dates
Parse.Cloud.job('checkDocumentExpiry', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting document expiry check job');
    
    // Find documents expiring in the next 30 days
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 30);
    
    const query = new Parse.Query('VerificationDocument');
    query.lessThan('expiryDate', warningDate);
    query.greaterThan('expiryDate', new Date());
    query.equalTo('status', 'verified');
    query.include('identity');
    query.limit(1000);
    
    const expiringDocuments = await query.find({ useMasterKey: true });
    
    let notificationCount = 0;
    
    for (const document of expiringDocuments) {
      try {
        const identity = document.get('identity');
        const user = identity.get('user');
        
        // Send expiry notification
        await Parse.Cloud.run('sendNotification', {
          userId: user.id,
          type: 'document_expiry_warning',
          title: 'Document Expiring Soon',
          message: `Your ${document.get('documentType')} will expire on ${document.get('expiryDate').toDateString()}`,
          data: {
            documentId: document.id,
            documentType: document.get('documentType'),
            expiryDate: document.get('expiryDate')
          }
        });
        
        notificationCount++;
        
      } catch (error) {
        log.error(`Error processing expiring document ${document.id}:`, error);
      }
    }
    
    log.info(`Sent ${notificationCount} expiry notifications`);
    message(`Successfully sent ${notificationCount} document expiry notifications`);
    
  } catch (error) {
    log.error('Document expiry check job failed:', error);
    throw error;
  }
});

// Job: Compliance risk assessment
Parse.Cloud.job('complianceRiskAssessment', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting compliance risk assessment job');
    
    // Find identities that need risk reassessment
    const assessmentDate = new Date();
    assessmentDate.setDate(assessmentDate.getDate() - 90); // 90 days ago
    
    const query = new Parse.Query('Identity');
    query.equalTo('status', 'verified');
    query.lessThan('lastModifiedAt', assessmentDate);
    query.limit(500);
    
    const identities = await query.find({ useMasterKey: true });
    
    let assessedCount = 0;
    
    for (const identity of identities) {
      try {
        // Calculate new risk score
        const riskScore = await calculateRiskScore(identity);
        
        // Update risk score if changed significantly
        const currentRiskScore = identity.get('riskScore') || 0;
        if (Math.abs(riskScore - currentRiskScore) > 10) {
          identity.set('riskScore', riskScore);
          identity.set('lastModifiedAt', new Date());
          await identity.save(null, { useMasterKey: true });
          
          // Log risk score change
          await Parse.Cloud.run('logAuditEvent', {
            action: 'risk_score_updated',
            entityType: 'Identity',
            entityId: identity.id,
            userId: 'system',
            details: {
              previousScore: currentRiskScore,
              newScore: riskScore,
              reason: 'Periodic risk assessment'
            }
          });
          
          // Alert if high risk
          if (riskScore > 70) {
            await Parse.Cloud.run('sendNotification', {
              userId: 'admin',
              type: 'high_risk_alert',
              title: 'High Risk Identity Detected',
              message: `Identity ${identity.id} has a high risk score of ${riskScore}`,
              data: {
                identityId: identity.id,
                riskScore: riskScore
              }
            });
          }
        }
        
        assessedCount++;
        
      } catch (error) {
        log.error(`Error assessing risk for identity ${identity.id}:`, error);
      }
    }
    
    log.info(`Assessed ${assessedCount} identities`);
    message(`Successfully assessed ${assessedCount} identities for compliance risk`);
    
  } catch (error) {
    log.error('Compliance risk assessment job failed:', error);
    throw error;
  }
});

// Job: Clean up expired credentials
Parse.Cloud.job('cleanupExpiredCredentials', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting expired credentials cleanup job');
    
    const now = new Date();
    
    // Find expired credentials
    const query = new Parse.Query('VerifiableCredential');
    query.lessThan('expirationDate', now);
    query.equalTo('status', 'active');
    query.limit(1000);
    
    const expiredCredentials = await query.find({ useMasterKey: true });
    
    let expiredCount = 0;
    
    for (const credential of expiredCredentials) {
      try {
        credential.set('status', 'expired');
        await credential.save(null, { useMasterKey: true });
        
        // Log expiry
        await Parse.Cloud.run('logAuditEvent', {
          action: 'credential_expired',
          entityType: 'VerifiableCredential',
          entityId: credential.id,
          userId: 'system',
          details: {
            credentialType: credential.get('credentialType'),
            expirationDate: credential.get('expirationDate')
          }
        });
        
        expiredCount++;
        
      } catch (error) {
        log.error(`Error expiring credential ${credential.id}:`, error);
      }
    }
    
    log.info(`Expired ${expiredCount} credentials`);
    message(`Successfully expired ${expiredCount} credentials`);
    
  } catch (error) {
    log.error('Credential cleanup job failed:', error);
    throw error;
  }
});

// Job: Generate compliance reports
Parse.Cloud.job('generateComplianceReports', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting compliance report generation job');
    
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Generate monthly verification report
    const verificationStats = await generateVerificationStats(lastMonth, now);
    
    // Generate risk assessment report
    const riskStats = await generateRiskStats();
    
    // Generate document compliance report
    const documentStats = await generateDocumentStats(lastMonth, now);
    
    // Create compliance report object
    const report = {
      reportDate: now,
      period: {
        start: lastMonth,
        end: now
      },
      verificationStats,
      riskStats,
      documentStats,
      generatedBy: 'system'
    };
    
    // Save report to Parse
    const ComplianceReport = Parse.Object.extend('ComplianceReport');
    const reportObject = new ComplianceReport();
    reportObject.set('reportData', report);
    reportObject.set('reportType', 'monthly_compliance');
    reportObject.set('reportPeriod', `${lastMonth.toISOString().slice(0, 7)}`);
    
    await reportObject.save(null, { useMasterKey: true });
    
    // Send report to administrators
    await Parse.Cloud.run('sendNotification', {
      userId: 'admin',
      type: 'compliance_report',
      title: 'Monthly Compliance Report Generated',
      message: `Compliance report for ${lastMonth.toISOString().slice(0, 7)} has been generated`,
      data: {
        reportId: reportObject.id,
        reportType: 'monthly_compliance'
      }
    });
    
    log.info('Compliance report generated successfully');
    message('Successfully generated monthly compliance report');
    
  } catch (error) {
    log.error('Compliance report generation job failed:', error);
    throw error;
  }
});

// Job: Sync with external KYC providers
Parse.Cloud.job('syncExternalKYC', async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log.info('Starting external KYC sync job');
    
    // Find verifications with external providers that need status updates
    const query = new Parse.Query('IdentityVerification');
    query.equalTo('status', 'in_review');
    query.exists('externalVerificationId');
    query.limit(100);
    
    const verifications = await query.find({ useMasterKey: true });
    
    let syncedCount = 0;
    
    for (const verification of verifications) {
      try {
        const provider = verification.get('externalProvider');
        const externalId = verification.get('externalVerificationId');
        
        if (provider && externalId) {
          // Check status with external provider
          const status = await checkExternalVerificationStatus(provider, externalId);
          
          if (status && status !== verification.get('status')) {
            verification.set('status', status.status);
            verification.set('verificationScore', status.score);
            verification.set('reviewedAt', new Date());
            
            await verification.save(null, { useMasterKey: true });
            
            syncedCount++;
          }
        }
        
      } catch (error) {
        log.error(`Error syncing verification ${verification.id}:`, error);
      }
    }
    
    log.info(`Synced ${syncedCount} verifications`);
    message(`Successfully synced ${syncedCount} external verifications`);
    
  } catch (error) {
    log.error('External KYC sync job failed:', error);
    throw error;
  }
});

// Helper function to calculate risk score
async function calculateRiskScore(identity) {
  let riskScore = 0;
  
  // Base score factors
  const verificationLevel = identity.get('verificationLevel');
  const status = identity.get('status');
  const nationality = identity.get('nationality');
  
  // Verification level factor
  switch (verificationLevel) {
    case 'premium':
      riskScore += 10;
      break;
    case 'enhanced':
      riskScore += 20;
      break;
    case 'basic':
      riskScore += 40;
      break;
    default:
      riskScore += 80;
  }
  
  // Status factor
  if (status === 'rejected' || status === 'suspended') {
    riskScore += 50;
  }
  
  // High-risk countries (example list)
  const highRiskCountries = ['AF', 'IR', 'KP', 'SY'];
  if (highRiskCountries.includes(nationality)) {
    riskScore += 30;
  }
  
  // Check for recent failed verifications
  const failedVerificationsQuery = new Parse.Query('IdentityVerification');
  failedVerificationsQuery.equalTo('identity', identity);
  failedVerificationsQuery.equalTo('status', 'rejected');
  failedVerificationsQuery.greaterThan('createdAt', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  
  const failedVerifications = await failedVerificationsQuery.count({ useMasterKey: true });
  riskScore += failedVerifications * 15;
  
  // Cap at 100
  return Math.min(riskScore, 100);
}

// Helper function to check external verification status
async function checkExternalVerificationStatus(provider, externalId) {
  // This would integrate with actual KYC provider APIs
  // For now, return mock data
  return {
    status: 'approved',
    score: 85
  };
}

// Helper functions for report generation
async function generateVerificationStats(startDate, endDate) {
  const query = new Parse.Query('IdentityVerification');
  query.greaterThan('createdAt', startDate);
  query.lessThan('createdAt', endDate);
  
  const total = await query.count({ useMasterKey: true });
  
  query.equalTo('status', 'approved');
  const approved = await query.count({ useMasterKey: true });
  
  query.equalTo('status', 'rejected');
  const rejected = await query.count({ useMasterKey: true });
  
  query.equalTo('status', 'pending');
  const pending = await query.count({ useMasterKey: true });
  
  return {
    total,
    approved,
    rejected,
    pending,
    approvalRate: total > 0 ? (approved / total * 100).toFixed(2) : 0
  };
}

async function generateRiskStats() {
  const identityQuery = new Parse.Query('Identity');
  identityQuery.equalTo('status', 'verified');
  
  const total = await identityQuery.count({ useMasterKey: true });
  
  identityQuery.greaterThan('riskScore', 70);
  const highRisk = await identityQuery.count({ useMasterKey: true });
  
  identityQuery.greaterThan('riskScore', 40);
  identityQuery.lessThanOrEqualTo('riskScore', 70);
  const mediumRisk = await identityQuery.count({ useMasterKey: true });
  
  identityQuery.lessThanOrEqualTo('riskScore', 40);
  const lowRisk = await identityQuery.count({ useMasterKey: true });
  
  return {
    total,
    highRisk,
    mediumRisk,
    lowRisk
  };
}

async function generateDocumentStats(startDate, endDate) {
  const query = new Parse.Query('VerificationDocument');
  query.greaterThan('createdAt', startDate);
  query.lessThan('createdAt', endDate);
  
  const total = await query.count({ useMasterKey: true });
  
  query.equalTo('status', 'verified');
  const verified = await query.count({ useMasterKey: true });
  
  query.equalTo('status', 'rejected');
  const rejected = await query.count({ useMasterKey: true });
  
  return {
    total,
    verified,
    rejected,
    verificationRate: total > 0 ? (verified / total * 100).toFixed(2) : 0
  };
}

module.exports = {
  calculateRiskScore,
  checkExternalVerificationStatus,
  generateVerificationStats,
  generateRiskStats,
  generateDocumentStats
};