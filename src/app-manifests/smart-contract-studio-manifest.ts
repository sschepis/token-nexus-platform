import { AppManifest } from '../types/app-framework';

export const smartContractStudioManifest: AppManifest = {
  id: 'nomyx-smart-contract-studio',
  name: 'Smart Contract Studio',
  version: '1.0.0',
  description: 'Comprehensive diamond contract and facet management platform for organizations',
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
        component: 'DiamondDashboard',
        title: 'Diamond Dashboard',
        description: 'Manage your organization\'s diamond contract and active facets',
        permissions: ['diamond:read'],
        layout: 'default'
      },
      {
        path: '/marketplace',
        component: 'FacetMarketplace',
        title: 'Facet Marketplace',
        description: 'Browse and install facets for your diamond contract',
        permissions: ['facets:browse'],
        layout: 'default'
      },
      {
        path: '/deploy',
        component: 'SmartDeploymentWizard',
        title: 'Deploy Facets',
        description: 'Deploy new facets to your organization\'s diamond',
        permissions: ['diamond:deploy'],
        layout: 'default'
      },
      {
        path: '/analytics',
        component: 'ContractAnalytics',
        title: 'Contract Analytics',
        description: 'View analytics and performance metrics for your contracts',
        permissions: ['diamond:read'],
        layout: 'default'
      },
      {
        path: '/custom-facets',
        component: 'CustomFacetDeveloper',
        title: 'Custom Facets',
        description: 'Develop and manage custom facets for your organization',
        permissions: ['facets:create'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Diamond Dashboard',
        icon: '💎',
        path: '/',
        order: 1
      },
      {
        label: 'Facet Marketplace',
        icon: '🏪',
        path: '/marketplace',
        order: 2,
        permissions: ['facets:browse']
      },
      {
        label: 'Deploy Facets',
        icon: '🚀',
        path: '/deploy',
        order: 3,
        permissions: ['diamond:deploy']
      },
      {
        label: 'Analytics',
        icon: '📊',
        path: '/analytics',
        order: 4,
        permissions: ['diamond:read']
      },
      {
        label: 'Custom Facets',
        icon: '🛠️',
        path: '/custom-facets',
        order: 5,
        permissions: ['facets:create']
      }
    ],
    permissions: [
      'diamond:read',
      'diamond:write',
      'diamond:deploy',
      'diamond:upgrade',
      'facets:browse',
      'facets:install',
      'facets:remove',
      'facets:create',
      'facets:publish',
      'contracts:analytics'
    ]
  },
  
  backend: {
    cloudFunctions: [
      'deployFacetToDiamond',
      'upgradeDiamondFacet',
      'getDiamondAnalytics',
      'getOrganizationDiamond',
      'listAvailableFacets',
      'installFacetToOrganization'
    ],
    schemas: [
      'OrganizationDiamond',
      'DiamondFacetInstance',
      'FacetRegistry',
      'CustomFacet'
    ],
    webhooks: [
      {
        event: 'facet.installed',
        url: '/webhook/facet-installed',
        method: 'POST'
      },
      {
        event: 'facet.upgraded',
        url: '/webhook/facet-upgraded',
        method: 'POST'
      },
      {
        event: 'diamond.deployed',
        url: '/webhook/diamond-deployed',
        method: 'POST'
      }
    ]
  },
  
  dependencies: {
    platform: '1.0.0',
    apps: [
      {
        appId: 'nomyx-digital-assets',
        version: '>=1.0.0',
        optional: true
      }
    ],
    permissions: [
      'blockchain:read',
      'blockchain:write',
      'parse:read',
      'parse:write'
    ]
  },
  
  configuration: {
    schema: {
      defaultNetwork: {
        type: 'select',
        label: 'Default Network',
        description: 'Default blockchain network for deployments',
        options: [
          { value: 'mainnet', label: 'Ethereum Mainnet' },
          { value: 'sepolia', label: 'Sepolia Testnet' },
          { value: 'basesep', label: 'Base Sepolia' }
        ],
        required: true
      },
      autoUpgrade: {
        type: 'boolean',
        label: 'Auto-upgrade Facets',
        description: 'Automatically upgrade facets when new versions are available',
        required: false
      },
      gasLimit: {
        type: 'number',
        label: 'Default Gas Limit',
        description: 'Default gas limit for facet deployments',
        required: false
      }
    },
    defaultValues: {
      defaultNetwork: 'basesep',
      autoUpgrade: false,
      gasLimit: 500000
    }
  }
};