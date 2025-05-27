/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import Parse from 'parse';
import { toast } from 'sonner';

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
}
export interface InviteUserToOrgParams {
  orgId: string;
  email: string;
  roles: string[];
}
export interface UpdateOrgUserRolesParams {
  orgId: string;
  userId: string;
  roles: string[];
}
export interface RemoveUserFromOrgParams {
  orgId: string;
  userId: string;
}

// For Admin Global User Management
export interface FetchUserDetailsAdminParams {
  userId: string;
}
export interface SuspendUserByAdminParams {
  userId: string;
}
export interface ReactivateUserByAdminParams {
  userId: string;
}


interface UserState {
  orgUsers: OrgUser[];
  isLoading: boolean; // For org-specific user actions
  error: string | null; // For org-specific user actions

  allUsers: AdminUserView[]; // For sysadmin global user list
  selectedUserDetailsAdmin: AdminUserView | null; // For sysadmin viewing/editing a user
  isAdminLoadingUsers: boolean; // Loading state for admin user actions
  adminUsersError: string | null; // Error state for admin user actions
}

const initialState: UserState = {
  orgUsers: [],
  isLoading: false,
  error: null,

  allUsers: [],
  selectedUserDetailsAdmin: null,
  isAdminLoadingUsers: false,
  adminUsersError: null,
};

// Async Thunks for Org-Specific User Management
export const fetchOrgUsers = createAsyncThunk(
  'user/fetchOrgUsers',
  async ({ orgId }: FetchOrgUsersParams, { rejectWithValue }) => {
    try {
      const users: OrgUser[] = await Parse.Cloud.run('getOrgUsers', { orgId });
      return users;
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch organization users.');
      return rejectWithValue(error.message || 'Failed to fetch organization users.');
    }
  }
);

export const inviteUserToOrganization = createAsyncThunk(
  'user/inviteUserToOrganization',
  async (params: InviteUserToOrgParams, { dispatch, rejectWithValue }) => {
    try {
      await Parse.Cloud.run('inviteUserToOrg', params);
      toast.success(`Invitation sent to ${params.email} or user added to organization.`);
      // Re-fetch users for the org to see the new/updated user
      dispatch(fetchOrgUsers({ orgId: params.orgId }));
      // The cloud function doesn't return the user object, so re-fetching is best.
      return { email: params.email }; // Indicate success for this email
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite user.');
      return rejectWithValue(error.message || 'Failed to invite user.');
    }
  }
);

export const updateOrgUserRoles = createAsyncThunk(
  'user/updateOrgUserRoles',
  async (params: UpdateOrgUserRolesParams, { dispatch, rejectWithValue }) => {
    try {
      await Parse.Cloud.run('updateUserRolesInOrg', params);
      toast.success(`Roles updated for user ${params.userId}.`);
      // Re-fetch to get updated roles
      dispatch(fetchOrgUsers({ orgId: params.orgId }));
      return { userId: params.userId, roles: params.roles };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user roles.');
      return rejectWithValue(error.message || 'Failed to update user roles.');
    }
  }
);

export const removeUserFromOrganization = createAsyncThunk(
  'user/removeUserFromOrganization',
  async (params: RemoveUserFromOrgParams, { rejectWithValue }) => {
    try {
      await Parse.Cloud.run('removeUserFromOrg', params);
      toast.success(`User ${params.userId} removed from organization.`);
      return { userId: params.userId, orgId: params.orgId }; // Return for optimistic update or logging
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove user from organization.');
      return rejectWithValue(error.message || 'Failed to remove user from organization.');
    }
  }
);

// Async Thunks for System Admin Global User Management
export const fetchAllUsersAdmin = createAsyncThunk(
  'user/fetchAllUsersAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const users: AdminUserView[] = await Parse.Cloud.run('listAllUsersAdmin');
      // Ensure the returned data matches AdminUserView structure, especially id vs objectId
      return users.map(u => ({...u, id: (u as any).objectId || u.id }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch all users.');
      return rejectWithValue(error.message || 'Failed to fetch all users.');
    }
  }
);

export const fetchUserDetailsAdmin = createAsyncThunk(
  'user/fetchUserDetailsAdmin',
  async ({ userId }: FetchUserDetailsAdminParams, { rejectWithValue }) => {
    try {
      const userDetails: AdminUserView = await Parse.Cloud.run('getUserDetailsAdmin', { userId });
      return {...userDetails, id: (userDetails as any).objectId || userDetails.id };
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch user details.');
      return rejectWithValue(error.message || 'Failed to fetch user details.');
    }
  }
);

export const suspendUserByAdmin = createAsyncThunk(
  'user/suspendUserByAdmin',
  async ({ userId }: SuspendUserByAdminParams, { dispatch, rejectWithValue }): Promise<{ userId: string; status: 'Suspended' } | ReturnType<typeof rejectWithValue>> => {
    try {
      await Parse.Cloud.run('suspendUserGlobal', { userId });
      toast.success(`User ${userId} suspended successfully.`);
      return { userId, status: 'Suspended' };
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend user.');
      return rejectWithValue(error.message || 'Failed to suspend user.');
    }
  }
);

export const reactivateUserByAdmin = createAsyncThunk(
  'user/reactivateUserByAdmin',
  async ({ userId }: ReactivateUserByAdminParams, { dispatch, rejectWithValue }): Promise<{ userId: string; status: 'Active' } | ReturnType<typeof rejectWithValue>> => {
    try {
      await Parse.Cloud.run('reactivateUserGlobal', { userId });
      toast.success(`User ${userId} reactivated successfully.`);
      return { userId, status: 'Active' };
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate user.');
      return rejectWithValue(error.message || 'Failed to reactivate user.');
    }
  }
);


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
    }
  },
  extraReducers: (builder) => {
    builder
      // Org-specific user management (No changes here for admin status)
      .addCase(fetchOrgUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrgUsers.fulfilled, (state, action: PayloadAction<OrgUser[]>) => {
        state.orgUsers = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchOrgUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(inviteUserToOrganization.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(inviteUserToOrganization.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(inviteUserToOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrgUserRoles.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateOrgUserRoles.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateOrgUserRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(removeUserFromOrganization.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(removeUserFromOrganization.fulfilled, (state, action: PayloadAction<{ userId: string; orgId: string }>) => {
        state.isLoading = false;
        state.orgUsers = state.orgUsers.filter(user => user.id !== action.payload.userId);
      })
      .addCase(removeUserFromOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // System Admin global user management
      .addCase(fetchAllUsersAdmin.pending, (state) => {
        state.isAdminLoadingUsers = true;
        state.adminUsersError = null;
      })
      .addCase(fetchAllUsersAdmin.fulfilled, (state, action: PayloadAction<AdminUserView[]>) => {
        state.allUsers = action.payload;
        state.isAdminLoadingUsers = false;
      })
      .addCase(fetchAllUsersAdmin.rejected, (state, action) => {
        state.isAdminLoadingUsers = false;
        state.adminUsersError = action.payload as string;
      })
      .addCase(fetchUserDetailsAdmin.pending, (state) => {
        state.isAdminLoadingUsers = true; // Could use a different flag for selected user loading
        state.selectedUserDetailsAdmin = null;
      })
      .addCase(fetchUserDetailsAdmin.fulfilled, (state, action: PayloadAction<AdminUserView>) => {
        state.selectedUserDetailsAdmin = action.payload;
        state.isAdminLoadingUsers = false;
      })
      .addCase(fetchUserDetailsAdmin.rejected, (state, action) => {
        state.isAdminLoadingUsers = false;
        state.adminUsersError = action.payload as string;
      })
      .addCase(suspendUserByAdmin.pending, (state) => { // Added pending for suspend
        state.isAdminLoadingUsers = true;
        state.adminUsersError = null;
      })
      .addCase(suspendUserByAdmin.fulfilled, (state, action: PayloadAction<{ userId: string; status: 'Suspended' }>) => {
        const userIndex = state.allUsers.findIndex(u => u.id === action.payload.userId);
        if (userIndex !== -1) {
          state.allUsers[userIndex].status = action.payload.status;
        }
        if (state.selectedUserDetailsAdmin?.id === action.payload.userId) {
          state.selectedUserDetailsAdmin.status = action.payload.status;
        }
        state.isAdminLoadingUsers = false;
      })
      .addCase(suspendUserByAdmin.rejected, (state, action) => {
         state.isAdminLoadingUsers = false;
         state.adminUsersError = action.payload as string;
      })
      .addCase(reactivateUserByAdmin.pending, (state) => { // Added pending for reactivate
        state.isAdminLoadingUsers = true;
        state.adminUsersError = null;
      })
      .addCase(reactivateUserByAdmin.fulfilled, (state, action: PayloadAction<{ userId: string; status: 'Active' }>) => {
        const userIndex = state.allUsers.findIndex(u => u.id === action.payload.userId);
        if (userIndex !== -1) {
          state.allUsers[userIndex].status = action.payload.status;
        }
         if (state.selectedUserDetailsAdmin?.id === action.payload.userId) {
          state.selectedUserDetailsAdmin.status = action.payload.status;
        }
        state.isAdminLoadingUsers = false;
      })
      .addCase(reactivateUserByAdmin.rejected, (state, action) => {
         state.isAdminLoadingUsers = false;
         state.adminUsersError = action.payload as string;
      });
  },
});

export const { clearOrgUsers } = userSlice.actions;

export default userSlice.reducer;
