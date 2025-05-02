
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'org_admin' | 'developer' | 'viewer' | 'token_manager';
export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  kycStatus: KycStatus;
  createdAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface UserState {
  users: OrgUser[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  isLoading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchUsersStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchUsersSuccess: (state, action: PayloadAction<OrgUser[]>) => {
      state.users = action.payload;
      state.isLoading = false;
    },
    fetchUsersFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    inviteUserStart: (state) => {
      state.isLoading = true;
    },
    inviteUserSuccess: (state, action: PayloadAction<OrgUser>) => {
      state.users.push(action.payload);
      state.isLoading = false;
    },
    inviteUserFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateUserRole: (state, action: PayloadAction<{ userId: string; roles: UserRole[] }>) => {
      const user = state.users.find(u => u.id === action.payload.userId);
      if (user) {
        user.roles = action.payload.roles;
      }
    },
    updateUserStatus: (state, action: PayloadAction<{ userId: string; isActive: boolean }>) => {
      const user = state.users.find(u => u.id === action.payload.userId);
      if (user) {
        user.isActive = action.payload.isActive;
      }
    },
  },
});

export const {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailed,
  inviteUserStart,
  inviteUserSuccess,
  inviteUserFailed,
  updateUserRole,
  updateUserStatus
} = userSlice.actions;

export default userSlice.reducer;
