/**
 * Toolbox Component
 * Provides draggable components for the report builder
 */

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  BarChart as ChartIcon,
  TableChart as TableIcon,
  FilterList as FilterIcon,
  TextFields as TextIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useDrag } from 'react-dnd';

// Component configurations
const componentConfigs = {
  chart: {
    icon: ChartIcon,
    label: 'Chart',
    description: 'Add a chart visualization',
    defaultConfig: {
      type: 'line',
      xAxis: 'category',
      yAxis: 'value',
      title: 'New Chart',
    },
  },
  table: {
    icon: TableIcon,
    label: 'Table',
    description: 'Add a data table',
    defaultConfig: {
      columns: [],
      pagination: true,
      sortable: true,
      title: 'New Table',
    },
  },
  filter: {
    icon: FilterIcon,
    label: 'Filter',
    description: 'Add a data filter',
    defaultConfig: {
      type: 'select',
      field: '',
      multiple: false,
      title: 'New Filter',
    },
  },
  text: {
    icon: TextIcon,
    label: 'Text',
    description: 'Add text content',
    defaultConfig: {
      content: 'New Text Block',
      style: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
  },
  image: {
    icon: ImageIcon,
    label: 'Image',
    description: 'Add an image',
    defaultConfig: {
      src: '',
      alt: 'Image',
      fit: 'contain',
    },
  },
};

// Draggable component item
const DraggableItem = ({ type, config }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'REPORT_COMPONENT',
    item: { type, defaultConfig: config.defaultConfig },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const Icon = config.icon;

  return (
    <Tooltip title={config.description} placement="right">
      <ListItem
        ref={drag}
        button
        sx={{
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        data-testid={`${type}-tool`}
      >
        <ListItemIcon>
          <Icon color="primary" />
        </ListItemIcon>
        <ListItemText primary={config.label} />
      </ListItem>
    </Tooltip>
  );
};

export const Toolbox = ({ components, className }) => {
  // Filter available components based on configuration
  const availableComponents = Object.entries(componentConfigs).filter(([key]) => components[key]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
      className={className}
      data-testid="report-toolbox"
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          Components
        </Typography>
      </Box>

      <List>
        {availableComponents.map(([type, config]) => (
          <DraggableItem key={type} type={type} config={config} />
        ))}
      </List>

      {/* Component Categories */}
      <Box sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" color="textSecondary">
          Visualizations
        </Typography>
        <List dense>
          {['chart', 'table'].map(
            type =>
              componentConfigs[type] &&
              components[type] && (
                <DraggableItem key={type} type={type} config={componentConfigs[type]} />
              )
          )}
        </List>

        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }}>
          Controls
        </Typography>
        <List dense>
          {['filter'].map(
            type =>
              componentConfigs[type] &&
              components[type] && (
                <DraggableItem key={type} type={type} config={componentConfigs[type]} />
              )
          )}
        </List>

        <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }}>
          Content
        </Typography>
        <List dense>
          {['text', 'image'].map(
            type =>
              componentConfigs[type] &&
              components[type] && (
                <DraggableItem key={type} type={type} config={componentConfigs[type]} />
              )
          )}
        </List>
      </Box>

      {/* Help Text */}
      <Box sx={{ p: 2, mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Drag and drop components onto the canvas to build your report. Click on a component to
          edit its properties.
        </Typography>
      </Box>
    </Box>
  );
};

Toolbox.defaultProps = {
  components: {
    chart: true,
    table: true,
    filter: true,
    text: true,
    image: true,
  },
};
