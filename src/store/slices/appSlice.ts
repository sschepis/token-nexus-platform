
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import api, { mockApis } from '@/services/api';
import { App, AppCategory, AppState, InstallAppParams, UninstallAppParams, UpdateAppSettingsParams } from '@/types/app-marketplace';

// Async thunks
export const fetchApps = createAsyncThunk('apps/fetchApps', async () => {
  try {
    // In a real app, use this:
    // const response = await api.get('/apps');
    // return response.data;
    
    // For now, use mock data
    const response = await mockApis.getApps();
    return response.data;
  } catch (error) {
    console.error('Error fetching apps:', error);
    throw error;
  }
});

export const installApp = createAsyncThunk(
  'apps/installApp',
  async ({ appId, permissions }: InstallAppParams) => {
    try {
      // In a real app, use this:
      // const response = await api.post('/apps/install', { appId, permissions });
      // return response.data;
      
      // For now, use mock data
      const response = await mockApis.installApp({ appId, permissions });
      return response.data;
    } catch (error) {
      console.error('Error installing app:', error);
      throw error;
    }
  }
);

export const uninstallApp = createAsyncThunk(
  'apps/uninstallApp',
  async ({ appId }: UninstallAppParams) => {
    try {
      // In a real app, use this:
      // const response = await api.post('/apps/uninstall', { appId });
      // return response.data;
      
      // For now, use mock data
      const response = await mockApis.uninstallApp({ appId });
      return { appId, ...response.data };
    } catch (error) {
      console.error('Error uninstalling app:', error);
      throw error;
    }
  }
);

export const updateAppSettings = createAsyncThunk(
  'apps/updateSettings',
  async ({ appId, settings }: UpdateAppSettingsParams) => {
    try {
      // In a real app, use this:
      // const response = await api.post(`/apps/${appId}/settings`, { settings });
      // return response.data;
      
      // For now, use mock data
      const response = await mockApis.updateAppSettings({ appId, settings });
      return { appId, settings: response.data.settings };
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw error;
    }
  }
);

const initialState: AppState = {
  apps: [],
  categories: ['finance', 'productivity', 'communication', 'integration', 'security', 'analytics', 'other'],
  selectedCategory: 'all',
  installedApps: [],
  isLoading: false,
  error: null,
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
        state.apps = action.payload.apps;
        state.installedApps = action.payload.apps
          .filter((app: App) => app.status === 'installed')
          .map((app: App) => app.id);
      })
      .addCase(fetchApps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch apps';
        toast.error('Failed to fetch apps. Please try again.');
      })
      .addCase(installApp.fulfilled, (state, action) => {
        const { app } = action.payload;
        const index = state.apps.findIndex((a) => a.id === app.id);
        if (index !== -1) {
          state.apps[index] = app;
          if (!state.installedApps.includes(app.id)) {
            state.installedApps.push(app.id);
          }
        }
        toast.success(`${app.name} has been successfully installed`);
      })
      .addCase(installApp.rejected, (state, action) => {
        toast.error('Failed to install app. Please try again.');
      })
      .addCase(uninstallApp.fulfilled, (state, action) => {
        const { appId } = action.payload;
        const index = state.apps.findIndex((a) => a.id === appId);
        if (index !== -1) {
          state.apps[index].status = 'not_installed';
          state.installedApps = state.installedApps.filter((id) => id !== appId);
        }
        toast.success('App has been successfully uninstalled');
      })
      .addCase(uninstallApp.rejected, (state) => {
        toast.error('Failed to uninstall app. Please try again.');
      })
      .addCase(updateAppSettings.fulfilled, (state, action) => {
        const { appId, settings } = action.payload;
        const index = state.apps.findIndex((a) => a.id === appId);
        if (index !== -1) {
          state.apps[index].settings = settings;
        }
        toast.success('App settings updated successfully');
      })
      .addCase(updateAppSettings.rejected, (state) => {
        toast.error('Failed to update app settings. Please try again.');
      });
  },
});

export const { setSelectedCategory } = appSlice.actions;
export default appSlice.reducer;
