import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  AppCategory,
  AppDefinitionForMarketplace,
  AppVersionForMarketplace,
  OrgAppInstallation,
  InstallAppParams,
  UninstallAppParams,
  UpdateAppSettingsParams,
} from '@/types/app-marketplace';
import { appMarketplaceApi } from '@/services/api/appMarketplace';

interface AppMarketplaceState {
  appDefinitions: AppDefinitionForMarketplace[];
  appVersions: AppVersionForMarketplace[]; // For displaying versions of a selected app
  orgAppInstallations: OrgAppInstallation[];
  categories: AppCategory[];
  selectedCategory: AppCategory | 'all';
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  // Specific loading/error states for actions
  isInstalling: boolean;
  installError: string | null;
  isUninstalling: boolean;
  uninstallError: string | null;
  isUpdatingSettings: boolean;
  updateSettingsError: string | null;
}

const initialState: AppMarketplaceState = {
  appDefinitions: [],
  appVersions: [],
  orgAppInstallations: [],
  categories: [], // Populate this dynamically or from a static list
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,
  isInstalling: false,
  installError: null,
  isUninstalling: false,
  uninstallError: null,
  isUpdatingSettings: false,
  updateSettingsError: null,
};

// Async Thunks
/**
 * Thunk to fetch all app definitions from the marketplace, with optional filtering.
 */
export const fetchAppDefinitions = createAsyncThunk(
  'appMarketplace/fetchAppDefinitions',
  async (params: { category?: string; search?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await appMarketplaceApi.fetchAppDefinitions(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch app definitions');
    }
  }
);

/**
 * Thunk to fetch all versions for a given app definition ID.
 */
export const fetchAppVersionsForDefinition = createAsyncThunk(
  'appMarketplace/fetchAppVersionsForDefinition',
  async (appDefinitionId: string, { rejectWithValue }) => {
    try {
      const response = await appMarketplaceApi.fetchAppVersionsForDefinition(appDefinitionId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch app versions');
    }
  }
);

/**
 * Thunk to fetch all installed apps for the current organization.
 */
export const fetchOrgAppInstallations = createAsyncThunk(
  'appMarketplace/fetchOrgAppInstallations',
  async (_, { rejectWithValue }) => {
    try {
      // Assuming organization ID is handled by the API itself or context
      const response = await appMarketplaceApi.fetchOrgAppInstallations();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch installed apps');
    }
  }
);

/**
 * Thunk to install an app for the current organization.
 */
export const installApp = createAsyncThunk(
  'appMarketplace/installApp',
  async (params: InstallAppParams, { rejectWithValue }) => {
    try {
      const response = await appMarketplaceApi.installApp(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to install app');
    }
  }
);

/**
 * Thunk to uninstall an app from the current organization.
 */
export const uninstallApp = createAsyncThunk(
  'appMarketplace/uninstallApp',
  async (params: UninstallAppParams, { rejectWithValue }) => {
    try {
      await appMarketplaceApi.uninstallApp(params);
      return params.orgAppInstallationId || params.appDefinitionId; // Return the ID to update state
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to uninstall app');
    }
  }
);

/**
 * Thunk to update settings for an installed app.
 */
export const updateAppSettings = createAsyncThunk(
  'appMarketplace/updateAppSettings',
  async (params: UpdateAppSettingsParams, { rejectWithValue }) => {
    try {
      const response = await appMarketplaceApi.updateAppSettings(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update app settings');
    }
  }
);

/**
 * Thunk for fetching details for a specific app installation.
 */
export const getAppInstallationDetails = createAsyncThunk(
  'appMarketplace/getAppInstallationDetails',
  async (appInstallationId: string, { rejectWithValue }) => {
    try {
      const response = await appMarketplaceApi.getAppInstallationDetails(appInstallationId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch app installation details');
    }
  }
);


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
    clearAppMarketplaceErrors: (state) => {
      state.error = null;
      state.installError = null;
      state.uninstallError = null;
      state.updateSettingsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAppDefinitions
      .addCase(fetchAppDefinitions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppDefinitions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appDefinitions = action.payload;
        // Also derive categories if not static
        const uniqueCategories = Array.from(new Set(action.payload.map(app => app.category)));
        state.categories = ['all', ...uniqueCategories].sort() as AppCategory[]; // Assuming 'all' is a valid filter
      })
      .addCase(fetchAppDefinitions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // fetchAppVersionsForDefinition
      .addCase(fetchAppVersionsForDefinition.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppVersionsForDefinition.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appVersions = action.payload;
      })
      .addCase(fetchAppVersionsForDefinition.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // fetchOrgAppInstallations
      .addCase(fetchOrgAppInstallations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrgAppInstallations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orgAppInstallations = action.payload;
      })
      .addCase(fetchOrgAppInstallations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // installApp
      .addCase(installApp.pending, (state) => {
        state.isInstalling = true;
        state.installError = null;
      })
      .addCase(installApp.fulfilled, (state, action) => {
        state.isInstalling = false;
        // Optionally update appDefinitions or orgAppInstallations
        state.orgAppInstallations.push(action.payload);
        // Update the status of the app definition in appDefinitions
        const appDef = state.appDefinitions.find(def => def.id === action.payload.appDefinition.id);
        if (appDef) {
          appDef.status = 'installed'; // Assuming AppDefinition has a status property to indicate installation
        }
      })
      .addCase(installApp.rejected, (state, action) => {
        state.isInstalling = false;
        state.installError = action.payload as string;
      })

      // uninstallApp
      .addCase(uninstallApp.pending, (state) => {
        state.isUninstalling = true;
        state.uninstallError = null;
      })
      .addCase(uninstallApp.fulfilled, (state, action) => {
        state.isUninstalling = false;
        const uninstalledAppId = action.payload; // appId returned from thunk
        state.orgAppInstallations = state.orgAppInstallations.filter(
          (inst) => inst.appDefinition.id !== uninstalledAppId
        );
        // Update the status of the app definition in appDefinitions
        const appDef = state.appDefinitions.find(def => def.id === uninstalledAppId);
        if (appDef) {
          appDef.status = 'not_installed'; // Assuming AppDefinition has a status property
        }
      })
      .addCase(uninstallApp.rejected, (state, action) => {
        state.isUninstalling = false;
        state.uninstallError = action.payload as string;
      })

      // updateAppSettings
      .addCase(updateAppSettings.pending, (state) => {
        state.isUpdatingSettings = true;
        state.updateSettingsError = null;
      })
      .addCase(updateAppSettings.fulfilled, (state, action) => {
        state.isUpdatingSettings = false;
        // Update the specific orgAppInstallation with new settings
        const index = state.orgAppInstallations.findIndex(
          (inst) => inst.objectId === action.payload.objectId
        );
        if (index !== -1) {
          state.orgAppInstallations[index] = action.payload; // Replace with updated object
        }
      })
      .addCase(updateAppSettings.rejected, (state, action) => {
        state.isUpdatingSettings = false;
        state.updateSettingsError = action.payload as string;
      })

      // getAppInstallationDetails
      .addCase(getAppInstallationDetails.pending, (state) => {
        state.isLoading = true; // Use general loading for details fetch
        state.error = null;
      })
      .addCase(getAppInstallationDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        // Optionally update the orgAppInstallations array or display details
        // For simplicity, we might just store the last fetched detail or not at all
      })
      .addCase(getAppInstallationDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedCategory, setSearchQuery, clearAppMarketplaceErrors } = appMarketplaceSlice.actions;

export default appMarketplaceSlice.reducer;