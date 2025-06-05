import Parse from 'parse';
import {
  AppDefinitionForMarketplace,
  AppVersionForMarketplace,
  OrgAppInstallation,
  InstallAppParams,
  UninstallAppParams,
  UpdateAppSettingsParams,
} from "@/types/app-marketplace";

/**
 * @typedef {object} AppMarketplaceApi
 * @property {function(object): Promise<AppDefinitionForMarketplace[]>} fetchAppDefinitions - Fetches all app definitions from the marketplace.
 * @property {function(string): Promise<AppVersionForMarketplace[]>} fetchAppVersionsForDefinition - Fetches all versions for a given app definition.
 * @property {function(object): Promise<OrgAppInstallation[]>} fetchOrgAppInstallations - Fetches all installed apps for the current organization.
 * @property {function(InstallAppParams): Promise<OrgAppInstallation>} installApp - Installs an app for the current organization.
 * @property {function(UninstallAppParams): Promise<void>} uninstallApp - Uninstalls an app from the current organization.
 * @property {function(UpdateAppSettingsParams): Promise<OrgAppInstallation>} updateAppSettings - Updates settings for an installed app.
 * @property {function(string): Promise<OrgAppInstallation>} getAppInstallationDetails - Fetches details for a specific app installation.
 */

interface AppMarketplaceApi {
  fetchAppDefinitions: (
    params?: { category?: string; search?: string }
  ) => Promise<AppDefinitionForMarketplace[]>;
  fetchAppVersionsForDefinition: (
    appDefinitionId: string
  ) => Promise<AppVersionForMarketplace[]>;
  fetchOrgAppInstallations: (params?: {
    organizationId?: string;
  }) => Promise<OrgAppInstallation[]>;
  installApp: (params: InstallAppParams) => Promise<OrgAppInstallation>;
  uninstallApp: (params: UninstallAppParams) => Promise<void>;
  updateAppSettings: (
    params: UpdateAppSettingsParams
  ) => Promise<OrgAppInstallation>;
  getAppInstallationDetails: (
    appInstallationId: string
  ) => Promise<OrgAppInstallation>;
}

const appMarketplaceApi: AppMarketplaceApi = {
  /**
   * Fetches all app definitions from the marketplace.
   * @param {object} [params] - Optional parameters for filtering.
   * @param {string} [params.category] - Filter by app category.
   * @param {string} [params.search] - Search terms.
   * @returns {Promise<AppDefinitionForMarketplace[]>} A promise that resolves to an array of app definitions.
   * @tsdoc
   */
  fetchAppDefinitions: async (params) => {
    console.debug("[appMarketplaceApi] Fetching app definitions with params:", params);
    try {
      const response = await Parse.Cloud.run(
        "fetchAppDefinitions",
        params || {}
      );
      return response as AppDefinitionForMarketplace[];
    } catch (error) {
      console.error("[appMarketplaceApi] Error fetching app definitions:", error);
      throw error;
    }
  },

  /**
   * Fetches all versions for a given app definition.
   * @param {string} appDefinitionId - The ID of the app definition.
   * @returns {Promise<AppVersionForMarketplace[]>} A promise that resolves to an array of app versions.
   * @tsdoc
   */
  fetchAppVersionsForDefinition: async (appDefinitionId) => {
    console.debug("[appMarketplaceApi] Fetching app versions for definition:", appDefinitionId);
    try {
      const response = await Parse.Cloud.run(
        "fetchAppVersionsForDefinition",
        { appDefinitionId }
      );
      return response as AppVersionForMarketplace[];
    } catch (error) {
      console.error("[appMarketplaceApi] Error fetching app versions for definition:", error);
      throw error;
    }
  },

  /**
   * Fetches all installed apps for the current organization.
   * @param {object} [params] - Optional parameters.
   * @param {string} [params.organizationId] - Filter by organization ID.
   * @returns {Promise<OrgAppInstallation[]>} A promise that resolves to an array of installed app entries.
   * @tsdoc
   */
  fetchOrgAppInstallations: async (params) => {
    console.debug("[appMarketplaceApi] Fetching organization app installations with params:", params);
    try {
      const response = await Parse.Cloud.run(
        "fetchOrgAppInstallations",
        params || {}
      );
      return response as OrgAppInstallation[];
    } catch (error) {
      console.error("[appMarketplaceApi] Error fetching organization app installations:", error);
      throw error;
    }
  },

  /**
   * Installs an app for the current organization.
   * @param {InstallAppParams} params - Parameters for app installation.
   * @returns {Promise<OrgAppInstallation>} A promise that resolves to the newly created app installation record.
   * @tsdoc
   */
  installApp: async (params) => {
    console.debug("[appMarketplaceApi] Installing app with params:", params);
    try {
      const response = await Parse.Cloud.run("installApp", {
        appDefinitionId: params.appDefinitionId,
        versionId: params.versionId,
        appSpecificConfig: params.appSpecificConfig
      });
      return response as OrgAppInstallation;
    } catch (error) {
      console.error("[appMarketplaceApi] Error installing app:", error);
      throw error;
    }
  },

  /**
   * Uninstalls an app from the current organization.
   * @param {UninstallAppParams} params - Parameters for app uninstallation.
   * @returns {Promise<void>} A promise that resolves when the app is uninstalled.
   * @tsdoc
   */
  uninstallApp: async (params) => {
    console.debug("[appMarketplaceApi] Uninstalling app with params:", params);
    try {
      const response = await Parse.Cloud.run("uninstallApp", {
        appDefinitionId: params.appDefinitionId,
        orgAppInstallationId: params.orgAppInstallationId
      });
      return response;
    } catch (error) {
      console.error("[appMarketplaceApi] Error uninstalling app:", error);
      throw error;
    }
  },

  /**
   * Updates settings for an installed app.
   * @param {UpdateAppSettingsParams} params - Parameters for updating app settings.
   * @returns {Promise<OrgAppInstallation>} A promise that resolves to the updated app installation record.
   * @tsdoc
   */
  updateAppSettings: async (params) => {
    console.debug("[appMarketplaceApi] Updating app settings with params:", params);
    try {
      const response = await Parse.Cloud.run("updateAppSettings", {
        appDefinitionId: params.appDefinitionId,
        orgAppInstallationId: params.orgAppInstallationId,
        settings: params.settings
      });
      return response as OrgAppInstallation;
    } catch (error) {
      console.error("[appMarketplaceApi] Error updating app settings:", error);
      throw error;
    }
  },

  /**
   * Fetches details for a specific app installation.
   * @param {string} appInstallationId - The ID of the app installation record.
   * @returns {Promise<OrgAppInstallation>} A promise that resolves to the app installation record.
   * @tsdoc
   */
  getAppInstallationDetails: async (appInstallationId) => {
    console.debug("[appMarketplaceApi] Fetching app installation details for ID:", appInstallationId);
    try {
      const response = await Parse.Cloud.run(
        "getAppInstallationDetails",
        { appInstallationId }
      );
      return response as OrgAppInstallation;
    } catch (error) {
      console.error("[appMarketplaceApi] Error fetching app installation details:", error);
      throw error;
    }
  },
};

export { appMarketplaceApi };
export type { AppMarketplaceApi };