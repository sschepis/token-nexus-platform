/**
 * Report Builder Theme
 * Theme configuration for report builder components
 */

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  components: {
    // Report Builder specific components
    ReportBuilder: {
      styleOverrides: {
        root: {
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        },
      },
    },

    // Toolbox styling
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: 240,
          backgroundColor: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },

    // Component styling
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },

    // Grid layout styling
    GridLayout: {
      styleOverrides: {
        root: {
          '& .react-grid-item': {
            border: '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'box-shadow 0.3s ease-in-out',
            '&:hover': {
              boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
            },
            '&.react-draggable-dragging': {
              boxShadow: '0 5px 10px rgba(0,0,0,0.20)',
            },
          },
          '& .react-resizable-handle': {
            backgroundColor: 'transparent',
            '&::after': {
              borderColor: 'rgba(0, 0, 0, 0.37)',
            },
          },
        },
      },
    },

    // Chart component styling
    ChartComponent: {
      styleOverrides: {
        root: {
          padding: '16px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        title: {
          marginBottom: '16px',
        },
        chart: {
          flex: 1,
          minHeight: 0,
        },
      },
    },

    // Table component styling
    TableComponent: {
      styleOverrides: {
        root: {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        header: {
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        },
        cell: {
          padding: '8px 16px',
        },
      },
    },

    // Filter component styling
    FilterComponent: {
      styleOverrides: {
        root: {
          padding: '16px',
        },
        header: {
          marginBottom: '16px',
        },
      },
    },
  },

  // Color palette
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff4081',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },

  // Typography
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h6: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },

  // Shape
  shape: {
    borderRadius: 4,
  },

  // Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },

  // Spacing
  spacing: 8,

  // Breakpoints
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },

  // Custom theme variables
  custom: {
    // Toolbox
    toolbox: {
      width: 240,
      backgroundColor: '#ffffff',
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },

    // Properties panel
    propertiesPanel: {
      width: 300,
      backgroundColor: '#ffffff',
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },

    // Component styles
    component: {
      headerHeight: 40,
      padding: 16,
      borderRadius: 4,
      borderColor: 'rgba(0, 0, 0, 0.12)',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      hoverBoxShadow: '0 3px 6px rgba(0,0,0,0.16)',
      draggingBoxShadow: '0 5px 10px rgba(0,0,0,0.20)',
    },

    // Chart colors
    chartColors: {
      primary: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
      categorical: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'],
      sequential: ['#deebf7', '#9ecae1', '#3182bd', '#08519c', '#08306b'],
      diverging: ['#d73027', '#fc8d59', '#fee090', '#e0f3f8', '#91bfdb'],
    },
  },
});

export default theme;
