import { ThemeTemplate } from '../types/theme.types';

/**
 * Modern theme template - Contemporary and vibrant design
 * Suitable for tech companies, startups, and creative organizations
 */

export const modernTheme: ThemeTemplate = {
  id: 'modern-template',
  name: 'Modern Tech',
  description: 'A contemporary, vibrant theme perfect for tech companies, startups, and creative organizations.',
  category: 'modern',
  preview: '/theme-previews/modern.png',
  tags: ['modern', 'tech', 'startup', 'creative', 'vibrant'],
  popularity: 92,
  isPublic: true,
  theme: {
    name: 'Modern Tech',
    version: '1.0.0',
    description: 'Modern theme with purple and teal accents and contemporary design',
    colors: {
      primary: '#8b5cf6', // Purple
      secondary: '#06b6d4', // Cyan
      accent: '#f59e0b', // Amber
      background: '#ffffff',
      surface: '#fafafa',
      text: {
        primary: '#111827',
        secondary: '#4b5563',
        muted: '#9ca3af'
      },
      border: '#e5e7eb',
      input: '#f9fafb',
      ring: '#8b5cf6',
      destructive: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#06b6d4',
      neutral: {
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
        950: '#09090b'
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
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
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
            background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
            textTransform: 'none'
          },
          secondary: {
            backgroundColor: 'var(--theme-surface)',
            color: 'var(--theme-primary)',
            border: '1px solid var(--theme-border)',
            fontWeight: '500'
          },
          outline: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border)',
            fontWeight: '500'
          },
          ghost: {
            backgroundColor: 'transparent',
            color: 'var(--theme-text-primary)',
            border: 'none',
            fontWeight: '500'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-lg)',
          padding: '0.625rem 1.25rem',
          fontSize: 'var(--theme-text-sm)',
          transition: 'all 200ms ease-in-out',
          transform: 'translateY(0)',
          boxShadow: 'var(--theme-shadow-sm)'
        },
        customCSS: `
          .button--primary:hover {
            transform: translateY(-1px);
            box-shadow: var(--theme-shadow-md);
          }
          .button--primary:active {
            transform: translateY(0);
          }
        `
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
            boxShadow: 'var(--theme-shadow-lg)'
          },
          glass: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'var(--theme-shadow-xl)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-xl)',
          padding: 'var(--theme-spacing-lg)',
          transition: 'all 200ms ease-in-out'
        },
        customCSS: `
          .card:hover {
            transform: translateY(-2px);
            box-shadow: var(--theme-shadow-xl);
          }
        `
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
            boxShadow: '0 0 0 3px var(--theme-primary-focus)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-lg)',
          padding: '0.75rem 1rem',
          fontSize: 'var(--theme-text-base)',
          transition: 'all 200ms ease-in-out'
        }
      },
      sidebar: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            borderRight: '1px solid var(--theme-border)',
            backdropFilter: 'blur(10px)'
          },
          glass: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)'
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
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderBottom: '1px solid var(--theme-border)',
            backdropFilter: 'blur(10px)',
            boxShadow: 'var(--theme-shadow-sm)'
          }
        },
        baseStyles: {
          height: '4rem',
          padding: '0 var(--theme-spacing-xl)'
        }
      },
      modal: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-background)',
            borderRadius: 'var(--theme-radius-2xl)',
            boxShadow: 'var(--theme-shadow-2xl)'
          }
        },
        baseStyles: {}
      },
      dropdown: {
        variants: {
          default: {
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-lg)'
          }
        },
        baseStyles: {}
      },
      table: {
        variants: {},
        baseStyles: {}
      },
      badge: {
        variants: {
          primary: {
            backgroundColor: 'var(--theme-primary-light)',
            color: 'var(--theme-primary)',
            border: '1px solid var(--theme-primary)'
          },
          secondary: {
            backgroundColor: 'var(--theme-secondary-light)',
            color: 'var(--theme-secondary)',
            border: '1px solid var(--theme-secondary)'
          }
        },
        baseStyles: {
          borderRadius: 'var(--theme-radius-full)',
          padding: '0.25rem 0.75rem',
          fontSize: 'var(--theme-text-xs)',
          fontWeight: '500'
        }
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
      containerMaxWidth: '1400px',
      contentPadding: '2rem',
      gridGap: '2rem',
      cardPadding: '2rem',
      formSpacing: '1.5rem'
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      easing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      transitions: {
        all: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        colors: 'color 200ms ease-in-out, background-color 200ms ease-in-out, border-color 200ms ease-in-out',
        opacity: 'opacity 200ms ease-in-out',
        transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)'
      }
    },
    customProperties: {
      'gradient-primary': 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
      'gradient-accent': 'linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-warning) 100%)',
      'blur-glass': 'blur(10px)',
      'blur-heavy': 'blur(20px)'
    }
  }
};

export default modernTheme;