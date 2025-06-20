import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Package, GitBranch } from 'lucide-react';
import AppStoreManagement from './AppStoreManagement';
import AppBundleManager from './AppBundleManager';
import AppBundles from '@/components/pages/system-admin/AppBundles';

type TabValue = 'marketplace' | 'bundles' | 'versions';

interface UnifiedAppStoreProps {
  defaultTab?: TabValue;
}

const UnifiedAppStore: React.FC<UnifiedAppStoreProps> = ({ defaultTab = 'marketplace' }) => {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Store className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">App Store Management</h1>
          <p className="text-muted-foreground">
            Comprehensive management of apps, bundles, and versions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace" className="flex items-center space-x-2">
            <Store className="h-4 w-4" />
            <span>Marketplace</span>
          </TabsTrigger>
          <TabsTrigger value="bundles" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Bundle Management</span>
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Version Control</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Store className="h-5 w-5" />
                <span>App Store Marketplace</span>
              </CardTitle>
              <CardDescription>
                Manage app definitions, reviews, analytics, and marketplace operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppStoreManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Bundle Management</span>
              </CardTitle>
              <CardDescription>
                Upload, manage, and configure app bundles and their deployment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppBundleManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5" />
                <span>Version Control</span>
              </CardTitle>
              <CardDescription>
                Manage app versions, release notes, and version history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppBundles />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedAppStore;