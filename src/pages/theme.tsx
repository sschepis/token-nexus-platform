import React from 'react';
import { GetServerSideProps } from 'next';
import Theme from '@/components/pages/Theme';

import { ThemeProvider } from "@/theming/providers/ThemeContext";

const ThemePage = () => {
  return (
    <ThemeProvider>
      <Theme />
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