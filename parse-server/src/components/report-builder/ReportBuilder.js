/**
 * Report Builder Component
 * Main component for the visual report builder
 */

import React, { useState, useCallback } from 'react';
import { Box, Paper, ThemeProvider } from '@mui/material';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Toolbox } from './Toolbox';
import { PropertiesPanel } from './PropertiesPanel';
import { ChartComponent } from './ChartComponent';
import { TableComponent } from './TableComponent';
import { FilterComponent } from './FilterComponent';
import { useReportState } from './hooks/useReportState';
import { theme } from './theme';

const componentTypes = {
  chart: ChartComponent,
  table: TableComponent,
  filter: FilterComponent,
};

export const ReportBuilder = ({ config, initialState, onSave, onExport }) => {
  const {
    components,
    layout,
    addComponent,
    updateComponent,
    removeComponent,
    updateLayout,
    saveState,
    loadState,
  } = useReportState(initialState);

  const [selectedComponent, setSelectedComponent] = useState(null);

  // Handle component drop from toolbox
  const handleDrop = useCallback(
    (item, position) => {
      const { type, defaultConfig } = item;
      const id = `${type}-${Date.now()}`;

      addComponent({
        id,
        type,
        config: defaultConfig,
        position: {
          x: position.x,
          y: position.y,
          w: 6,
          h: 4,
        },
      });
    },
    [addComponent]
  );

  // Handle layout changes
  const handleLayoutChange = useCallback(
    newLayout => {
      updateLayout(newLayout);
    },
    [updateLayout]
  );

  // Handle component selection
  const handleComponentSelect = useCallback(componentId => {
    setSelectedComponent(componentId);
  }, []);

  // Handle component property updates
  const handlePropertyChange = useCallback(
    (componentId, changes) => {
      updateComponent(componentId, changes);
    },
    [updateComponent]
  );

  // Handle save
  const handleSave = useCallback(() => {
    const state = saveState();
    onSave?.(state);
  }, [saveState, onSave]);

  // Handle export
  const handleExport = useCallback(
    format => {
      const state = saveState();
      onExport?.(format, state);
    },
    [saveState, onExport]
  );

  // Render component based on type
  const renderComponent = useCallback(
    component => {
      const Component = componentTypes[component.type];
      if (!Component) return null;

      return (
        <Paper
          key={component.id}
          elevation={2}
          sx={{ width: '100%', height: '100%', overflow: 'hidden' }}
          onClick={() => handleComponentSelect(component.id)}
          data-testid={`${component.type}-component`}
        >
          <Component
            {...component.config}
            isSelected={selectedComponent === component.id}
            onConfigChange={changes => handlePropertyChange(component.id, changes)}
          />
        </Paper>
      );
    },
    [selectedComponent, handleComponentSelect, handlePropertyChange]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Toolbox */}
        <Box sx={{ width: 240, borderRight: 1, borderColor: 'divider' }}>
          <Toolbox
            components={config.components}
            onDragStart={() => {}}
            data-testid="report-toolbox"
          />
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, p: 2 }} data-testid="report-canvas">
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={30}
            width={1200}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".component-header"
          >
            {components.map(renderComponent)}
          </GridLayout>
        </Box>

        {/* Properties Panel */}
        <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider' }}>
          <PropertiesPanel
            component={components.find(c => c.id === selectedComponent)}
            onPropertyChange={handlePropertyChange}
            onSave={handleSave}
            onExport={handleExport}
            exportFormats={config.export}
            data-testid="properties-panel"
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

ReportBuilder.defaultProps = {
  config: {
    components: {
      charts: true,
      tables: true,
      filters: true,
    },
    theme: 'light',
    export: ['pdf', 'excel'],
  },
};
