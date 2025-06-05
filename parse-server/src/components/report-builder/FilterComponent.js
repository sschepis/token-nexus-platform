/**
 * Filter Component
 * Handles data filtering across report components
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Button,
  Paper,
  Popover,
  Stack,
  Switch,
  FormControlLabel,
  Slider,
  DatePicker,
  DateRangePicker,
} from '@mui/material';
import { FilterList as FilterIcon, Clear as ClearIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

// Filter type components
const FilterTypes = {
  // Select filter
  select: ({ value, onChange, options, multiple }) => (
    <FormControl fullWidth>
      <Select
        multiple={multiple}
        value={multiple ? value || [] : value || ''}
        onChange={e => onChange(e.target.value)}
        renderValue={
          multiple
            ? selected => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(value => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )
            : undefined
        }
      >
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  ),

  // Date filter
  date: ({ value, onChange }) => (
    <DatePicker
      value={value ? new Date(value) : null}
      onChange={date => onChange(date?.toISOString())}
      renderInput={params => <TextField {...params} fullWidth />}
    />
  ),

  // Date range filter
  dateRange: ({ value, onChange }) => (
    <DateRangePicker
      value={value ? [new Date(value[0]), new Date(value[1])] : [null, null]}
      onChange={([start, end]) => onChange([start?.toISOString(), end?.toISOString()])}
      renderInput={(startProps, endProps) => (
        <Stack direction="row" spacing={2}>
          <TextField {...startProps} />
          <TextField {...endProps} />
        </Stack>
      )}
    />
  ),

  // Text filter
  text: ({ value, onChange }) => (
    <TextField fullWidth value={value || ''} onChange={e => onChange(e.target.value)} />
  ),

  // Number filter
  number: ({ value, onChange, min, max, step }) => (
    <Box sx={{ width: '100%', px: 2 }}>
      <Slider
        value={value || min}
        onChange={(_, newValue) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        marks={[
          { value: min, label: min },
          { value: max, label: max },
        ]}
      />
    </Box>
  ),

  // Boolean filter
  boolean: ({ value, onChange, label }) => (
    <FormControlLabel
      control={<Switch checked={Boolean(value)} onChange={e => onChange(e.target.checked)} />}
      label={label}
    />
  ),
};

export const FilterComponent = ({
  title,
  type = 'select',
  field,
  dataSource,
  options: staticOptions,
  config = {},
  value,
  onChange,
  className,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [localValue, setLocalValue] = useState(value);

  // Fetch filter options if dataSource is provided
  const { data: dynamicOptions, isLoading } = useQuery(
    ['filterOptions', dataSource, field],
    async () => {
      const response = await fetch(`/api/filters/${dataSource}/${field}`);
      if (!response.ok) throw new Error('Failed to fetch filter options');
      return response.json();
    },
    {
      enabled: !!dataSource && !!field,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Combine static and dynamic options
  const options = staticOptions || dynamicOptions || [];

  // Handle filter changes
  const handleChange = useCallback(
    newValue => {
      setLocalValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  // Handle filter clear
  const handleClear = useCallback(() => {
    setLocalValue(undefined);
    onChange?.(undefined);
  }, [onChange]);

  // Get the appropriate filter component
  const FilterComponent = FilterTypes[type];

  if (!FilterComponent) {
    console.error(`Unknown filter type: ${type}`);
    return null;
  }

  return (
    <Box
      sx={{
        width: '100%',
        p: 2,
      }}
      className={className}
      data-testid="filter-component"
    >
      {/* Filter Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">{title}</Typography>
        <Box>
          <IconButton size="small" onClick={handleClear} disabled={!localValue}>
            <ClearIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
            <FilterIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Filter Content */}
      <Paper sx={{ p: 2 }}>
        <FilterComponent value={localValue} onChange={handleChange} options={options} {...config} />
      </Paper>

      {/* Filter Options Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter Options
          </Typography>

          {type === 'select' && (
            <FormControlLabel
              control={
                <Switch
                  checked={config.multiple}
                  onChange={e => onChange?.({ ...config, multiple: e.target.checked })}
                />
              }
              label="Multiple Selection"
            />
          )}

          {type === 'number' && (
            <>
              <TextField
                label="Min"
                type="number"
                value={config.min}
                onChange={e => onChange?.({ ...config, min: Number(e.target.value) })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Max"
                type="number"
                value={config.max}
                onChange={e => onChange?.({ ...config, max: Number(e.target.value) })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Step"
                type="number"
                value={config.step}
                onChange={e => onChange?.({ ...config, step: Number(e.target.value) })}
                fullWidth
                margin="normal"
              />
            </>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

FilterComponent.defaultProps = {
  type: 'select',
  config: {},
  options: [],
};
