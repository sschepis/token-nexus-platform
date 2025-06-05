import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchApps, fetchInstalledOrgApps, installAppToOrg, uninstallOrgApp } from '@/store/slices/appSlice'; // Assuming this path is correct
import { OrgAppInstallation } from '@/types/app-marketplace'; // Assuming this path is correct
import { StyledCard } from '@/components/ui/styled-card'; // Assuming this path is correct
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner'; 
import AppBrowser from '@/components/app-marketplace/AppBrowser'; // Assuming this path is correct
import AppSettings from '@/components/app-marketplace/AppSettings'; // Assuming this path is correct
import usePermission from '@/hooks/usePermission'; // Assuming this path is correct

const AppMarketplacePage = () => {
  const dispatch = useAppDispatch();
  const { apps, isLoading, installedOrgApps } = useAppSelector(state => state.app);
  const { currentOrg } = useAppSelector(state => state.org);
  const { hasPermission } = usePermission();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');

  const canBrowseApps = hasPermission('apps:read');
  const canManageApps = hasPermission('apps:manage');
  
  useEffect(() => {
    if (canBrowseApps) {
      dispatch(fetchApps());
      if (currentOrg?.id) {
        dispatch(fetchInstalledOrgApps(currentOrg.id));
      }
    }
  }, [dispatch, canBrowseApps, currentOrg?.id]);

  const handleInstall = (appDefinitionId: string, versionId: string) => {
    if (!currentOrg?.id) {
      toast.error("No organization selected to install the app into.");
      return;
    }
    dispatch(installAppToOrg({ orgId: currentOrg.id, appDefinitionId, versionId }));
  };

  const handleUninstall = (orgAppInstallationId: string) => {
    dispatch(uninstallOrgApp({ orgAppInstallationId }));
  };

  const handleViewSettings = (appId: string) => {
    setSelectedAppId(appId);
    setActiveTab('installed'); // Switch tab to show settings under "Installed Apps"
  };

  const handleBackToApps = () => {
    setSelectedAppId(null);
    // Optionally switch back to 'browse' or 'installed' list view
    // setActiveTab('browse'); 
  };

  if (!canBrowseApps) {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have permission to view the App Marketplace.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Marketplace</h1>
          <p className="text-muted-foreground">Browse, install, and manage third-party apps for your organization.</p>
        </div>

        <StyledCard>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'installed')}>
            {!selectedAppId ? ( // Show tabs only when not viewing specific app settings
              <TabsList>
                <TabsTrigger value="browse">Browse Apps</TabsTrigger>
                <TabsTrigger value="installed">Installed Apps</TabsTrigger>
              </TabsList>
            ) : (
              // Optionally, show a breadcrumb or back button here when selectedAppId is active
              <Button variant="outline" onClick={handleBackToApps} className="mb-4">Back to Apps</Button>
            )}
            
            <TabsContent value="browse" forceMount={true} style={{ display: activeTab === 'browse' && !selectedAppId ? 'block' : 'none' }}>
              <AppBrowser
                apps={apps}
                installedOrgApps={installedOrgApps}
                onViewSettings={handleViewSettings}
                onInstall={handleInstall}
                onUninstall={handleUninstall} // This might be better placed in the installed apps view
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="installed" forceMount={true} style={{ display: activeTab === 'installed' ? 'block' : 'none' }}>
              {selectedAppId ? (
                <AppSettings appId={selectedAppId} onBack={handleBackToApps} />
              ) : (
                <AppBrowser // This should ideally be a different component or filtered view for installed apps
                  apps={apps.filter(app => installedOrgApps.some(inst => inst.appDefinition?.objectId === app.id))}
                  installedOrgApps={installedOrgApps}
                  onViewSettings={handleViewSettings}
                  onInstall={handleInstall} // Install action might not be relevant here
                  onUninstall={handleUninstall}
                  isLoading={isLoading}
                />
              )}
            </TabsContent>
          </Tabs>
        </StyledCard>
    </div>
  );
};

export default AppMarketplacePage;