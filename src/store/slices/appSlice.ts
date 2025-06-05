/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import Parse from 'parse';
import {
    App, AppCategory, AppState,
    InstallAppParams, UninstallAppParams, UpdateAppSettingsParams,
    OrgAppInstallation, AppDefinitionForMarketplace, AppVersionForMarketplace // Import admin-specific types
} from '@/types/app-marketplace';

// Async thunks for user-facing marketplace
export const fetchApps = createAsyncThunk('apps/fetchApps', async () => {
  try {
    // Fetch published apps from the marketplace
    const appDefinitions = await Parse.Cloud.run('fetchAppDefinitions', {});
    
    // Transform AppDefinition data to App format for the UI
    const apps: App[] = appDefinitions.map((appDef: any) => ({
      id: appDef.id,
      name: appDef.name,
      description: appDef.description || '',
      category: appDef.category || 'other',
      icon: appDef.iconUrl,
      publisher: appDef.publisherName || 'Unknown',
      version: '1.0.0', // Will be updated with actual version info
      pricing: 'free', // Default pricing
      status: 'not_installed', // Will be updated based on installed apps
      permissions: [], // Will be populated from app manifest
      settings: {}
    }));
    
    return apps;
  } catch (error) {
    console.error('Error fetching apps:', error);
    throw error;
  }
});

// Fetches all available app definitions for the marketplace browser
// This can remain using mock or a future cloud fn like 'getAvailableAppDefinitions'
// For now, it populates the general catalog of apps.

export const fetchInstalledOrgApps = createAsyncThunk(
  'apps/fetchInstalledOrgApps',
  async (orgId: string, { rejectWithValue }) => {
    if (!orgId) {
      return rejectWithValue('Organization ID is required.');
    }
    try {
      const installations = await Parse.Cloud.run('fetchOrgAppInstallations', {
        organizationId: orgId
      });
      return installations as OrgAppInstallation[];
    } catch (error: any) {
      console.error('Error fetching installed org apps:', error);
      return rejectWithValue(error.message || 'Failed to fetch installed apps for organization.');
    }
  }
);

export interface InstallAppToOrgParams {
  orgId: string;
  appDefinitionId: string;
  versionId: string; // ID of the AppVersion to install (must be published)
  appSpecificConfig?: Record<string, any>;
  // permissions?: string[]; // Permissions to grant could be part of app manifest or selected during install
}

export const installAppToOrg = createAsyncThunk(
  'apps/installAppToOrg',
  async (params: InstallAppToOrgParams, { rejectWithValue }) => {
    try {
      const result = await Parse.Cloud.run('installApp', {
        appDefinitionId: params.appDefinitionId,
        versionId: params.versionId,
        appSpecificConfig: params.appSpecificConfig || {}
      });
      
      toast.success('App installed successfully');
      // Return the installation ID so we can refetch the installations
      return { installationId: result.installationId };
    } catch (error: any) {
      console.error('Error installing app to org:', error);
      return rejectWithValue(error.message || 'Failed to install app.');
    }
  }
);

export interface UninstallOrgAppParams {
  orgAppInstallationId: string;
}

export const uninstallOrgApp = createAsyncThunk(
  'apps/uninstallOrgApp',
  async ({ orgAppInstallationId }: UninstallOrgAppParams, { rejectWithValue }) => {
    try {
      await Parse.Cloud.run('uninstallApp', {
        orgAppInstallationId: orgAppInstallationId
      });
      
      toast.success('App uninstalled successfully');
      return { orgAppInstallationId }; // Return ID for removal from state
    } catch (error: any) {
      console.error('Error uninstalling org app:', error);
      return rejectWithValue(error.message || 'Failed to uninstall app.');
    }
  }
);

export const updateAppSettings = createAsyncThunk(
  'apps/updateSettings',
  async (params: UpdateAppSettingsParams) => {
    try {
      const response = await Parse.Cloud.run('updateAppSettings', params);
      return response;
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw error;
    }
  }
);

// --- Async Thunks for System Admin App Management ---

export const fetchAllAppDefinitionsAdmin = createAsyncThunk(
  'apps/fetchAllAppDefinitionsAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const definitionsFromCloud: any[] = await Parse.Cloud.run('listAppsForAdmin');
      // Map to ensure 'id' field is present, using objectId from Parse
      return definitionsFromCloud.map(def => ({
        ...def,
        id: def.objectId,
        // Ensure other fields match AppDefinitionForMarketplace if transformation is needed
      })) as AppDefinitionForMarketplace[];
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch app definitions for admin.');
      return rejectWithValue(error.message || 'Failed to fetch app definitions for admin.');
    }
  }
);

export const fetchAppVersionsAdmin = createAsyncThunk(
  'apps/fetchAppVersionsAdmin',
  async (appDefinitionId: string, { rejectWithValue }) => {
    try {
      const versionsFromCloud: any[] = await Parse.Cloud.run('getAppVersionsForDefinition', { appDefinitionId });
      // Map to ensure 'id' field and other fields align with AppVersionForMarketplace
      return versionsFromCloud.map(ver => ({
        ...ver,
        id: ver.objectId,
        // appDefinition pointer should be part of 'ver' if cloud function includes it
      })) as AppVersionForMarketplace[];
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch app versions.');
      return rejectWithValue(error.message || 'Failed to fetch app versions.');
    }
  }
);

export const approveAppVersionAdmin = createAsyncThunk(
  'apps/approveAppVersionAdmin',
  async (versionId: string, { dispatch, rejectWithValue }) => {
    try {
      const updatedVersionRaw: any = await Parse.Cloud.run('approveAppVersion', { versionId });
      toast.success('App version approved.');
      const updatedVersion = { ...updatedVersionRaw, id: updatedVersionRaw.objectId } as AppVersionForMarketplace;
      if (updatedVersion.appDefinition?.objectId) {
         dispatch(fetchAppVersionsAdmin(updatedVersion.appDefinition.objectId));
      }
      return updatedVersion;
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve app version.');
      return rejectWithValue(error.message || 'Failed to approve app version.');
    }
  }
);

export interface RejectAppVersionAdminParams {
  versionId: string;
  reason: string;
}
export const rejectAppVersionAdmin = createAsyncThunk(
  'apps/rejectAppVersionAdmin',
  async ({ versionId, reason }: RejectAppVersionAdminParams, { dispatch, rejectWithValue }) => {
    try {
      const updatedVersionRaw: any = await Parse.Cloud.run('rejectAppVersion', { versionId, reason });
      toast.success('App version rejected.');
      const updatedVersion = { ...updatedVersionRaw, id: updatedVersionRaw.objectId } as AppVersionForMarketplace;
      if (updatedVersion.appDefinition?.objectId) {
         dispatch(fetchAppVersionsAdmin(updatedVersion.appDefinition.objectId));
      }
      return updatedVersion;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject app version.');
      return rejectWithValue(error.message || 'Failed to reject app version.');
    }
  }
);

export const publishAppVersionAdmin = createAsyncThunk(
  'apps/publishAppVersionAdmin',
  async (versionId: string, { dispatch, rejectWithValue }) => {
    try {
      const updatedVersionRaw: any = await Parse.Cloud.run('publishAppVersion', { versionId });
      toast.success('App version published.');
      const updatedVersion = { ...updatedVersionRaw, id: updatedVersionRaw.objectId } as AppVersionForMarketplace;
       if (updatedVersion.appDefinition?.objectId) {
         dispatch(fetchAppVersionsAdmin(updatedVersion.appDefinition.objectId));
      }
      return updatedVersion;
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish app version.');
      return rejectWithValue(error.message || 'Failed to publish app version.');
    }
  }
);


const initialState: AppState = {
  apps: [], // For user-facing marketplace
  categories: ['finance', 'productivity', 'communication', 'integration', 'security', 'analytics', 'other'],
  selectedCategory: 'all',
  installedApps: [],
  installedOrgApps: [],
  isLoading: false, // For user-facing actions
  error: null, // For user-facing actions

  allAppDefinitionsAdmin: [], // For admin app management
  selectedAppVersionsAdmin: [], // For admin viewing versions of a selected app
  isAdminLoadingApps: false, // For admin app actions
  adminAppsError: null, // For admin app actions
};

const appSlice = createSlice({
  name: 'apps',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<AppCategory | 'all'>) => {
      state.selectedCategory = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchApps.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApps.fulfilled, (state, action) => {
        state.isLoading = false;
        state.apps = action.payload;
        // Note: installedApps will now be determined by installedOrgApps
        state.installedApps = [];
      })
      .addCase(fetchApps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch apps';
        toast.error('Failed to fetch apps. Please try again.');
      })
      // Handle fetchInstalledOrgApps
      .addCase(fetchInstalledOrgApps.pending, (state) => {
        state.isLoading = true; // Or a specific loading flag for installed apps
        state.error = null;
      })
      .addCase(fetchInstalledOrgApps.fulfilled, (state, action: PayloadAction<OrgAppInstallation[]>) => {
        state.isLoading = false;
        state.installedOrgApps = action.payload;
      })
      .addCase(fetchInstalledOrgApps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch installed org apps';
        toast.error(state.error);
      })
      // Handle installAppToOrg
      .addCase(installAppToOrg.fulfilled, (state, action) => {
        // The install action now returns just { installationId }
        // We'll need to refetch the installations to get the full data
        // For now, just mark that we need to refresh
        state.isLoading = false;
        // The success toast is already shown in the thunk
      })
      .addCase(installAppToOrg.rejected, (state, action) => {
        toast.error(`Failed to install app: ${action.payload as string}`);
      })
      // Handle uninstallOrgApp
      .addCase(uninstallOrgApp.fulfilled, (state, action: PayloadAction<{ orgAppInstallationId: string }>) => {
        const { orgAppInstallationId } = action.payload;
        const uninstalledApp = state.installedOrgApps.find(app => app.objectId === orgAppInstallationId);
        state.installedOrgApps = state.installedOrgApps.filter(app => app.objectId !== orgAppInstallationId);
        
        // Optionally update the main 'apps' catalog status
        if (uninstalledApp && uninstalledApp.appDefinition) {
            const appDefId = uninstalledApp.appDefinition.objectId;
            // Check if this app definition is still installed in any other way (if this slice managed multiple orgs' views)
            // For a single org view, if uninstalled, it's no longer 'installed' for this org.
            // const appIndex = state.apps.findIndex(a => a.id === appDefId);
            // if (appIndex !== -1) {
            //     state.apps[appIndex].status = 'not_installed'; // Reconsider this
            // }
        }
        toast.success('App has been successfully uninstalled.');
      })
      .addCase(uninstallOrgApp.rejected, (state, action) => {
        toast.error(`Failed to uninstall app: ${action.payload as string}`);
      })
      .addCase(updateAppSettings.fulfilled, (state, action) => {
        const { appId, settings } = action.payload;
        const index = state.apps.findIndex((a) => a.id === appId);
        if (index !== -1) {
          state.apps[index].settings = settings;
        }
        toast.success('App settings updated successfully');
      })
      .addCase(updateAppSettings.rejected, (state, action) => { // Added action param
        toast.error((action.payload as string) ||'Failed to update app settings. Please try again.');
      })
      // Admin App Management Reducers
      .addCase(fetchAllAppDefinitionsAdmin.pending, (state) => {
        state.isAdminLoadingApps = true;
        state.adminAppsError = null;
      })
      .addCase(fetchAllAppDefinitionsAdmin.fulfilled, (state, action: PayloadAction<AppDefinitionForMarketplace[]>) => {
        state.isAdminLoadingApps = false;
        state.allAppDefinitionsAdmin = action.payload;
      })
      .addCase(fetchAllAppDefinitionsAdmin.rejected, (state, action) => {
        state.isAdminLoadingApps = false;
        state.adminAppsError = action.payload as string;
      })
      .addCase(fetchAppVersionsAdmin.pending, (state) => {
        state.isAdminLoadingApps = true; // Or a specific flag like 'isLoadingVersions'
        state.adminAppsError = null;
        state.selectedAppVersionsAdmin = []; // Clear previous versions
      })
      .addCase(fetchAppVersionsAdmin.fulfilled, (state, action: PayloadAction<AppVersionForMarketplace[]>) => {
        state.isAdminLoadingApps = false;
        state.selectedAppVersionsAdmin = action.payload;
      })
      .addCase(fetchAppVersionsAdmin.rejected, (state, action) => {
        state.isAdminLoadingApps = false;
        state.adminAppsError = action.payload as string;
      })
      // Approve, Reject, Publish version reducers - typically update selectedAppVersionsAdmin or trigger re-fetch
      .addCase(approveAppVersionAdmin.fulfilled, (state, action: PayloadAction<AppVersionForMarketplace>) => {
        state.isAdminLoadingApps = false; // Assuming a pending state was set
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
        // Also update in allAppDefinitionsAdmin if it stores version summaries (it doesn't currently)
      })
      .addCase(rejectAppVersionAdmin.fulfilled, (state, action: PayloadAction<AppVersionForMarketplace>) => {
        state.isAdminLoadingApps = false;
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
      })
      .addCase(publishAppVersionAdmin.fulfilled, (state, action: PayloadAction<AppVersionForMarketplace>) => {
        state.isAdminLoadingApps = false;
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
      })
      // Add .pending and .rejected for approve, reject, publish if more granular loading/error state is needed
      .addCase(approveAppVersionAdmin.pending, (state) => { state.isAdminLoadingApps = true; })
      .addCase(approveAppVersionAdmin.rejected, (state, action) => { state.isAdminLoadingApps = false; state.adminAppsError = action.payload as string; })
      .addCase(rejectAppVersionAdmin.pending, (state) => { state.isAdminLoadingApps = true; })
      .addCase(rejectAppVersionAdmin.rejected, (state, action) => { state.isAdminLoadingApps = false; state.adminAppsError = action.payload as string; })
      .addCase(publishAppVersionAdmin.pending, (state) => { state.isAdminLoadingApps = true; })
      .addCase(publishAppVersionAdmin.rejected, (state, action) => { state.isAdminLoadingApps = false; state.adminAppsError = action.payload as string; });
  },
});

export const { setSelectedCategory } = appSlice.actions;
export default appSlice.reducer;
