import { callCloudFunction, callCloudFunctionForArray } from '@/utils/apiUtils';
import {
  AppDefinitionForMarketplace,
  AppVersionForMarketplace,
  OrgAppInstallation,
  InstallAppParams,
  UninstallAppParams,
  UpdateAppSettingsParams,
} from "@/types/app-marketplace";

/**
 * Refactored App Marketplace API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface AppMarketplaceFilters {
  category?: string;
  search?: string;
}

export interface OrgAppInstallationFilters {
  organizationId?: string;
}

export const appMarketplaceApi = {
  /**
   * Fetches all app definitions from the marketplace.
   */
  async fetchAppDefinitions(params: AppMarketplaceFilters = {}) {
    return callCloudFunctionForArray<AppDefinitionForMarketplace>(
      "fetchAppDefinitions",
      params as Record<string, unknown>,
      {
        errorMessage: "Failed to fetch app definitions"
      }
    );
  },

  /**
   * Fetches all versions for a given app definition.
   */
  async fetchAppVersionsForDefinition(appDefinitionId: string) {
    return callCloudFunctionForArray<AppVersionForMarketplace>(
      "fetchAppVersionsForDefinition",
      { appDefinitionId },
      {
        errorMessage: "Failed to fetch app versions for definition"
      }
    );
  },

  /**
   * Fetches all installed apps for the current organization.
   */
  async fetchOrgAppInstallations(params: OrgAppInstallationFilters = {}) {
    return callCloudFunctionForArray<OrgAppInstallation>(
      "fetchOrgAppInstallations",
      params as Record<string, unknown>,
      {
        errorMessage: "Failed to fetch organization app installations"
      }
    );
  },

  /**
   * Installs an app for the current organization.
   */
  async installApp(params: InstallAppParams) {
    return callCloudFunction<OrgAppInstallation>(
      "installApp",
      {
        appDefinitionId: params.appDefinitionId,
        versionId: params.versionId,
        appSpecificConfig: params.appSpecificConfig
      } as Record<string, unknown>,
      {
        errorMessage: "Failed to install app"
      }
    );
  },

  /**
   * Uninstalls an app from the current organization.
   */
  async uninstallApp(params: UninstallAppParams) {
    return callCloudFunction<void>(
      "uninstallApp",
      {
        appDefinitionId: params.appDefinitionId,
        orgAppInstallationId: params.orgAppInstallationId
      } as Record<string, unknown>,
      {
        errorMessage: "Failed to uninstall app"
      }
    );
  },

  /**
   * Updates settings for an installed app.
   */
  async updateAppSettings(params: UpdateAppSettingsParams) {
    return callCloudFunction<OrgAppInstallation>(
      "updateAppSettings",
      {
        appDefinitionId: params.appDefinitionId,
        orgAppInstallationId: params.orgAppInstallationId,
        settings: params.settings
      } as Record<string, unknown>,
      {
        errorMessage: "Failed to update app settings"
      }
    );
  },

  /**
   * Fetches details for a specific app installation.
   */
  async getAppInstallationDetails(appInstallationId: string) {
    return callCloudFunction<OrgAppInstallation>(
      "getAppInstallationDetails",
      { appInstallationId },
      {
        errorMessage: "Failed to fetch app installation details"
      }
    );
  },
};

// Mock implementation for development
if (process.env.NODE_ENV === 'development') {
  const mockAppDefinitions: AppDefinitionForMarketplace[] = [
    {
      id: 'app1',
      objectId: 'app1',
      name: 'Analytics Dashboard',
      description: 'Advanced analytics and reporting dashboard',
      category: 'analytics',
      publisherName: 'DataCorp',
      iconUrl: '/icons/analytics.png',
      overallRating: 4.5,
      reviewCount: 120,
      isFeatured: true,
      status: 'published'
    },
    {
      id: 'app2',
      objectId: 'app2',
      name: 'CRM Integration',
      description: 'Seamless CRM integration for customer management',
      category: 'productivity',
      publisherName: 'SalesTech',
      iconUrl: '/icons/crm.png',
      overallRating: 4.2,
      reviewCount: 85,
      isFeatured: false,
      status: 'published'
    }
  ];

  const mockAppVersions: AppVersionForMarketplace[] = [
    {
      id: 'version1',
      objectId: 'version1',
      versionString: '1.2.0',
      status: 'published',
      releaseNotes: 'Bug fixes and performance improvements',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appDefinition: { objectId: 'app1', __type: 'Pointer', className: 'AppDefinition' }
    }
  ];

  const mockOrgAppInstallations: OrgAppInstallation[] = [
    {
      objectId: 'install1',
      organization: { objectId: 'org1', __type: 'Pointer', className: 'Organization' },
      appDefinition: mockAppDefinitions[0],
      installedVersion: mockAppVersions[0],
      installationDate: new Date().toISOString(),
      status: 'active',
      appSpecificConfig: {},
      installedBy: { objectId: 'user1', __type: 'Pointer', className: '_User' }
    }
  ];

  // Override with mock implementations
  Object.assign(appMarketplaceApi, {
    async fetchAppDefinitions() {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, data: mockAppDefinitions, error: null };
    },

    async fetchAppVersionsForDefinition() {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, data: mockAppVersions, error: null };
    },

    async fetchOrgAppInstallations() {
      await new Promise(resolve => setTimeout(resolve, 400));
      return { success: true, data: mockOrgAppInstallations, error: null };
    },

    async installApp() {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        data: {
          ...mockOrgAppInstallations[0],
          objectId: 'new_install_' + Date.now(),
          installationDate: new Date().toISOString()
        },
        error: null
      };
    },

    async uninstallApp() {
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, data: undefined, error: null };
    },

    async updateAppSettings() {
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        success: true,
        data: {
          ...mockOrgAppInstallations[0],
          installationDate: new Date().toISOString()
        },
        error: null
      };
    },

    async getAppInstallationDetails() {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, data: mockOrgAppInstallations[0], error: null };
    }
  });
}