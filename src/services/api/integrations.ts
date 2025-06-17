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
  async getApps(): Promise<{ success: boolean; data: { apps: App[] } }> {
    // This is currently using mock data, but could be converted to cloud function call
    const mockApps: App[] = [
      {
        id: 'app-1',
        name: 'Expense Tracker',
        description: 'Track and manage company expenses with customizable categories and approval workflows',
        category: 'finance',
        icon: 'https://cdn-icons-png.flaticon.com/512/2285/2285551.png',
        publisher: 'Finance Solutions Inc.',
        version: '1.2.0',
        pricing: 'freemium',
        status: 'not_installed',
        permissions: ['finance:read', 'finance:write', 'notification:send'],
        settings: {
          auto_categorize: true,
          approval_threshold: 500,
          notification_preference: 'email'
        }
      },
      {
        id: 'app-2',
        name: 'Document Vault',
        description: 'Securely store and share sensitive documents with role-based access control',
        category: 'security',
        icon: 'https://cdn-icons-png.flaticon.com/512/1643/1643264.png',
        publisher: 'SecureVault Ltd',
        version: '2.3.1',
        pricing: 'paid',
        status: 'not_installed',
        permissions: ['documents:read', 'documents:write', 'encryption:manage'],
        settings: {}
      },
      {
        id: 'app-3',
        name: 'Team Chat',
        description: 'Real-time messaging and collaboration platform for teams',
        category: 'communication',
        icon: 'https://cdn-icons-png.flaticon.com/512/944/944111.png',
        publisher: 'Chat Masters',
        version: '1.1.0',
        pricing: 'free',
        status: 'installed',
        permissions: ['chat:send', 'chat:read', 'users:view'],
        settings: {
          default_channel: '#general'
        }
      },
    ];

    return {
      success: true,
      data: { apps: mockApps }
    };
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
    const response = await this.getApps();
    const app = response.data.apps.find((a: App) => a.id === params.appId);
    return {
      success: true,
      data: { settings: app ? app.settings : {} }
    };
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

// Mock data for development/testing
const mockIntegrationsApis = {
  getIntegrations: (params?: IntegrationFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        integrations: [
          {
            id: 'int-1',
            name: 'Stripe Integration',
            type: 'payment_gateway',
            description: 'Connects to Stripe for payment processing.',
            active: true,
            config: {},
            createdAt: new Date().toISOString(),
          },
          {
            id: 'int-2',
            name: 'Slack Notifications',
            type: 'communication',
            description: 'Sends notifications to Slack channels.',
            active: false,
            config: {},
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        pagination: {
          total: 2,
          limit: 10,
          skip: 0,
        },
      }
    });
  },

  createIntegration: (params: CreateIntegrationParams) => {
    const newIntegration = {
      id: `int-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      active: true,
      ...params,
    };
    return Promise.resolve({
      success: true,
      data: { integration: newIntegration }
    });
  },

  updateIntegration: (integrationId: string, params: UpdateIntegrationParams) => {
    return Promise.resolve({
      success: true,
      data: { integration: { id: integrationId, ...params } }
    });
  },

  getIntegrationStatistics: () => {
    return Promise.resolve({
      success: true,
      data: { statistics: { active: 1, inactive: 1, total: 2 } }
    });
  },

  getApps: () => {
    return integrationsApi.getApps();
  },

  installApp: (params: InstallAppParams) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `App ${params.appId} installed with permissions: ${params.permissions.join(', ')}` }
    });
  },

  getAppSettings: (params: { appId: string }) => {
    return integrationsApi.getAppSettings(params);
  },

  updateAppSettings: (params: AppSettingsParams) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `Settings for App ${params.appId} updated successfully.`, settings: params.settings }
    });
  },

  batchUpdateIntegrations: (updates: Array<{ integrationId: string; params: UpdateIntegrationParams }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchInstallApps: (installations: InstallAppParams[]) => {
    return Promise.resolve({
      results: installations.map(() => ({ success: true })),
      successCount: installations.length,
      errorCount: 0
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

// Use mock or real API based on environment
const finalIntegrationsApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockIntegrationsApis : integrationsApi;

// Default export
export default finalIntegrationsApi;