
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Layout } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';

// Define the available widget types
export type WidgetType = 
  | 'tokenStats' 
  | 'recentTokens' 
  | 'userMetrics' 
  | 'activityFeed' 
  | 'quickActions' 
  | 'chartWidget';

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
}

// Default titles for widget types
const defaultWidgetTitles: Record<WidgetType, string> = {
  tokenStats: 'Token Statistics',
  recentTokens: 'Recent Tokens',
  userMetrics: 'User Metrics',
  activityFeed: 'Activity Feed',
  quickActions: 'Quick Actions',
  chartWidget: 'Chart',
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
    default:
      return { ...baseLayout, w: 3, h: 3 };
  }
};

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
    }),
    {
      name: 'dashboard-storage',
    }
  )
);
