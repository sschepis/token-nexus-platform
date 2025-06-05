import { AppManifest } from '../types/app-framework';

export const kycComplianceManifest: AppManifest = {
  id: 'nomyx-kyc-compliance',
  name: 'KYC & Compliance Platform',
  version: '1.0.0',
  description: 'Comprehensive KYC, AML, and regulatory compliance platform with automated verification, risk assessment, and regulatory reporting',
  publisher: 'Nomyx Platform',
  
  framework: {
    version: '1.0.0',
    compatibility: ['1.0.0', '1.1.0']
  },
  
  adminUI: {
    enabled: true,
    routes: [
      {
        path: '/',
        component: 'ComplianceDashboard',
        title: 'Compliance Dashboard',
        description: 'Overview of compliance status and pending verifications',
        layout: 'default'
      },
      {
        path: '/kyc-reviews',
        component: 'KYCReviewQueue',
        title: 'KYC Reviews',
        description: 'Review and approve KYC submissions',
        permissions: ['kyc:review', 'kyc:approve'],
        layout: 'default'
      },
      {
        path: '/aml-monitoring',
        component: 'AMLMonitoring',
        title: 'AML Monitoring',
        description: 'Anti-money laundering monitoring and alerts',
        permissions: ['aml:monitor', 'compliance:read'],
        layout: 'default'
      },
      {
        path: '/sanctions-screening',
        component: 'SanctionsScreening',
        title: 'Sanctions Screening',
        description: 'Screen against sanctions lists and watchlists',
        permissions: ['sanctions:screen', 'compliance:read'],
        layout: 'default'
      },
      {
        path: '/risk-assessment',
        component: 'RiskAssessment',
        title: 'Risk Assessment',
        description: 'Customer and transaction risk assessment',
        permissions: ['risk:assess', 'compliance:read'],
        layout: 'default'
      },
      {
        path: '/regulatory-reporting',
        component: 'RegulatoryReporting',
        title: 'Regulatory Reporting',
        description: 'Generate and submit regulatory reports',
        permissions: ['reporting:generate', 'compliance:manage'],
        layout: 'default'
      },
      {
        path: '/document-verification',
        component: 'DocumentVerification',
        title: 'Document Verification',
        description: 'Verify identity documents and certificates',
        permissions: ['documents:verify', 'kyc:review'],
        layout: 'default'
      },
      {
        path: '/audit-trail',
        component: 'ComplianceAuditTrail',
        title: 'Audit Trail',
        description: 'Compliance audit trail and history',
        permissions: ['audit:read', 'compliance:read'],
        layout: 'default'
      },
      {
        path: '/settings',
        component: 'ComplianceSettings',
        title: 'Compliance Settings',
        description: 'Configure compliance rules and thresholds',
        permissions: ['compliance:manage'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Compliance Dashboard',
        icon: '🛡️',
        path: '/',
        order: 1
      },
      {
        label: 'KYC Reviews',
        icon: '👤',
        path: '/kyc-reviews',
        order: 2,
        permissions: ['kyc:review']
      },
      {
        label: 'AML Monitoring',
        icon: '🔍',
        path: '/aml-monitoring',
        order: 3,
        permissions: ['aml:monitor']
      },
      {
        label: 'Sanctions Screening',
        icon: '⚠️',
        path: '/sanctions-screening',
        order: 4,
        permissions: ['sanctions:screen']
      },
      {
        label: 'Risk Assessment',
        icon: '📊',
        path: '/risk-assessment',
        order: 5,
        permissions: ['risk:assess']
      },
      {
        label: 'Regulatory Reporting',
        icon: '📋',
        path: '/regulatory-reporting',
        order: 6,
        permissions: ['reporting:generate']
      },
      {
        label: 'Document Verification',
        icon: '📄',
        path: '/document-verification',
        order: 7,
        permissions: ['documents:verify']
      },
      {
        label: 'Audit Trail',
        icon: '📜',
        path: '/audit-trail',
        order: 8,
        permissions: ['audit:read']
      },
      {
        label: 'Settings',
        icon: '⚙️',
        path: '/settings',
        order: 9,
        permissions: ['compliance:manage']
      }
    ],
    permissions: [
      'kyc:read',
      'kyc:write',
      'kyc:review',
      'kyc:approve',
      'aml:monitor',
      'aml:investigate',
      'sanctions:screen',
      'risk:assess',
      'risk:manage',
      'compliance:read',
      'compliance:write',
      'compliance:manage',
      'documents:verify',
      'reporting:generate',
      'reporting:submit',
      'audit:read'
    ]
  },
  
  userUI: {
    enabled: true,
    routes: [
      {
        path: '/verification',
        component: 'UserKYCVerification',
        title: 'Identity Verification',
        description: 'Complete your identity verification process',
        layout: 'default'
      },
      {
        path: '/status',
        component: 'VerificationStatus',
        title: 'Verification Status',
        description: 'Check your verification status and requirements',
        layout: 'default'
      },
      {
        path: '/documents',
        component: 'UserDocuments',
        title: 'My Documents',
        description: 'Manage your verification documents',
        layout: 'default'
      }
    ]
  },
  
  backend: {
    cloudFunctions: [
      'submitKYC',
      'reviewKYC',
      'approveKYC',
      'rejectKYC',
      'performAMLCheck',
      'screenSanctions',
      'assessRisk',
      'verifyDocument',
      'generateReport',
      'submitRegulatoryReport',
      'createAuditEntry',
      'flagSuspiciousActivity',
      'updateComplianceStatus',
      'getVerificationStatus',
      'searchCompliance',
      'exportComplianceData',
      'scheduleReview',
      'sendComplianceNotification',
      'updateRiskScore',
      'performPEPCheck',
      'validateAddress',
      'checkCreditHistory'
    ],
    schemas: [
      'KYCSubmission',
      'ComplianceCheck',
      'RiskAssessment',
      'AMLAlert',
      'SanctionsScreening',
      'DocumentVerification',
      'RegulatoryReport',
      'ComplianceAudit',
      'SuspiciousActivity',
      'VerificationDocument',
      'ComplianceRule'
    ],
    webhooks: [
      {
        event: 'kyc.submitted',
        url: '/webhook/kyc-submitted',
        method: 'POST'
      },
      {
        event: 'kyc.approved',
        url: '/webhook/kyc-approved',
        method: 'POST'
      },
      {
        event: 'kyc.rejected',
        url: '/webhook/kyc-rejected',
        method: 'POST'
      },
      {
        event: 'aml.alert',
        url: '/webhook/aml-alert',
        method: 'POST'
      },
      {
        event: 'sanctions.match',
        url: '/webhook/sanctions-match',
        method: 'POST'
      },
      {
        event: 'risk.elevated',
        url: '/webhook/risk-elevated',
        method: 'POST'
      },
      {
        event: 'compliance.violation',
        url: '/webhook/compliance-violation',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'daily-sanctions-screening',
      name: 'Daily Sanctions Screening',
      description: 'Screen all active users against updated sanctions lists',
      schedule: '0 3 * * *', // Daily at 3 AM
      function: 'performDailySanctionsScreening',
      enabled: true,
      timezone: 'UTC',
      params: {
        batchSize: 500,
        includeWatchlists: true
      }
    },
    {
      id: 'aml-monitoring',
      name: 'AML Transaction Monitoring',
      description: 'Monitor transactions for suspicious patterns',
      schedule: '0 */4 * * *', // Every 4 hours
      function: 'monitorAMLTransactions',
      enabled: true,
      timezone: 'UTC',
      params: {
        lookbackHours: 4,
        thresholdAmount: 10000
      }
    },
    {
      id: 'risk-score-updates',
      name: 'Risk Score Updates',
      description: 'Update customer risk scores based on recent activity',
      schedule: '0 2 * * *', // Daily at 2 AM
      function: 'updateRiskScores',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeTransactionHistory: true,
        lookbackDays: 30
      }
    },
    {
      id: 'kyc-expiry-check',
      name: 'KYC Expiry Check',
      description: 'Check for expiring KYC verifications and send renewal notices',
      schedule: '0 9 * * *', // Daily at 9 AM
      function: 'checkKYCExpiry',
      enabled: true,
      timezone: 'UTC',
      params: {
        warningDays: 30,
        autoRenewal: false
      }
    },
    {
      id: 'regulatory-reporting',
      name: 'Automated Regulatory Reporting',
      description: 'Generate and submit required regulatory reports',
      schedule: '0 1 1 * *', // Monthly on the 1st at 1 AM
      function: 'generateRegulatoryReports',
      enabled: true,
      timezone: 'UTC',
      params: {
        reportTypes: ['SAR', 'CTR', 'FBAR'],
        autoSubmit: false
      }
    },
    {
      id: 'compliance-audit',
      name: 'Weekly Compliance Audit',
      description: 'Perform weekly compliance audit and generate reports',
      schedule: '0 6 * * 1', // Weekly on Monday at 6 AM
      function: 'performComplianceAudit',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeRiskAssessment: true,
        generateReport: true
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    apps: [
      {
        appId: 'nomyx-identity-management',
        version: '1.0.0',
        apis: ['getIdentityDetails', 'updateIdentityStatus'],
        optional: false
      }
    ],
    permissions: [
      'parse:read',
      'parse:write',
      'notifications:send',
      'documents:read',
      'documents:write',
      'external-api:sanctions',
      'external-api:credit-check',
      'external-api:address-validation',
      'blockchain:read'
    ]
  },
  
  configuration: {
    schema: {
      kycTier: {
        type: 'select',
        label: 'KYC Verification Tier',
        description: 'Level of KYC verification required',
        defaultValue: 'tier2',
        required: true,
        options: [
          { value: 'tier1', label: 'Tier 1 - Basic Verification' },
          { value: 'tier2', label: 'Tier 2 - Enhanced Verification' },
          { value: 'tier3', label: 'Tier 3 - Premium Verification' }
        ]
      },
      amlThreshold: {
        type: 'number',
        label: 'AML Monitoring Threshold (USD)',
        description: 'Transaction amount threshold for AML monitoring',
        defaultValue: 10000,
        required: true,
        validation: {
          min: 1000
        }
      },
      riskToleranceLevel: {
        type: 'select',
        label: 'Risk Tolerance Level',
        description: 'Platform risk tolerance for customer onboarding',
        defaultValue: 'medium',
        required: true,
        options: [
          { value: 'low', label: 'Low Risk Tolerance' },
          { value: 'medium', label: 'Medium Risk Tolerance' },
          { value: 'high', label: 'High Risk Tolerance' }
        ]
      },
      autoApproveThreshold: {
        type: 'number',
        label: 'Auto-Approve Risk Score Threshold',
        description: 'Maximum risk score for automatic KYC approval (0-100)',
        defaultValue: 30,
        required: true,
        validation: {
          min: 0,
          max: 100
        }
      },
      sanctionsScreeningProvider: {
        type: 'select',
        label: 'Sanctions Screening Provider',
        description: 'Third-party provider for sanctions screening',
        defaultValue: 'ofac',
        required: true,
        options: [
          { value: 'ofac', label: 'OFAC (US Treasury)' },
          { value: 'eu-sanctions', label: 'EU Sanctions List' },
          { value: 'un-sanctions', label: 'UN Sanctions List' },
          { value: 'comprehensive', label: 'Comprehensive (All Lists)' }
        ]
      },
      documentVerificationProvider: {
        type: 'select',
        label: 'Document Verification Provider',
        description: 'Third-party provider for document verification',
        defaultValue: 'jumio',
        required: true,
        options: [
          { value: 'jumio', label: 'Jumio' },
          { value: 'onfido', label: 'Onfido' },
          { value: 'trulioo', label: 'Trulioo' },
          { value: 'shufti-pro', label: 'Shufti Pro' }
        ]
      },
      enableBiometricVerification: {
        type: 'boolean',
        label: 'Enable Biometric Verification',
        description: 'Require biometric verification for high-risk customers',
        defaultValue: true,
        required: false
      },
      kycExpiryMonths: {
        type: 'number',
        label: 'KYC Expiry Period (Months)',
        description: 'Number of months before KYC verification expires',
        defaultValue: 24,
        required: true,
        validation: {
          min: 6,
          max: 60
        }
      },
      enablePEPScreening: {
        type: 'boolean',
        label: 'Enable PEP Screening',
        description: 'Screen for Politically Exposed Persons (PEP)',
        defaultValue: true,
        required: false
      },
      requireSourceOfFunds: {
        type: 'boolean',
        label: 'Require Source of Funds',
        description: 'Require documentation of source of funds for high-value transactions',
        defaultValue: true,
        required: false
      },
      enableContinuousMonitoring: {
        type: 'boolean',
        label: 'Enable Continuous Monitoring',
        description: 'Continuously monitor customers for risk changes',
        defaultValue: true,
        required: false
      },
      complianceJurisdictions: {
        type: 'multiselect',
        label: 'Compliance Jurisdictions',
        description: 'Jurisdictions for compliance requirements',
        defaultValue: ['US', 'EU'],
        required: true,
        options: [
          { value: 'US', label: 'United States' },
          { value: 'EU', label: 'European Union' },
          { value: 'UK', label: 'United Kingdom' },
          { value: 'CA', label: 'Canada' },
          { value: 'AU', label: 'Australia' },
          { value: 'SG', label: 'Singapore' },
          { value: 'HK', label: 'Hong Kong' },
          { value: 'JP', label: 'Japan' }
        ]
      },
      reportingFrequency: {
        type: 'select',
        label: 'Regulatory Reporting Frequency',
        description: 'Frequency of automated regulatory reporting',
        defaultValue: 'monthly',
        required: true,
        options: [
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annually', label: 'Annually' }
        ]
      }
    },
    defaultValues: {
      kycTier: 'tier2',
      amlThreshold: 10000,
      riskToleranceLevel: 'medium',
      autoApproveThreshold: 30,
      sanctionsScreeningProvider: 'ofac',
      documentVerificationProvider: 'jumio',
      enableBiometricVerification: true,
      kycExpiryMonths: 24,
      enablePEPScreening: true,
      requireSourceOfFunds: true,
      enableContinuousMonitoring: true,
      complianceJurisdictions: ['US', 'EU'],
      reportingFrequency: 'monthly'
    }
  }
};