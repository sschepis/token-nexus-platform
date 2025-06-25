/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored User slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive createAsyncThunk and error handling patterns
 */

export type UserRole = 'org_admin' | 'developer' | 'viewer' | 'token_manager'; // This might be org-specific role base names
export type KycStatus = 'pending' | 'verified' | 'rejected';

// Represents a user within the context of an organization, as returned by getOrgUsers
export interface OrgUser {
  id: string; // Parse User objectId
  username?: string; // Parse User username
  email: string;
  firstName?: string;
  lastName?: string;
  orgRoles: string[]; // Actual role names like 'editor_ORGID123' or just base names if UI constructs full name
  isSystemAdmin: boolean;
  createdAt: string; // ISO date string
  lastLoginAt?: string; // Not directly available from User object without custom tracking, but UI uses it
  avatarUrl?: string;
  isActive?: boolean;
  kycStatus?: KycStatus;
}

// Represents a user from the system admin's global perspective
export interface AdminUserView {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isSystemAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
  emailVerified?: boolean;
  orgId?: string;
  orgName?: string;
  status?: 'Active' | 'Suspended'; // Added for UI representation
  // roles?: string[]; // Global roles, if any, distinct from orgRoles
}

// --- Payload types for Thunks ---
// For Org Users
export interface FetchOrgUsersParams {
  orgId: string;
  [key: string]: unknown; // Add index signature for Record<string, unknown> compatibility
}

export interface InviteUserToOrgParams {
  orgId: string;
  email: string;
  roles: string[];
  [key: string]: unknown;
}

export interface UpdateOrgUserRolesParams {
  orgId: string;
  userId: string;
  roles: string[];
  [key: string]: unknown;
}

export interface RemoveUserFromOrgParams {
  orgId: string;
  userId: string;
  [key: string]: unknown;
}

// For Admin Global User Management
export interface FetchUserDetailsAdminParams {
  userId: string;
  [key: string]: unknown;
}

export interface SuspendUserByAdminParams {
  userId: string;
  [key: string]: unknown;
}

export interface ReactivateUserByAdminParams {
  userId: string;
  [key: string]: unknown;
}

interface UserState extends ExtendedAsyncState {
  orgUsers: OrgUser[];
  allUsers: AdminUserView[]; // For sysadmin global user list
  selectedUserDetailsAdmin: AdminUserView | null; // For sysadmin viewing/editing a user
  
  // Specific loading states
  isInviting: boolean;
  inviteError: string | null;
  isUpdatingRoles: boolean;
  updateRolesError: string | null;
  isRemoving: boolean;
  removeError: string | null;
  isAdminLoadingUsers: boolean; // Loading state for admin user actions
  adminUsersError: string | null; // Error state for admin user actions
  isSuspending: boolean;
  suspendError: string | null;
  isReactivating: boolean;
  reactivateError: string | null;
}

// Create async thunks using the factory
const userThunks = {
  // Org-specific user management
  fetchOrgUsers: AsyncThunkFactory.create<FetchOrgUsersParams, OrgUser[]>({
    name: 'user/fetchOrgUsers',
    cloudFunction: 'getOrgUsers',
    transformParams: (params) => ({ orgId: params.orgId }),
    transformResponse: (response: any) => response.users || response.data || response,
    errorMessage: 'Failed to fetch organization users'
  }),

  inviteUserToOrganization: AsyncThunkFactory.create<InviteUserToOrgParams, { email: string }>({
    name: 'user/inviteUserToOrganization',
    cloudFunction: 'inviteUserToOrg',
    transformParams: (params) => ({
      orgId: params.orgId,
      email: params.email,
      roles: params.roles
    }),
    transformResponse: (response: any) => ({ email: response.email || 'invited' }),
    errorMessage: 'Failed to invite user'
  }),

  updateOrgUserRoles: AsyncThunkFactory.create<UpdateOrgUserRolesParams, { userId: string; roles: string[] }>({
    name: 'user/updateOrgUserRoles',
    cloudFunction: 'updateUserRolesInOrg',
    transformParams: (params) => ({
      orgId: params.orgId,
      userId: params.userId,
      roles: params.roles
    }),
    transformResponse: (response: any) => ({
      userId: response.userId || response.id,
      roles: response.roles || []
    }),
    errorMessage: 'Failed to update user roles'
  }),

  removeUserFromOrganization: AsyncThunkFactory.create<RemoveUserFromOrgParams, { userId: string; orgId: string }>({
    name: 'user/removeUserFromOrganization',
    cloudFunction: 'removeUserFromOrg',
    transformParams: (params) => ({
      orgId: params.orgId,
      userId: params.userId
    }),
    transformResponse: (response: any) => ({
      userId: response.userId || response.id,
      orgId: response.orgId
    }),
    errorMessage: 'Failed to remove user from organization'
  }),

  // System Admin global user management
  fetchAllUsersAdmin: AsyncThunkFactory.create<undefined, AdminUserView[]>({
    name: 'user/fetchAllUsersAdmin',
    cloudFunction: 'listAllUsersAdmin',
    transformParams: () => ({}),
    transformResponse: (response: any) => {
      const users = response.data || response;
      // Ensure the returned data matches AdminUserView structure, especially id vs objectId
      return users.map((u: any) => ({...u, id: u.objectId || u.id }));
    },
    errorMessage: 'Failed to fetch all users'
  }),

  fetchUserDetailsAdmin: AsyncThunkFactory.create<FetchUserDetailsAdminParams, AdminUserView>({
    name: 'user/fetchUserDetailsAdmin',
    cloudFunction: 'getUserDetailsAdmin',
    transformParams: (params) => ({ userId: params.userId }),
    transformResponse: (response: any) => {
      const userDetails = response.data || response;
      return {...userDetails, id: userDetails.objectId || userDetails.id };
    },
    errorMessage: 'Failed to fetch user details'
  }),

  suspendUserByAdmin: AsyncThunkFactory.create<SuspendUserByAdminParams, { userId: string; status: 'Suspended' }>({
    name: 'user/suspendUserByAdmin',
    cloudFunction: 'suspendUserGlobal',
    transformParams: (params) => ({ userId: params.userId }),
    transformResponse: (response: any) => ({
      userId: response.userId || response.id,
      status: 'Suspended' as const
    }),
    errorMessage: 'Failed to suspend user'
  }),

  reactivateUserByAdmin: AsyncThunkFactory.create<ReactivateUserByAdminParams, { userId: string; status: 'Active' }>({
    name: 'user/reactivateUserByAdmin',
    cloudFunction: 'reactivateUserGlobal',
    transformParams: (params) => ({ userId: params.userId }),
    transformResponse: (response: any) => ({
      userId: response.userId || response.id,
      status: 'Active' as const
    }),
    errorMessage: 'Failed to reactivate user'
  })
};

// Export thunks for backward compatibility
export const {
  fetchOrgUsers,
  inviteUserToOrganization,
  updateOrgUserRoles,
  removeUserFromOrganization,
  fetchAllUsersAdmin,
  fetchUserDetailsAdmin,
  suspendUserByAdmin,
  reactivateUserByAdmin
} = userThunks;

const initialState: UserState = createAsyncInitialState({
  orgUsers: [],
  allUsers: [],
  selectedUserDetailsAdmin: null,
  
  // Specific loading states
  isInviting: false,
  inviteError: null,
  isUpdatingRoles: false,
  updateRolesError: null,
  isRemoving: false,
  removeError: null,
  isAdminLoadingUsers: false,
  adminUsersError: null,
  isSuspending: false,
  suspendError: null,
  isReactivating: false,
  reactivateError: null,
}, { includeExtended: true });

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Synchronous reducers can be added if needed, e.g., for clearing state on logout
    clearOrgUsers: (state) => {
      state.orgUsers = [];
      state.isLoading = false;
      state.error = null;
      state.isAdminLoadingUsers = false; // Also reset admin loading/error
      state.adminUsersError = null;
      state.allUsers = [];
      state.selectedUserDetailsAdmin = null;
    },

    clearInviteError: (state) => {
      state.inviteError = null;
    },

    clearUpdateRolesError: (state) => {
      state.updateRolesError = null;
    },

    clearRemoveError: (state) => {
      state.removeError = null;
    },

    clearAdminUsersError: (state) => {
      state.adminUsersError = null;
    },

    clearSuspendError: (state) => {
      state.suspendError = null;
    },

    clearReactivateError: (state) => {
      state.reactivateError = null;
    },

    clearAllErrors: (state) => {
      state.error = null;
      state.inviteError = null;
      state.updateRolesError = null;
      state.removeError = null;
      state.adminUsersError = null;
      state.suspendError = null;
      state.reactivateError = null;
    }
  },
  
  extraReducers: (builder) => {
    // Org-specific user management
    AsyncReducerBuilder.addAsyncCase(builder, userThunks.fetchOrgUsers, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.orgUsers = action.payload;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.inviteUserToOrganization, {
      loadingFlag: 'isInviting',
      onFulfilled: (state, action) => {
        state.inviteError = null;
        // Note: The actual user list will be updated by re-fetching in the component
      },
      onRejected: (state, action) => {
        state.inviteError = action.payload as string;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.updateOrgUserRoles, {
      loadingFlag: 'isUpdatingRoles',
      onFulfilled: (state, action) => {
        state.updateRolesError = null;
        // Note: The actual user list will be updated by re-fetching in the component
      },
      onRejected: (state, action) => {
        state.updateRolesError = action.payload as string;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.removeUserFromOrganization, {
      loadingFlag: 'isRemoving',
      onFulfilled: (state, action) => {
        state.orgUsers = state.orgUsers.filter(user => user.id !== action.payload.userId);
        state.removeError = null;
      },
      onRejected: (state, action) => {
        state.removeError = action.payload as string;
      }
    });

    // System Admin global user management
    AsyncReducerBuilder.addAsyncCase(builder, userThunks.fetchAllUsersAdmin, {
      loadingFlag: 'isAdminLoadingUsers',
      onFulfilled: (state, action) => {
        state.allUsers = action.payload;
        state.adminUsersError = null;
      },
      onRejected: (state, action) => {
        state.adminUsersError = action.payload as string;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.fetchUserDetailsAdmin, {
      loadingFlag: 'isAdminLoadingUsers',
      onFulfilled: (state, action) => {
        state.selectedUserDetailsAdmin = action.payload;
        state.adminUsersError = null;
      },
      onRejected: (state, action) => {
        state.adminUsersError = action.payload as string;
        state.selectedUserDetailsAdmin = null;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.suspendUserByAdmin, {
      loadingFlag: 'isSuspending',
      onFulfilled: (state, action) => {
        const userIndex = state.allUsers.findIndex(u => u.id === action.payload.userId);
        if (userIndex !== -1) {
          state.allUsers[userIndex].status = action.payload.status;
        }
        if (state.selectedUserDetailsAdmin?.id === action.payload.userId) {
          state.selectedUserDetailsAdmin.status = action.payload.status;
        }
        state.suspendError = null;
      },
      onRejected: (state, action) => {
        state.suspendError = action.payload as string;
      }
    });

    AsyncReducerBuilder.addAsyncCase(builder, userThunks.reactivateUserByAdmin, {
      loadingFlag: 'isReactivating',
      onFulfilled: (state, action) => {
        const userIndex = state.allUsers.findIndex(u => u.id === action.payload.userId);
        if (userIndex !== -1) {
          state.allUsers[userIndex].status = action.payload.status;
        }
        if (state.selectedUserDetailsAdmin?.id === action.payload.userId) {
          state.selectedUserDetailsAdmin.status = action.payload.status;
        }
        state.reactivateError = null;
      },
      onRejected: (state, action) => {
        state.reactivateError = action.payload as string;
      }
    });
  },
});

export const { 
  clearOrgUsers,
  clearInviteError,
  clearUpdateRolesError,
  clearRemoveError,
  clearAdminUsersError,
  clearSuspendError,
  clearReactivateError,
  clearAllErrors
} = userSlice.actions;

export default userSlice.reducer;
