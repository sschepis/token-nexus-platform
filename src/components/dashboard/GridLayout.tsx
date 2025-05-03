
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

  // Convert our layout to the format expected by react-grid-layout
  const gridLayouts = {
    lg: layouts,
    md: layouts,
    sm: layouts,
    xs: layouts,
    xxs: layouts,
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
