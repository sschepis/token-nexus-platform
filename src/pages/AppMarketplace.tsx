
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchApps, uninstallApp } from '@/store/slices/appSlice';
import AppLayout from '@/components/layout/AppLayout';
import { StyledCard } from '@/components/ui/styled-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppBrowser from '@/components/app-marketplace/AppBrowser';
import AppSettings from '@/components/app-marketplace/AppSettings';
import usePermission from '@/hooks/usePermission';

const AppMarketplace = () => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.app);
  const { hasPermission } = usePermission();
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');

  const canBrowseApps = hasPermission('apps:read');
  const canManageApps = hasPermission('apps:manage');
  
  useEffect(() => {
    // Fetch apps when the component mounts
    if (canBrowseApps) {
      dispatch(fetchApps());
    }
  }, [dispatch, canBrowseApps]);

  const handleUninstall = (appId: string) => {
    dispatch(uninstallApp({ appId }));
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
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have permission to view the App Marketplace.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
                  onViewSettings={handleViewSettings}
                  onUninstall={handleUninstall}
                />
              )}
            </TabsContent>
            
            <TabsContent value="installed">
              {selectedAppId ? (
                <AppSettings appId={selectedAppId} onBack={handleBackToApps} />
              ) : (
                <AppBrowser 
                  onViewSettings={handleViewSettings}
                  onUninstall={handleUninstall}
                />
              )}
            </TabsContent>
          </Tabs>
        </StyledCard>
      </div>
    </AppLayout>
  );
};

export default AppMarketplace;
