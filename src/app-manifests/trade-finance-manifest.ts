import { AppManifest } from '../types/app-framework';

export const tradeFinanceManifest: AppManifest = {
  id: 'nomyx-trade-finance',
  name: 'Trade Finance Platform',
  version: '1.0.0',
  description: 'Comprehensive trade finance and supply chain management platform with smart contracts, letters of credit, and automated trade deal execution',
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
        component: 'TradeDashboard',
        title: 'Trade Dashboard',
        description: 'Overview of trade deals and finance operations',
        layout: 'default'
      },
      {
        path: '/deals',
        component: 'TradeDealsManagement',
        title: 'Trade Deals',
        description: 'Manage trade deals and contracts',
        permissions: ['trades:read', 'trades:write'],
        layout: 'default'
      },
      {
        path: '/letters-of-credit',
        component: 'LettersOfCreditManagement',
        title: 'Letters of Credit',
        description: 'Issue and manage letters of credit',
        permissions: ['finance:manage', 'trades:write'],
        layout: 'default'
      },
      {
        path: '/supply-chain',
        component: 'SupplyChainTracking',
        title: 'Supply Chain',
        description: 'Track goods and supply chain milestones',
        permissions: ['supply-chain:read'],
        layout: 'default'
      },
      {
        path: '/financing',
        component: 'TradeFinancing',
        title: 'Trade Financing',
        description: 'Manage trade financing and working capital',
        permissions: ['finance:manage'],
        layout: 'default'
      },
      {
        path: '/compliance',
        component: 'TradeCompliance',
        title: 'Compliance',
        description: 'Trade compliance and regulatory reporting',
        permissions: ['compliance:read', 'trades:read'],
        layout: 'default'
      },
      {
        path: '/documents',
        component: 'TradeDocuments',
        title: 'Documents',
        description: 'Manage trade documents and certificates',
        permissions: ['documents:read', 'trades:read'],
        layout: 'default'
      },
      {
        path: '/analytics',
        component: 'TradeAnalytics',
        title: 'Analytics',
        description: 'Trade performance and risk analytics',
        permissions: ['analytics:read', 'trades:read'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Trade Dashboard',
        icon: '📊',
        path: '/',
        order: 1
      },
      {
        label: 'Trade Deals',
        icon: '🤝',
        path: '/deals',
        order: 2,
        permissions: ['trades:read']
      },
      {
        label: 'Letters of Credit',
        icon: '📜',
        path: '/letters-of-credit',
        order: 3,
        permissions: ['finance:manage']
      },
      {
        label: 'Supply Chain',
        icon: '🚚',
        path: '/supply-chain',
        order: 4,
        permissions: ['supply-chain:read']
      },
      {
        label: 'Financing',
        icon: '💳',
        path: '/financing',
        order: 5,
        permissions: ['finance:manage']
      },
      {
        label: 'Compliance',
        icon: '⚖️',
        path: '/compliance',
        order: 6,
        permissions: ['compliance:read']
      },
      {
        label: 'Documents',
        icon: '📄',
        path: '/documents',
        order: 7,
        permissions: ['documents:read']
      },
      {
        label: 'Analytics',
        icon: '📈',
        path: '/analytics',
        order: 8,
        permissions: ['analytics:read']
      }
    ],
    permissions: [
      'trades:read',
      'trades:write',
      'trades:manage',
      'finance:read',
      'finance:write',
      'finance:manage',
      'supply-chain:read',
      'supply-chain:write',
      'compliance:read',
      'compliance:write',
      'documents:read',
      'documents:write',
      'analytics:read'
    ]
  },
  
  userUI: {
    enabled: true,
    routes: [
      {
        path: '/my-trades',
        component: 'UserTradePortfolio',
        title: 'My Trades',
        description: 'View and manage your trade deals',
        layout: 'default'
      },
      {
        path: '/marketplace',
        component: 'TradeMarketplace',
        title: 'Trade Marketplace',
        description: 'Discover and participate in trade opportunities',
        layout: 'default'
      },
      {
        path: '/financing-requests',
        component: 'UserFinancingRequests',
        title: 'Financing Requests',
        description: 'Request trade financing and working capital',
        layout: 'default'
      }
    ]
  },
  
  backend: {
    cloudFunctions: [
      'createTradeDeal',
      'updateTradeDeal',
      'executeTradeDeal',
      'cancelTradeDeal',
      'createLetterOfCredit',
      'processLetterOfCredit',
      'updateSupplyChainStatus',
      'trackShipment',
      'requestTradeFinancing',
      'approveFinancing',
      'processPayment',
      'generateTradeDocuments',
      'validateCompliance',
      'calculateRisk',
      'getTradeHistory',
      'searchTrades',
      'generateReports',
      'notifyParties',
      'escrowFunds',
      'releaseFunds',
      'disputeResolution'
    ],
    schemas: [
      'TradeDeal',
      'LetterOfCredit',
      'TradeParty',
      'TradeDocument',
      'SupplyChainEvent',
      'TradeFinancing',
      'TradePayment',
      'ComplianceCheck',
      'RiskAssessment',
      'TradeDispute',
      'EscrowAccount'
    ],
    webhooks: [
      {
        event: 'trade.created',
        url: '/webhook/trade-created',
        method: 'POST'
      },
      {
        event: 'trade.executed',
        url: '/webhook/trade-executed',
        method: 'POST'
      },
      {
        event: 'payment.processed',
        url: '/webhook/payment-processed',
        method: 'POST'
      },
      {
        event: 'shipment.updated',
        url: '/webhook/shipment-updated',
        method: 'POST'
      },
      {
        event: 'compliance.flagged',
        url: '/webhook/compliance-flagged',
        method: 'POST'
      },
      {
        event: 'financing.approved',
        url: '/webhook/financing-approved',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'trade-status-updates',
      name: 'Trade Status Updates',
      description: 'Update trade deal statuses and check for milestone completions',
      schedule: '0 */2 * * *', // Every 2 hours
      function: 'updateTradeStatuses',
      enabled: true,
      timezone: 'UTC',
      params: {
        batchSize: 100,
        checkMilestones: true
      }
    },
    {
      id: 'compliance-monitoring',
      name: 'Compliance Monitoring',
      description: 'Monitor trades for compliance violations and regulatory changes',
      schedule: '0 6 * * *', // Daily at 6 AM
      function: 'monitorCompliance',
      enabled: true,
      timezone: 'UTC',
      params: {
        checkSanctions: true,
        validateDocuments: true
      }
    },
    {
      id: 'payment-reminders',
      name: 'Payment Reminders',
      description: 'Send payment reminders for upcoming trade obligations',
      schedule: '0 9 * * *', // Daily at 9 AM
      function: 'sendPaymentReminders',
      enabled: true,
      timezone: 'UTC',
      params: {
        reminderDays: [7, 3, 1], // Days before due date
        includeLateFees: true
      }
    },
    {
      id: 'risk-assessment',
      name: 'Daily Risk Assessment',
      description: 'Assess and update risk scores for active trades',
      schedule: '0 1 * * *', // Daily at 1 AM
      function: 'assessTradeRisks',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeMarketData: true,
        updateCreditScores: true
      }
    },
    {
      id: 'document-expiry-check',
      name: 'Document Expiry Check',
      description: 'Check for expiring trade documents and certificates',
      schedule: '0 8 * * *', // Daily at 8 AM
      function: 'checkDocumentExpiry',
      enabled: true,
      timezone: 'UTC',
      params: {
        warningDays: 30,
        autoRenew: false
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    apps: [
      {
        appId: 'nomyx-identity-management',
        version: '1.0.0',
        apis: ['verifyIdentity', 'getIdentityDetails', 'performKYC'],
        optional: false
      },
      {
        appId: 'nomyx-digital-assets',
        version: '1.0.0',
        apis: ['createAsset', 'transferAsset'],
        optional: true
      }
    ],
    permissions: [
      'blockchain:read',
      'blockchain:write',
      'parse:read',
      'parse:write',
      'notifications:send',
      'documents:read',
      'documents:write',
      'payments:process',
      'compliance:check'
    ]
  },
  
  configuration: {
    schema: {
      defaultCurrency: {
        type: 'select',
        label: 'Default Currency',
        description: 'Default currency for trade deals',
        defaultValue: 'USD',
        required: true,
        options: [
          { value: 'USD', label: 'US Dollar' },
          { value: 'EUR', label: 'Euro' },
          { value: 'GBP', label: 'British Pound' },
          { value: 'JPY', label: 'Japanese Yen' },
          { value: 'CNY', label: 'Chinese Yuan' }
        ]
      },
      escrowRequiredThreshold: {
        type: 'number',
        label: 'Escrow Required Threshold',
        description: 'Minimum trade value requiring escrow (in USD)',
        defaultValue: 10000,
        required: true,
        validation: {
          min: 0
        }
      },
      maxFinancingPercentage: {
        type: 'number',
        label: 'Maximum Financing Percentage',
        description: 'Maximum percentage of trade value that can be financed',
        defaultValue: 80,
        required: true,
        validation: {
          min: 0,
          max: 100
        }
      },
      complianceLevel: {
        type: 'select',
        label: 'Compliance Level',
        description: 'Level of compliance checking required',
        defaultValue: 'standard',
        required: true,
        options: [
          { value: 'basic', label: 'Basic Compliance' },
          { value: 'standard', label: 'Standard Compliance' },
          { value: 'enhanced', label: 'Enhanced Compliance' }
        ]
      },
      autoExecuteThreshold: {
        type: 'number',
        label: 'Auto-Execute Threshold',
        description: 'Maximum trade value for automatic execution (in USD)',
        defaultValue: 50000,
        required: true,
        validation: {
          min: 0
        }
      },
      requireInsurance: {
        type: 'boolean',
        label: 'Require Trade Insurance',
        description: 'Require trade insurance for high-value transactions',
        defaultValue: true,
        required: false
      },
      enableSmartContracts: {
        type: 'boolean',
        label: 'Enable Smart Contracts',
        description: 'Use smart contracts for trade execution',
        defaultValue: true,
        required: false
      },
      supportedIncoterms: {
        type: 'multiselect',
        label: 'Supported Incoterms',
        description: 'International commercial terms supported',
        defaultValue: ['FOB', 'CIF', 'EXW', 'DDP'],
        required: true,
        options: [
          { value: 'EXW', label: 'Ex Works' },
          { value: 'FCA', label: 'Free Carrier' },
          { value: 'CPT', label: 'Carriage Paid To' },
          { value: 'CIP', label: 'Carriage and Insurance Paid To' },
          { value: 'DAP', label: 'Delivered at Place' },
          { value: 'DPU', label: 'Delivered at Place Unloaded' },
          { value: 'DDP', label: 'Delivered Duty Paid' },
          { value: 'FAS', label: 'Free Alongside Ship' },
          { value: 'FOB', label: 'Free on Board' },
          { value: 'CFR', label: 'Cost and Freight' },
          { value: 'CIF', label: 'Cost, Insurance and Freight' }
        ]
      },
      paymentTermsDays: {
        type: 'number',
        label: 'Default Payment Terms (Days)',
        description: 'Default payment terms in days',
        defaultValue: 30,
        required: true,
        validation: {
          min: 1,
          max: 365
        }
      },
      enableDocumentVerification: {
        type: 'boolean',
        label: 'Enable Document Verification',
        description: 'Verify trade documents using blockchain',
        defaultValue: true,
        required: false
      },
      riskToleranceLevel: {
        type: 'select',
        label: 'Risk Tolerance Level',
        description: 'Platform risk tolerance for trade approvals',
        defaultValue: 'medium',
        required: true,
        options: [
          { value: 'low', label: 'Low Risk' },
          { value: 'medium', label: 'Medium Risk' },
          { value: 'high', label: 'High Risk' }
        ]
      }
    },
    defaultValues: {
      defaultCurrency: 'USD',
      escrowRequiredThreshold: 10000,
      maxFinancingPercentage: 80,
      complianceLevel: 'standard',
      autoExecuteThreshold: 50000,
      requireInsurance: true,
      enableSmartContracts: true,
      supportedIncoterms: ['FOB', 'CIF', 'EXW', 'DDP'],
      paymentTermsDays: 30,
      enableDocumentVerification: true,
      riskToleranceLevel: 'medium'
    }
  }
};