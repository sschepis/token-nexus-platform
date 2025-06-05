import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { webhooksApi } from '../../services/api/webhooks';
import { oauthAppsApi } from '../../services/api/oauthApps';
import { apiKeysApi } from '../../services/api/apiKeys';

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
  key?: string; // Add the key property
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

interface IntegrationState {
  // Integrations
  integrations: Integration[];
  isLoadingIntegrations: boolean;
  integrationError: string | null;
  integrationStatistics: any;

  // Webhooks
  webhooks: Webhook[];
  isLoadingWebhooks: boolean;
  webhookError: string | null;

  // OAuth Apps
  oauthApps: OAuthApp[];
  isLoadingOAuthApps: boolean;
  oauthError: string | null;

  // API Keys
  apiKeys: ApiKey[];
  isLoadingApiKeys: boolean;
  apiKeyError: string | null;
  apiKeyUsage: any;


  // General
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isTesting: boolean;
}

const initialState: IntegrationState = {
  // Integrations
  integrations: [],
  isLoadingIntegrations: false,
  integrationError: null,
  integrationStatistics: null,

  // Webhooks
  webhooks: [],
  isLoadingWebhooks: false,
  webhookError: null,

  // OAuth Apps
  oauthApps: [],
  isLoadingOAuthApps: false,
  oauthError: null,

  // API Keys
  apiKeys: [],
  isLoadingApiKeys: false,
  apiKeyError: null,
  apiKeyUsage: null,


  // General
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isTesting: false,
};

// Async thunks for integrations
export const fetchIntegrations = createAsyncThunk(
  'integration/fetchIntegrations',
  async (params?: {
    type?: string;
    activeOnly?: boolean;
    limit?: number;
    skip?: number;
  }) => {
    const response = await apiService.getIntegrations(params);
    return response.data;
  }
);

export const createIntegration = createAsyncThunk(
  'integration/createIntegration',
  async (params: {
    name: string;
    type: string;
    description?: string;
    config?: any;
    metadata?: any;
  }) => {
    const response = await apiService.createIntegration(params);
    return response.data;
  }
);

export const updateIntegration = createAsyncThunk(
  'integration/updateIntegration',
  async (params: {
    integrationId: string;
    name?: string;
    description?: string;
    config?: any;
    metadata?: any;
    isActive?: boolean;
  }) => {
    const { integrationId, ...updateParams } = params;
    const response = await apiService.updateIntegration(integrationId, updateParams);
    return response.data;
  }
);

export const fetchIntegrationStatistics = createAsyncThunk(
  'integration/fetchIntegrationStatistics',
  async () => {
    const response = await apiService.getIntegrationStatistics();
    return response.data;
  }
);

// Async thunks for webhooks
export const fetchWebhooks = createAsyncThunk(
  'integration/fetchWebhooks',
  async (params?: {
    activeOnly?: boolean;
    limit?: number;
    skip?: number;
  }) => {
    const response = await webhooksApi.getWebhooks(params);
    return response.data;
  }
);

export const createWebhook = createAsyncThunk(
  'integration/createWebhook',
  async (params: {
    name: string;
    url: string;
    events: string[];
    method?: string;
    headers?: any;
    secret?: string;
  }) => {
    const response = await webhooksApi.createWebhook(params);
    return response.data;
  }
);

export const updateWebhook = createAsyncThunk(
  'integration/updateWebhook',
  async (params: {
    webhookId: string;
    name?: string;
    url?: string;
    events?: string[];
    method?: string; // Added method
    headers?: any;
    isActive?: boolean;
  }) => {
    const { webhookId, ...updateParams } = params;
    const response = await webhooksApi.updateWebhook(webhookId, updateParams);
    return response.data;
  }
);

export const deleteWebhook = createAsyncThunk(
  'integration/deleteWebhook',
  async (webhookId: string) => {
    const response = await webhooksApi.deleteWebhook(webhookId);
    return { ...response.data, webhookId };
  }
);

export const testWebhook = createAsyncThunk(
  'integration/testWebhook',
  async (webhookId: string) => {
    const response = await webhooksApi.testWebhook(webhookId);
    return response.data;
  }
);

// Async thunks for OAuth apps
export const fetchOAuthApps = createAsyncThunk(
  'integration/fetchOAuthApps',
  async (params?: {
    activeOnly?: boolean;
    limit?: number;
    skip?: number;
  }) => {
    const response = await oauthAppsApi.getOAuthApps(params);
    return response.data;
  }
);

export const createOAuthApp = createAsyncThunk(
  'integration/createOAuthApp',
  async (params: {
    name: string;
    description?: string;
    redirectUris: string[];
    scopes?: string[];
    applicationType?: string;
  }) => {
    const response = await oauthAppsApi.createOAuthApp(params);
    return response.data;
  }
);

export const updateOAuthApp = createAsyncThunk(
  'integration/updateOAuthApp',
  async (params: {
    oauthAppId: string;
    name?: string;
    description?: string;
    redirectUris?: string[];
    scopes?: string[];
    isActive?: boolean;
  }) => {
    const { oauthAppId, ...updateParams } = params;
    const response = await oauthAppsApi.updateOAuthApp(oauthAppId, updateParams);
    return response.data;
  }
);

export const regenerateOAuthSecret = createAsyncThunk(
  'integration/regenerateOAuthSecret',
  async (oauthAppId: string) => {
    const response = await oauthAppsApi.regenerateOAuthSecret(oauthAppId);
    return { ...response.data, oauthAppId };
  }
);

export const deleteOAuthApp = createAsyncThunk(
  'integration/deleteOAuthApp',
  async (oauthAppId: string) => {
    const response = await oauthAppsApi.deleteOAuthApp(oauthAppId);
    return { ...response.data, oauthAppId };
  }
);

// Async thunks for API keys
export const fetchApiKeys = createAsyncThunk(
  'integration/fetchApiKeys',
  async (params?: {
    activeOnly?: boolean;
    limit?: number;
    skip?: number;
  }) => {
    const response = await apiKeysApi.getApiKeys(params);
    return response.data;
  }
);

export const createApiKey = createAsyncThunk(
  'integration/createApiKey',
  async (params: {
    name: string;
    description?: string;
    permissions: string[]; // Change to permissions to match API
    expiresAt?: string;
    restrictions?: any;
  }) => {
    const response = await apiKeysApi.createApiKey(params);
    return response.data;
  }
);

export const updateApiKey = createAsyncThunk(
  'integration/updateApiKey',
  async (params: {
    apiKeyId: string;
    name?: string;
    description?: string;
    permissions?: string[]; // Change to permissions to match API
    isActive?: boolean;
    expiresAt?: string; // Added expiresAt
    restrictions?: any;
  }) => {
    const { apiKeyId, ...updateParams } = params;
    const response = await apiKeysApi.updateApiKey(apiKeyId, updateParams);
    return response.data;
  }
);

export const deleteApiKey = createAsyncThunk(
  'integration/deleteApiKey',
  async (apiKeyId: string) => {
    const response = await apiKeysApi.deleteApiKey(apiKeyId);
    return { ...response.data, apiKeyId };
  }
);

export const fetchApiKeyUsage = createAsyncThunk(
  'integration/fetchApiKeyUsage',
  async (apiKeyId?: string) => {
    const response = await apiKeysApi.getApiKeyUsage(apiKeyId);
    return response.data;
  }
);



export const integrationSlice = createSlice({
  name: 'integration',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.integrationError = null;
      state.webhookError = null;
      state.oauthError = null;
      state.apiKeyError = null;
    },
    resetIntegrationState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Integrations
    builder
      .addCase(fetchIntegrations.pending, (state) => {
        state.isLoadingIntegrations = true;
        state.integrationError = null;
      })
      .addCase(fetchIntegrations.fulfilled, (state, action) => {
        state.isLoadingIntegrations = false;
        state.integrations = action.payload.integrations || [];
      })
      .addCase(fetchIntegrations.rejected, (state, action) => {
        state.isLoadingIntegrations = false;
        state.integrationError = action.error.message || 'Failed to fetch integrations';
      })

      .addCase(createIntegration.pending, (state) => {
        state.isCreating = true;
        state.integrationError = null;
      })
      .addCase(createIntegration.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.integration) {
          state.integrations.unshift(action.payload.integration);
        }
      })
      .addCase(createIntegration.rejected, (state, action) => {
        state.isCreating = false;
        state.integrationError = action.error.message || 'Failed to create integration';
      })

      .addCase(updateIntegration.pending, (state) => {
        state.isUpdating = true;
        state.integrationError = null;
      })
      .addCase(updateIntegration.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.integration) {
          const index = state.integrations.findIndex(i => i.id === action.payload.integration.id);
          if (index !== -1) {
            state.integrations[index] = action.payload.integration;
          }
        }
      })
      .addCase(updateIntegration.rejected, (state, action) => {
        state.isUpdating = false;
        state.integrationError = action.error.message || 'Failed to update integration';
      })

      .addCase(fetchIntegrationStatistics.fulfilled, (state, action) => {
        state.integrationStatistics = action.payload.statistics;
      })

      // Webhooks
      .addCase(fetchWebhooks.pending, (state) => {
        state.isLoadingWebhooks = true;
        state.webhookError = null;
      })
      .addCase(fetchWebhooks.fulfilled, (state, action) => {
        state.isLoadingWebhooks = false;
        state.webhooks = action.payload.webhooks || [];
      })
      .addCase(fetchWebhooks.rejected, (state, action) => {
        state.isLoadingWebhooks = false;
        state.webhookError = action.error.message || 'Failed to fetch webhooks';
      })

      .addCase(createWebhook.pending, (state) => {
        state.isCreating = true;
        state.webhookError = null;
      })
      .addCase(createWebhook.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.webhook) {
          state.webhooks.unshift(action.payload.webhook);
        }
      })
      .addCase(createWebhook.rejected, (state, action) => {
        state.isCreating = false;
        state.webhookError = action.error.message || 'Failed to create webhook';
      })

      .addCase(updateWebhook.pending, (state) => {
        state.isUpdating = true;
        state.webhookError = null;
      })
      .addCase(updateWebhook.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.webhook) {
          const index = state.webhooks.findIndex(w => w.id === action.payload.webhook.id);
          if (index !== -1) {
            state.webhooks[index] = action.payload.webhook;
          }
        }
      })
      .addCase(updateWebhook.rejected, (state, action) => {
        state.isUpdating = false;
        state.webhookError = action.error.message || 'Failed to update webhook';
      })

      .addCase(deleteWebhook.pending, (state) => {
        state.isDeleting = true;
        state.webhookError = null;
      })
      .addCase(deleteWebhook.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.webhooks = state.webhooks.filter(w => w.id !== action.payload.webhookId);
      })
      .addCase(deleteWebhook.rejected, (state, action) => {
        state.isDeleting = false;
        state.webhookError = action.error.message || 'Failed to delete webhook';
      })

      .addCase(testWebhook.pending, (state) => {
        state.isTesting = true;
        state.webhookError = null;
      })
      .addCase(testWebhook.fulfilled, (state) => {
        state.isTesting = false;
      })
      .addCase(testWebhook.rejected, (state, action) => {
        state.isTesting = false;
        state.webhookError = action.error.message || 'Failed to test webhook';
      })

      // OAuth Apps
      .addCase(fetchOAuthApps.pending, (state) => {
        state.isLoadingOAuthApps = true;
        state.oauthError = null;
      })
      .addCase(fetchOAuthApps.fulfilled, (state, action) => {
        state.isLoadingOAuthApps = false;
        state.oauthApps = action.payload.oauthApps || [];
      })
      .addCase(fetchOAuthApps.rejected, (state, action) => {
        state.isLoadingOAuthApps = false;
        state.oauthError = action.error.message || 'Failed to fetch OAuth apps';
      })

      .addCase(createOAuthApp.pending, (state) => {
        state.isCreating = true;
        state.oauthError = null;
      })
      .addCase(createOAuthApp.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.oauthApp) {
          state.oauthApps.unshift(action.payload.oauthApp);
        }
      })
      .addCase(createOAuthApp.rejected, (state, action) => {
        state.isCreating = false;
        state.oauthError = action.error.message || 'Failed to create OAuth app';
      })

      .addCase(updateOAuthApp.pending, (state) => {
        state.isUpdating = true;
        state.oauthError = null;
      })
      .addCase(updateOAuthApp.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.oauthApp) {
          const index = state.oauthApps.findIndex(a => a.id === action.payload.oauthApp.id);
          if (index !== -1) {
            state.oauthApps[index] = action.payload.oauthApp;
          }
        }
      })
      .addCase(updateOAuthApp.rejected, (state, action) => {
        state.isUpdating = false;
        state.oauthError = action.error.message || 'Failed to update OAuth app';
      })
      .addCase(regenerateOAuthSecret.pending, (state) => {
        state.isUpdating = true; // Use updating state for this action as well
        state.oauthError = null;
      })
      .addCase(regenerateOAuthSecret.fulfilled, (state, action) => {
        state.isUpdating = false;
        // Optionally update the specific OAuth app in the array if needed (though UI handles direct display)
      })
      .addCase(regenerateOAuthSecret.rejected, (state, action) => {
        state.isUpdating = false;
        state.oauthError = action.error.message || 'Failed to regenerate OAuth secret';
      })

      .addCase(deleteOAuthApp.pending, (state) => {
        state.isDeleting = true;
        state.oauthError = null;
      })
      .addCase(deleteOAuthApp.fulfilled, (state, action) => {
        state.isDeleting = false;
        // Remove from the list if the deletion was successful
        state.oauthApps = state.oauthApps.filter(app => app.id !== action.payload.oauthAppId);
      })
      .addCase(deleteOAuthApp.rejected, (state, action) => {
        state.isDeleting = false;
        state.oauthError = action.error.message || 'Failed to delete OAuth app';
      })

      // API Keys
      .addCase(fetchApiKeys.pending, (state) => {
        state.isLoadingApiKeys = true;
        state.apiKeyError = null;
      })
      .addCase(fetchApiKeys.fulfilled, (state, action) => {
        state.isLoadingApiKeys = false;
        state.apiKeys = action.payload.apiKeys || [];
      })
      .addCase(fetchApiKeys.rejected, (state, action) => {
        state.isLoadingApiKeys = false;
        state.apiKeyError = action.error.message || 'Failed to fetch API keys';
      })

      .addCase(createApiKey.pending, (state) => {
        state.isCreating = true;
        state.apiKeyError = null;
      })
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.apiKey) {
          state.apiKeys.unshift(action.payload.apiKey);
        }
      })
      .addCase(createApiKey.rejected, (state, action) => {
        state.isCreating = false;
        state.apiKeyError = action.error.message || 'Failed to create API key';
      })

      .addCase(updateApiKey.pending, (state) => {
        state.isUpdating = true;
        state.apiKeyError = null;
      })
      .addCase(updateApiKey.fulfilled, (state, action) => {
        state.isUpdating = false;
        if (action.payload.apiKey) {
          const index = state.apiKeys.findIndex(key => key.id === action.payload.apiKey.id);
          if (index !== -1) {
            state.apiKeys[index] = action.payload.apiKey;
          }
        }
      })
      .addCase(updateApiKey.rejected, (state, action) => {
        state.isUpdating = false;
        state.apiKeyError = action.error.message || 'Failed to update API key';
      })

      .addCase(deleteApiKey.pending, (state) => {
        state.isDeleting = true;
        state.apiKeyError = null;
      })
      .addCase(deleteApiKey.fulfilled, (state, action: PayloadAction<{ success: boolean; message: string; apiKeyId: string }>) => {
        state.isDeleting = false;
        state.apiKeys = state.apiKeys.filter(key => key.id !== action.payload.apiKeyId);
      })
      .addCase(deleteApiKey.rejected, (state, action) => {
        state.isDeleting = false;
        state.apiKeyError = action.error.message || 'Failed to delete API key';
      })

      .addCase(fetchApiKeyUsage.fulfilled, (state, action) => {
        state.apiKeyUsage = action.payload.usage;
      })

      // App Marketplace
  },
});

export const { clearErrors, resetIntegrationState } = integrationSlice.actions;

export default integrationSlice.reducer;