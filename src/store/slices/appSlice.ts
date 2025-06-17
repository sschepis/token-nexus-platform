/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import {
    App, AppCategory, AppState,
    InstallAppParams, UninstallAppParams, UpdateAppSettingsParams,
    OrgAppInstallation, AppDefinitionForMarketplace, AppVersionForMarketplace
} from '@/types/app-marketplace';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored App Slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive Parse.Cloud.run and error handling patterns
 */

export interface InstallAppToOrgParams {
  orgId: string;
  appDefinitionId: string;
  versionId: string;
  appSpecificConfig?: Record<string, any>;
}

export interface UninstallOrgAppParams {
  orgAppInstallationId: string;
}

export interface RejectAppVersionAdminParams {
  versionId: string;
  reason: string;
}

// Create async thunks using the factory
const appThunks = {
  // User-facing marketplace thunks
  fetchApps: AsyncThunkFactory.create<void, App[]>({
    name: 'apps/fetchApps',
    cloudFunction: 'fetchAppDefinitions',
    transformResponse: (appDefinitions: any[]) => {
      return appDefinitions.map((appDef: any) => ({
        id: appDef.id,
        name: appDef.name,
        description: appDef.description || '',
        category: appDef.category || 'other',
        icon: appDef.iconUrl,
        publisher: appDef.publisherName || 'Unknown',
        version: '1.0.0',
        pricing: 'free',
        status: 'not_installed',
        permissions: [],
        settings: {}
      }));
    },
    errorMessage: 'Failed to fetch apps'
  }),

  fetchInstalledOrgApps: AsyncThunkFactory.create<string, OrgAppInstallation[]>({
    name: 'apps/fetchInstalledOrgApps',
    cloudFunction: 'fetchOrgAppInstallations',
    transformParams: (orgId: string) => ({ organizationId: orgId }),
    errorMessage: 'Failed to fetch installed apps for organization'
  }),

  installAppToOrg: AsyncThunkFactory.create<InstallAppToOrgParams, any>({
    name: 'apps/installAppToOrg',
    cloudFunction: 'installApp',
    transformParams: (params) => ({
      appDefinitionId: params.appDefinitionId,
      versionId: params.versionId,
      appSpecificConfig: params.appSpecificConfig || {}
    }),
    transformResponse: (result) => {
      toast.success('App installed successfully');
      return { installationId: result.installationId };
    },
    errorMessage: 'Failed to install app'
  }),

  uninstallOrgApp: AsyncThunkFactory.create<UninstallOrgAppParams, { orgAppInstallationId: string }>({
    name: 'apps/uninstallOrgApp',
    cloudFunction: 'uninstallApp',
    transformParams: (params) => ({
      orgAppInstallationId: params.orgAppInstallationId,
      _originalParams: params // Store original params for response transformation
    }),
    transformResponse: (result) => {
      toast.success('App uninstalled successfully');
      // Extract the original params from the result if the cloud function returns it
      // or use the result directly if it contains the ID
      return { orgAppInstallationId: result.orgAppInstallationId || result._originalParams?.orgAppInstallationId };
    },
    errorMessage: 'Failed to uninstall app'
  }),

  updateAppSettings: AsyncThunkFactory.create<UpdateAppSettingsParams, any>({
    name: 'apps/updateSettings',
    cloudFunction: 'updateAppSettings',
    transformResponse: (result) => {
      toast.success('App settings updated successfully');
      return result;
    },
    errorMessage: 'Failed to update app settings'
  }),

  // Admin thunks
  fetchAllAppDefinitionsAdmin: AsyncThunkFactory.create<void, AppDefinitionForMarketplace[]>({
    name: 'apps/fetchAllAppDefinitionsAdmin',
    cloudFunction: 'listAppsForAdmin',
    transformResponse: (definitionsFromCloud: any[]) => {
      return definitionsFromCloud.map(def => ({
        ...def,
        id: def.objectId
      }));
    },
    errorMessage: 'Failed to fetch app definitions for admin'
  }),

  fetchAppVersionsAdmin: AsyncThunkFactory.create<string, AppVersionForMarketplace[]>({
    name: 'apps/fetchAppVersionsAdmin',
    cloudFunction: 'getAppVersionsForDefinition',
    transformParams: (appDefinitionId: string) => ({ appDefinitionId }),
    transformResponse: (versionsFromCloud: any[]) => {
      return versionsFromCloud.map(ver => ({
        ...ver,
        id: ver.objectId
      }));
    },
    errorMessage: 'Failed to fetch app versions'
  }),

  approveAppVersionAdmin: AsyncThunkFactory.create<string, AppVersionForMarketplace>({
    name: 'apps/approveAppVersionAdmin',
    cloudFunction: 'approveAppVersion',
    transformParams: (versionId: string) => ({ versionId }),
    transformResponse: (updatedVersionRaw: any) => {
      toast.success('App version approved.');
      return { ...updatedVersionRaw, id: updatedVersionRaw.objectId };
    },
    errorMessage: 'Failed to approve app version'
  }),

  rejectAppVersionAdmin: AsyncThunkFactory.create<RejectAppVersionAdminParams, AppVersionForMarketplace>({
    name: 'apps/rejectAppVersionAdmin',
    cloudFunction: 'rejectAppVersion',
    transformParams: (params) => ({ versionId: params.versionId, reason: params.reason }),
    transformResponse: (updatedVersionRaw: any) => {
      toast.success('App version rejected.');
      return { ...updatedVersionRaw, id: updatedVersionRaw.objectId };
    },
    errorMessage: 'Failed to reject app version'
  }),

  publishAppVersionAdmin: AsyncThunkFactory.create<string, AppVersionForMarketplace>({
    name: 'apps/publishAppVersionAdmin',
    cloudFunction: 'publishAppVersion',
    transformParams: (versionId: string) => ({ versionId }),
    transformResponse: (updatedVersionRaw: any) => {
      toast.success('App version published.');
      return { ...updatedVersionRaw, id: updatedVersionRaw.objectId };
    },
    errorMessage: 'Failed to publish app version'
  })
};

// Export thunks for backward compatibility
export const {
  fetchApps,
  fetchInstalledOrgApps,
  installAppToOrg,
  uninstallOrgApp,
  updateAppSettings,
  fetchAllAppDefinitionsAdmin,
  fetchAppVersionsAdmin,
  approveAppVersionAdmin,
  rejectAppVersionAdmin,
  publishAppVersionAdmin
} = appThunks;

// Initial state using the utility
interface AppSliceState extends ExtendedAsyncState {
  apps: App[];
  categories: AppCategory[];
  selectedCategory: AppCategory | 'all';
  installedApps: App[];
  installedOrgApps: OrgAppInstallation[];
  allAppDefinitionsAdmin: AppDefinitionForMarketplace[];
  selectedAppVersionsAdmin: AppVersionForMarketplace[];
  isAdminLoadingApps: boolean;
  adminAppsError: string | null;
}

const initialState: AppSliceState = createAsyncInitialState({
  apps: [],
  categories: ['finance', 'productivity', 'communication', 'integration', 'security', 'analytics', 'other'],
  selectedCategory: 'all' as const,
  installedApps: [],
  installedOrgApps: [],
  allAppDefinitionsAdmin: [],
  selectedAppVersionsAdmin: [],
  isAdminLoadingApps: false,
  adminAppsError: null
}, { includeExtended: true });

const appSlice = createSlice({
  name: 'apps',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<AppCategory | 'all'>) => {
      state.selectedCategory = action.payload;
    },
  },
  extraReducers: (builder) => {
    // User-facing marketplace reducers using AsyncReducerBuilder
    AsyncReducerBuilder.addAsyncCase(builder, appThunks.fetchApps, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.apps = action.payload;
        state.installedApps = [];
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.fetchInstalledOrgApps, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.installedOrgApps = action.payload;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.installAppToOrg, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        // App installed successfully, installation ID returned
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.uninstallOrgApp, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        const { orgAppInstallationId } = action.payload;
        state.installedOrgApps = state.installedOrgApps.filter(
          app => app.objectId !== orgAppInstallationId
        );
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.updateAppSettings, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const { appId, settings } = action.payload;
        const index = state.apps.findIndex((a) => a.id === appId);
        if (index !== -1) {
          state.apps[index].settings = settings;
        }
      }
    });

    // Admin reducers
    AsyncReducerBuilder.addAsyncCase(builder, appThunks.fetchAllAppDefinitionsAdmin, {
      loadingFlag: 'isAdminLoadingApps',
      onFulfilled: (state, action) => {
        state.allAppDefinitionsAdmin = action.payload;
        state.adminAppsError = null;
      },
      onRejected: (state, action) => {
        state.adminAppsError = action.payload || 'Failed to fetch app definitions';
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.fetchAppVersionsAdmin, {
      loadingFlag: 'isAdminLoadingApps',
      onFulfilled: (state, action) => {
        state.selectedAppVersionsAdmin = action.payload;
        state.adminAppsError = null;
      },
      onRejected: (state, action) => {
        state.adminAppsError = action.payload || 'Failed to fetch app versions';
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.approveAppVersionAdmin, {
      loadingFlag: 'isAdminLoadingApps',
      onFulfilled: (state, action) => {
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
        state.adminAppsError = null;
      },
      onRejected: (state, action) => {
        state.adminAppsError = action.payload || 'Failed to approve app version';
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.rejectAppVersionAdmin, {
      loadingFlag: 'isAdminLoadingApps',
      onFulfilled: (state, action) => {
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
        state.adminAppsError = null;
      },
      onRejected: (state, action) => {
        state.adminAppsError = action.payload || 'Failed to reject app version';
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, appThunks.publishAppVersionAdmin, {
      loadingFlag: 'isAdminLoadingApps',
      onFulfilled: (state, action) => {
        const index = state.selectedAppVersionsAdmin.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.selectedAppVersionsAdmin[index] = action.payload;
        }
        state.adminAppsError = null;
      },
      onRejected: (state, action) => {
        state.adminAppsError = action.payload || 'Failed to publish app version';
      }
    });
  },
});

export const { setSelectedCategory } = appSlice.actions;
export default appSlice.reducer;
