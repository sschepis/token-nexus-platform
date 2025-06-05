/**
 * CMS Theme Class
 * Manages application styling and branding
 */

const Parse = require('parse/node');

class CMSTheme extends Parse.Object {
  constructor() {
    super('CMSTheme');
  }

  static get className() {
    return 'CMSTheme';
  }

  static get schema() {
    return {
      // Basic Info
      name: { type: 'String', required: true },
      description: { type: 'String' },
      version: { type: 'String', default: '1.0.0' },
      status: {
        type: 'String',
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
      },

      // Relationships
      application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      parent: { type: 'Pointer', targetClass: 'CMSTheme' }, // For theme inheritance

      // Color Palette
      colors: {
        type: 'Object',
        required: true,
        default: {
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#dc004e',
            light: '#ff4081',
            dark: '#9a0036',
            contrastText: '#ffffff',
          },
          error: {
            main: '#f44336',
            light: '#e57373',
            dark: '#d32f2f',
            contrastText: '#ffffff',
          },
          warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
            contrastText: '#000000',
          },
          info: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
            contrastText: '#ffffff',
          },
          success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#388e3c',
            contrastText: '#ffffff',
          },
          grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
          },
          background: {
            default: '#ffffff',
            paper: '#ffffff',
          },
          text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.54)',
            disabled: 'rgba(0, 0, 0, 0.38)',
            hint: 'rgba(0, 0, 0, 0.38)',
          },
        },
      },

      // Typography
      typography: {
        type: 'Object',
        required: true,
        default: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontSize: 14,
          fontWeightLight: 300,
          fontWeightRegular: 400,
          fontWeightMedium: 500,
          fontWeightBold: 700,
          h1: {
            fontSize: '2.5rem',
            fontWeight: 300,
            lineHeight: 1.2,
          },
          h2: {
            fontSize: '2rem',
            fontWeight: 300,
            lineHeight: 1.2,
          },
          h3: {
            fontSize: '1.75rem',
            fontWeight: 400,
            lineHeight: 1.2,
          },
          h4: {
            fontSize: '1.5rem',
            fontWeight: 400,
            lineHeight: 1.2,
          },
          h5: {
            fontSize: '1.25rem',
            fontWeight: 400,
            lineHeight: 1.2,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: 1.2,
          },
          body1: {
            fontSize: '1rem',
            fontWeight: 400,
            lineHeight: 1.5,
          },
          body2: {
            fontSize: '0.875rem',
            fontWeight: 400,
            lineHeight: 1.43,
          },
          button: {
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.75,
            textTransform: 'uppercase',
          },
        },
      },

      // Spacing and Layout
      spacing: {
        type: 'Object',
        required: true,
        default: {
          unit: 8,
          scale: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          custom: {},
        },
      },

      // Component Styles
      components: {
        type: 'Object',
        default: {
          // MUI-style component customization
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 4,
              },
            },
            variants: [],
          },
          // Add other component styles
        },
      },

      // Breakpoints
      breakpoints: {
        type: 'Object',
        required: true,
        default: {
          values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1920,
          },
          unit: 'px',
        },
      },

      // Transitions
      transitions: {
        type: 'Object',
        default: {
          easing: {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
          },
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
      },

      // Custom CSS
      customCSS: {
        type: 'String',
        default: '',
      },

      // Assets
      assets: {
        type: 'Object',
        default: {
          logo: null,
          favicon: null,
          fonts: [],
          icons: {},
        },
      },

      // Metadata
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
      publishedAt: { type: 'Date' },
    };
  }

  /**
   * Initialize theme
   */
  static async initialize(params) {
    const {
      name,
      description,
      application,
      createdBy,
      colors,
      typography,
      spacing,
      components = {},
    } = params;

    const theme = new CMSTheme();
    theme.set('name', name);
    theme.set('description', description);
    theme.set('application', application);
    theme.set('createdBy', createdBy);

    if (colors) {
      theme.set('colors', {
        ...theme.get('colors'),
        ...colors,
      });
    }

    if (typography) {
      theme.set('typography', {
        ...theme.get('typography'),
        ...typography,
      });
    }

    if (spacing) {
      theme.set('spacing', {
        ...theme.get('spacing'),
        ...spacing,
      });
    }

    theme.set('components', components);

    return theme.save(null, { useMasterKey: true });
  }

  /**
   * Generate CSS variables
   */
  generateCSSVariables() {
    const variables = [];

    // Colors
    this.processObjectToCSS(this.get('colors'), '--color', variables);

    // Typography
    this.processObjectToCSS(this.get('typography'), '--typography', variables);

    // Spacing
    this.processObjectToCSS(this.get('spacing'), '--spacing', variables);

    // Breakpoints
    this.processObjectToCSS(this.get('breakpoints').values, '--breakpoint', variables);

    return variables.map(v => `${v.name}: ${v.value};`).join('\n');
  }

  /**
   * Process object to CSS variables
   */
  processObjectToCSS(obj, prefix, variables, path = []) {
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = [...path, key];
      const varName = `${prefix}-${newPath.join('-')}`.toLowerCase();

      if (typeof value === 'object' && value !== null) {
        this.processObjectToCSS(value, prefix, variables, newPath);
      } else {
        variables.push({
          name: varName,
          value: value,
        });
      }
    });
  }

  /**
   * Generate complete CSS
   */
  generateCSS() {
    return `
      :root {
        ${this.generateCSSVariables()}
      }

      ${this.get('customCSS')}
    `;
  }

  /**
   * Get theme configuration
   */
  getConfig() {
    return {
      colors: this.get('colors'),
      typography: this.get('typography'),
      spacing: this.get('spacing'),
      breakpoints: this.get('breakpoints'),
      transitions: this.get('transitions'),
      components: this.get('components'),
    };
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const theme = request.object;

    // Set timestamps
    if (!theme.get('createdAt')) {
      theme.set('createdAt', new Date());
    }
    theme.set('updatedAt', new Date());

    // Validate color values
    this.validateColors(theme.get('colors'));
  }

  /**
   * Validate color values
   */
  static validateColors(colors) {
    const validateHex = color => {
      if (typeof color === 'string' && !color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
        throw new Error(`Invalid hex color: ${color}`);
      }
    };

    const validateColorObject = obj => {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          validateColorObject(value);
        } else if (key !== 'contrastText') {
          validateHex(value);
        }
      });
    };

    validateColorObject(colors);
  }
}

Parse.Object.registerSubclass('CMSTheme', CMSTheme);
module.exports = CMSTheme;
