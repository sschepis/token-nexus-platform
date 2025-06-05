/**
 * Properties Panel Component
 * Configures selected report component properties
 */

import React, { useMemo } from 'react';
import {
  Box,
  Divider,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Switch,
  InputLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ColorPicker,
  Slider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';

// Property editors for different types of components
const ChartProperties = ({ config, onChange }) => (
  <>
    <FormControl fullWidth margin="normal">
      <InputLabel>Chart Type</InputLabel>
      <Select value={config.type} onChange={e => onChange({ type: e.target.value })}>
        <MenuItem value="line">Line Chart</MenuItem>
        <MenuItem value="bar">Bar Chart</MenuItem>
        <MenuItem value="pie">Pie Chart</MenuItem>
        <MenuItem value="area">Area Chart</MenuItem>
        <MenuItem value="scatter">Scatter Plot</MenuItem>
      </Select>
    </FormControl>

    <TextField
      fullWidth
      margin="normal"
      label="Title"
      value={config.title}
      onChange={e => onChange({ title: e.target.value })}
    />

    <TextField
      fullWidth
      margin="normal"
      label="X-Axis Field"
      value={config.xAxis}
      onChange={e => onChange({ xAxis: e.target.value })}
    />

    <TextField
      fullWidth
      margin="normal"
      label="Y-Axis Field"
      value={config.yAxis}
      onChange={e => onChange({ yAxis: e.target.value })}
    />

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Style</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControl fullWidth margin="normal">
          <InputLabel>Color Scheme</InputLabel>
          <Select
            value={config.colorScheme}
            onChange={e => onChange({ colorScheme: e.target.value })}
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="categorical">Categorical</MenuItem>
            <MenuItem value="sequential">Sequential</MenuItem>
            <MenuItem value="diverging">Diverging</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={config.showLegend}
              onChange={e => onChange({ showLegend: e.target.checked })}
            />
          }
          label="Show Legend"
        />

        <FormControlLabel
          control={
            <Switch
              checked={config.showGrid}
              onChange={e => onChange({ showGrid: e.target.checked })}
            />
          }
          label="Show Grid"
        />
      </AccordionDetails>
    </Accordion>
  </>
);

const TableProperties = ({ config, onChange }) => (
  <>
    <TextField
      fullWidth
      margin="normal"
      label="Title"
      value={config.title}
      onChange={e => onChange({ title: e.target.value })}
    />

    <FormControlLabel
      control={
        <Switch
          checked={config.pagination}
          onChange={e => onChange({ pagination: e.target.checked })}
        />
      }
      label="Enable Pagination"
    />

    <FormControlLabel
      control={
        <Switch
          checked={config.sortable}
          onChange={e => onChange({ sortable: e.target.checked })}
        />
      }
      label="Enable Sorting"
    />

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Columns</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {config.columns.map((column, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Column Header"
              value={column.header}
              onChange={e => {
                const newColumns = [...config.columns];
                newColumns[index].header = e.target.value;
                onChange({ columns: newColumns });
              }}
            />
            <TextField
              fullWidth
              label="Field"
              value={column.field}
              onChange={e => {
                const newColumns = [...config.columns];
                newColumns[index].field = e.target.value;
                onChange({ columns: newColumns });
              }}
            />
          </Box>
        ))}
        <Button
          variant="outlined"
          onClick={() => {
            const newColumns = [...config.columns, { header: '', field: '' }];
            onChange({ columns: newColumns });
          }}
        >
          Add Column
        </Button>
      </AccordionDetails>
    </Accordion>
  </>
);

const FilterProperties = ({ config, onChange }) => (
  <>
    <TextField
      fullWidth
      margin="normal"
      label="Title"
      value={config.title}
      onChange={e => onChange({ title: e.target.value })}
    />

    <FormControl fullWidth margin="normal">
      <InputLabel>Filter Type</InputLabel>
      <Select value={config.type} onChange={e => onChange({ type: e.target.value })}>
        <MenuItem value="select">Select</MenuItem>
        <MenuItem value="multiSelect">Multi Select</MenuItem>
        <MenuItem value="date">Date</MenuItem>
        <MenuItem value="dateRange">Date Range</MenuItem>
        <MenuItem value="text">Text</MenuItem>
        <MenuItem value="number">Number</MenuItem>
      </Select>
    </FormControl>

    <TextField
      fullWidth
      margin="normal"
      label="Field"
      value={config.field}
      onChange={e => onChange({ field: e.target.value })}
    />
  </>
);

export const PropertiesPanel = ({
  component,
  onPropertyChange,
  onSave,
  onExport,
  exportFormats,
}) => {
  // Get the appropriate property editor based on component type
  const PropertyEditor = useMemo(() => {
    if (!component) return null;

    switch (component.type) {
      case 'chart':
        return ChartProperties;
      case 'table':
        return TableProperties;
      case 'filter':
        return FilterProperties;
      default:
        return null;
    }
  }, [component]);

  if (!component) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="textSecondary">Select a component to edit its properties</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Properties</Typography>
        <Typography variant="caption" color="textSecondary">
          {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
        </Typography>
      </Box>

      {/* Properties Form */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {PropertyEditor && <PropertyEditor config={component.config} onChange={onPropertyChange} />}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={onSave}
          sx={{ mb: 1 }}
        >
          Save Report
        </Button>

        {exportFormats?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Export As
            </Typography>
            {exportFormats.map(format => (
              <Button
                key={format}
                fullWidth
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => onExport(format)}
                sx={{ mb: 1 }}
                data-testid={`export-${format}`}
              >
                {format.toUpperCase()}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

PropertiesPanel.defaultProps = {
  exportFormats: ['pdf', 'excel'],
};
