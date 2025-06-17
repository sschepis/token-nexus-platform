
import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useDashboardStore } from '@/store/dashboardStore';
import { WidgetRenderer } from './WidgetRenderer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutProps {
  isEditing: boolean;
}

export const GridLayout: React.FC<GridLayoutProps> = ({ isEditing }) => {
  const { layouts, widgets, updateLayout } = useDashboardStore();

  const handleLayoutChange = (currentLayout: any) => {
    if (isEditing) {
      updateLayout(currentLayout);
    }
  };

  // Create responsive layouts that respect column constraints
  const createResponsiveLayout = (baseLayouts: any[], maxCols: number) => {
    return baseLayouts.map(layout => ({
      ...layout,
      w: Math.min(layout.w, maxCols), // Ensure width doesn't exceed available columns
      minW: Math.min(layout.minW || 1, maxCols), // Ensure minW doesn't exceed available columns
      maxW: layout.maxW ? Math.min(layout.maxW, maxCols) : maxCols
    }));
  };

  const gridLayouts = {
    lg: layouts, // 12 columns - use original layouts
    md: createResponsiveLayout(layouts, 10), // 10 columns
    sm: createResponsiveLayout(layouts, 6),  // 6 columns
    xs: createResponsiveLayout(layouts, 4),  // 4 columns
    xxs: createResponsiveLayout(layouts, 2), // 2 columns
  };
  
  return (
    <div className="dashboard-grid">
      <ResponsiveGridLayout
        className="layout"
        layouts={gridLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="widget-container">
            <WidgetRenderer
              widget={widget}
              isEditing={isEditing}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};
