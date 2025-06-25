import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Marketplace browsing and search actions
 * Adapted to work with BasePageController's registerAction pattern
 */

export function getBrowseMarketplaceAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'browseMarketplace',
      name: 'Browse Marketplace',
      description: 'Browse available apps and plugins in the marketplace',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by app category' },
        { name: 'searchTerm', type: 'string', required: false, description: 'Search term for app names' },
        { name: 'sortBy', type: 'string', required: false, description: 'Sort by (popularity, rating, name, date)' },
        { name: 'featured', type: 'boolean', required: false, description: 'Show only featured apps' },
        { name: 'limit', type: 'number', required: false, description: 'Number of results to return' }
      ],
      requiresOrganization: false,
      metadata: {
        tags: ['marketplace', 'browse', 'search'],
        examples: [
          {
            params: {},
            description: 'Get all available marketplace apps'
          },
          {
            params: { category: 'Productivity', limit: 10 },
            description: 'Find productivity-related apps'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { category, searchTerm, sortBy = 'popularity', featured = false, limit = 20 } = params;

      try {
        const result = await callCloudFunction('fetchAppDefinitions', {
          category: category as string,
          search: searchTerm as string
        });

        // Handle API response - extract data if it's wrapped
        let apps: any[] = [];
        if (Array.isArray(result)) {
          apps = result;
        } else if (result && typeof result === 'object' && 'data' in result) {
          apps = Array.isArray(result.data) ? result.data : [];
        } else if (result && typeof result === 'object') {
          apps = [result];
        }

        if (featured) {
          apps = apps.filter((app: any) => app.isFeatured);
        }

        // Apply sorting
        switch (sortBy) {
          case 'popularity':
            apps.sort((a: any, b: any) => (b.installCount || 0) - (a.installCount || 0));
            break;
          case 'rating':
            apps.sort((a: any, b: any) => (b.overallRating || 0) - (a.overallRating || 0));
            break;
          case 'name':
            apps.sort((a: any, b: any) => a.name.localeCompare(b.name));
            break;
          case 'date':
            apps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
        }

        // Apply limit
        if (limit && typeof limit === 'number' && limit > 0) {
          apps = apps.slice(0, limit);
        }

        return { apps };
      } catch (error) {
        throw new Error(`Failed to browse marketplace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

export function getMarketplaceCategoriesAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getMarketplaceCategories',
      name: 'Get Marketplace Categories',
      description: 'Get all available marketplace categories',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [],
      requiresOrganization: false,
      metadata: {
        tags: ['marketplace', 'categories'],
        examples: [
          {
            params: {},
            description: 'Retrieve all available app categories'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const categories = [
        'Productivity',
        'Analytics',
        'Communication',
        'CRM',
        'E-commerce',
        'Finance',
        'Marketing',
        'Project Management',
        'Security',
        'Development Tools',
        'Integrations',
        'Utilities',
        'Other'
      ];

      return { categories };
    }
  };
}

export function getAppDetailsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getAppDetails',
      name: 'Get App Details',
      description: 'Get detailed information about a marketplace app',
      category: 'data',
      permissions: ['marketplace:read'],
      parameters: [
        { name: 'appId', type: 'string', required: true, description: 'Marketplace app ID' }
      ],
      requiresOrganization: true,
      metadata: {
        tags: ['marketplace', 'app-details'],
        examples: [
          {
            params: { appId: 'app123' },
            description: 'Retrieve detailed information about a specific app'
          }
        ]
      }
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      const { appId } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      try {
        // Get app definition
        const appDefinitionsResult = await callCloudFunction('fetchAppDefinitions', {});
        let appDefinitions: any[] = [];
        
        if (Array.isArray(appDefinitionsResult)) {
          appDefinitions = appDefinitionsResult;
        } else if (appDefinitionsResult && typeof appDefinitionsResult === 'object' && 'data' in appDefinitionsResult) {
          appDefinitions = Array.isArray(appDefinitionsResult.data) ? appDefinitionsResult.data : [];
        }
        
        const app = appDefinitions.find((a: any) => a.id === appId);
        
        if (!app) {
          throw new Error('App not found in marketplace');
        }

        // Get app versions
        const versionsResult = await callCloudFunction('fetchAppVersionsForDefinition', {
          appDefinitionId: appId as string
        });
        
        let versions: any[] = [];
        if (Array.isArray(versionsResult)) {
          versions = versionsResult;
        } else if (versionsResult && typeof versionsResult === 'object' && 'data' in versionsResult) {
          versions = Array.isArray(versionsResult.data) ? versionsResult.data : [];
        }

        // Check if app is installed for current organization
        let isInstalled = false;
        let installationData = null;
        
        if (orgId) {
          try {
            const installationsResult = await callCloudFunction('fetchOrgAppInstallations', {
              organizationId: orgId
            });
            
            let installations: any[] = [];
            if (Array.isArray(installationsResult)) {
              installations = installationsResult;
            } else if (installationsResult && typeof installationsResult === 'object' && 'data' in installationsResult) {
              installations = Array.isArray(installationsResult.data) ? installationsResult.data : [];
            }
            
            const installation = installations.find((inst: any) =>
              inst.appDefinition && inst.appDefinition.id === appId
            );
            isInstalled = !!installation;
            installationData = installation || null;
          } catch (error) {
            console.warn('Could not check installation status:', error);
          }
        }

        return {
          app: {
            ...app,
            isInstalled,
            installationData,
            versions
          }
        };
      } catch (error) {
        throw new Error(`Failed to get app details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}