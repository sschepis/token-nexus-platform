import { AppManifest } from '../types/app-framework';

export const identityManagementManifest: AppManifest = {
  id: 'nomyx-identity-management',
  name: 'Identity Management',
  version: '1.0.0',
  description: 'Complete digital identity and credential management system with EVM identity creation, KYC verification, and wallet linking',
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
        component: 'IdentityDashboard',
        title: 'Identity Dashboard',
        description: 'Manage digital identities and credentials',
        layout: 'default'
      },
      {
        path: '/create',
        component: 'IdentityCreation',
        title: 'Create Identity',
        description: 'Create new digital identities via IdentityFactory',
        permissions: ['identity:write'],
        layout: 'default'
      },
      {
        path: '/kyc',
        component: 'KYCManagement',
        title: 'KYC Management',
        description: 'Manage KYC verification processes and compliance',
        permissions: ['identity:manage', 'kyc:read'],
        layout: 'default'
      },
      {
        path: '/wallets',
        component: 'WalletLinking',
        title: 'Wallet Management',
        description: 'Link and manage Dfns wallets for identities',
        permissions: ['identity:manage', 'wallet:manage'],
        layout: 'default'
      },
      {
        path: '/credentials',
        component: 'CredentialManagement',
        title: 'Credentials',
        description: 'Issue and manage verifiable credentials',
        permissions: ['identity:manage', 'credentials:write'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Identity Dashboard',
        icon: '🆔',
        path: '/',
        order: 1
      },
      {
        label: 'Create Identity',
        icon: '➕',
        path: '/create',
        order: 2,
        permissions: ['identity:write']
      },
      {
        label: 'KYC Management',
        icon: '✅',
        path: '/kyc',
        order: 3,
        permissions: ['kyc:read']
      },
      {
        label: 'Wallets',
        icon: '👛',
        path: '/wallets',
        order: 4,
        permissions: ['wallet:manage']
      },
      {
        label: 'Credentials',
        icon: '📜',
        path: '/credentials',
        order: 5,
        permissions: ['credentials:write']
      }
    ],
    permissions: ['identity:read', 'identity:write', 'identity:manage', 'kyc:read', 'kyc:write', 'wallet:manage', 'credentials:read', 'credentials:write']
  },
  
  userUI: {
    enabled: false,
    routes: []
  },
  
  backend: {
    cloudFunctions: [
      'createIdentity',
      'verifyIdentity',
      'linkWallet',
      'recoverIdentity',
      'manageCredentials',
      'initiateKYC',
      'updateKYCStatus',
      'issueCredential',
      'revokeCredential',
      'getIdentityDetails'
    ],
    schemas: ['Identity', 'Credential', 'VerificationRequest', 'KYCRecord', 'WalletLink'],
    webhooks: [
      {
        event: 'identity.created',
        url: '/webhook/identity-created',
        method: 'POST'
      },
      {
        event: 'kyc.completed',
        url: '/webhook/kyc-completed',
        method: 'POST'
      },
      {
        event: 'credential.issued',
        url: '/webhook/credential-issued',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'kyc-reminder',
      name: 'KYC Reminder Notifications',
      description: 'Send reminders for pending KYC verifications',
      schedule: '0 9 * * *', // Daily at 9 AM
      function: 'sendKYCReminders',
      enabled: true,
      timezone: 'UTC',
      params: {
        reminderThresholdDays: 7,
        maxReminders: 3
      }
    },
    {
      id: 'credential-expiry-check',
      name: 'Credential Expiry Check',
      description: 'Check for expiring credentials and send notifications',
      schedule: '0 0 * * 0', // Weekly on Sunday
      function: 'checkCredentialExpiry',
      enabled: true,
      timezone: 'UTC',
      params: {
        expiryWarningDays: 30
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    permissions: [
      'blockchain:read',
      'blockchain:write',
      'dfns:manage',
      'parse:read',
      'parse:write'
    ]
  },
  
  configuration: {
    schema: {
      autoVerification: {
        type: 'boolean',
        label: 'Auto Verification',
        description: 'Automatically verify identities when possible based on trusted sources',
        defaultValue: false,
        required: false
      },
      kycProvider: {
        type: 'select',
        label: 'KYC Provider',
        description: 'Choose the primary KYC verification provider',
        defaultValue: 'jumio',
        required: true,
        options: [
          { value: 'jumio', label: 'Jumio' },
          { value: 'onfido', label: 'Onfido' },
          { value: 'sumsub', label: 'Sum&Substance' },
          { value: 'shufti', label: 'Shufti Pro' }
        ]
      },
      identityFactoryAddress: {
        type: 'string',
        label: 'Identity Factory Contract Address',
        description: 'Ethereum address of the IdentityFactory contract',
        required: true,
        validation: {
          pattern: '^0x[a-fA-F0-9]{40}$'
        }
      },
      dfnsIntegration: {
        type: 'boolean',
        label: 'Enable Dfns Integration',
        description: 'Enable Dfns wallet-as-a-service integration for identity wallets',
        defaultValue: true,
        required: false
      },
      credentialValidityPeriod: {
        type: 'number',
        label: 'Credential Validity Period (days)',
        description: 'Default validity period for issued credentials in days',
        defaultValue: 365,
        required: false,
        validation: {
          min: 30,
          max: 3650
        }
      },
      requireKYCForIdentity: {
        type: 'boolean',
        label: 'Require KYC for Identity Creation',
        description: 'Require KYC verification before allowing identity creation',
        defaultValue: true,
        required: false
      },
      socialRecoveryEnabled: {
        type: 'boolean',
        label: 'Enable Social Recovery',
        description: 'Allow social recovery mechanisms for identity restoration',
        defaultValue: true,
        required: false
      },
      minimumRecoveryGuardians: {
        type: 'number',
        label: 'Minimum Recovery Guardians',
        description: 'Minimum number of guardians required for social recovery',
        defaultValue: 3,
        required: false,
        validation: {
          min: 1,
          max: 10
        }
      }
    },
    defaultValues: {
      autoVerification: false,
      kycProvider: 'jumio',
      dfnsIntegration: true,
      credentialValidityPeriod: 365,
      requireKYCForIdentity: true,
      socialRecoveryEnabled: true,
      minimumRecoveryGuardians: 3
    }
  }
};