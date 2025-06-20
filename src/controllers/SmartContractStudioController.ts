import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext } from './types/actionContexts';
import { diamondContractService } from '../services/DiamondContractService';
import Parse from 'parse';

/**
 * Smart Contract Studio Controller
 * Leverages existing BasePageController patterns for diamond contract management
 */
export class SmartContractStudioController extends BasePageController {
  
  constructor() {
    super({
      pageId: 'smart-contract-studio',
      pageName: 'Smart Contract Studio',
      description: 'Manage organization diamond contracts and facets',
      category: 'blockchain',
      tags: ['smart-contracts', 'diamond', 'facets', 'blockchain', 'deployment'],
      permissions: ['diamond:read', 'diamond:write', 'diamond:deploy'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    // Action: Get organization diamond details
    this.registerAction(
      {
        id: 'getOrganizationDiamond',
        name: 'Get Organization Diamond',
        description: 'Get the diamond contract details for the current organization',
        category: 'data',
        permissions: ['diamond:read'],
        parameters: [
          { name: 'orgId', type: 'string', description: 'Organization ID (optional, uses current org if not provided)', required: false }
        ]
      },
      async (params, context) => {
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        // REUSE: Leverage DiamondContractService
        const result = await diamondContractService.getOrCreateOrganizationDiamond(orgId, {
          autoCreate: false
        });

        return {
          diamond: result.diamond,
          activeFacets: result.activeFacets,
          facetCount: result.activeFacets.length,
          isNew: result.isNew,
          message: result.diamond ? 'Diamond contract found' : 'No diamond contract found for organization'
        };
      }
    );

    // Action: List available facets
    this.registerAction(
      {
        id: 'listAvailableFacets',
        name: 'List Available Facets',
        description: 'Get all available facets that can be installed',
        category: 'data',
        permissions: ['facets:browse'],
        parameters: [
          { name: 'category', type: 'string', description: 'Filter by facet category', required: false },
          { name: 'search', type: 'string', description: 'Search facets by name', required: false },
          { name: 'includeInstalled', type: 'boolean', description: 'Include already installed facets', required: false }
        ]
      },
      async (params, context) => {
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const category = params.category as string;
        const search = params.search as string;
        const includeInstalled = params.includeInstalled as boolean;

        // REUSE: Leverage DiamondContractService
        const result = await diamondContractService.getAvailableFacets(orgId, {
          category,
          search,
          includeInstalled
        });

        return {
          facets: result.facets,
          categories: result.categories,
          total: result.facets.length,
          installedCount: result.installedCount
        };
      }
    );

    // Action: Install facet to organization diamond
    this.registerAction(
      {
        id: 'installFacet',
        name: 'Install Facet',
        description: 'Install a facet to the organization\'s diamond contract',
        category: 'data',
        permissions: ['diamond:deploy'],
        parameters: [
          { name: 'facetId', type: 'string', description: 'Deployment artifact ID of the facet to install', required: true },
          { name: 'configuration', type: 'object', description: 'Facet configuration options', required: false }
        ]
      },
      async (params, context) => {
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const facetId = params.facetId as string;
        const configuration = params.configuration as Record<string, any>;

        // REUSE: Leverage DiamondContractService
        const result = await diamondContractService.installFacet(orgId, facetId, configuration);

        return {
          facetInstance: result.facetInstance,
          deploymentTx: result.deploymentTx,
          message: 'Facet installed successfully'
        };
      }
    );

    // Action: Remove facet from diamond
    this.registerAction(
      {
        id: 'removeFacet',
        name: 'Remove Facet',
        description: 'Remove a facet from the organization\'s diamond contract',
        category: 'data',
        permissions: ['diamond:write'],
        parameters: [
          { name: 'facetInstanceId', type: 'string', description: 'ID of the facet instance to remove', required: true }
        ]
      },
      async (params, context) => {
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const facetInstanceId = params.facetInstanceId as string;

        // REUSE: Leverage DiamondContractService
        await diamondContractService.removeFacet(orgId, facetInstanceId);

        return {
          message: 'Facet removed successfully'
        };
      }
    );

    // Action: Create organization diamond
    this.registerAction(
      {
        id: 'createOrganizationDiamond',
        name: 'Create Organization Diamond',
        description: 'Deploy a new diamond contract for the organization',
        category: 'data',
        permissions: ['diamond:deploy'],
        parameters: [
          { name: 'blockchain', type: 'string', description: 'Blockchain network (default: ethereum)', required: false },
          { name: 'network', type: 'string', description: 'Network name (default: sepolia)', required: false },
          { name: 'name', type: 'string', description: 'Diamond contract name', required: false },
          { name: 'symbol', type: 'string', description: 'Diamond contract symbol', required: false }
        ]
      },
      async (params, context) => {
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const config = {
          blockchain: params.blockchain as string || 'ethereum',
          network: params.network as string || 'sepolia',
          name: params.name as string,
          symbol: params.symbol as string
        };

        // REUSE: Leverage DiamondContractService
        const diamond = await diamondContractService.createOrganizationDiamond(orgId, config);

        return {
          diamond,
          message: 'Diamond contract created and deployed successfully'
        };
      }
    );
  }
}