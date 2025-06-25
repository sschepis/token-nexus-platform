import { objectManagerApi } from './api';
import Parse from 'parse';
import { DiamondOptions, DiamondConfig, FacetInstallationConfig } from './diamond/types/DiamondTypes';
import { categorizeFacet, checkFacetCompatibility, generateFacetDescription } from './diamond/utils/DiamondFacetUtils';

/**
 * Diamond Contract Service
 * Provides diamond-specific business logic while leveraging existing objectManagerApi
 */
export class DiamondContractService {
  
  /**
   * Get or create organization diamond contract
   */
  async getOrCreateOrganizationDiamond(orgId: string, options?: DiamondOptions): Promise<{
    diamond: any;
    isNew: boolean;
    activeFacets: any[];
  }> {
    // Check if diamond already exists
    const existingDiamondsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'OrganizationDiamond',
      limit: 1,
      filters: { status: 'active' }
    });

    if (!existingDiamondsResponse.success) {
      throw new Error(existingDiamondsResponse.error || 'Failed to fetch existing diamonds');
    }

    const existingDiamonds = existingDiamondsResponse.data || { records: [], total: 0 };

    if (existingDiamonds.records.length > 0) {
      const diamond = existingDiamonds.records[0];
      
      // Get active facets
      const facetsResponse = await objectManagerApi.fetchRecords({
        orgId,
        objectApiName: 'DiamondFacetInstance',
        filters: { 
          organizationDiamond: diamond.objectId,
          status: 'active'
        }
      });

      if (!facetsResponse.success) {
        throw new Error(facetsResponse.error || 'Failed to fetch diamond facets');
      }

      const facets = facetsResponse.data || { records: [], total: 0 };

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

    throw new Error('No diamond contract found and autoCreate is disabled');
  }

  /**
   * Create organization diamond contract
   */
  async createOrganizationDiamond(orgId: string, config: DiamondConfig): Promise<any> {
    try {
      // Get organization details
      const orgsResponse = await objectManagerApi.fetchRecords({
        orgId,
        objectApiName: 'Organization',
        limit: 1,
        filters: { objectId: orgId }
      });

      if (!orgsResponse.success) {
        throw new Error(orgsResponse.error || 'Failed to fetch organization');
      }

      const orgs = orgsResponse.data || { records: [], total: 0 };

      // Create diamond record
      const diamondResponse = await objectManagerApi.createRecord({
        orgId,
        objectApiName: 'OrganizationDiamond',
        recordData: {
          organization: Parse.Object.extend('Organization').createWithoutData(orgId),
          blockchain: config.blockchain,
          network: config.network,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      if (!diamondResponse.success) {
        throw new Error(diamondResponse.error || 'Failed to create diamond');
      }

      const diamond = diamondResponse.data;

      try {
        // Update status to deploying
        await objectManagerApi.updateRecord({
          orgId,
          objectApiName: 'OrganizationDiamond',
          recordId: diamond.objectId,
          updates: {
            status: 'deploying',
            deploymentStarted: new Date()
          }
        });

        // Install core facets
        await this.installCoreFacets(orgId, diamond.objectId);

        // Get updated diamond with deployment info
        const updatedDiamondsResponse = await objectManagerApi.fetchRecords({
          orgId,
          objectApiName: 'OrganizationDiamond',
          filters: { objectId: diamond.objectId },
          limit: 1
        });

        if (!updatedDiamondsResponse.success) {
          throw new Error('Failed to fetch updated diamond');
        }

        const updatedDiamonds = updatedDiamondsResponse.data || { records: [], total: 0 };

        // Update status to active
        await objectManagerApi.updateRecord({
          orgId,
          objectApiName: 'OrganizationDiamond',
          recordId: diamond.objectId,
          updates: {
            status: 'active',
            deploymentCompleted: new Date()
          }
        });

        return updatedDiamonds.records[0] || diamond;

      } catch (deploymentError) {
        // Update status to failed
        await objectManagerApi.updateRecord({
          orgId,
          objectApiName: 'OrganizationDiamond',
          recordId: diamond.objectId,
          updates: {
            status: 'failed',
            error: deploymentError instanceof Error ? deploymentError.message : 'Deployment failed'
          }
        });

        throw deploymentError;
      }

    } catch (error) {
      console.error('[DiamondContractService] Error creating organization diamond:', error);
      throw error;
    }
  }

  /**
   * Install core facets required for diamond functionality
   */
  private async installCoreFacets(orgId: string, diamondId: string): Promise<void> {
    const coreFacets = ['DiamondCutFacet', 'DiamondLoupeFacet', 'OwnershipFacet'];
    
    for (const facetName of coreFacets) {
      try {
        // Get facet artifact
        const artifactsResponse = await objectManagerApi.fetchRecords({
          orgId,
          objectApiName: 'DeploymentArtifact',
          filters: { name: facetName, type: 'facet' },
          limit: 1
        });

        if (!artifactsResponse.success || !artifactsResponse.data?.records.length) {
          console.warn(`Core facet ${facetName} not found in artifacts`);
          continue;
        }

        const artifacts = artifactsResponse.data;

        // Create facet instance
        await objectManagerApi.createRecord({
          orgId,
          objectApiName: 'DiamondFacetInstance',
          recordData: {
            organizationDiamond: Parse.Object.extend('OrganizationDiamond').createWithoutData(diamondId),
            deploymentArtifact: Parse.Object.extend('DeploymentArtifact').createWithoutData(artifacts.records[0].objectId),
            status: 'active',
            isCore: true,
            installedAt: new Date()
          }
        });

      } catch (error) {
        console.error(`Failed to install core facet ${facetName}:`, error);
        // Continue with other facets even if one fails
      }
    }
  }

  /**
   * Get available facets for installation
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
    // Build filters
    let filters: any = {
      type: 'facet',
      status: 'active'
    };

    // Category patterns for filtering
    const categoryPatterns: Record<string, string> = {
      'token': '(ERC721|ERC20|Token)',
      'identity': '(Identity|Registry)',
      'marketplace': '(Marketplace|Trade|Sale)',
      'governance': '(Governance|Voting)',
      'core': '(DiamondCut|DiamondLoupe|Ownership)'
    };

    if (options?.category) {
      filters.name = { $regex: categoryPatterns[options.category] };
    }

    if (options?.search) {
      filters.name = { $regex: options.search, $options: 'i' };
    }

    // Get available facets
    const availableFacetsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'DeploymentArtifact',
      filters,
      limit: 100
    });

    if (!availableFacetsResponse.success) {
      throw new Error(availableFacetsResponse.error || 'Failed to fetch available facets');
    }

    const availableFacets = availableFacetsResponse.data || { records: [], total: 0 };

    // Get installed facets
    const installedFacetsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'DiamondFacetInstance',
      filters: { status: 'active' },
      limit: 100
    });

    if (!installedFacetsResponse.success) {
      throw new Error(installedFacetsResponse.error || 'Failed to fetch installed facets');
    }

    const installedFacets = installedFacetsResponse.data || { records: [], total: 0 };

    // Create set of installed facet IDs for quick lookup
    const installedFacetIds = new Set(
      installedFacets.records.map(f => f.deploymentArtifact).filter(Boolean)
    );

    // Enhance facets with additional metadata
    const enhancedFacets = availableFacets.records.map(facet => {
      const isInstalled = installedFacetIds.has(facet.objectId);
      const category = categorizeFacet(facet.name);
      
      return {
        ...facet,
        isInstalled,
        category,
        compatibility: checkFacetCompatibility(facet),
        description: generateFacetDescription(facet.name, category)
      };
    }).filter(facet => {
      // Filter out installed facets if requested
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
   * Install a facet to the organization's diamond
   */
  async installFacet(orgId: string, facetId: string, configuration?: Record<string, any>): Promise<FacetInstallationConfig> {
    // Get organization's diamond
    const diamondsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'OrganizationDiamond',
      filters: { status: 'active' },
      limit: 1
    });

    if (!diamondsResponse.success) {
      throw new Error(diamondsResponse.error || 'Failed to fetch organization diamond');
    }

    const diamonds = diamondsResponse.data || { records: [], total: 0 };

    if (diamonds.records.length === 0) {
      throw new Error('No active diamond contract found for organization');
    }

    const diamond = diamonds.records[0];

    // Check if facet is already installed
    const existingFacetsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'DiamondFacetInstance',
      filters: {
        organizationDiamond: diamond.objectId,
        deploymentArtifact: facetId,
        status: 'active'
      },
      limit: 1
    });

    if (!existingFacetsResponse.success) {
      throw new Error('Failed to check existing facets');
    }

    const existingFacets = existingFacetsResponse.data || { records: [], total: 0 };

    if (existingFacets.records.length > 0) {
      throw new Error('Facet is already installed');
    }

    // Create facet instance
    const facetInstanceResponse = await objectManagerApi.createRecord({
      orgId,
      objectApiName: 'DiamondFacetInstance',
      recordData: {
        organizationDiamond: Parse.Object.extend('OrganizationDiamond').createWithoutData(diamond.objectId),
        deploymentArtifact: Parse.Object.extend('DeploymentArtifact').createWithoutData(facetId),
        configuration: configuration || {},
        status: 'installing',
        installedAt: new Date()
      }
    });

    if (!facetInstanceResponse.success) {
      throw new Error(facetInstanceResponse.error || 'Failed to create facet instance');
    }

    const facetInstance = facetInstanceResponse.data;

    try {
      // Simulate deployment process
      // In a real implementation, this would interact with blockchain
      const deploymentTx = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Update facet instance with deployment info
      await objectManagerApi.updateRecord({
        orgId,
        objectApiName: 'DiamondFacetInstance',
        recordId: facetInstance.objectId,
        updates: {
          status: 'active',
          deploymentTx,
          deployedAt: new Date()
        }
      });

      return {
        facetInstance: facetInstance,
        deploymentTx
      };

    } catch (error) {
      // Update facet instance status to failed
      await objectManagerApi.updateRecord({
        orgId,
        objectApiName: 'DiamondFacetInstance',
        recordId: facetInstance.objectId,
        updates: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Installation failed'
        }
      });

      throw error;
    }
  }

  /**
   * Remove a facet from the organization's diamond
   */
  async removeFacet(orgId: string, facetInstanceId: string): Promise<void> {
    // Get facet instance
    const facetsResponse = await objectManagerApi.fetchRecords({
      orgId,
      objectApiName: 'DiamondFacetInstance',
      filters: { objectId: facetInstanceId },
      limit: 1
    });

    if (!facetsResponse.success) {
      throw new Error(facetsResponse.error || 'Failed to fetch facet instance');
    }

    const facets = facetsResponse.data || { records: [], total: 0 };

    if (facets.records.length === 0) {
      throw new Error('Facet instance not found');
    }

    const facetInstance = facets.records[0];

    // Check if it's a core facet (cannot be removed)
    if (facetInstance.isCore) {
      throw new Error('Core facets cannot be removed');
    }

    try {
      // Get artifact details for removal
      const artifactsResponse = await objectManagerApi.fetchRecords({
        orgId,
        objectApiName: 'DeploymentArtifact',
        filters: { objectId: facetInstance.deploymentArtifact },
        limit: 1
      });

      if (!artifactsResponse.success) {
        throw new Error('Failed to fetch facet artifact details');
      }

      const artifacts = artifactsResponse.data || { records: [], total: 0 };

      // Simulate removal process
      // In a real implementation, this would interact with blockchain
      const removalTx = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Update facet instance status
      await objectManagerApi.updateRecord({
        orgId,
        objectApiName: 'DiamondFacetInstance',
        recordId: facetInstanceId,
        updates: {
          status: 'removed',
          removalTx,
          removedAt: new Date()
        }
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Core facets')) {
        // Delete the facet instance record completely for failed core removal attempts
        await objectManagerApi.deleteRecord({
          orgId,
          objectApiName: 'DiamondFacetInstance',
          recordId: facetInstanceId
        });
      } else {
        // Update status to removal_failed
        await objectManagerApi.updateRecord({
          orgId,
          objectApiName: 'DiamondFacetInstance',
          recordId: facetInstanceId,
          updates: {
            status: 'removal_failed',
            error: error instanceof Error ? error.message : 'Removal failed'
          }
        });
      }
      throw error;
    }
  }
}

export const diamondContractService = new DiamondContractService();