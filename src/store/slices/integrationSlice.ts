import { createCRUDSlice, createApiServiceAdapter } from '../utils/createCRUDSlice';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { webhooksApi } from '../../services/api/webhooks';
import { oauthAppsApi } from '../../services/api/oauthApps';
import { apiKeysApi } from '../../services/api/apiKeys';

/**
 * Refactored Integration Slice using createCRUDSlice utility
 * This eliminates massive duplication across integrations, webhooks, OAuth apps, and API keys
 */

export interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  status: string;
  config: any;
  metadata: any;
  lastSync?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  method: string;
  headers: any;
  isActive: boolean;
  status: string;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface OAuthApp {
  id: string;
  name: string;
  description: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  applicationType: string;
  isActive: boolean;
  tokenCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  keyPrefix: string;
  key?: string;
  scopes: string[];
  isActive: boolean;
  expiresAt?: string;
  restrictions: any;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

// Create parameter interfaces
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
  isActive?: boolean;
}

export interface CreateWebhookParams {
  name: string;
  url: string;
  events: string[];
  method?: string;
  headers?: any;
  secret?: string;
}

export interface UpdateWebhookParams {
  name?: string;
  url?: string;
  events?: string[];
  method?: string;
  headers?: any;
  isActive?: boolean;
}

export interface CreateOAuthAppParams {
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  applicationType?: string;
}

export interface UpdateOAuthAppParams {
  name?: string;
  description?: string;
  redirectUris?: string[];
  scopes?: string[];
  isActive?: boolean;
}

export interface CreateApiKeyParams {
  name: string;
  description?: string;
  scopes: string[];
  expiresAt?: string;
  restrictions?: any;
}

export interface UpdateApiKeyParams {
  name?: string;
  description?: string;
  scopes?: string[];
  isActive?: boolean;
  restrictions?: any;
}

// Create API service adapters with proper typing
const integrationApiAdapter = createApiServiceAdapter<Integration, CreateIntegrationParams, UpdateIntegrationParams>(apiService, {
  getAllMethod: 'getIntegrations',
  getByIdMethod: 'getIntegrationDetails',
  createMethod: 'createIntegration',
  updateMethod: 'updateIntegration',
  deleteMethod: 'deleteIntegration'
});

const webhookApiAdapter = createApiServiceAdapter<Webhook, CreateWebhookParams, UpdateWebhookParams>(webhooksApi, {
  getAllMethod: 'getWebhooks',
  getByIdMethod: 'getWebhookDetails',
  createMethod: 'createWebhook',
  updateMethod: 'updateWebhook',
  deleteMethod: 'deleteWebhook'
});

const oauthApiAdapter = createApiServiceAdapter<OAuthApp, CreateOAuthAppParams, UpdateOAuthAppParams>(oauthAppsApi, {
  getAllMethod: 'getOAuthApps',
  getByIdMethod: 'getOAuthAppDetails',
  createMethod: 'createOAuthApp',
  updateMethod: 'updateOAuthApp',
  deleteMethod: 'deleteOAuthApp'
});

const apiKeyApiAdapter = createApiServiceAdapter<ApiKey, CreateApiKeyParams, UpdateApiKeyParams>(apiKeysApi, {
  getAllMethod: 'getApiKeys',
  getByIdMethod: 'getApiKeyDetails',
  createMethod: 'createApiKey',
  updateMethod: 'updateApiKey',
  deleteMethod: 'deleteApiKey'
});

// Create CRUD slices for each entity
const integrationCRUD = createCRUDSlice<Integration, CreateIntegrationParams, UpdateIntegrationParams>({
  name: 'integration',
  apiService: integrationApiAdapter,
  initialState: {
    integrationStatistics: null,
  },
  responseMapping: {
    items: 'integrations',
    item: 'integration',
  },
  errorMessages: {
    fetch: 'Failed to fetch integrations',
    create: 'Failed to create integration',
    update: 'Failed to update integration',
    delete: 'Failed to delete integration',
    getById: 'Failed to fetch integration details',
  },
});

const webhookCRUD = createCRUDSlice<Webhook, CreateWebhookParams, UpdateWebhookParams>({
  name: 'webhook',
  apiService: webhookApiAdapter,
  responseMapping: {
    items: 'webhooks',
    item: 'webhook',
  },
  errorMessages: {
    fetch: 'Failed to fetch webhooks',
    create: 'Failed to create webhook',
    update: 'Failed to update webhook',
    delete: 'Failed to delete webhook',
    getById: 'Failed to fetch webhook details',
  },
});

const oauthCRUD = createCRUDSlice<OAuthApp, CreateOAuthAppParams, UpdateOAuthAppParams>({
  name: 'oauthApp',
  apiService: oauthApiAdapter,
  responseMapping: {
    items: 'oauthApps',
    item: 'oauthApp',
  },
  errorMessages: {
    fetch: 'Failed to fetch OAuth apps',
    create: 'Failed to create OAuth app',
    update: 'Failed to update OAuth app',
    delete: 'Failed to delete OAuth app',
    getById: 'Failed to fetch OAuth app details',
  },
});

const apiKeyCRUD = createCRUDSlice<ApiKey, CreateApiKeyParams, UpdateApiKeyParams>({
  name: 'apiKey',
  apiService: apiKeyApiAdapter,
  initialState: {
    apiKeyUsage: null,
  },
  responseMapping: {
    items: 'apiKeys',
    item: 'apiKey',
  },
  errorMessages: {
    fetch: 'Failed to fetch API keys',
    create: 'Failed to create API key',
    update: 'Failed to update API key',
    delete: 'Failed to delete API key',
    getById: 'Failed to fetch API key details',
  },
});

// Additional async thunks for special operations
export const fetchIntegrationStatistics = createAsyncThunk(
  'integration/fetchIntegrationStatistics',
  async () => {
    const response = await apiService.getIntegrationStatistics();
    return response.data;
  }
);

export const testWebhook = createAsyncThunk(
  'integration/testWebhook',
  async (webhookId: string) => {
    const response = await webhooksApi.testWebhook(webhookId);
    return response.data;
  }
);

export const fetchApiKeyUsage = createAsyncThunk(
  'integration/fetchApiKeyUsage',
  async (apiKeyId: string) => {
    const response = await apiKeysApi.getApiKeyUsage(apiKeyId);
    return response.data;
  }
);

export const regenerateOAuthSecret = createAsyncThunk(
  'integration/regenerateOAuthSecret',
  async (oauthAppId: string) => {
    const response = await oauthAppsApi.regenerateOAuthSecret(oauthAppId);
    return response.data;
  }
);

// Create a combined slice for the integration module
const integrationSlice = createSlice({
  name: 'integrationModule',
  initialState: {
    // Integration state
    integrations: integrationCRUD.slice.getInitialState(),
    // Webhook state
    webhooks: webhookCRUD.slice.getInitialState(),
    // OAuth app state
    oauthApps: oauthCRUD.slice.getInitialState(),
    // API key state
    apiKeys: apiKeyCRUD.slice.getInitialState(),
    // Shared state
    isTesting: false,
  },
  reducers: {
    clearAllErrors: (state) => {
      state.integrations.error = null;
      state.webhooks.error = null;
      state.oauthApps.error = null;
      state.apiKeys.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Integration statistics
      .addCase(fetchIntegrationStatistics.fulfilled, (state, action) => {
        state.integrations.integrationStatistics = action.payload;
      })
      // Webhook testing
      .addCase(testWebhook.pending, (state) => {
        state.isTesting = true;
      })
      .addCase(testWebhook.fulfilled, (state) => {
        state.isTesting = false;
      })
      .addCase(testWebhook.rejected, (state) => {
        state.isTesting = false;
      })
      // API key usage
      .addCase(fetchApiKeyUsage.fulfilled, (state, action) => {
        state.apiKeys.apiKeyUsage = action.payload;
      });
  },
});

// Export actions with backward-compatible names
export const {
  // Integration actions
  fetchItems: fetchIntegrations,
  createItem: createIntegration,
  updateItem: updateIntegration,
  deleteItem: deleteIntegration,
  fetchItemById: fetchIntegrationDetails,
} = integrationCRUD.actions;

export const {
  // Webhook actions
  fetchItems: fetchWebhooks,
  createItem: createWebhook,
  updateItem: updateWebhook,
  deleteItem: deleteWebhook,
  fetchItemById: fetchWebhookDetails,
} = webhookCRUD.actions;

export const {
  // OAuth app actions
  fetchItems: fetchOAuthApps,
  createItem: createOAuthApp,
  updateItem: updateOAuthApp,
  deleteItem: deleteOAuthApp,
  fetchItemById: fetchOAuthAppDetails,
} = oauthCRUD.actions;

export const {
  // API key actions
  fetchItems: fetchApiKeys,
  createItem: createApiKey,
  updateItem: updateApiKey,
  deleteItem: deleteApiKey,
  fetchItemById: fetchApiKeyDetails,
} = apiKeyCRUD.actions;

// Export additional actions
export const { clearAllErrors } = integrationSlice.actions;

// Export selectors with backward-compatible names
export const integrationSelectors = {
  // Integration selectors
  selectIntegrations: integrationCRUD.selectors.selectItems,
  selectSelectedIntegration: integrationCRUD.selectors.selectSelectedItem,
  selectIsLoadingIntegrations: integrationCRUD.selectors.selectIsLoading,
  selectIsCreatingIntegration: integrationCRUD.selectors.selectIsCreating,
  selectIsUpdatingIntegration: integrationCRUD.selectors.selectIsUpdating,
  selectIsDeletingIntegration: integrationCRUD.selectors.selectIsDeleting,
  selectIntegrationError: integrationCRUD.selectors.selectError,
  
  // Webhook selectors
  selectWebhooks: webhookCRUD.selectors.selectItems,
  selectSelectedWebhook: webhookCRUD.selectors.selectSelectedItem,
  selectIsLoadingWebhooks: webhookCRUD.selectors.selectIsLoading,
  selectIsCreatingWebhook: webhookCRUD.selectors.selectIsCreating,
  selectIsUpdatingWebhook: webhookCRUD.selectors.selectIsUpdating,
  selectIsDeletingWebhook: webhookCRUD.selectors.selectIsDeleting,
  selectWebhookError: webhookCRUD.selectors.selectError,
  
  // OAuth app selectors
  selectOAuthApps: oauthCRUD.selectors.selectItems,
  selectSelectedOAuthApp: oauthCRUD.selectors.selectSelectedItem,
  selectIsLoadingOAuthApps: oauthCRUD.selectors.selectIsLoading,
  selectIsCreatingOAuthApp: oauthCRUD.selectors.selectIsCreating,
  selectIsUpdatingOAuthApp: oauthCRUD.selectors.selectIsUpdating,
  selectIsDeletingOAuthApp: oauthCRUD.selectors.selectIsDeleting,
  selectOAuthError: oauthCRUD.selectors.selectError,
  
  // API key selectors
  selectApiKeys: apiKeyCRUD.selectors.selectItems,
  selectSelectedApiKey: apiKeyCRUD.selectors.selectSelectedItem,
  selectIsLoadingApiKeys: apiKeyCRUD.selectors.selectIsLoading,
  selectIsCreatingApiKey: apiKeyCRUD.selectors.selectIsCreating,
  selectIsUpdatingApiKey: apiKeyCRUD.selectors.selectIsUpdating,
  selectIsDeletingApiKey: apiKeyCRUD.selectors.selectIsDeleting,
  selectApiKeyError: apiKeyCRUD.selectors.selectError,
  
  // Shared selectors
  selectIsTesting: (state: any) => state.integrationModule.isTesting,
};

export default integrationSlice.reducer;