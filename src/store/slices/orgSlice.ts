/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import Parse from 'parse';
import { toast } from 'sonner';

export interface Organization {
  id: string; // Mapped from objectId
  name: string;
  description?: string;
  subdomain?: string;
  industry?: string;
  logo?: string; // This might be part of settings.theme.logoUrl or a direct field
  primaryColor?: string; // Potentially part of 'settings.theme' (legacy or direct)
  secondaryColor?: string; // Potentially part of 'settings.theme' (legacy or direct)
  domain?: string; // Potentially part of 'settings.customDomain' (legacy or direct)
  
  // Fields from listOrganizationsForAdmin and for general use
  // Parse Server returns pointers as objects with __type, className, objectId.
  // .toJSON() often converts these. We need to handle the structure as returned by the cloud function.
  administrator?: string | { objectId: string; className?: string; __type?: 'Pointer'; email?: string; username?: string; name?: string; get?: (key:string)=>any };
  status?: string; // e.g., "Active", "Suspended"
  planType?: string; // This is what listOrganizationsForAdmin likely returns for 'plan'
  plan?: 'free' | 'standard' | 'enterprise' | string; // Keep original plan for flexibility
  createdAt: string; // ISO date string (Parse default)
  updatedAt: string; // ISO date string (Parse default)
  createdBy?: { objectId: string; className?: string; __type?: 'Pointer'; username?: string; get?: (key:string)=>any };
  updatedBy?: { objectId: string; className?: string; __type?: 'Pointer'; username?: string; get?: (key:string)=>any };
  settings?: Record<string, any>;
}

// Type for the data returned by getOrganizationSettings cloud function
export interface OrganizationDetails { // This is what getOrganizationSettings and updateOrganizationSettings return
  objectId: string;
  name: string;
  description?: string;
  subdomain?: string;
  industry?: string;
  status?: string;
  planType?: string;
  // administrator?: any; // Not typically returned by getOrganizationSettings unless specifically included
  createdAt: string;    // Added
  updatedAt: string;    // Added
  settings: Record<string, any>;
}

// Type for parameters when updating settings
export interface UpdateOrgSettingsParams {
  orgId: string;
  name?: string;
  description?: string;
  subdomain?: string;
  industry?: string;
  settings?: Record<string, any>; // To update nested settings
}

// Params for creating an org by admin
export interface CreateOrgByAdminParams {
    name: string;
    ownerEmail: string;
    planType?: string;
    description?: string;
    subdomain?: string;
    industry?: string;
}


interface OrgState {
  currentOrg: Organization | null; // Should store the detailed Organization object
  userOrgs: Organization[]; // Orgs associated with the logged-in user (if not admin)
  allOrganizations: Organization[]; // For sys admin view of all orgs
  isLoading: boolean;
  isAdminLoading: boolean; // Specific loading for admin actions
  error: string | null;
  adminError: string | null; // Specific error for admin actions
}

const initialState: OrgState = {
  currentOrg: null,
  userOrgs: [],
  allOrganizations: [],
  isLoading: false,
  isAdminLoading: false,
  error: null,
  adminError: null,
};

// Async Thunks for current org (user-facing)
export const fetchCurrentOrgDetails = createAsyncThunk(
  'org/fetchCurrentOrgDetails',
  async (orgId: string, { rejectWithValue }) => {
    try {
      const orgDetails: OrganizationDetails = await Parse.Cloud.run('getOrganizationSettings', { orgId });
      // Transform OrganizationDetails (with objectId) to Organization (with id)
      return { ...orgDetails, id: orgDetails.objectId } as Organization;
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch organization details.');
      return rejectWithValue(error.message || 'Failed to fetch organization details.');
    }
  }
);

export const updateCurrentOrgSettings = createAsyncThunk(
  'org/updateCurrentOrgSettings',
  async (params: UpdateOrgSettingsParams, { rejectWithValue }) => {
    try {
      const updatedOrgData: OrganizationDetails = await Parse.Cloud.run('updateOrganizationSettings', params);
      toast.success('Organization settings updated successfully!');
      return { ...updatedOrgData, id: updatedOrgData.objectId } as Organization;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization settings.');
      return rejectWithValue(error.message || 'Failed to update organization settings.');
    }
  }
);

// Async Thunks for System Admin (Global Org Management)
export const fetchAllOrganizationsAdmin = createAsyncThunk(
  'org/fetchAllOrganizationsAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const orgsFromCloud: any[] = await Parse.Cloud.run('listOrganizationsForAdmin');
      // Ensure mapping aligns with the comprehensive Organization interface
      return orgsFromCloud.map(orgJson => ({
        id: orgJson.objectId,
        name: orgJson.name,
        description: orgJson.description,
        subdomain: orgJson.subdomain,
        industry: orgJson.industry,
        logo: orgJson.logo,
        plan: orgJson.planType || orgJson.plan, // Prioritize planType if available
        planType: orgJson.planType,
        status: orgJson.status,
        administrator: orgJson.administrator, // Cloud fn returns this (can be string or pointer-like)
        createdAt: orgJson.createdAt,
        updatedAt: orgJson.updatedAt,
        createdBy: orgJson.createdBy,
        updatedBy: orgJson.updatedBy,
        settings: orgJson.settings || {},
        // Map other fields if the cloud function returns them and they are in Organization interface
      })) as Organization[];
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch all organizations.');
      return rejectWithValue(error.message || 'Failed to fetch all organizations.');
    }
  }
);

export const createOrgByAdmin = createAsyncThunk(
  'org/createOrgByAdmin',
  async (params: CreateOrgByAdminParams, { dispatch, rejectWithValue }) => {
    try {
      const newOrgDataRaw: any = await Parse.Cloud.run('createOrganization', params);
      toast.success(`Organization "${params.name}" created successfully!`);
      dispatch(fetchAllOrganizationsAdmin());
      // Map the raw response to the Organization interface
      return {
        id: newOrgDataRaw.objectId,
        name: newOrgDataRaw.name,
        description: newOrgDataRaw.description,
        subdomain: newOrgDataRaw.subdomain,
        industry: newOrgDataRaw.industry,
        planType: newOrgDataRaw.planType,
        status: newOrgDataRaw.status,
        administrator: newOrgDataRaw.administrator,
        createdAt: newOrgDataRaw.createdAt,
        updatedAt: newOrgDataRaw.updatedAt,
        createdBy: newOrgDataRaw.createdBy,
        updatedBy: newOrgDataRaw.updatedBy,
        settings: newOrgDataRaw.settings || {},
      } as Organization;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization.');
      return rejectWithValue(error.message || 'Failed to create organization.');
    }
  }
);

export const suspendOrgByAdmin = createAsyncThunk(
  'org/suspendOrgByAdmin',
  async (orgId: string, { rejectWithValue }) => { // Removed dispatch as optimistic update is better
    try {
      const updatedOrgDataRaw: any = await Parse.Cloud.run('suspendOrganization', { orgId });
      toast.success(`Organization suspended successfully!`);
      return {
        id: updatedOrgDataRaw.objectId,
        name: updatedOrgDataRaw.name,
        status: updatedOrgDataRaw.status, // Key field that changed
        // Include all other fields to maintain Organization structure
        description: updatedOrgDataRaw.description,
        subdomain: updatedOrgDataRaw.subdomain,
        industry: updatedOrgDataRaw.industry,
        planType: updatedOrgDataRaw.planType,
        administrator: updatedOrgDataRaw.administrator,
        createdAt: updatedOrgDataRaw.createdAt,
        updatedAt: updatedOrgDataRaw.updatedAt,
        createdBy: updatedOrgDataRaw.createdBy,
        updatedBy: updatedOrgDataRaw.updatedBy,
        settings: updatedOrgDataRaw.settings || {},
       } as Organization;
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend organization.');
      return rejectWithValue(error.message || 'Failed to suspend organization.');
    }
  }
);

export const activateOrgByAdmin = createAsyncThunk(
  'org/activateOrgByAdmin',
  async (orgId: string, { rejectWithValue }) => { // Removed dispatch
    try {
      const updatedOrgDataRaw: any = await Parse.Cloud.run('activateOrganization', { orgId });
      toast.success(`Organization activated successfully!`);
      return {
        id: updatedOrgDataRaw.objectId,
        name: updatedOrgDataRaw.name,
        status: updatedOrgDataRaw.status, // Key field that changed
        description: updatedOrgDataRaw.description,
        subdomain: updatedOrgDataRaw.subdomain,
        industry: updatedOrgDataRaw.industry,
        planType: updatedOrgDataRaw.planType,
        administrator: updatedOrgDataRaw.administrator,
        createdAt: updatedOrgDataRaw.createdAt,
        updatedAt: updatedOrgDataRaw.updatedAt,
        createdBy: updatedOrgDataRaw.createdBy,
        updatedBy: updatedOrgDataRaw.updatedBy,
        settings: updatedOrgDataRaw.settings || {},
      } as Organization;
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate organization.');
      return rejectWithValue(error.message || 'Failed to activate organization.');
    }
  }
);


export const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    // fetchOrgsStart, fetchOrgsSuccess, fetchOrgsFailed might be deprecated if
    // userOrgs list is populated differently or if not needed directly by UI in favor of currentOrg focus.
    // For now, keeping them but they don't use createAsyncThunk.
    fetchOrgsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchOrgsSuccess: (state, action: PayloadAction<Organization[]>) => {
      state.userOrgs = action.payload;
      state.isLoading = false;
      // Logic to set currentOrg from this list might change if fetchCurrentOrgDetails is primary.
      if (action.payload.length > 0 && !state.currentOrg) {
        // state.currentOrg = action.payload[0]; // Potentially set a summary, then fetch details
      }
    },
    fetchOrgsFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setCurrentOrgById: (state, action: PayloadAction<string | null>) => {
        if (action.payload === null) {
            state.currentOrg = null;
        } else {
            const selected = state.userOrgs.find(org => org.id === action.payload);
            state.currentOrg = selected || null;
            // After setting, one might dispatch fetchCurrentOrgDetails(action.payload)
        }
    },
    // updateOrgTheme and updateOrgLogo might become part of updateCurrentOrgSettings
    // by modifying the 'settings.theme.primaryColor' or 'settings.theme.logoUrl'
    updateOrgTheme: (state, action: PayloadAction<{ primaryColor?: string; secondaryColor?: string }>) => {
      if (state.currentOrg) {
        state.currentOrg.settings = {
          ...state.currentOrg.settings,
          theme: {
            ...state.currentOrg.settings?.theme,
            ...action.payload,
          }
        };
      }
    },
    updateOrgLogo: (state, action: PayloadAction<string>) => {
      if (state.currentOrg) {
         state.currentOrg.settings = {
          ...state.currentOrg.settings,
          theme: {
            ...state.currentOrg.settings?.theme,
            logoUrl: action.payload,
          }
        };
      }
    },
    resetOrgState: (state) => { // Renamed to avoid conflict if 'resetOrg' is used elsewhere
      state.currentOrg = null;
      state.userOrgs = [];
      state.isLoading = false;
      state.error = null;
      state.adminError = null; // Reset admin error too
      state.allOrganizations = []; // Reset admin list on full reset
    }
  },
  extraReducers: (builder) => {
    builder
      // User-facing org details
      .addCase(fetchCurrentOrgDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentOrgDetails.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isLoading = false;
        state.currentOrg = action.payload;
        const index = state.userOrgs.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.userOrgs[index] = action.payload;
        } else {
          state.userOrgs.push(action.payload);
        }
      })
      .addCase(fetchCurrentOrgDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCurrentOrgSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCurrentOrgSettings.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isLoading = false;
        state.currentOrg = action.payload;
        const index = state.userOrgs.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.userOrgs[index] = action.payload;
        }
         // Also update in allOrganizations list if present (for admin consistency)
        const adminIndex = state.allOrganizations.findIndex(org => org.id === action.payload.id);
        if (adminIndex !== -1) {
            state.allOrganizations[adminIndex] = action.payload;
        }
      })
      .addCase(updateCurrentOrgSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // System Admin org management
      .addCase(fetchAllOrganizationsAdmin.pending, (state) => {
        state.isAdminLoading = true;
        state.adminError = null;
      })
      .addCase(fetchAllOrganizationsAdmin.fulfilled, (state, action: PayloadAction<Organization[]>) => {
        state.isAdminLoading = false;
        state.allOrganizations = action.payload;
      })
      .addCase(fetchAllOrganizationsAdmin.rejected, (state, action) => {
        state.isAdminLoading = false;
        state.adminError = action.payload as string;
      })
      .addCase(createOrgByAdmin.pending, (state) => {
        state.isAdminLoading = true;
      })
      .addCase(createOrgByAdmin.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isAdminLoading = false;
        // Re-fetch is handled by thunk, or could push: state.allOrganizations.push(action.payload);
      })
      .addCase(createOrgByAdmin.rejected, (state, action) => {
        state.isAdminLoading = false;
        state.adminError = action.payload as string;
      })
      .addCase(suspendOrgByAdmin.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isAdminLoading = false;
        const index = state.allOrganizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.allOrganizations[index] = action.payload;
        }
        if (state.currentOrg?.id === action.payload.id) state.currentOrg = action.payload;

      })
      .addCase(suspendOrgByAdmin.rejected, (state, action) => {
        state.isAdminLoading = false;
        state.adminError = action.payload as string;
      })
      .addCase(activateOrgByAdmin.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isAdminLoading = false;
        const index = state.allOrganizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.allOrganizations[index] = action.payload;
        }
        if (state.currentOrg?.id === action.payload.id) state.currentOrg = action.payload;
      })
      .addCase(activateOrgByAdmin.rejected, (state, action) => {
        state.isAdminLoading = false;
        state.adminError = action.payload as string;
      });
  }
});

export const {
  fetchOrgsStart,
  fetchOrgsSuccess,
  fetchOrgsFailed,
  setCurrentOrgById, // Changed from setCurrentOrg
  updateOrgTheme,
  updateOrgLogo,
  resetOrgState // Changed from resetOrg
} = orgSlice.actions;

export default orgSlice.reducer;
