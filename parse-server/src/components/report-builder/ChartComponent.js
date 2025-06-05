/**
 * Chart Component
 * Renders various chart types using recharts
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

// Color schemes
const colorSchemes = {
  default: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'],
  categorical: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'],
  sequential: ['#deebf7', '#9ecae1', '#3182bd', '#08519c', '#08306b'],
  diverging: ['#d73027', '#fc8d59', '#fee090', '#e0f3f8', '#91bfdb'],
};

// Chart type components
const charts = {
  line: ({ data, config }) => (
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xAxis} />
      <YAxis />
      <Tooltip />
      {config.showLegend && <Legend />}
      <Line
        type="monotone"
        dataKey={config.yAxis}
        stroke={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
        activeDot={{ r: 8 }}
      />
    </LineChart>
  ),

  bar: ({ data, config }) => (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xAxis} />
      <YAxis />
      <Tooltip />
      {config.showLegend && <Legend />}
      <Bar
        dataKey={config.yAxis}
        fill={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
      />
    </BarChart>
  ),

  pie: ({ data, config }) => (
    <PieChart>
      <Pie
        data={data}
        dataKey={config.yAxis}
        nameKey={config.xAxis}
        cx="50%"
        cy="50%"
        outerRadius={80}
        fill={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
        label
      />
      <Tooltip />
      {config.showLegend && <Legend />}
    </PieChart>
  ),

  area: ({ data, config }) => (
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xAxis} />
      <YAxis />
      <Tooltip />
      {config.showLegend && <Legend />}
      <Area
        type="monotone"
        dataKey={config.yAxis}
        stroke={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
        fill={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
        fillOpacity={0.3}
      />
    </AreaChart>
  ),

  scatter: ({ data, config }) => (
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={config.xAxis} />
      <YAxis dataKey={config.yAxis} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      {config.showLegend && <Legend />}
      <Scatter
        data={data}
        fill={colorSchemes[config.colorScheme]?.[0] || colorSchemes.default[0]}
      />
    </ScatterChart>
  ),
};

export const ChartComponent = ({
  type = 'line',
  title,
  xAxis,
  yAxis,
  dataSource,
  colorScheme = 'default',
  showLegend = true,
  showGrid = true,
  height = 300,
  filters = {},
  onDataLoad,
  className,
}) => {
  // Fetch data using react-query
  const { data, isLoading, error } = useQuery(
    ['chartData', dataSource, filters],
    async () => {
      const response = await fetch(`/api/data/${dataSource}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      onDataLoad?.(data);
      return data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get the appropriate chart component
  const ChartType = useMemo(() => charts[type], [type]);

  // Prepare chart configuration
  const chartConfig = {
    xAxis,
    yAxis,
    colorScheme,
    showLegend,
    showGrid,
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
      data-testid="chart-component"
    >
      {/* Chart Title */}
      {title && (
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
      )}

      {/* Chart Content */}
      <Box sx={{ flex: 1, minHeight: height }}>
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.main',
            }}
          >
            <Typography>Error loading chart data</Typography>
          </Box>
        ) : !data?.length ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography>No data available</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ChartType data={data} config={chartConfig} />
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

ChartComponent.defaultProps = {
  type: 'line',
  colorScheme: 'default',
  showLegend: true,
  showGrid: true,
  height: 300,
  filters: {},
};
