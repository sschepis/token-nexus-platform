import { AppManifest } from '../types/app-framework';

export const digitalAssetManifest: AppManifest = {
  id: 'nomyx-digital-assets',
  name: 'Digital Asset Management',
  version: '1.0.0',
  description: 'Complete tokenization and digital asset management platform with NFT minting, marketplace integration, and royalty management',
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
        component: 'AssetDashboard',
        title: 'Asset Dashboard',
        description: 'Manage digital assets and tokens',
        layout: 'default'
      },
      {
        path: '/create',
        component: 'AssetCreation',
        title: 'Create Asset',
        description: 'Tokenize new assets and mint NFTs',
        permissions: ['assets:write'],
        layout: 'default'
      },
      {
        path: '/marketplace',
        component: 'AssetMarketplace',
        title: 'Asset Marketplace',
        description: 'Trade digital assets and manage listings',
        permissions: ['marketplace:read'],
        layout: 'default'
      },
      {
        path: '/collections',
        component: 'CollectionManagement',
        title: 'Collections',
        description: 'Manage asset collections and series',
        permissions: ['assets:manage'],
        layout: 'default'
      },
      {
        path: '/royalties',
        component: 'RoyaltyManagement',
        title: 'Royalties',
        description: 'Configure and track royalty distributions',
        permissions: ['assets:manage', 'finance:read'],
        layout: 'default'
      },
      {
        path: '/analytics',
        component: 'AssetAnalytics',
        title: 'Analytics',
        description: 'Asset performance and market analytics',
        permissions: ['assets:read', 'analytics:read'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Asset Dashboard',
        icon: '💎',
        path: '/',
        order: 1
      },
      {
        label: 'Create Asset',
        icon: '🎨',
        path: '/create',
        order: 2,
        permissions: ['assets:write']
      },
      {
        label: 'Marketplace',
        icon: '🏪',
        path: '/marketplace',
        order: 3,
        permissions: ['marketplace:read']
      },
      {
        label: 'Collections',
        icon: '📚',
        path: '/collections',
        order: 4,
        permissions: ['assets:manage']
      },
      {
        label: 'Royalties',
        icon: '💰',
        path: '/royalties',
        order: 5,
        permissions: ['assets:manage']
      },
      {
        label: 'Analytics',
        icon: '📊',
        path: '/analytics',
        order: 6,
        permissions: ['analytics:read']
      }
    ],
    permissions: [
      'assets:read',
      'assets:write', 
      'assets:manage',
      'tokens:read',
      'tokens:write',
      'marketplace:read',
      'marketplace:write',
      'marketplace:manage',
      'finance:read',
      'analytics:read'
    ]
  },
  
  userUI: {
    enabled: true,
    routes: [
      {
        path: '/portfolio',
        component: 'UserAssetPortfolio',
        title: 'My Assets',
        description: 'View and manage your digital asset portfolio',
        layout: 'default'
      },
      {
        path: '/marketplace',
        component: 'UserMarketplace',
        title: 'Marketplace',
        description: 'Browse and purchase digital assets',
        layout: 'default'
      }
    ]
  },
  
  backend: {
    cloudFunctions: [
      'createAsset',
      'mintTokens',
      'transferAsset',
      'listForSale',
      'purchaseAsset',
      'manageRoyalties',
      'createCollection',
      'updateAssetMetadata',
      'burnAsset',
      'getAssetDetails',
      'getAssetHistory',
      'calculateRoyalties',
      'distributeRoyalties',
      'getMarketplaceStats',
      'searchAssets'
    ],
    schemas: [
      'DigitalAsset',
      'AssetCollection', 
      'AssetMetadata',
      'AssetTransfer',
      'MarketplaceListing',
      'RoyaltyConfiguration',
      'AssetSale'
    ],
    webhooks: [
      {
        event: 'asset.created',
        url: '/webhook/asset-created',
        method: 'POST'
      },
      {
        event: 'asset.transferred',
        url: '/webhook/asset-transferred',
        method: 'POST'
      },
      {
        event: 'asset.sold',
        url: '/webhook/asset-sold',
        method: 'POST'
      },
      {
        event: 'royalty.distributed',
        url: '/webhook/royalty-distributed',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'royalty-distribution',
      name: 'Daily Royalty Distribution',
      description: 'Process and distribute accumulated royalties to creators',
      schedule: '0 2 * * *', // Daily at 2 AM
      function: 'distributeRoyalties',
      enabled: true,
      timezone: 'UTC',
      params: {
        minimumDistributionAmount: 10, // USD
        batchSize: 100
      }
    },
    {
      id: 'marketplace-analytics',
      name: 'Marketplace Analytics Update',
      description: 'Update marketplace statistics and trending data',
      schedule: '0 */6 * * *', // Every 6 hours
      function: 'updateMarketplaceAnalytics',
      enabled: true,
      timezone: 'UTC'
    },
    {
      id: 'asset-metadata-sync',
      name: 'Asset Metadata Synchronization',
      description: 'Sync asset metadata with IPFS and external sources',
      schedule: '0 4 * * *', // Daily at 4 AM
      function: 'syncAssetMetadata',
      enabled: true,
      timezone: 'UTC',
      params: {
        batchSize: 50,
        retryFailedSync: true
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
      }
    ],
    permissions: [
      'blockchain:read',
      'blockchain:write',
      'tokens:read',
      'tokens:write',
      'marketplace:manage',
      'ipfs:read',
      'ipfs:write',
      'parse:read',
      'parse:write'
    ]
  },
  
  configuration: {
    schema: {
      defaultTokenStandard: {
        type: 'select',
        label: 'Default Token Standard',
        description: 'Default token standard for new asset creation',
        defaultValue: 'ERC721',
        required: true,
        options: [
          { value: 'ERC721', label: 'ERC-721 (NFT)' },
          { value: 'ERC1155', label: 'ERC-1155 (Multi-Token)' },
          { value: 'ERC20', label: 'ERC-20 (Fungible)' }
        ]
      },
      marketplaceFeePercentage: {
        type: 'number',
        label: 'Marketplace Fee (%)',
        description: 'Percentage fee charged on marketplace transactions',
        defaultValue: 2.5,
        required: true,
        validation: {
          min: 0,
          max: 10
        }
      },
      royaltyCapPercentage: {
        type: 'number',
        label: 'Maximum Royalty (%)',
        description: 'Maximum royalty percentage that can be set by creators',
        defaultValue: 10,
        required: true,
        validation: {
          min: 0,
          max: 25
        }
      },
      ipfsGateway: {
        type: 'string',
        label: 'IPFS Gateway URL',
        description: 'IPFS gateway URL for metadata storage',
        defaultValue: 'https://ipfs.io/ipfs/',
        required: true
      },
      enableLazyMinting: {
        type: 'boolean',
        label: 'Enable Lazy Minting',
        description: 'Allow lazy minting to reduce gas costs for creators',
        defaultValue: true,
        required: false
      },
      requireIdentityVerification: {
        type: 'boolean',
        label: 'Require Identity Verification',
        description: 'Require verified identity for asset creation and high-value transactions',
        defaultValue: true,
        required: false
      },
      autoApproveListings: {
        type: 'boolean',
        label: 'Auto-approve Listings',
        description: 'Automatically approve marketplace listings without manual review',
        defaultValue: false,
        required: false
      },
      supportedBlockchains: {
        type: 'multiselect',
        label: 'Supported Blockchains',
        description: 'Blockchain networks supported for asset creation',
        defaultValue: ['ethereum', 'polygon'],
        required: true,
        options: [
          { value: 'ethereum', label: 'Ethereum' },
          { value: 'polygon', label: 'Polygon' },
          { value: 'arbitrum', label: 'Arbitrum' },
          { value: 'optimism', label: 'Optimism' },
          { value: 'base', label: 'Base' }
        ]
      },
      metadataStorageProvider: {
        type: 'select',
        label: 'Metadata Storage Provider',
        description: 'Provider for storing asset metadata',
        defaultValue: 'ipfs',
        required: true,
        options: [
          { value: 'ipfs', label: 'IPFS' },
          { value: 'arweave', label: 'Arweave' },
          { value: 'aws-s3', label: 'AWS S3' }
        ]
      },
      enableBatchOperations: {
        type: 'boolean',
        label: 'Enable Batch Operations',
        description: 'Allow batch minting and transfer operations',
        defaultValue: true,
        required: false
      }
    },
    defaultValues: {
      defaultTokenStandard: 'ERC721',
      marketplaceFeePercentage: 2.5,
      royaltyCapPercentage: 10,
      ipfsGateway: 'https://ipfs.io/ipfs/',
      enableLazyMinting: true,
      requireIdentityVerification: true,
      autoApproveListings: false,
      supportedBlockchains: ['ethereum', 'polygon'],
      metadataStorageProvider: 'ipfs',
      enableBatchOperations: true
    }
  }
};