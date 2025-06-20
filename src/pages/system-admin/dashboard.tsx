import React from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';
import { SystemAdminDashboard } from '@/components/system-admin/dashboard/SystemAdminDashboard';

const SystemAdminDashboardPage = () => {
  const router = useRouter();
  const { permissions } = useAppSelector((state) => state.auth || { permissions: [] });

  // Check if user has system admin permissions
  React.useEffect(() => {
    if (permissions.length > 0 && !permissions.includes("system:admin")) {
      router.replace("/dashboard");
    }
  }, [permissions, router]);

  // Show loading while permissions are being checked
  if (permissions.length === 0) {
    return <div>Loading...</div>;
  }

  // Render the dashboard if user has permissions
  if (permissions.includes("system:admin")) {
    return <SystemAdminDashboard />;
  }

  // This shouldn't be reached due to the useEffect redirect, but just in case
  return <div>Redirecting...</div>;
};

export default SystemAdminDashboardPage;