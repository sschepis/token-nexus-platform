import { objectManagerService } from './objectManagerService';
import Parse from 'parse';

/**
 * Diamond Contract Service
 * Provides diamond-specific business logic while leveraging existing objectManagerService
 */
export class DiamondContractService {
  
  /**
   * Get or create organization diamond contract
   */
  async getOrCreateOrganizationDiamond(orgId: string, options?: {
    blockchain?: string;
    network?: string;
    autoCreate?: boolean;
  }): Promise<{
    diamond: any;
    isNew: boolean;
    activeFacets: any[];
  }> {
    // Check if diamond already exists
    const existingDiamonds = await objectManagerService.fetchRecords(orgId, 'OrganizationDiamond', {
      limit: 1,
      filters: { status: 'active' }
    });

    if (existingDiamonds.records.length > 0) {
      const diamond = existingDiamonds.records[0];
      
      // Get active facets
      const facets = await objectManagerService.fetchRecords(orgId, 'DiamondFacetInstance', {
        filters: { 
          organizationDiamond: diamond.objectId,
          status: 'active'
        }
      });

      return {
        diamond,
        isNew: false,
        activeFacets: facets.records
      };
    }

    // Create new diamond if autoCreate is enabled
    if (options?.autoCreate) {
      const diamond = await this.createOrganizationDiamond(orgId, {
        blockchain: options.blockchain || 'ethereum',
        network: options.network || 'sepolia'
      });

      return {
        diamond,
        isNew: true,
        activeFacets: []
      };
    }

    // Return null diamond if not found and autoCreate is false
    return {
      diamond: null,
      isNew: false,
      activeFacets: []
    };
  }

  /**
   * Create a new organization diamond contract
   */
  async createOrganizationDiamond(orgId: string, config: {
    blockchain: string;
    network: string;
    name?: string;
    symbol?: string;
  }): Promise<any> {
    // Get organization details
    const orgs = await objectManagerService.fetchRecords(orgId, 'Organization', {
      filters: { objectId: orgId },
      limit: 1
    });

    if (orgs.records.length === 0) {
      throw new Error('Organization not found');
    }

    const org = orgs.records[0];
    
    // Create diamond record
    const diamond = await objectManagerService.createRecord(orgId, 'OrganizationDiamond', {
      organization: orgId,
      name: config.name || `${org.name} Diamond`,
      symbol: config.symbol || `${org.name.substring(0, 3).toUpperCase()}D`,
      blockchain: config.blockchain,
      network: config.network,
      status: 'deploying',
      createdAt: new Date()
    });

    // Trigger deployment via cloud function
    try {
      const deploymentResult = await Parse.Cloud.run('deployOrganizationDiamond', {
        organizationId: orgId,
        diamondId: diamond.objectId,
        config
      });

      // Update diamond with deployment details
      await objectManagerService.updateRecord(orgId, 'OrganizationDiamond', diamond.objectId, {
        contractAddress: deploymentResult.contractAddress,
        deploymentTxHash: deploymentResult.txHash,
        status: 'active',
        deployedAt: new Date()
      });

      // Install core facets
      await this.installCoreFacets(orgId, diamond.objectId);

      return await objectManagerService.fetchRecords(orgId, 'OrganizationDiamond', {
        filters: { objectId: diamond.objectId },
        limit: 1
      }).then(result => result.records[0]);

    } catch (error) {
      // Update status to failed
      await objectManagerService.updateRecord(orgId, 'OrganizationDiamond', diamond.objectId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Deployment failed'
      });
      throw error;
    }
  }

  /**
   * Install core facets required for diamond functionality
   */
  private async installCoreFacets(orgId: string, diamondId: string): Promise<void> {
    const coreFacets = [
      'DiamondCutFacet',
      'DiamondLoupeFacet'
    ];

    for (const facetName of coreFacets) {
      // Find the deployment artifact for this facet
      const artifacts = await objectManagerService.fetchRecords(orgId, 'DeploymentArtifact', {
        filters: { name: facetName },
        limit: 1
      });

      if (artifacts.records.length > 0) {
        const artifact = artifacts.records[0];
        
        // Create facet instance
        await objectManagerService.createRecord(orgId, 'DiamondFacetInstance', {
          organizationDiamond: diamondId,
          deploymentArtifact: artifact.objectId,
          status: 'active',
          isCore: true,
          installedAt: new Date()
        });
      }
    }
  }

  /**
   * Get available facets with installation status
   */
  async getAvailableFacets(orgId: string, options?: {
    category?: string;
    search?: string;
    includeInstalled?: boolean;
  }): Promise<{
    facets: any[];
    categories: string[];
    installedCount: number;
  }> {
    // Build filters for facet artifacts
    let filters: any = {
      $or: [
        { name: { $regex: 'Facet$' } },
        { name: { $in: ['DiamondCutFacet', 'DiamondLoupeFacet'] } }
      ]
    };

    if (options?.category) {
      const categoryPatterns: Record<string, string> = {
        'token': 'ERC721|ERC20|Token',
        'identity': 'Identity|Registry',
        'marketplace': 'Marketplace|Trade|Sale',
        'governance': 'Governance|Voting',
        'utility': 'Metadata|Attributes|SVG',
        'core': 'DiamondCut|DiamondLoupe'
      };
      
      if (categoryPatterns[options.category]) {
        filters.name = { $regex: categoryPatterns[options.category] };
      }
    }

    if (options?.search) {
      filters.name = { $regex: options.search, $options: 'i' };
    }

    // Get available facets
    const availableFacets = await objectManagerService.fetchRecords(orgId, 'DeploymentArtifact', {
      filters,
      limit: 100
    });

    // Get installed facets
    const installedFacets = await objectManagerService.fetchRecords(orgId, 'DiamondFacetInstance', {
      filters: { status: 'active' }
    });

    const installedFacetIds = new Set(
      installedFacets.records.map(f => f.deploymentArtifact).filter(Boolean)
    );

    // Enhance facets with metadata
    const enhancedFacets = availableFacets.records.map(facet => {
      const isInstalled = installedFacetIds.has(facet.objectId);
      const category = this.categorizeFacet(facet.name);
      
      return {
        ...facet,
        isInstalled,
        category,
        compatibility: this.checkFacetCompatibility(facet),
        description: this.generateFacetDescription(facet.name, category)
      };
    }).filter(facet => {
      // Filter out installed facets if includeInstalled is false
      if (options?.includeInstalled === false && facet.isInstalled) {
        return false;
      }
      return true;
    });

    // Get unique categories
    const categories = Array.from(new Set(enhancedFacets.map(f => f.category)));

    return {
      facets: enhancedFacets,
      categories,
      installedCount: installedFacets.total
    };
  }

  /**
   * Install a facet to organization diamond
   */
  async installFacet(orgId: string, facetId: string, configuration?: Record<string, any>): Promise<{
    facetInstance: any;
    deploymentTx?: string;
  }> {
    // Get organization diamond
    const diamonds = await objectManagerService.fetchRecords(orgId, 'OrganizationDiamond', {
      filters: { status: 'active' },
      limit: 1
    });

    if (diamonds.records.length === 0) {
      throw new Error('No active diamond contract found for organization');
    }

    const diamond = diamonds.records[0];

    // Check if facet is already installed
    const existingFacets = await objectManagerService.fetchRecords(orgId, 'DiamondFacetInstance', {
      filters: {
        organizationDiamond: diamond.objectId,
        deploymentArtifact: facetId,
        status: { $in: ['active', 'installing'] }
      }
    });

    if (existingFacets.records.length > 0) {
      throw new Error('Facet is already installed or being installed');
    }

    // Create facet instance record
    const facetInstance = await objectManagerService.createRecord(orgId, 'DiamondFacetInstance', {
      organizationDiamond: diamond.objectId,
      deploymentArtifact: facetId,
      configuration: configuration || {},
      status: 'installing',
      installedAt: new Date()
    });

    // Trigger blockchain deployment
    try {
      const deploymentResult = await Parse.Cloud.run('installFacetToDiamond', {
        organizationId: orgId,
        diamondAddress: diamond.contractAddress,
        facetInstanceId: facetInstance.objectId,
        facetId,
        configuration
      });

      // Update status to active
      await objectManagerService.updateRecord(orgId, 'DiamondFacetInstance', facetInstance.objectId, {
        status: 'active',
        deploymentTxHash: deploymentResult.txHash
      });

      return {
        facetInstance: await objectManagerService.fetchRecords(orgId, 'DiamondFacetInstance', {
          filters: { objectId: facetInstance.objectId },
          limit: 1
        }).then(result => result.records[0]),
        deploymentTx: deploymentResult.txHash
      };

    } catch (error) {
      // Update status to failed
      await objectManagerService.updateRecord(orgId, 'DiamondFacetInstance', facetInstance.objectId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Installation failed'
      });
      throw error;
    }
  }

  /**
   * Remove a facet from organization diamond
   */
  async removeFacet(orgId: string, facetInstanceId: string): Promise<void> {
    // Get facet instance
    const facets = await objectManagerService.fetchRecords(orgId, 'DiamondFacetInstance', {
      filters: { objectId: facetInstanceId }
    });

    if (facets.records.length === 0) {
      throw new Error('Facet instance not found');
    }

    const facetInstance = facets.records[0];

    // Check if it's a core facet
    if (facetInstance.isCore) {
      throw new Error('Core facets cannot be removed');
    }

    // Get deployment artifact to check facet name
    const artifacts = await objectManagerService.fetchRecords(orgId, 'DeploymentArtifact', {
      filters: { objectId: facetInstance.deploymentArtifact }
    });

    if (artifacts.records.length > 0) {
      const facetName = artifacts.records[0].name;
      const coreFacets = ['DiamondCutFacet', 'DiamondLoupeFacet'];
      
      if (coreFacets.includes(facetName)) {
        throw new Error('Core facets cannot be removed');
      }
    }

    // Update status to removing
    await objectManagerService.updateRecord(orgId, 'DiamondFacetInstance', facetInstanceId, {
      status: 'removing'
    });

    try {
      // Trigger blockchain removal
      await Parse.Cloud.run('removeFacetFromDiamond', {
        organizationId: orgId,
        facetInstanceId
      });

      // Delete the facet instance record
      await objectManagerService.deleteRecord(orgId, 'DiamondFacetInstance', facetInstanceId);

    } catch (error) {
      // Update status to failed
      await objectManagerService.updateRecord(orgId, 'DiamondFacetInstance', facetInstanceId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Removal failed'
      });
      throw error;
    }
  }

  /**
   * Categorize facet by name
   */
  private categorizeFacet(facetName: string): string {
    if (facetName.includes('ERC721') || facetName.includes('ERC20') || facetName.includes('Token')) return 'token';
    if (facetName.includes('Identity') || facetName.includes('Registry')) return 'identity';
    if (facetName.includes('Marketplace') || facetName.includes('Trade') || facetName.includes('Sale')) return 'marketplace';
    if (facetName.includes('Governance') || facetName.includes('Voting')) return 'governance';
    if (facetName.includes('DiamondCut') || facetName.includes('DiamondLoupe')) return 'core';
    return 'utility';
  }

  /**
   * Check facet compatibility
   */
  private checkFacetCompatibility(facet: any): { compatible: boolean; reason?: string } {
    if (!facet.abi || !Array.isArray(facet.abi)) {
      return { compatible: false, reason: 'Invalid or missing ABI' };
    }

    // Check for required diamond interface
    const hasRequiredInterface = facet.abi.some((item: any) => 
      item.type === 'function' && item.name === 'supportsInterface'
    );

    if (!hasRequiredInterface) {
      return { compatible: false, reason: 'Missing required diamond interface' };
    }

    return { compatible: true };
  }

  /**
   * Generate facet description based on name and category
   */
  private generateFacetDescription(facetName: string, category: string): string {
    const descriptions: Record<string, string> = {
      'DiamondCutFacet': 'Core facet for managing diamond upgrades and facet modifications',
      'DiamondLoupeFacet': 'Core facet for diamond introspection and interface discovery',
      'ERC721AMetadataFacet': 'Provides ERC721 metadata functionality for NFT collections',
      'ERC721AAttributesFacet': 'Manages dynamic attributes for ERC721A tokens',
      'IdentityRegistryFacet': 'Manages identity verification and KYC compliance',
      'MarketplaceFacet': 'Enables peer-to-peer trading and marketplace functionality',
      'GovernanceFacet': 'Provides DAO governance and voting capabilities'
    };

    if (descriptions[facetName]) {
      return descriptions[facetName];
    }

    // Generate description based on category
    const categoryDescriptions: Record<string, string> = {
      'token': 'Provides token-related functionality and standards compliance',
      'identity': 'Manages identity verification and user authentication',
      'marketplace': 'Enables trading and marketplace operations',
      'governance': 'Provides governance and decision-making capabilities',
      'utility': 'Offers utility functions and helper methods',
      'core': 'Essential diamond functionality - required for operation'
    };

    return categoryDescriptions[category] || 'Custom facet with specialized functionality';
  }
}

// Export singleton instance
export const diamondContractService = new DiamondContractService();