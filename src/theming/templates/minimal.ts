import { ThemeTemplate } from '../types/theme.types';

/**
 * Minimal theme template - Clean and simple design
 * Suitable for organizations that prefer understated, clean aesthetics
 */

export const minimalTheme: ThemeTemplate = {
  id: 'minimal-template',
  name: 'Minimal Clean',
  description: 'A clean, minimal theme with subtle colors and plenty of whitespace for organizations that prefer understated aesthetics.',
  category: 'minimal',
  preview: '/theme-previews/minimal.png',
  tags: ['minimal', 'clean', 'simple', 'whitespace', 'subtle'],
  popularity: 78,
  isPublic: true,
  theme: {
    name: 'Minimal Clean',
    version: '1.0.0',
    description: 'Minimal theme with subtle grays and clean typography',
    colors: {
      primary: '#374151', // Gray-700
      secondary: '#6b7280', // Gray-500
      accent: '#059669', // Emerald-600
      background: '#ffffff',
      surface: '#ffffff',
      text: {
        primary: '#111827',
        secondary: '#6b7280',
        muted: '#9ca3af'
      },
      border: '#f3f4f6',
      input: '#ffffff',
      ring: '#374151',
      destructive: '#dc2626',
      warning: '#d97706',
      success: '#059669',
      info: '#0284c7',
      neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712'
      }
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      sizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem'
      },
      weights: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800
      },
      lineHeights: {
        tight: '1.25',
        normal: '1.6', // Slightly more relaxed for readability
        relaxed: '1.75',
        loose: '2'
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em'
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
      '4xl': '6rem',
      '5xl': '8rem',
      '6xl': '12rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.375rem',
      xl: '0.5rem',
      '2xl': '0.75rem',
      '3xl': '1rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.1)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
      none: '0 0 #0000'
    },
    components: {
      button: {
        variants: {
          primary: {
            backgroundColor: 'var(--theme-primary)',
            color: 'white',
            border: '1px solid var(--theme-primary)',
            fontWeight: '500'
          },
          secondary: {
            backgroundColor: 'var(--theme-background)',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border)',
            fontWeight: '500'
          },
          outline: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border)',
            fontWeight: '400'
          },
          ghost: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-secondary)',
            border: 'none',
            fontWeight: '400'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-md)',
          padding: '0.5rem 1rem',
          fontSize: 'var(--theme-text-sm)',
          transition: 'all 150ms ease-in-out',
          boxShadow: 'none'
        }
      },
      card: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            boxShadow: 'none'
          },
          elevated: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            boxShadow: 'var(--theme-shadow-sm)'
          },
          flat: {
            backgroundColor: 'var(--theme-surface)',
            border: 'none',
            boxShadow: 'none'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-lg)',
          padding: 'var(--theme-spacing-xl)'
        }
      },
      input: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-input)',
            border: '1px solid var(--theme-border)',
            color: 'var(--theme-text-primary)'
          },
          focused: {
            borderColor: 'var(--theme-primary)',
            boxShadow: 'none',
            outline: '2px solid var(--theme-primary)',
            outlineOffset: '-1px'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-md)',
          padding: '0.75rem 1rem',
          fontSize: 'var(--theme-text-base)',
          transition: 'all 150ms ease-in-out'
        }
      },
      sidebar: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            borderRight: '1px solid var(--theme-border)'
          },
          borderless: {
            backgroundColor: 'var(--theme-surface)',
            borderRight: 'none'
          }
        },
        baseStyles: {
          width: '15rem',
          height: '100vh'
        }
      },
      navbar: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-background)',
            borderBottom: '1px solid var(--theme-border)',
            boxShadow: 'none'
          },
          borderless: {
            backgroundColor: 'var(--theme-background)',
            borderBottom: 'none',
            boxShadow: 'none'
          }
        },
        baseStyles: {
          height: '3.5rem',
          padding: '0 var(--theme-spacing-xl)'
        }
      },
      modal: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-background)',
            borderRadius: 'var(--theme-radius-lg)',
            boxShadow: 'var(--theme-shadow-xl)',
            border: '1px solid var(--theme-border)'
          }
        },
        baseStyles: {}
      },
      dropdown: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            borderRadius: 'var(--theme-radius-md)',
            boxShadow: 'var(--theme-shadow-md)'
          }
        },
        baseStyles: {}
      },
      table: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            borderCollapse: 'collapse'
          }
        },
        baseStyles: {},
        customCSS: `
          .table th {
            border-bottom: 1px solid var(--theme-border);
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 500;
            color: var(--theme-text-secondary);
          }
          .table td {
            border-bottom: 1px solid var(--theme-border);
            padding: 0.75rem 1rem;
            color: var(--theme-text-primary);
          }
        `
      },
      badge: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-neutral-100)',
            color: 'var(--theme-text-primary)',
            border: 'none'
          },
          primary: {
            backgroundColor: 'var(--theme-neutral-100)',
            color: 'var(--theme-primary)',
            border: 'none'
          },
          outline: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-secondary)',
            border: '1px solid var(--theme-border)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-sm)',
          padding: '0.125rem 0.5rem',
          fontSize: 'var(--theme-text-xs)',
          fontWeight: '500'
        }
      },
      alert: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-neutral-50)',
            border: '1px solid var(--theme-border)',
            color: 'var(--theme-text-primary)'
          },
          success: {
            backgroundColor: 'rgb(34 197 94 / 0.1)',
            border: '1px solid rgb(34 197 94 / 0.2)',
            color: 'var(--theme-success)'
          },
          warning: {
            backgroundColor: 'rgb(245 158 11 / 0.1)',
            border: '1px solid rgb(245 158 11 / 0.2)',
            color: 'var(--theme-warning)'
          },
          error: {
            backgroundColor: 'rgb(239 68 68 / 0.1)',
            border: '1px solid rgb(239 68 68 / 0.2)',
            color: 'var(--theme-destructive)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-md)',
          padding: 'var(--theme-spacing-md)',
          fontSize: 'var(--theme-text-sm)'
        }
      },
      tooltip: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-neutral-900)',
            color: 'white',
            borderRadius: 'var(--theme-radius-sm)',
            fontSize: 'var(--theme-text-xs)',
            padding: '0.25rem 0.5rem'
          }
        },
        baseStyles: {}
      },
      tabs: {
        variants: {
          default: {
            borderBottom: '1px solid var(--theme-border)'
          }
        },
        baseStyles: {},
        customCSS: `
          .tabs-trigger {
            border-bottom: 2px solid transparent;
            padding: 0.5rem 1rem;
            color: var(--theme-text-secondary);
            transition: all 150ms ease-in-out;
          }
          .tabs-trigger[data-state="active"] {
            border-bottom-color: var(--theme-primary);
            color: var(--theme-primary);
          }
        `
      }
    },
    branding: {
      logo: '',
      favicon: '/favicon.ico',
      appIcon: '/icon-192.png'
    },
    layout: {
      sidebarWidth: '15rem',
      headerHeight: '3.5rem',
      containerMaxWidth: '1200px',
      contentPadding: '2rem',
      gridGap: '2rem',
      cardPadding: '2rem',
      formSpacing: '2rem'
    },
    animations: {
      duration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms'
      },
      easing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      transitions: {
        all: 'all 200ms ease-in-out',
        colors: 'color 150ms ease-in-out, background-color 150ms ease-in-out, border-color 150ms ease-in-out',
        opacity: 'opacity 150ms ease-in-out',
        transform: 'transform 150ms ease-in-out'
      }
    }
  }
};

export default minimalTheme;