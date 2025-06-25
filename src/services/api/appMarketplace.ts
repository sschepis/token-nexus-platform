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
  [key: string]: unknown; // Add index signature for compatibility with Record<string, unknown>
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
