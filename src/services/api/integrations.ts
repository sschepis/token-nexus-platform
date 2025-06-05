/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse
import { App } from '@/types/app-marketplace';
import { webhooksApi, mockWebhooksApis } from './webhooks';
import { oauthAppsApi, mockOauthAppsApis } from './oauthApps';
import { apiKeysApi, mockApiKeysApis } from './apiKeys';

/**
 * @file General Integrations API services.
 * Handles core operations related to platform integrations, App Marketplace apps,
 * and merges with Webhooks, OAuth Apps, and API Keys services.
 */
const integrationsApi = {
  /**
   * Fetches a list of integrations.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.type] - Filter integrations by type.
   * @param {boolean} [params.activeOnly] - If true, only return active integrations.
   * @param {number} [params.limit] - Maximum number of integrations to return.
   * @param {number} [params.skip] - Number of integrations to skip for pagination.
   * @returns {Promise<{ data: { integrations: any[]; pagination: any } }>} A promise that resolves with an object containing the list of integrations and pagination info.
   * @throws {Error} Throws an error if fetching integrations fails.
   */
  getIntegrations: async (params?: {
    type?: string;
    activeOnly?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<{ data: { integrations: any[]; pagination: any } }> => {
    try {
      const result = await Parse.Cloud.run('getIntegrations', params || {});
      
      return {
        data: {
          integrations: result.integrations || [],
          pagination: result.pagination || {}
        }
      };
    } catch (error: any) {
      console.debug('[Integrations API] Error calling getIntegrations cloud function:', error);
      throw new Error(error.message || 'Failed to fetch integrations');
    }
  },

  /**
   * Creates a new integration.
   * @param {object} params - Parameters for the new integration.
   * @param {string} params.name - The name of the integration.
   * @param {string} params.type - The type of integration (e.g., 'payment_gateway', 'communication').
   * @param {string} [params.description] - A description for the integration.
   * @param {any} [params.config] - Configuration object for the integration.
   * @param {any} [params.metadata] - Additional metadata for the integration.
   * @returns {Promise<{ data: { integration: any } }>} A promise that resolves with an object containing the newly created integration.
   * @throws {Error} Throws an error if integration creation fails.
   */
  createIntegration: async (params: {
    name: string;
    type: string;
    description?: string;
    config?: any;
    metadata?: any;
  }): Promise<{ data: { integration: any } }> => {
    try {
      const result = await Parse.Cloud.run('createIntegration', params);
      
      return {
        data: {
          integration: result.integration
        }
      };
    } catch (error: any) {
      console.debug('[Integrations API] Error calling createIntegration cloud function:', error);
      throw new Error(error.message || 'Failed to create integration');
    }
  },

  /**
   * Updates an existing integration.
   * @param {string} integrationId - The ID of the integration to update.
   * @param {object} params - Parameters to update for the integration.
   * @param {string} [params.name] - New name for the integration.
   * @param {string} [params.description] - New description for the integration.
   * @param {any} [params.config] - New configuration object for the integration.
   * @param {any} [params.metadata] - New metadata for the integration.
   * @param {boolean} [params.active] - New active status for the integration.
   * @returns {Promise<{ data: { integration: any } }>} A promise that resolves with an object containing the updated integration.
   * @throws {Error} Throws an error if updating the integration fails.
   */
  updateIntegration: async (integrationId: string, params: {
    name?: string;
    description?: string;
    config?: any;
    metadata?: any;
    active?: boolean;
  }): Promise<{ data: { integration: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateIntegration', { integrationId, ...params });
      
      return {
        data: {
          integration: result.integration
        }
      };
    } catch (error: any) {
      console.debug('[Integrations API] Error calling updateIntegration cloud function:', error);
      throw new Error(error.message || 'Failed to update integration');
    }
  },

  /**
   * Retrieves statistics for integrations.
   * @returns {Promise<{ data: { statistics: any } }>} A promise that resolves with an object containing integration statistics.
   * @throws {Error} Throws an error if fetching integration statistics fails.
   */
  getIntegrationStatistics: async (): Promise<{ data: { statistics: any } }> => {
    try {
      const result = await Parse.Cloud.run('getIntegrationStatistics');
      
      return {
        data: {
          statistics: result.statistics
        }
      };
    } catch (error: any) {
      console.debug('[Integrations API] Error calling getIntegrationStatistics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch integration statistics');
    }
  },

  /**
   * Fetches a list of applications from the App Marketplace.
   * @returns {Promise<{ data: { apps: App[] } }>} A promise that resolves with a list of applications.
   */
  getApps: async (): Promise<{ data: { apps: App[] } }> => {
    return mockResponse({
      apps: [
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
        } as App,
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
        } as App,
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
        } as App,
      ],
    });
  },

  /**
   * Installs an application from the App Marketplace.
   * @param {object} params - Parameters for installing the application.
   * @param {string} params.appId - The ID of the application to install.
   * @param {string[]} params.permissions - An array of permissions to grant the app.
   * @returns {Promise<{ success: boolean; message: string }>} A promise that resolves with a success status and message.
   */
  installApp: async ({ appId, permissions }: { appId: string; permissions: string[] }) => {
    return mockResponse({ success: true, message: `App ${appId} installed with permissions: ${permissions.join(', ')}` });
  },

  /**
   * Retrieves settings for a specific App Marketplace application.
   * @param {object} params - Parameters for retrieving app settings.
   * @param {string} params.appId - The ID of the application to get settings for.
   * @returns {Promise<{ settings: any }>} A promise that resolves with the application's settings.
   */
  getAppSettings: async ({ appId }: { appId: string }) => {
    const response = await integrationsApi.getApps(); // Use integrationsApi for internal calls
    const mockApps = response.data.apps;
    const app = mockApps.find((a: App) => a.id === appId);
    return mockResponse({ settings: app ? app.settings : {} });
  },

  /**
   * Updates settings for a specific App Marketplace application.
   * @param {object} params - Parameters for updating app settings.
   * @param {string} params.appId - The ID of the application to update settings for.
   * @param {any} params.settings - The new settings object for the application.
   * @returns {Promise<{ success: boolean; message: string; settings: any }>} A promise that resolves with a success status, message, and updated settings.
   */
  updateAppSettings: async ({ appId, settings }: { appId: string; settings: any }) => {
    return mockResponse({ success: true, message: `Settings for App ${appId} updated successfully.`, settings });
  },
};

const mockIntegrationsApis = {
  getIntegrations: () => {
    return mockResponse({
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
    });
  },

  createIntegration: (params: any) => {
    const newIntegration = {
      id: `int-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      active: true,
      ...params,
    };
    return mockResponse({ integration: newIntegration });
  },

  updateIntegration: (integrationId: string, params: any) => {
    return mockResponse({ integration: { id: integrationId, ...params } });
  },

  getIntegrationStatistics: () => {
    return mockResponse({ statistics: { active: 1, inactive: 1, total: 2 } });
  },

  getApps: () => {
    return mockResponse({
      apps: [
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
        } as App,
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
        } as App,
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
        } as App,
      ],
    });
  },

  installApp: ({ appId, permissions }: { appId: string; permissions: string[] }) => {
    return mockResponse({ success: true, message: `App ${appId} installed with permissions: ${permissions.join(', ')}` });
  },

  getAppSettings: async ({ appId }: { appId: string }) => {
    const response = await mockIntegrationsApis.getApps();
    const mockApps = response.data.apps;
    const app = mockApps.find((a: App) => a.id === appId);
    return mockResponse({ settings: app ? app.settings : {} });
  },

  updateAppSettings: ({ appId, settings }: { appId: string; settings: any }) => {
    return mockResponse({ success: true, message: `Settings for App ${appId} updated successfully.`, settings });
  },
};

// Merge all Integration-related APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ?
  { ...mockIntegrationsApis, ...mockWebhooksApis, ...mockOauthAppsApis, ...mockApiKeysApis } :
  { ...integrationsApi, ...webhooksApi, ...oauthAppsApi, ...apiKeysApi }
);