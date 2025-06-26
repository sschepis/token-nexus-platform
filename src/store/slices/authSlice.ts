
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Parse from 'parse';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isAdmin?: boolean; // Added isAdmin property
  organizationId?: string; // Add organizationId to User interface
}

export interface AuthState {
  user: User | null;
  token: string | null;
  orgId: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  developerMode: boolean;
}

// Clean initial state - permissions will be populated by session restoration
const initialState: AuthState = {
  user: null,
  token: null,
  orgId: null,
  permissions: [], // Empty - will be populated by session restoration
  isAuthenticated: false,
  isLoading: false,
  error: null,
  developerMode: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; orgId: string | null; permissions: string[]; isAdmin?: boolean; organizations?: any[] }>) => {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.user = {
        ...action.payload.user,
        isAdmin: action.payload.isAdmin || false,
        organizationId: action.payload.orgId // Set organizationId on user object (can be null)
      };
      state.token = action.payload.token;
      state.orgId = action.payload.orgId;
      state.permissions = action.payload.permissions || [];
      state.error = null;
    },
    loginFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.orgId = null;
      state.permissions = [];
      state.developerMode = false;
      state.error = null;
      state.isLoading = false;
      
      // Clear Parse session to prevent token mismatch
      try {
        if (typeof window !== 'undefined' && Parse?.User?.logOut) {
          Parse.User.logOut().catch((error: any) => {
            console.debug('[Auth] Parse logout error (non-critical):', error);
          });
        }
      } catch (error) {
        console.debug('[Auth] Parse logout error (non-critical):', error);
      }
    },
    updatePermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
      console.log('[Auth] Permissions updated:', action.payload);
    },
    refreshPermissions: (state, action: PayloadAction<{ permissions: string[]; orgId: string | null }>) => {
      state.permissions = action.payload.permissions;
      state.orgId = action.payload.orgId;
      if (state.user) {
        state.user.organizationId = action.payload.orgId;
      }
      console.log('[Auth] Permissions and organization refreshed:', action.payload);
    },
    switchOrg: (state, action: PayloadAction<string>) => {
      state.orgId = action.payload;
      if (state.user) {
        state.user.organizationId = action.payload;
      }
    },
    toggleDeveloperMode: (state, action: PayloadAction<boolean>) => {
      state.developerMode = action.payload;
    }
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailed,
  logout,
  updatePermissions,
  refreshPermissions,
  switchOrg,
  toggleDeveloperMode
} = authSlice.actions;

export default authSlice.reducer;
