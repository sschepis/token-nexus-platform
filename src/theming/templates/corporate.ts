import { ThemeTemplate } from '../types/theme.types';

/**
 * Corporate theme template - Professional and conservative design
 * Suitable for enterprise organizations and formal business environments
 */

export const corporateTheme: ThemeTemplate = {
  id: 'corporate-template',
  name: 'Corporate Professional',
  description: 'A professional, conservative theme perfect for enterprise organizations and formal business environments.',
  category: 'corporate',
  preview: '/theme-previews/corporate.png',
  tags: ['professional', 'enterprise', 'formal', 'business'],
  popularity: 85,
  isPublic: true,
  theme: {
    name: 'Corporate Professional',
    version: '1.0.0',
    description: 'Professional corporate theme with navy blue and gray color scheme',
    colors: {
      primary: '#1e3a8a', // Navy blue
      secondary: '#64748b', // Slate gray
      accent: '#0ea5e9', // Sky blue
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1e293b',
        secondary: '#475569',
        muted: '#94a3b8'
      },
      border: '#e2e8f0',
      input: '#f1f5f9',
      ring: '#1e3a8a',
      destructive: '#dc2626',
      warning: '#d97706',
      success: '#059669',
      info: '#0284c7',
      neutral: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617'
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
        normal: '1.5',
        relaxed: '1.625',
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
      md: '0.25rem', // More conservative radius
      lg: '0.375rem',
      xl: '0.5rem',
      '2xl': '0.75rem',
      '3xl': '1rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      none: '0 0 #0000'
    },
    components: {
      button: {
        variants: {
          primary: {
            backgroundColor: 'var(--theme-primary)',
            color: 'white',
            border: '1px solid var(--theme-primary)',
            fontWeight: '600',
            textTransform: 'none'
          },
          secondary: {
            backgroundColor: 'transparent',
            color: 'var(--theme-primary)',
            border: '1px solid var(--theme-primary)',
            fontWeight: '500'
          },
          outline: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border)',
            fontWeight: '500'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-md)',
          padding: '0.5rem 1rem',
          fontSize: 'var(--theme-text-sm)',
          transition: 'all 150ms ease-in-out'
        }
      },
      card: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            boxShadow: 'var(--theme-shadow-sm)'
          },
          elevated: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            boxShadow: 'var(--theme-shadow-md)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-lg)',
          padding: 'var(--theme-spacing-lg)'
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
            boxShadow: '0 0 0 2px var(--theme-primary-focus)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-md)',
          padding: '0.5rem 0.75rem',
          fontSize: 'var(--theme-text-sm)'
        }
      },
      sidebar: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            borderRight: '1px solid var(--theme-border)'
          }
        },
        baseStyles: {
          width: '16rem',
          height: '100vh'
        }
      },
      navbar: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-background)',
            borderBottom: '1px solid var(--theme-border)',
            boxShadow: 'var(--theme-shadow-sm)'
          }
        },
        baseStyles: {
          height: '4rem',
          padding: '0 var(--theme-spacing-lg)'
        }
      },
      modal: {
        variants: {},
        baseStyles: {}
      },
      dropdown: {
        variants: {},
        baseStyles: {}
      },
      table: {
        variants: {},
        baseStyles: {}
      },
      badge: {
        variants: {},
        baseStyles: {}
      },
      alert: {
        variants: {},
        baseStyles: {}
      },
      tooltip: {
        variants: {},
        baseStyles: {}
      },
      tabs: {
        variants: {},
        baseStyles: {}
      }
    },
    branding: {
      logo: '',
      favicon: '/favicon.ico',
      appIcon: '/icon-192.png'
    },
    layout: {
      sidebarWidth: '16rem',
      headerHeight: '4rem',
      containerMaxWidth: '1200px',
      contentPadding: '2rem',
      gridGap: '1.5rem',
      cardPadding: '1.5rem',
      formSpacing: '1.5rem'
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '250ms', // Slightly faster for professional feel
        slow: '400ms'
      },
      easing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      transitions: {
        all: 'all 250ms ease-in-out',
        colors: 'color 150ms ease-in-out, background-color 150ms ease-in-out, border-color 150ms ease-in-out',
        opacity: 'opacity 150ms ease-in-out',
        transform: 'transform 150ms ease-in-out'
      }
    }
  }
};

export default corporateTheme;