import React, { useState, useEffect } from 'react';
import AppMarketplace from '@/components/pages/AppMarketplace';
import { usePageController } from '@/hooks/usePageController';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MarketplacePage: React.FC = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [apps, setApps] = useState<any[]>([]);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('apps:read');
  const canInstall = hasPermission('apps:install');
  const canManage = hasPermission('apps:manage');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'marketplace',
    pageName: 'App Marketplace',
    description: 'Browse, install, and manage third-party applications',
    category: 'marketplace',
    permissions: ['apps:read', 'apps:install', 'apps:manage'],
    tags: ['apps', 'marketplace', 'integrations', 'third-party']
  });

  // Load apps from controller
  const loadApps = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchApps', { includeInactive: false });
      
      if (result.success && result.data) {
        const appsData = result.data as { apps: any[] };
        setApps(appsData.apps || []);
        toast({
          title: "Apps loaded",
          description: "Apps loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load apps');
        toast({
          title: "Error loading apps",
          description: result.error || 'Failed to load apps',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading apps:', error);
      setError('Failed to load apps');
      toast({
        title: "Error loading apps",
        description: 'Failed to load apps',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load installed apps from controller
  const loadInstalledApps = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    try {
      const result = await pageController.executeAction('fetchInstalledApps', {});
      
      if (result.success && result.data) {
        const installedData = result.data as { apps: any[] };
        setInstalledApps(installedData.apps || []);
      }
    } catch (error) {
      console.error('Error loading installed apps:', error);
    }
  };

  // Load apps on component mount
  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadApps();
      loadInstalledApps();
    }
  }, [pageController.isRegistered, canRead]);

  const handleRefreshApps = async () => {
    await loadApps();
    await loadInstalledApps();
  };

  // Show permission error if user can't read apps
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">App Marketplace</h1>
            <p className="text-muted-foreground">
              Browse, install, and manage third-party apps for your organization
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view the marketplace. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Marketplace</h1>
          <p className="text-muted-foreground">
            Browse, install, and manage third-party apps for your organization
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshApps}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AppMarketplace />
    </div>
  );
};

export default MarketplacePage;