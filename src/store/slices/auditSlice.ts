
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AuditEventType = 'user_activity' | 'security' | 'token_usage' | 'admin_action';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  description: string;
  userId: string;
  userEmail?: string;
  timestamp: string;
  severity: AuditSeverity;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface AuditState {
  events: AuditEvent[];
  isLoading: boolean;
  error: string | null;
  filters: {
    eventType: AuditEventType[] | null;
    severity: AuditSeverity[] | null;
    dateRange: {
      start: string | null;
      end: string | null;
    };
    userId: string | null;
  };
}

const initialState: AuditState = {
  events: [],
  isLoading: false,
  error: null,
  filters: {
    eventType: null,
    severity: null,
    dateRange: {
      start: null,
      end: null,
    },
    userId: null,
  },
};

export const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    fetchAuditEventsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchAuditEventsSuccess: (state, action: PayloadAction<AuditEvent[]>) => {
      state.events = action.payload;
      state.isLoading = false;
    },
    fetchAuditEventsFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setEventTypeFilter: (state, action: PayloadAction<AuditEventType[] | null>) => {
      state.filters.eventType = action.payload;
    },
    setSeverityFilter: (state, action: PayloadAction<AuditSeverity[] | null>) => {
      state.filters.severity = action.payload;
    },
    setDateRangeFilter: (state, action: PayloadAction<{ start: string | null; end: string | null }>) => {
      state.filters.dateRange = action.payload;
    },
    setUserFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.userId = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const {
  fetchAuditEventsStart,
  fetchAuditEventsSuccess,
  fetchAuditEventsFailed,
  setEventTypeFilter,
  setSeverityFilter,
  setDateRangeFilter,
  setUserFilter,
  resetFilters,
} = auditSlice.actions;

export default auditSlice.reducer;
