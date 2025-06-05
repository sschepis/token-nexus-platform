/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import Parse from 'parse';
import { toast } from 'sonner';

// Utility function to serialize Parse objects to plain objects
const serializeParseObject = (obj: any): any => {
  if (!obj) return obj;
  
  // Handle JSHandle objects (browser-specific objects that shouldn't be in Redux)
  if (obj.constructor && obj.constructor.name === 'JSHandle') {
    console.warn('JSHandle object detected in Redux state, converting to null:', obj);
    return null;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // If it's a Parse Object, convert to plain object
  if (obj.toJSON && typeof obj.toJSON === 'function') {
    const serialized = obj.toJSON();
    // Recursively serialize nested objects
    Object.keys(serialized).forEach(key => {
      if (serialized[key] instanceof Date) {
        serialized[key] = serialized[key].toISOString();
      } else if (serialized[key] && typeof serialized[key] === 'object') {
        serialized[key] = serializeParseObject(serialized[key]);
      }
    });
    return serialized;
  }
  
  // If it's a Parse object with get method, extract data manually
  if (obj.get && typeof obj.get === 'function') {
    const serialized: any = {
      objectId: obj.id || obj.get('objectId'),
      id: obj.id || obj.get('objectId'),
      className: obj.className,
    };
    
    // Common fields to extract
    const commonFields = ['email', 'username', 'name', 'createdAt', 'updatedAt'];
    commonFields.forEach(field => {
      try {
        const value = obj.get(field);
        if (value !== undefined) {
          serialized[field] = value instanceof Date ? value.toISOString() : serializeParseObject(value);
        }
      } catch (error) {
        // Ignore errors for fields that don't exist
      }
    });
    
    return serialized;
  }
  
  // If it's already a plain object with Parse-like structure, extract relevant fields
  if (obj.objectId || obj.id) {
    const serialized = {
      objectId: obj.objectId || obj.id,
      id: obj.objectId || obj.id,
      className: obj.className,
      email: obj.email,
      username: obj.username,
      name: obj.name,
      createdAt: obj.createdAt instanceof Date ? obj.createdAt.toISOString() : obj.createdAt,
      updatedAt: obj.updatedAt instanceof Date ? obj.updatedAt.toISOString() : obj.updatedAt,
    };
    
    // Remove undefined values
    Object.keys(serialized).forEach(key => {
      if (serialized[key as keyof typeof serialized] === undefined) {
        delete serialized[key as keyof typeof serialized];
      }
    });
    
    return serialized;
  }
  
  // For arrays, recursively serialize each element
  if (Array.isArray(obj)) {
    return obj.map(item => serializeParseObject(item));
  }
  
  // For plain objects, recursively serialize properties
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const serialized: any = {};
    Object.keys(obj).forEach(key => {
      serialized[key] = serializeParseObject(obj[key]);
    });
    return serialized;
  }
  
  return obj;
};

// Utility function to serialize organization data
const serializeOrganization = (orgJson: any): Organization => {
  return {
    id: orgJson.objectId || orgJson.id,
    name: orgJson.name,
    description: orgJson.description,
    subdomain: orgJson.subdomain,
    industry: orgJson.industry,
    logo: orgJson.logo,
    plan: orgJson.planType || orgJson.plan,
    planType: orgJson.planType,
    status: orgJson.status,
    administrator: serializeParseObject(orgJson.administrator),
    createdAt: orgJson.createdAt,
    updatedAt: orgJson.updatedAt,
    createdBy: serializeParseObject(orgJson.createdBy),
    updatedBy: serializeParseObject(orgJson.updatedBy),
    settings: orgJson.settings || {},
  };
};

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
  // All Parse objects are serialized to plain objects for Redux compatibility
  administrator?: {
    objectId: string;
    id: string;
    className?: string;
    email?: string;
    username?: string;
    name?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  status?: string; // e.g., "Active", "Suspended"
  planType?: string; // This is what listOrganizationsForAdmin likely returns for 'plan'
  plan?: 'free' | 'standard' | 'enterprise' | string; // Keep original plan for flexibility
  createdAt: string; // ISO date string (Parse default)
  updatedAt: string; // ISO date string (Parse default)
  createdBy?: {
    objectId: string;
    id: string;
    className?: string;
    username?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  updatedBy?: {
    objectId: string;
    id: string;
    className?: string;
    username?: string;
    createdAt?: string;
    updatedAt?: string;
  };
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
      // Changed 'getOrganizationSettings' to 'getOrganizationProfile'
      const profileResponse: any = await Parse.Cloud.run('getOrganizationProfile', { orgId });
      if (!profileResponse.success || !profileResponse.organization) {
        throw new Error(profileResponse.message || 'Failed to fetch organization profile.');
      }
      // The 'organization' field from getOrganizationProfile needs to be serialized
      return serializeOrganization(profileResponse.organization);
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
      return serializeOrganization({ ...updatedOrgData, id: updatedOrgData.objectId });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization settings.');
      return rejectWithValue(error.message || 'Failed to update organization settings.');
    }
  }
);

// Fetch organizations for the current user with robust error handling
export const fetchUserOrganizations = createAsyncThunk(
  'org/fetchUserOrganizations',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Changed 'getUserOrganizations' to 'getUserDetails' and get current user ID
      const state = getState() as { auth: { user: { id: string } | null } };
      const currentUserId = state.auth.user?.id;

      if (!currentUserId) {
        console.warn('fetchUserOrganizations: No current user ID available.');
        return rejectWithValue('No current user found to fetch organizations for.');
      }

      const userDetailsResponse: any = await Parse.Cloud.run('getUserDetails', { userId: currentUserId });
      
      if (!userDetailsResponse || !userDetailsResponse.organizations) {
        console.warn('getUserDetails did not return expected organizations array:', userDetailsResponse);
        return [] as Organization[];
      }
      
      return userDetailsResponse.organizations.map((orgJson: any) => serializeOrganization(orgJson));
    } catch (error: any) {
      console.error('Failed to fetch user organizations:', error);
      // Don't show toast for this as it might be called automatically
      return rejectWithValue(error.message || 'Failed to fetch user organizations.');
    }
  }
);

// Set current organization with validation
export const setCurrentOrganization = createAsyncThunk(
  'org/setCurrentOrganization',
  async (orgId: string, { rejectWithValue }) => {
    try {
      const result = await Parse.Cloud.run('setCurrentOrganization', {
        // orgId removed - now handled by middleware
      });
      if (result.success) {
        toast.success(`Switched to organization: ${result.orgName}`);
        return serializeOrganization({
          objectId: result.orgId,
          id: result.orgId,
          name: result.orgName,
          description: result.orgDescription,
          subdomain: result.orgSubdomain,
          industry: result.orgIndustry,
          logo: result.orgLogo,
          plan: result.orgPlanType,
          planType: result.orgPlanType,
          status: result.orgStatus,
          settings: result.orgSettings || {},
          createdAt: result.orgCreatedAt || new Date().toISOString(),
          updatedAt: result.orgUpdatedAt || new Date().toISOString(),
        });
      } else {
        throw new Error(result.message || 'Failed to switch organization');
      }
    } catch (error: any) {
      console.error('Failed to set current organization:', error);
      toast.error(error.message || 'Failed to switch organization');
      return rejectWithValue(error.message || 'Failed to switch organization');
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
      return orgsFromCloud.map(orgJson => serializeOrganization(orgJson));
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
      return serializeOrganization(newOrgDataRaw);
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
      return serializeOrganization(updatedOrgDataRaw);
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
      return serializeOrganization(updatedOrgDataRaw);
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
      // Serialize the organizations to ensure no ParseUser objects are stored in Redux
      state.userOrgs = action.payload.map(org => serializeOrganization(org));
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
      // User organizations
      .addCase(fetchUserOrganizations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserOrganizations.fulfilled, (state, action: PayloadAction<Organization[]>) => {
        state.isLoading = false;
        state.userOrgs = action.payload;
        
        // If no current org is set but we have orgs, try to set one from auth state
        if (!state.currentOrg && action.payload.length > 0) {
          // This will be handled by the auth flow or explicit organization switching
          console.log(`User has ${action.payload.length} organizations available`);
        }
      })
      .addCase(fetchUserOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Set current organization
      .addCase(setCurrentOrganization.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setCurrentOrganization.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isLoading = false;
        state.currentOrg = action.payload;
        
        // Update the organization in userOrgs if it exists there
        const orgIndex = state.userOrgs.findIndex(org => org.id === action.payload.id);
        if (orgIndex >= 0) {
          state.userOrgs[orgIndex] = action.payload;
        }
      })
      .addCase(setCurrentOrganization.rejected, (state, action) => {
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
