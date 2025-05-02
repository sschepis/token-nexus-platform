
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain?: string;
  plan: 'free' | 'standard' | 'enterprise';
}

interface OrgState {
  currentOrg: Organization | null;
  userOrgs: Organization[];
  isLoading: boolean;
  error: string | null;
}

const initialState: OrgState = {
  currentOrg: null,
  userOrgs: [],
  isLoading: false,
  error: null,
};

export const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    fetchOrgsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchOrgsSuccess: (state, action: PayloadAction<Organization[]>) => {
      state.userOrgs = action.payload;
      state.isLoading = false;
      if (action.payload.length > 0 && !state.currentOrg) {
        state.currentOrg = action.payload[0];
      }
    },
    fetchOrgsFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setCurrentOrg: (state, action: PayloadAction<Organization>) => {
      state.currentOrg = action.payload;
    },
    updateOrgTheme: (state, action: PayloadAction<{ primaryColor?: string; secondaryColor?: string }>) => {
      if (state.currentOrg) {
        state.currentOrg = {
          ...state.currentOrg,
          ...action.payload
        };
      }
    },
    updateOrgLogo: (state, action: PayloadAction<string>) => {
      if (state.currentOrg) {
        state.currentOrg.logo = action.payload;
      }
    }
  },
});

export const {
  fetchOrgsStart,
  fetchOrgsSuccess,
  fetchOrgsFailed,
  setCurrentOrg,
  updateOrgTheme,
  updateOrgLogo
} = orgSlice.actions;

export default orgSlice.reducer;
