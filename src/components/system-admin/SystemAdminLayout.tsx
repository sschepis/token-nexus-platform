import React from 'react';
import AppLayout from '@/components/layout/AppLayout';

interface SystemAdminLayoutProps {
  children: React.ReactNode;
}

const SystemAdminLayout: React.FC<SystemAdminLayoutProps> = ({ children }) => {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};

export default SystemAdminLayout;