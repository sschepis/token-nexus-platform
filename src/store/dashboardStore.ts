/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // Import createJSONStorage
import { Layout } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '@/services/api'; // Import apiService
import { store } from './store'; // Import the actual store instance
import { RootState } from './store'; // Import RootState for typing

// Define the available widget types
export type WidgetType = 
  | 'tokenStats' 
  | 'recentTokens' 
  | 'userMetrics' 
  | 'activityFeed'
  | 'quickActions'
  | 'chartWidget'
  | 'installedApps'; // Added new widget type

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config?: Record<string, any>;
}

export interface DashboardState {
  layouts: Layout[];
  widgets: Widget[];
  addWidget: (widgetType: WidgetType, initialConfig?: Record<string, any>) => void;
  removeWidget: (widgetId: string) => void;
  updateLayout: (layouts: Layout[]) => void;
  updateWidgetConfig: (widgetId: string, config: Record<string, any>) => void;
  resetDashboard: () => void;
  setLayouts: (layouts: Layout[]) => void;
  setWidgets: (widgets: Widget[]) => void;
  saveDashboardLayout: () => Promise<void>; // New action to save layout
  loadDashboardLayout: () => Promise<void>; // New action to load layout
}

// Default titles for widget types
const defaultWidgetTitles: Record<WidgetType, string> = {
  tokenStats: 'Token Statistics',
  recentTokens: 'Recent Tokens',
  userMetrics: 'User Metrics',
  activityFeed: 'Activity Feed',
  quickActions: 'Quick Actions',
  chartWidget: 'Chart',
  installedApps: 'My Applications', // Added title for the new widget
};

// Initial layouts for each widget type
const getInitialLayout = (id: string, type: WidgetType): Layout => {
  const baseLayout = { i: id, x: 0, y: 0, minH: 2, minW: 1 };
  
  switch (type) {
    case 'tokenStats':
      return { ...baseLayout, w: 3, h: 2 };
    case 'recentTokens':
      return { ...baseLayout, w: 6, h: 6 };
    case 'userMetrics':
      return { ...baseLayout, w: 3, h: 4 };
    case 'activityFeed':
      return { ...baseLayout, w: 4, h: 6 };
    case 'quickActions':
      return { ...baseLayout, w: 3, h: 4 };
    case 'chartWidget':
      return { ...baseLayout, w: 6, h: 6 };
    case 'installedApps': // Added layout for the new widget
      return { ...baseLayout, w: 4, h: 4 };
    default:
      return { ...baseLayout, w: 3, h: 3 };
  }
};

// Module-level variable to prevent multiple simultaneous calls
let isLoadingDashboard = false;

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      layouts: [],
      widgets: [],
      
      addWidget: (widgetType: WidgetType, initialConfig = {}) => {
        const id = uuidv4();
        set((state) => {
          const newWidget = {
            id,
            type: widgetType,
            title: defaultWidgetTitles[widgetType],
            config: initialConfig,
          };
          const newLayout = getInitialLayout(id, widgetType);
          
          return {
            widgets: [...state.widgets, newWidget],
            layouts: [...state.layouts, newLayout],
          };
        });
      },
      
      removeWidget: (widgetId: string) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== widgetId),
          layouts: state.layouts.filter((l) => l.i !== widgetId),
        }));
      },
      
      updateLayout: (layouts: Layout[]) => {
        set({ layouts });
      },
      
      updateWidgetConfig: (widgetId: string, config: Record<string, any>) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === widgetId ? { ...widget, config: { ...widget.config, ...config } } : widget
          ),
        }));
      },
      
      resetDashboard: () => {
        set({ layouts: [], widgets: [] });
      },
      
      setLayouts: (layouts: Layout[]) => {
        set({ layouts });
      },
      
      setWidgets: (widgets: Widget[]) => {
        set({ widgets });
      },
    
      saveDashboardLayout: async () => {
        const state = useDashboardStore.getState(); // Get current state
        const rootState = store.getState() as RootState; // Access Redux store directly
        const { user, orgId } = rootState.auth; // Corrected to use orgId from auth slice

        if (!user || !orgId) {
          console.warn("User or organization not found, cannot save dashboard layout.");
          return;
        }

        try {
          await apiService.saveDashboardLayout({
            userId: user.id,
            orgId: orgId, // Corrected access
            layouts: state.layouts,
            widgets: state.widgets,
          });
          console.log("Dashboard layout saved successfully.");
        } catch (error) {
          console.error("Failed to save dashboard layout:", error);
          // Optionally dispatch an error to a Redux store if you have a general error slice
        }
      },

      loadDashboardLayout: async () => { // Removed userId and orgId parameters as they are fetched from Redux
        const rootState = store.getState() as RootState; // Access Redux store properly
        const { user, orgId } = rootState.auth; // Corrected to use orgId from auth slice

        if (!user || !orgId) {
          console.warn("User or organization not found, cannot load dashboard layout.");
          set({ layouts: [], widgets: [] }); // Set to empty if cannot load
          return;
        }

        // Prevent multiple simultaneous calls
        if (isLoadingDashboard) {
          console.log("Dashboard layout loading already in progress, skipping...");
          return;
        }

        try {
          isLoadingDashboard = true;
          console.log("Loading dashboard layout for user:", user.id, "org:", orgId);
          const response = await apiService.getDashboardLayout(user.id, orgId);
          if (response.data.layouts && response.data.widgets) {
              set({ layouts: response.data.layouts, widgets: response.data.widgets });
              console.log("Dashboard layout loaded successfully.");
          } else {
              set({ layouts: [], widgets: [] }); // Initialize to empty if no data returned
              console.log("No dashboard layout found, initialized with empty state.");
          }
        } catch (error) {
            console.error("Failed to load dashboard layout:", error);
            // If no layout exists, maybe initialize with default or empty
            set({ layouts: [], widgets: [] });
        } finally {
          isLoadingDashboard = false;
        }
      },
    }),
    {
      name: 'dashboard-storage',
      version: 1, // Increment version to trigger rehydration logic if schema changes
      storage: createJSONStorage(() => localStorage), // Use createJSONStorage for web
      partialize: (state) => ({ layouts: state.layouts, widgets: state.widgets }), // Only persist layouts and widgets
    }
  )
);
