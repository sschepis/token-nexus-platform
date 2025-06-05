import { AppManifest } from '../types/app-framework';

export const walletManagementManifest: AppManifest = {
  id: 'nomyx-wallet-management',
  name: 'Wallet Management Platform',
  version: '1.0.0',
  description: 'Comprehensive wallet management platform with multi-signature support, hardware wallet integration, and advanced security features',
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
        component: 'WalletDashboard',
        title: 'Wallet Dashboard',
        description: 'Overview of wallet operations and security status',
        layout: 'default'
      },
      {
        path: '/wallets',
        component: 'WalletManagement',
        title: 'Wallet Management',
        description: 'Create and manage user wallets',
        permissions: ['wallets:read', 'wallets:write'],
        layout: 'default'
      },
      {
        path: '/multisig',
        component: 'MultisigManagement',
        title: 'Multi-Signature Wallets',
        description: 'Manage multi-signature wallet configurations',
        permissions: ['wallets:manage', 'multisig:manage'],
        layout: 'default'
      },
      {
        path: '/transactions',
        component: 'TransactionManagement',
        title: 'Transaction Management',
        description: 'Monitor and manage wallet transactions',
        permissions: ['transactions:read'],
        layout: 'default'
      },
      {
        path: '/security',
        component: 'WalletSecurity',
        title: 'Security Management',
        description: 'Manage wallet security policies and controls',
        permissions: ['security:manage'],
        layout: 'default'
      },
      {
        path: '/recovery',
        component: 'WalletRecovery',
        title: 'Wallet Recovery',
        description: 'Manage wallet recovery and backup procedures',
        permissions: ['wallets:manage', 'recovery:manage'],
        layout: 'default'
      },
      {
        path: '/integrations',
        component: 'WalletIntegrations',
        title: 'Integrations',
        description: 'Manage third-party wallet integrations',
        permissions: ['integrations:manage'],
        layout: 'default'
      },
      {
        path: '/analytics',
        component: 'WalletAnalytics',
        title: 'Analytics',
        description: 'Wallet usage and performance analytics',
        permissions: ['analytics:read', 'wallets:read'],
        layout: 'default'
      },
      {
        path: '/audit',
        component: 'WalletAudit',
        title: 'Audit Trail',
        description: 'Wallet operation audit trail and compliance',
        permissions: ['audit:read', 'wallets:read'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Wallet Dashboard',
        icon: '👛',
        path: '/',
        order: 1
      },
      {
        label: 'Wallet Management',
        icon: '💼',
        path: '/wallets',
        order: 2,
        permissions: ['wallets:read']
      },
      {
        label: 'Multi-Signature',
        icon: '🔐',
        path: '/multisig',
        order: 3,
        permissions: ['multisig:manage']
      },
      {
        label: 'Transactions',
        icon: '💸',
        path: '/transactions',
        order: 4,
        permissions: ['transactions:read']
      },
      {
        label: 'Security',
        icon: '🛡️',
        path: '/security',
        order: 5,
        permissions: ['security:manage']
      },
      {
        label: 'Recovery',
        icon: '🔄',
        path: '/recovery',
        order: 6,
        permissions: ['recovery:manage']
      },
      {
        label: 'Integrations',
        icon: '🔗',
        path: '/integrations',
        order: 7,
        permissions: ['integrations:manage']
      },
      {
        label: 'Analytics',
        icon: '📊',
        path: '/analytics',
        order: 8,
        permissions: ['analytics:read']
      },
      {
        label: 'Audit Trail',
        icon: '📋',
        path: '/audit',
        order: 9,
        permissions: ['audit:read']
      }
    ],
    permissions: [
      'wallets:read',
      'wallets:write',
      'wallets:manage',
      'multisig:read',
      'multisig:write',
      'multisig:manage',
      'transactions:read',
      'transactions:write',
      'security:read',
      'security:manage',
      'recovery:read',
      'recovery:manage',
      'integrations:read',
      'integrations:manage',
      'analytics:read',
      'audit:read'
    ]
  },
  
  userUI: {
    enabled: true,
    routes: [
      {
        path: '/my-wallets',
        component: 'UserWalletPortfolio',
        title: 'My Wallets',
        description: 'View and manage your wallets',
        layout: 'default'
      },
      {
        path: '/send',
        component: 'SendTransaction',
        title: 'Send',
        description: 'Send cryptocurrency and tokens',
        layout: 'default'
      },
      {
        path: '/receive',
        component: 'ReceiveTransaction',
        title: 'Receive',
        description: 'Receive cryptocurrency and tokens',
        layout: 'default'
      },
      {
        path: '/history',
        component: 'TransactionHistory',
        title: 'Transaction History',
        description: 'View your transaction history',
        layout: 'default'
      },
      {
        path: '/security-settings',
        component: 'UserSecuritySettings',
        title: 'Security Settings',
        description: 'Manage your wallet security settings',
        layout: 'default'
      }
    ]
  },
  
  backend: {
    cloudFunctions: [
      'createWallet',
      'importWallet',
      'deleteWallet',
      'getWalletBalance',
      'getWalletHistory',
      'sendTransaction',
      'signTransaction',
      'createMultisigWallet',
      'addMultisigSigner',
      'removeMultisigSigner',
      'proposeMultisigTransaction',
      'approveMultisigTransaction',
      'executeMultisigTransaction',
      'generateRecoveryPhrase',
      'backupWallet',
      'restoreWallet',
      'rotateKeys',
      'freezeWallet',
      'unfreezeWallet',
      'setSpendingLimits',
      'validateAddress',
      'estimateGas',
      'getNetworkStatus',
      'syncWalletData',
      'exportWalletData',
      'auditWalletActivity'
    ],
    schemas: [
      'Wallet',
      'WalletTransaction',
      'MultisigWallet',
      'MultisigTransaction',
      'WalletBackup',
      'SecurityPolicy',
      'SpendingLimit',
      'WalletAudit',
      'RecoveryConfiguration',
      'WalletIntegration'
    ],
    webhooks: [
      {
        event: 'wallet.created',
        url: '/webhook/wallet-created',
        method: 'POST'
      },
      {
        event: 'transaction.sent',
        url: '/webhook/transaction-sent',
        method: 'POST'
      },
      {
        event: 'transaction.received',
        url: '/webhook/transaction-received',
        method: 'POST'
      },
      {
        event: 'multisig.proposed',
        url: '/webhook/multisig-proposed',
        method: 'POST'
      },
      {
        event: 'multisig.approved',
        url: '/webhook/multisig-approved',
        method: 'POST'
      },
      {
        event: 'wallet.frozen',
        url: '/webhook/wallet-frozen',
        method: 'POST'
      },
      {
        event: 'security.breach',
        url: '/webhook/security-breach',
        method: 'POST'
      },
      {
        event: 'spending.limit.exceeded',
        url: '/webhook/spending-limit-exceeded',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'wallet-balance-sync',
      name: 'Wallet Balance Synchronization',
      description: 'Synchronize wallet balances with blockchain networks',
      schedule: '0 */10 * * *', // Every 10 minutes
      function: 'syncWalletBalances',
      enabled: true,
      timezone: 'UTC',
      params: {
        batchSize: 100,
        includeTokenBalances: true
      }
    },
    {
      id: 'transaction-monitoring',
      name: 'Transaction Monitoring',
      description: 'Monitor pending transactions and update statuses',
      schedule: '*/5 * * * *', // Every 5 minutes
      function: 'monitorTransactions',
      enabled: true,
      timezone: 'UTC',
      params: {
        checkPendingOnly: true,
        maxRetries: 10
      }
    },
    {
      id: 'security-audit',
      name: 'Daily Security Audit',
      description: 'Perform daily security audit of wallet operations',
      schedule: '0 2 * * *', // Daily at 2 AM
      function: 'performSecurityAudit',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeMultisigWallets: true,
        checkSpendingLimits: true
      }
    },
    {
      id: 'backup-verification',
      name: 'Backup Verification',
      description: 'Verify integrity of wallet backups',
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      function: 'verifyWalletBackups',
      enabled: true,
      timezone: 'UTC',
      params: {
        testRestoreProcess: false,
        alertOnFailure: true
      }
    },
    {
      id: 'inactive-wallet-cleanup',
      name: 'Inactive Wallet Cleanup',
      description: 'Archive or cleanup inactive wallets',
      schedule: '0 1 1 * *', // Monthly on the 1st at 1 AM
      function: 'cleanupInactiveWallets',
      enabled: true,
      timezone: 'UTC',
      params: {
        inactiveDays: 365,
        archiveOnly: true
      }
    },
    {
      id: 'gas-price-optimization',
      name: 'Gas Price Optimization',
      description: 'Optimize gas prices for pending transactions',
      schedule: '*/15 * * * *', // Every 15 minutes
      function: 'optimizeGasPrices',
      enabled: true,
      timezone: 'UTC',
      params: {
        maxGasPrice: 100, // Gwei
        enableSpeedUp: true
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    apps: [
      {
        appId: 'nomyx-identity-management',
        version: '1.0.0',
        apis: ['verifyIdentity', 'getIdentityDetails'],
        optional: false
      },
      {
        appId: 'nomyx-kyc-compliance',
        version: '1.0.0',
        apis: ['checkCompliance', 'validateTransaction'],
        optional: true
      }
    ],
    permissions: [
      'blockchain:read',
      'blockchain:write',
      'dfns:read',
      'dfns:write',
      'parse:read',
      'parse:write',
      'notifications:send',
      'encryption:encrypt',
      'encryption:decrypt'
    ]
  },
  
  configuration: {
    schema: {
      defaultWalletType: {
        type: 'select',
        label: 'Default Wallet Type',
        description: 'Default type for new wallet creation',
        defaultValue: 'custodial',
        required: true,
        options: [
          { value: 'custodial', label: 'Custodial Wallet' },
          { value: 'non-custodial', label: 'Non-Custodial Wallet' },
          { value: 'multisig', label: 'Multi-Signature Wallet' }
        ]
      },
      supportedNetworks: {
        type: 'multiselect',
        label: 'Supported Networks',
        description: 'Blockchain networks supported for wallet creation',
        defaultValue: ['ethereum', 'polygon'],
        required: true,
        options: [
          { value: 'ethereum', label: 'Ethereum' },
          { value: 'polygon', label: 'Polygon' },
          { value: 'arbitrum', label: 'Arbitrum' },
          { value: 'optimism', label: 'Optimism' },
          { value: 'base', label: 'Base' },
          { value: 'bsc', label: 'Binance Smart Chain' },
          { value: 'avalanche', label: 'Avalanche' }
        ]
      },
      defaultSpendingLimit: {
        type: 'number',
        label: 'Default Daily Spending Limit (USD)',
        description: 'Default daily spending limit for new wallets',
        defaultValue: 1000,
        required: true,
        validation: {
          min: 0
        }
      },
      multisigThreshold: {
        type: 'number',
        label: 'Default Multisig Threshold',
        description: 'Default number of signatures required for multisig wallets',
        defaultValue: 2,
        required: true,
        validation: {
          min: 2,
          max: 10
        }
      },
      enableHardwareWallets: {
        type: 'boolean',
        label: 'Enable Hardware Wallet Integration',
        description: 'Allow integration with hardware wallets',
        defaultValue: true,
        required: false
      },
      autoBackupEnabled: {
        type: 'boolean',
        label: 'Enable Automatic Backups',
        description: 'Automatically backup wallet data',
        defaultValue: true,
        required: false
      },
      backupFrequency: {
        type: 'select',
        label: 'Backup Frequency',
        description: 'Frequency of automatic wallet backups',
        defaultValue: 'daily',
        required: true,
        options: [
          { value: 'hourly', label: 'Hourly' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' }
        ]
      },
      gasOptimizationLevel: {
        type: 'select',
        label: 'Gas Optimization Level',
        description: 'Level of gas price optimization',
        defaultValue: 'standard',
        required: true,
        options: [
          { value: 'economy', label: 'Economy (Slow)' },
          { value: 'standard', label: 'Standard' },
          { value: 'fast', label: 'Fast' },
          { value: 'instant', label: 'Instant (Expensive)' }
        ]
      },
      enableTransactionBatching: {
        type: 'boolean',
        label: 'Enable Transaction Batching',
        description: 'Batch multiple transactions to reduce gas costs',
        defaultValue: true,
        required: false
      },
      securityLevel: {
        type: 'select',
        label: 'Security Level',
        description: 'Security level for wallet operations',
        defaultValue: 'high',
        required: true,
        options: [
          { value: 'standard', label: 'Standard Security' },
          { value: 'high', label: 'High Security' },
          { value: 'maximum', label: 'Maximum Security' }
        ]
      },
      enableBiometricAuth: {
        type: 'boolean',
        label: 'Enable Biometric Authentication',
        description: 'Require biometric authentication for sensitive operations',
        defaultValue: true,
        required: false
      },
      sessionTimeout: {
        type: 'number',
        label: 'Session Timeout (Minutes)',
        description: 'Wallet session timeout in minutes',
        defaultValue: 30,
        required: true,
        validation: {
          min: 5,
          max: 480
        }
      },
      enableWhitelist: {
        type: 'boolean',
        label: 'Enable Address Whitelist',
        description: 'Require address whitelisting for transactions',
        defaultValue: false,
        required: false
      },
      maxWalletsPerUser: {
        type: 'number',
        label: 'Maximum Wallets Per User',
        description: 'Maximum number of wallets a user can create',
        defaultValue: 10,
        required: true,
        validation: {
          min: 1,
          max: 100
        }
      }
    },
    defaultValues: {
      defaultWalletType: 'custodial',
      supportedNetworks: ['ethereum', 'polygon'],
      defaultSpendingLimit: 1000,
      multisigThreshold: 2,
      enableHardwareWallets: true,
      autoBackupEnabled: true,
      backupFrequency: 'daily',
      gasOptimizationLevel: 'standard',
      enableTransactionBatching: true,
      securityLevel: 'high',
      enableBiometricAuth: true,
      sessionTimeout: 30,
      enableWhitelist: false,
      maxWalletsPerUser: 10
    }
  }
};