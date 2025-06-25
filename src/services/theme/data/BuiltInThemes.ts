import { ThemeConfig } from '../types/ThemeTypes';

export function getDefaultTheme(): ThemeConfig {
  return {
    name: 'Default',
    description: 'Default Token Nexus theme',
    category: 'built-in',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    branding: {
      logo: '/assets/logo.svg',
      favicon: '/assets/favicon.ico',
      appIcon: '/assets/app-icon.png',
      brandName: 'Token Nexus',
      tagline: 'Decentralized Token Management Platform'
    },
    components: {
      button: {
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem'
      },
      card: {
        borderRadius: '0.5rem',
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      },
      input: {
        borderRadius: '0.375rem',
        borderWidth: '1px'
      }
    }
  };
}

export function getBuiltInThemes(): ThemeConfig[] {
  const builtInThemes = [
    {
      id: 'theme_minimal',
      name: 'Minimal',
      description: 'A clean and simple theme.',
      category: 'minimal',
      colors: {
        primary: '#3B82F6', // blue-500
        secondary: '#6B7280', // gray-500
        background: '#F9FAFB', // gray-50
        text: '#1F2937', // gray-900
        border: '#D1D5DB' // gray-300
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headingSize: '2.25rem',
        bodySize: '1rem'
      },
      spacing: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem'
      },
      branding: {
        logo: '/assets/logo.svg',
        favicon: '/assets/favicon.ico',
        appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus',
        tagline: 'Minimal Design'
      },
      components: { /* specific component styles */ },
      isBuiltIn: true
    },
    {
      id: 'theme_modern',
      name: 'Modern',
      description: 'A sleek and contemporary theme.',
      category: 'modern',
      colors: {
        primary: '#8B5CF6', // violet-500
        secondary: '#4B5563', // gray-700
        background: '#FFFFFF', // white
        text: '#111827', // gray-900
        border: '#E5E7EB' // gray-200
      },
      typography: {
        fontFamily: 'Roboto, sans-serif',
        headingSize: '2.5rem',
        bodySize: '1.05rem'
      },
      spacing: {
        sm: '0.75rem',
        md: '1.25rem',
        lg: '1.75rem'
      },
      branding: {
        logo: '/assets/logo.svg',
        favicon: '/assets/favicon.ico',
        appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus',
        tagline: 'Modern Interface'
      },
      components: { /* specific component styles */ },
      isBuiltIn: true
    },
    {
      id: 'theme_corporate',
      name: 'Corporate',
      description: 'A professional and business-oriented theme.',
      category: 'corporate',
      colors: {
        primary: '#007BFF', // brand blue
        secondary: '#6C757D', // mute gray
        background: '#F8F9FA', // light gray
        text: '#343A40', // dark gray
        border: '#DEE2E6' // very light gray
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        headingSize: '2rem',
        bodySize: '0.95rem'
      },
      spacing: {
        sm: '0.625rem',
        md: '1.125rem',
        lg: '1.625rem'
      },
      branding: {
        logo: '/assets/logo.svg',
        favicon: '/assets/favicon.ico',
        appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus',
        tagline: 'Professional Solutions'
      },
      components: { /* specific component styles */ },
      isBuiltIn: true
    },
     {
      id: 'theme_dark',
      name: 'Dark Mode (Experimental)',
      description: 'A theme with dark background and light text.',
      category: 'experimental',
      colors: {
        primary: '#3B82F6', // blue-500
        secondary: '#6B7280', // gray-500
        background: '#1F2937', // gray-900
        text: '#F9FAFB', // gray-50
        border: '#4B5563' // gray-700
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headingSize: '2.25rem',
        bodySize: '1rem'
      },
      spacing: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem'
      },
      branding: {
        logo: '/assets/logo-light.svg',
        favicon: '/assets/favicon.ico',
        appIcon: '/assets/app-icon.png',
        brandName: 'Token Nexus',
        tagline: 'Dark Mode Experience'
      },
      components: { /* specific component styles */ },
      isBuiltIn: true
    }
  ];
  return builtInThemes;
}