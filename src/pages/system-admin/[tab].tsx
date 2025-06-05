import React from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';
import { ContractDeployWizard } from '@/components/system-admin/ContractDeployWizard';
import { ContractImportManager } from '@/components/system-admin/ContractImportManager';
import { ChainConfigurator } from '@/components/system-admin/ChainConfigurator';
import AppBundleManager from '@/components/system-admin/AppBundleManager';
import AppStoreManagement from '@/components/system-admin/AppStoreManagement';
import { DeploymentDashboard } from '@/components/system-admin/DeploymentDashboard';
import { GlobalOrgManager } from '@/components/system-admin/GlobalOrgManager';
import { GlobalUserManager } from '@/components/system-admin/GlobalUserManager';
import DfnsManagementPage from '@/pages/system-admin/dfns-management'; // Import the new DfnsManagementPage
import { useEffect, useState } from 'react';

const SystemAdminPage = () => {
  const router = useRouter();
  const { tab } = router.query;
  const { permissions } = useAppSelector((state) => state.auth || { permissions: [] });
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (permissions.includes("system:admin")) {
      setIsAllowed(true);
    } else if (permissions.length > 0) { // Only redirect if permissions have been loaded
      router.replace("/dashboard");
    }
  }, [permissions, router]);

  // Default to 'deploy' if tab is not in query or is an array (which it shouldn't be for file routes)
  const currentTab = typeof tab === 'string' ? tab : 'deploy';

  if (!isAllowed) {
    return <p>Loading permissions or redirecting...</p>;
  }
  
  const renderContent = () => {
    switch (currentTab) {
      case 'deploy':
        return <ContractDeployWizard />;
      case 'import':
        return <ContractImportManager />;
      case 'chains':
        return <ChainConfigurator />;
      case 'store':
        return <AppBundleManager />;
      case 'app-store':
        return <AppStoreManagement />;
      case 'status':
        return <DeploymentDashboard />;
      case 'orgs':
        return <GlobalOrgManager />;
      case 'users':
        return <GlobalUserManager />;
      case 'dfns':
        return <DfnsManagementPage />;
      case 'ssh':
        return (
          <div className="h-full w-full">
            <iframe
              src="http://localhost:3001/ssh-management"
              className="w-full h-screen border-0"
              title="SSH Management"
            />
          </div>
        );
      default:
        // Optionally, redirect to a default tab or show a 404-like component
        if (typeof window !== 'undefined') { // Ensure router.replace is called client-side
            router.replace('/system-admin/deploy');
        }
        return null;
    }
  };

  return renderContent();
};

export default SystemAdminPage;