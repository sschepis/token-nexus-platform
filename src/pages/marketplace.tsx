import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, Store, Download, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { marketplacePageController } from '@/controllers/marketplace/MarketplacePageController';

const MarketplacePage: React.FC = () => {
  const { toast } = useToast();
  const { checkAnyPermission } = usePermission();
  const [apps, setApps] = useState<any[]>([]);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks using checkAnyPermission for consistency with PAGES.md standards
  const canRead = checkAnyPermission(['marketplace:read', 'apps:read']);
  const canInstall = checkAnyPermission(['marketplace:install', 'apps:install']);
  const canManage = checkAnyPermission(['marketplace:write', 'apps:manage']);

  // Get available actions count for AI assistant
  const availableActions = marketplacePageController.getAllActions();
  const actionCount = availableActions.length;

  // Load marketplace data
  const loadMarketplaceData = async () => {
    if (!canRead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create proper action context
      const actionContext = {
        user: {
          userId: 'current-user',
          organizationId: 'current-org',
          roles: [],
          permissions: []
        },
        organization: {
          id: 'current-org',
          name: 'Current Organization',
          settings: {},
          permissions: [],
          features: []
        },
        page: {
          pageId: 'marketplace',
          pageName: 'Marketplace',
          state: {},
          props: {},
          metadata: {
            category: 'marketplace',
            tags: ['marketplace', 'apps'],
            permissions: ['marketplace:read']
          }
        },
        navigation: {
          router: {} as any, // Mock router for now
          currentPath: '/marketplace',
          breadcrumbs: []
        },
        timestamp: new Date()
      };

      // Load apps
      const browseAction = marketplacePageController.getAction('browseMarketplace');
      if (browseAction) {
        const appsResult = await browseAction.execute({}, actionContext);
        
        if (appsResult.success && appsResult.data) {
          const data = appsResult.data as { apps: any[] };
          setApps(data.apps || []);
        }
      }

      // Load installed apps
      const installedAction = marketplacePageController.getAction('getInstalledApps');
      if (installedAction) {
        const installedResult = await installedAction.execute({}, actionContext);
        
        if (installedResult.success && installedResult.data) {
          const data = installedResult.data as { installedApps: any[] };
          setInstalledApps(data.installedApps || []);
        }
      }

      // Load categories
      const categoriesAction = marketplacePageController.getAction('getMarketplaceCategories');
      if (categoriesAction) {
        const categoriesResult = await categoriesAction.execute({}, actionContext);
        
        if (categoriesResult.success && categoriesResult.data) {
          const data = categoriesResult.data as { categories: string[] };
          setCategories(data.categories || []);
        }
      }

      toast({
        title: "Marketplace loaded",
        description: "Marketplace data loaded successfully",
      });
    } catch (error) {
      console.error('Error loading marketplace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load marketplace';
      setError(errorMessage);
      toast({
        title: "Error loading marketplace",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (canRead) {
      loadMarketplaceData();
    }
  }, [canRead]);

  // Show permission error if user can't read marketplace
  if (!canRead) {
    return (
      <div className="space-y-6">
        {/* Header section following PAGES.md standards */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground">
              Browse, install, and manage marketplace apps for your organization
            </p>
          </div>
          {/* AI Assistant Badge */}
          <Badge variant="secondary" className="ml-2">
            <Store className="h-3 w-3 mr-1" />
            {actionCount} actions available
          </Badge>
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
      {/* Header section following PAGES.md standards */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse, install, and manage marketplace apps for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Assistant Badge */}
          <Badge variant="secondary">
            <Store className="h-3 w-3 mr-1" />
            {actionCount} actions available
          </Badge>
          <Button
            variant="outline"
            onClick={loadMarketplaceData}
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
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Cards following PAGES.md standards */}
      <div className="grid gap-6">
        {/* Installed Apps Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Installed Apps
            </CardTitle>
            <CardDescription>
              Apps currently installed in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {installedApps.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {installedApps.map((app) => (
                  <Card key={app.objectId} className="p-4">
                    <div className="flex items-center gap-3">
                      {app.appDefinition?.iconUrl && (
                        <img
                          src={app.appDefinition.iconUrl}
                          alt={app.appDefinition.name}
                          className="h-8 w-8 rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{app.appDefinition?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {app.installedVersion?.versionString}
                        </p>
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No apps installed yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Available Apps Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Available Apps
            </CardTitle>
            <CardDescription>
              Browse and install apps from the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apps.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                  <Card key={app.id} className="p-4">
                    <div className="flex items-center gap-3">
                      {app.iconUrl && (
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          className="h-8 w-8 rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{app.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {app.publisherName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {app.category}
                          </Badge>
                          {app.isFeatured && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                      {canInstall && (
                        <Button variant="outline" size="sm">
                          Install
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {isLoading ? 'Loading apps...' : 'No apps available.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Categories Section */}
        {categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Browse apps by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge key={category} variant="outline" className="cursor-pointer">
                    {category}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;