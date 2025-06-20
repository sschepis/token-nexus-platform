/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';
import { callCloudFunction } from '../../utils/apiUtils';

/**
 * Refactored Organization slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive createAsyncThunk and Parse.Cloud.run patterns
 */

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
  id: string;
  name: string;
  description?: string;
  subdomain?: string;
  industry?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain?: string;
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
  status?: string;
  planType?: string;
  plan?: 'free' | 'standard' | 'enterprise' | string;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateOrgSettingsParams {
  orgId: string;
  name?: string;
  description?: string;
  subdomain?: string;
  industry?: string;
  settings?: Record<string, any>;
}

export interface CreateOrgByAdminParams {
  name: string;
  ownerEmail: string;
  planType?: string;
  description?: string;
  subdomain?: string;
  industry?: string;
}

interface OrgState extends ExtendedAsyncState {
  currentOrg: Organization | null;
  userOrgs: Organization[];
  allOrganizations: Organization[];
  isAdminLoading: boolean;
  adminError: string | null;
}

// Create async thunks using the factory
const orgThunks = {
  fetchCurrentOrgDetails: AsyncThunkFactory.create<string, Organization>({
    name: 'org/fetchCurrentOrgDetails',
    cloudFunction: 'getOrganizationProfile',
    transformParams: (orgId: string) => ({ orgId }),
    transformResponse: (response: any) => {
      if (!response.success || !response.organization) {
        throw new Error(response.message || 'Failed to fetch organization profile.');
      }
      return serializeOrganization(response.organization);
    },
    errorMessage: 'Failed to fetch organization details'
  }),

  updateCurrentOrgSettings: AsyncThunkFactory.create<UpdateOrgSettingsParams, Organization>({
    name: 'org/updateCurrentOrgSettings',
    cloudFunction: 'updateOrganizationSettings',
    transformResponse: (response: any) => {
      toast.success('Organization settings updated successfully!');
      return serializeOrganization({ ...response, id: response.objectId });
    },
    errorMessage: 'Failed to update organization settings'
  }),

  // This thunk needs custom logic for getState, so we'll keep it as createAsyncThunk
  fetchUserOrganizations: null as any, // Will be defined separately

  setCurrentOrganization: AsyncThunkFactory.create<string, Organization>({
    name: 'org/setCurrentOrganization',
    cloudFunction: 'setCurrentOrganization',
    transformParams: (orgId: string) => ({ orgId }),
    transformResponse: (result: any) => {
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
    },
    errorMessage: 'Failed to switch organization'
  }),

  fetchAllOrganizationsAdmin: AsyncThunkFactory.create<void, Organization[]>({
    name: 'org/fetchAllOrganizationsAdmin',
    cloudFunction: 'listOrganizationsForAdmin',
    transformResponse: (orgsFromCloud: any[]) => {
      return orgsFromCloud.map(orgJson => serializeOrganization(orgJson));
    },
    errorMessage: 'Failed to fetch all organizations'
  }),

  createOrgByAdmin: AsyncThunkFactory.create<CreateOrgByAdminParams, Organization>({
    name: 'org/createOrgByAdmin',
    cloudFunction: 'createOrganization',
    transformResponse: (response: any) => {
      toast.success('Organization created successfully!');
      return serializeOrganization(response);
    },
    errorMessage: 'Failed to create organization'
  }),

  suspendOrgByAdmin: AsyncThunkFactory.create<string, Organization>({
    name: 'org/suspendOrgByAdmin',
    cloudFunction: 'suspendOrganization',
    transformParams: (orgId: string) => ({ orgId }),
    transformResponse: (response: any) => {
      toast.success('Organization suspended successfully!');
      return serializeOrganization(response);
    },
    errorMessage: 'Failed to suspend organization'
  }),

  activateOrgByAdmin: AsyncThunkFactory.create<string, Organization>({
    name: 'org/activateOrgByAdmin',
    cloudFunction: 'activateOrganization',
    transformParams: (orgId: string) => ({ orgId }),
    transformResponse: (response: any) => {
      toast.success('Organization activated successfully!');
      return serializeOrganization(response);
    },
    errorMessage: 'Failed to activate organization'
  })
};

// Custom thunk for fetchUserOrganizations that needs getState access
export const fetchUserOrganizations = createAsyncThunk(
  'org/fetchUserOrganizations',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const currentUserId = state.auth.user?.id;

      if (!currentUserId) {
        console.warn('fetchUserOrganizations: No current user ID available.');
        return rejectWithValue('No current user found to fetch organizations for.');
      }

      const userDetailsResponse: any = await callCloudFunction('getUserDetails', { userId: currentUserId });
      
      if (!userDetailsResponse || !userDetailsResponse.success || !userDetailsResponse.data || !userDetailsResponse.data.organizations) {
        console.warn('getUserDetails did not return expected organizations array:', userDetailsResponse);
        return { organizations: [] as Organization[], currentOrganization: null };
      }
      
      const organizations = userDetailsResponse.data.organizations.map((orgJson: any) => serializeOrganization(orgJson));
      const currentOrganization = userDetailsResponse.data.currentOrganization ? serializeOrganization(userDetailsResponse.data.currentOrganization) : null;
      
      return { organizations, currentOrganization };
    } catch (error: any) {
      console.error('Failed to fetch user organizations:', error);
      return rejectWithValue(error.message || 'Failed to fetch user organizations.');
    }
  }
);

// Export thunks for backward compatibility
export const {
  fetchCurrentOrgDetails,
  updateCurrentOrgSettings,
  setCurrentOrganization,
  fetchAllOrganizationsAdmin,
  createOrgByAdmin,
  suspendOrgByAdmin,
  activateOrgByAdmin
} = orgThunks;

const initialState: OrgState = createAsyncInitialState({
  currentOrg: null,
  userOrgs: [],
  allOrganizations: [],
  isAdminLoading: false,
  adminError: null
}, { includeExtended: true });

const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    clearOrgErrors: (state) => {
      state.error = null;
      state.adminError = null;
    },
    
    clearCurrentOrg: (state) => {
      state.currentOrg = null;
    },
    
    setCurrentOrgLocal: (state, action: PayloadAction<Organization>) => {
      state.currentOrg = action.payload;
    },

    // Legacy reducers for backward compatibility
    fetchOrgsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    fetchOrgsSuccess: (state, action: PayloadAction<Organization[]>) => {
      state.userOrgs = action.payload.map(org => serializeOrganization(org));
      state.isLoading = false;
      if (action.payload.length > 0 && !state.currentOrg) {
        // Optionally set first org as current
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
      }
    },

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

    resetOrgState: (state) => {
      state.currentOrg = null;
      state.userOrgs = [];
      state.isLoading = false;
      state.error = null;
      state.adminError = null;
      state.allOrganizations = [];
    }
  },
  extraReducers: (builder) => {
    // Fetch current org details
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.fetchCurrentOrgDetails, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.currentOrg = action.payload;
        const index = state.userOrgs.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.userOrgs[index] = action.payload;
        } else {
          state.userOrgs.push(action.payload);
        }
      }
    });

    // Update current org settings
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.updateCurrentOrgSettings, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
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
      }
    });

    // Fetch user organizations (using custom thunk)
    AsyncReducerBuilder.addAsyncCase(builder, fetchUserOrganizations, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.userOrgs = action.payload.organizations;
        
        // Set current organization from the response
        if (action.payload.currentOrganization) {
          state.currentOrg = action.payload.currentOrganization;
          console.log(`Set current organization: ${action.payload.currentOrganization.name}`);
        } else if (!state.currentOrg && action.payload.organizations.length > 0) {
          // If no current org is set but we have orgs, set the first one
          state.currentOrg = action.payload.organizations[0];
          console.log(`Set first available organization as current: ${action.payload.organizations[0].name}`);
        }
      }
    });

    // Set current organization
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.setCurrentOrganization, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentOrg = action.payload;
        
        // Update the organization in userOrgs if it exists there
        const orgIndex = state.userOrgs.findIndex(org => org.id === action.payload.id);
        if (orgIndex >= 0) {
          state.userOrgs[orgIndex] = action.payload;
        }
      }
    });

    // Admin: Fetch all organizations
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.fetchAllOrganizationsAdmin, {
      loadingFlag: 'isAdminLoading',
      onFulfilled: (state, action) => {
        state.allOrganizations = action.payload;
        state.adminError = null;
      },
      onRejected: (state, action) => {
        state.adminError = action.payload || 'Failed to fetch all organizations';
      }
    });

    // Admin: Create organization
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.createOrgByAdmin, {
      loadingFlag: 'isAdminLoading',
      onFulfilled: (state, action) => {
        state.allOrganizations.push(action.payload);
        state.adminError = null;
      },
      onRejected: (state, action) => {
        state.adminError = action.payload || 'Failed to create organization';
      }
    });

    // Admin: Suspend organization
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.suspendOrgByAdmin, {
      loadingFlag: 'isAdminLoading',
      onFulfilled: (state, action) => {
        const index = state.allOrganizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.allOrganizations[index] = action.payload;
        }
        if (state.currentOrg?.id === action.payload.id) {
          state.currentOrg = action.payload;
        }
        state.adminError = null;
      },
      onRejected: (state, action) => {
        state.adminError = action.payload || 'Failed to suspend organization';
      }
    });

    // Admin: Activate organization
    AsyncReducerBuilder.addAsyncCase(builder, orgThunks.activateOrgByAdmin, {
      loadingFlag: 'isAdminLoading',
      onFulfilled: (state, action) => {
        const index = state.allOrganizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.allOrganizations[index] = action.payload;
        }
        if (state.currentOrg?.id === action.payload.id) {
          state.currentOrg = action.payload;
        }
        state.adminError = null;
      },
      onRejected: (state, action) => {
        state.adminError = action.payload || 'Failed to activate organization';
      }
    });
  },
});

export const {
  clearOrgErrors,
  clearCurrentOrg,
  setCurrentOrgLocal,
  fetchOrgsStart,
  fetchOrgsSuccess,
  fetchOrgsFailed,
  setCurrentOrgById,
  updateOrgTheme,
  updateOrgLogo,
  resetOrgState
} = orgSlice.actions;

export default orgSlice.reducer;

// Selectors
export const selectCurrentOrg = (state: { org: OrgState }) => state.org.currentOrg;
export const selectUserOrgs = (state: { org: OrgState }) => state.org.userOrgs;
export const selectAllOrganizations = (state: { org: OrgState }) => state.org.allOrganizations;
export const selectOrgLoading = (state: { org: OrgState }) => state.org.isLoading;
export const selectOrgError = (state: { org: OrgState }) => state.org.error;
export const selectAdminLoading = (state: { org: OrgState }) => state.org.isAdminLoading;
export const selectAdminError = (state: { org: OrgState }) => state.org.adminError;
