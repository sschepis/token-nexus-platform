import React from 'react';
import { GetServerSideProps } from 'next';
import { ThemeProvider } from "@/theming/providers/ThemeContext";
import ThemePageComponent from '@/components/pages/Theme';

/**
 * Theme Management Page
 * 
 * This page provides comprehensive theme management capabilities for organizations.
 * Users can customize visual appearance, branding, colors, typography, and components
 * to create a cohesive brand experience across the platform.
 * 
 * Features:
 * - Apply built-in theme templates
 * - Create custom themes with advanced customization
 * - Real-time theme preview
 * - Theme validation and consistency checking
 * - Organization-wide theme deployment
 * - Theme history and version management
 */
const ThemePage = () => {
  return (
    <ThemeProvider>
      <ThemePageComponent />
    </ThemeProvider>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Add any server-side logic here if needed
  return {
    props: {},
  };
};

export default ThemePage;