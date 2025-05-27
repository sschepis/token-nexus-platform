
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchApps, fetchInstalledOrgApps, installAppToOrg, uninstallOrgApp } from '@/store/slices/appSlice';
import { OrgAppInstallation } from '@/types/app-marketplace'; // Import the new type
// import AppLayout from '@/components/layout/AppLayout'; // Removed AppLayout import
import { StyledCard } from '@/components/ui/styled-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner'; // Import toast
import AppBrowser from '@/components/app-marketplace/AppBrowser';
import AppSettings from '@/components/app-marketplace/AppSettings';
import usePermission from '@/hooks/usePermission';

const AppMarketplace = () => {
  const dispatch = useAppDispatch();
  const { apps, isLoading, installedOrgApps } = useAppSelector(state => state.app);
  const { currentOrg } = useAppSelector(state => state.org);
  const { hasPermission } = usePermission();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');

  const canBrowseApps = hasPermission('apps:read');
  const canManageApps = hasPermission('apps:manage');
  
  useEffect(() => {
    // Fetch apps when the component mounts
    if (canBrowseApps) {
      dispatch(fetchApps());
      if (currentOrg?.id) {
        dispatch(fetchInstalledOrgApps(currentOrg.id));
      }
    }
  }, [dispatch, canBrowseApps, currentOrg?.id]);

  const handleInstall = async (appDefinitionId: string, versionId: string) => {
    if (!currentOrg?.id) {
      toast.error("No organization selected to install the app into.");
      return;
    }
    
    // If no versionId provided, fetch the current version from the app definition
    let actualVersionId = versionId;
    if (!actualVersionId) {
      const app = apps.find(a => a.id === appDefinitionId);
      if (!app) {
        toast.error("App not found");
        return;
      }
      // For now, use the version string as a placeholder
      // In a real implementation, you'd fetch the current version ID from the backend
      actualVersionId = app.version;
    }
    
    const result = await dispatch(installAppToOrg({
      orgId: currentOrg.id,
      appDefinitionId,
      versionId: actualVersionId
    }));
    
    // If successful, refresh the installed apps list
    if (installAppToOrg.fulfilled.match(result)) {
      dispatch(fetchInstalledOrgApps(currentOrg.id));
    }
  };

  const handleUninstall = (orgAppInstallationId: string) => {
    // We now need orgAppInstallationId to uninstall
    dispatch(uninstallOrgApp({ orgAppInstallationId }));
  };

  const handleViewSettings = (appId: string) => {
    setSelectedAppId(appId);
    setActiveTab('installed');
  };

  const handleBackToApps = () => {
    setSelectedAppId(null);
  };

  // If user doesn't have permission
  if (!canBrowseApps) {
    return (
      // <AppLayout> // Removed AppLayout wrapper
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have permission to view the App Marketplace.</p>
        </div>
      // </AppLayout>
    );
  }

  return (
    // <AppLayout> // Removed AppLayout wrapper
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Marketplace</h1>
          <p className="text-muted-foreground">Browse, install, and manage third-party apps for your organization.</p>
        </div>

        <StyledCard>
          <Tabs defaultValue="browse" value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'installed')}>
            {!selectedAppId && (
              <TabsList>
                <TabsTrigger value="browse">Browse Apps</TabsTrigger>
                <TabsTrigger value="installed">Installed Apps</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="browse">
              {!selectedAppId && (
                <AppBrowser
                  apps={apps}
                  installedOrgApps={installedOrgApps}
                  onViewSettings={handleViewSettings}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  isLoading={isLoading}
                />
              )}
            </TabsContent>
            
            <TabsContent value="installed">
              {selectedAppId ? (
                <AppSettings appId={selectedAppId} onBack={handleBackToApps} />
              ) : (
                // The "Installed Apps" tab should probably show a filtered list of apps,
                // not the full browser. For now, to fix type error, passing props.
                // This part will need refinement to show only installed apps.
                <AppBrowser
                  apps={apps.filter(app => installedOrgApps.some(inst => inst.appDefinition?.objectId === app.id))}
                  installedOrgApps={installedOrgApps}
                  onViewSettings={handleViewSettings}
                  onInstall={handleInstall} // Install shouldn't be available on "installed" tab view of AppBrowser
                  onUninstall={handleUninstall}
                  isLoading={isLoading}
                />
              )}
            </TabsContent>
          </Tabs>
        </StyledCard>
      </div>
    // </AppLayout>
  );
};

export default AppMarketplace;
