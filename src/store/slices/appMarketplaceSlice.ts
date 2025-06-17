import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';
import {
  AppCategory,
  AppDefinitionForMarketplace,
  AppVersionForMarketplace,
  OrgAppInstallation,
  InstallAppParams,
  UninstallAppParams,
  UpdateAppSettingsParams,
} from '../../types/app-marketplace';

/**
 * Refactored App Marketplace slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive createAsyncThunk and error handling patterns
 */

// Parameter interfaces for async thunks
export interface FetchAppDefinitionsParams {
  category?: string;
  search?: string;
  [key: string]: unknown; // Add index signature for Record<string, unknown> compatibility
}

export interface FetchOrgAppInstallationsParams {
  organizationId?: string;
  [key: string]: unknown;
}

interface AppMarketplaceState extends ExtendedAsyncState {
  appDefinitions: AppDefinitionForMarketplace[];
  appVersions: AppVersionForMarketplace[]; // For displaying versions of a selected app
  orgAppInstallations: OrgAppInstallation[];
  categories: AppCategory[];
  selectedCategory: AppCategory | 'all';
  searchQuery: string;
  // Specific loading/error states for actions
  isInstalling: boolean;
  installError: string | null;
  isUninstalling: boolean;
  uninstallError: string | null;
  isUpdatingSettings: boolean;
  updateSettingsError: string | null;
}

// Create async thunks using the factory
const appMarketplaceThunks = {
  fetchAppDefinitions: AsyncThunkFactory.create<FetchAppDefinitionsParams | undefined, AppDefinitionForMarketplace[]>({
    name: 'appMarketplace/fetchAppDefinitions',
    cloudFunction: 'fetchAppDefinitions',
    transformParams: (params) => (params || {}) as Record<string, unknown>,
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch app definitions'
  }),

  fetchAppVersionsForDefinition: AsyncThunkFactory.create<string, AppVersionForMarketplace[]>({
    name: 'appMarketplace/fetchAppVersionsForDefinition',
    cloudFunction: 'fetchAppVersionsForDefinition',
    transformParams: (appDefinitionId: string) => ({ appDefinitionId }),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch app versions'
  }),

  fetchOrgAppInstallations: AsyncThunkFactory.create<FetchOrgAppInstallationsParams | undefined, OrgAppInstallation[]>({
    name: 'appMarketplace/fetchOrgAppInstallations',
    cloudFunction: 'fetchOrgAppInstallations',
    transformParams: (params) => (params || {}) as Record<string, unknown>,
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch installed apps'
  }),

  installApp: AsyncThunkFactory.create<InstallAppParams, OrgAppInstallation>({
    name: 'appMarketplace/installApp',
    cloudFunction: 'installApp',
    transformParams: (params) => ({
      appDefinitionId: params.appDefinitionId,
      versionId: params.versionId,
      appSpecificConfig: params.appSpecificConfig
    }),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to install app'
  }),

  uninstallApp: AsyncThunkFactory.create<UninstallAppParams, { success: boolean; orgAppInstallationId: string }>({
    name: 'appMarketplace/uninstallApp',
    cloudFunction: 'uninstallApp',
    transformParams: (params) => ({
      appDefinitionId: params.appDefinitionId,
      orgAppInstallationId: params.orgAppInstallationId
    }),
    transformResponse: (response: any) => ({
      success: response.success || true,
      orgAppInstallationId: response.orgAppInstallationId || response.id
    }),
    errorMessage: 'Failed to uninstall app'
  }),

  updateAppSettings: AsyncThunkFactory.create<UpdateAppSettingsParams, OrgAppInstallation>({
    name: 'appMarketplace/updateAppSettings',
    cloudFunction: 'updateAppSettings',
    transformParams: (params) => ({
      appDefinitionId: params.appDefinitionId,
      orgAppInstallationId: params.orgAppInstallationId,
      settings: params.settings
    }),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to update app settings'
  })
};

// Export thunks for backward compatibility
export const {
  fetchAppDefinitions,
  fetchAppVersionsForDefinition,
  fetchOrgAppInstallations,
  installApp,
  uninstallApp,
  updateAppSettings
} = appMarketplaceThunks;

const initialState: AppMarketplaceState = createAsyncInitialState({
  appDefinitions: [],
  appVersions: [],
  orgAppInstallations: [],
  categories: [], // Populate this dynamically or from a static list
  selectedCategory: 'all' as AppCategory | 'all',
  searchQuery: '',
  // Specific loading/error states for actions
  isInstalling: false,
  installError: null,
  isUninstalling: false,
  uninstallError: null,
  isUpdatingSettings: false,
  updateSettingsError: null,
}, { includeExtended: true });

const appMarketplaceSlice = createSlice({
  name: 'appMarketplace',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<AppCategory | 'all'>) => {
      state.selectedCategory = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    clearAppVersions: (state) => {
      state.appVersions = [];
    },
    
    clearInstallError: (state) => {
      state.installError = null;
    },
    
    clearUninstallError: (state) => {
      state.uninstallError = null;
    },
    
    clearUpdateSettingsError: (state) => {
      state.updateSettingsError = null;
    },
    
    clearAllErrors: (state) => {
      state.error = null;
      state.installError = null;
      state.uninstallError = null;
      state.updateSettingsError = null;
    },
    
    // Manual state updates for optimistic UI updates
    addAppInstallation: (state, action: PayloadAction<OrgAppInstallation>) => {
      const existingIndex = state.orgAppInstallations.findIndex(
        installation => installation.objectId === action.payload.objectId
      );
      if (existingIndex === -1) {
        state.orgAppInstallations.push(action.payload);
      }
    },
    
    removeAppInstallation: (state, action: PayloadAction<string>) => {
      state.orgAppInstallations = state.orgAppInstallations.filter(
        installation => installation.objectId !== action.payload
      );
    },
    
    updateAppInstallation: (state, action: PayloadAction<OrgAppInstallation>) => {
      const index = state.orgAppInstallations.findIndex(
        installation => installation.objectId === action.payload.objectId
      );
      if (index !== -1) {
        state.orgAppInstallations[index] = action.payload;
      }
    }
  },
  
  extraReducers: (builder) => {
    // Fetch app definitions using AsyncReducerBuilder
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.fetchAppDefinitions, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.appDefinitions = action.payload;
        // Extract categories from app definitions
        const categorySet = new Set<AppCategory>();
        action.payload.forEach(app => {
          if (app.category) {
            categorySet.add(app.category);
          }
        });
        state.categories = Array.from(categorySet);
      }
    });

    // Fetch app versions for definition
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.fetchAppVersionsForDefinition, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.appVersions = action.payload;
      }
    });

    // Fetch organization app installations
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.fetchOrgAppInstallations, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.orgAppInstallations = action.payload;
      }
    });

    // Install app
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.installApp, {
      loadingFlag: 'isInstalling',
      onFulfilled: (state, action) => {
        // Add the new installation to the list
        state.orgAppInstallations.push(action.payload);
        state.installError = null;
      },
      onRejected: (state, action) => {
        state.installError = action.payload as string;
      }
    });

    // Uninstall app
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.uninstallApp, {
      loadingFlag: 'isUninstalling',
      onFulfilled: (state, action) => {
        // Remove the installation from the list
        state.orgAppInstallations = state.orgAppInstallations.filter(
          installation => installation.objectId !== action.payload.orgAppInstallationId
        );
        state.uninstallError = null;
      },
      onRejected: (state, action) => {
        state.uninstallError = action.payload as string;
      }
    });

    // Update app settings
    AsyncReducerBuilder.addAsyncCase(builder, appMarketplaceThunks.updateAppSettings, {
      loadingFlag: 'isUpdatingSettings',
      onFulfilled: (state, action) => {
        // Update the installation in the list
        const index = state.orgAppInstallations.findIndex(
          installation => installation.objectId === action.payload.objectId
        );
        if (index !== -1) {
          state.orgAppInstallations[index] = action.payload;
        }
        state.updateSettingsError = null;
      },
      onRejected: (state, action) => {
        state.updateSettingsError = action.payload as string;
      }
    });
  }
});

export const {
  setSelectedCategory,
  setSearchQuery,
  clearAppVersions,
  clearInstallError,
  clearUninstallError,
  clearUpdateSettingsError,
  clearAllErrors,
  addAppInstallation,
  removeAppInstallation,
  updateAppInstallation
} = appMarketplaceSlice.actions;

export default appMarketplaceSlice.reducer;