import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { App } from '@/types/app-marketplace';

/**
 * Refactored integrations API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface IntegrationFilters {
  type?: string;
  activeOnly?: boolean;
  limit?: number;
  skip?: number;
}

export interface CreateIntegrationParams {
  name: string;
  type: string;
  description?: string;
  config?: any;
  metadata?: any;
}

export interface UpdateIntegrationParams {
  name?: string;
  description?: string;
  config?: any;
  metadata?: any;
  active?: boolean;
}

export interface InstallAppParams {
  appId: string;
  permissions: string[];
}

export interface AppSettingsParams {
  appId: string;
  settings?: any;
}

export const integrationsApi = {
  /**
   * Fetches a list of integrations
   */
  async getIntegrations(params: IntegrationFilters = {}) {
    return callCloudFunction('getIntegrations', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch integrations'
    });
  },

  /**
   * Creates a new integration
   */
  async createIntegration(params: CreateIntegrationParams) {
    return callCloudFunction('createIntegration', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create integration'
    });
  },

  /**
   * Updates an existing integration
   */
  async updateIntegration(integrationId: string, params: UpdateIntegrationParams) {
    return callCloudFunction('updateIntegration', { integrationId, ...params }, {
      errorMessage: 'Failed to update integration'
    });
  },

  /**
   * Retrieves statistics for integrations
   */
  async getIntegrationStatistics() {
    return callCloudFunction('getIntegrationStatistics', {}, {
      errorMessage: 'Failed to fetch integration statistics'
    });
  },

  /**
   * Fetches a list of applications from the App Marketplace
   */
  async getApps(): Promise<any> { // Change return type to any for now to resolve TS error
    // This should now call a cloud function to fetch apps from the marketplace
    return callCloudFunction('getAppList', {}, {
      errorMessage: 'Failed to fetch apps'
    });
  },

  /**
   * Installs an application from the App Marketplace
   */
  async installApp(params: InstallAppParams) {
    return callCloudFunction('installApp', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to install app'
    });
  },

  /**
   * Retrieves settings for a specific App Marketplace application
   */
  async getAppSettings(params: { appId: string }) {
    return callCloudFunction('getAppSettings', params, {
      errorMessage: 'Failed to fetch app settings'
    });
  },

  /**
   * Updates settings for a specific App Marketplace application
   */
  async updateAppSettings(params: AppSettingsParams) {
    return callCloudFunction('updateAppSettings', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to update app settings'
    });
  },

  /**
   * Batch update multiple integrations
   */
  async batchUpdateIntegrations(updates: Array<{ integrationId: string; params: UpdateIntegrationParams }>) {
    const operations = updates.map(({ integrationId, params }) => 
      () => this.updateIntegration(integrationId, params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch install multiple apps
   */
  async batchInstallApps(installations: InstallAppParams[]) {
    const operations = installations.map(params => 
      () => this.installApp(params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getIntegrations,
  createIntegration,
  updateIntegration,
  getIntegrationStatistics,
  getApps,
  installApp,
  getAppSettings,
  updateAppSettings,
  batchUpdateIntegrations,
  batchInstallApps
} = integrationsApi;

// Default export
export default integrationsApi;