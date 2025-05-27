/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import Parse from 'parse';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Loader2, Settings, Package, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Interface for the structure returned by getInstalledAppsForOrg
interface InstalledApp {
  id: string;
  status: 'active' | 'disabled' | 'error';
  installationDate: string;
  lastUpdated?: string;
  appDefinition: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    publisher?: string;
    category?: string;
  };
  installedVersion: {
    id: string;
    version: string;
    changelog?: string;
  };
  installedBy: {
    id: string;
    email: string;
    name: string;
  };
  configuration?: Record<string, any>;
  permissions?: string[];
}

const InstalledAppsWidget = () => {
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentOrg } = useAppSelector((state) => state.org); // Get current orgId

  useEffect(() => {
    const fetchInstalledApps = async () => {
      if (!currentOrg?.id) {
        // setError("No organization selected or available.");
        // setIsLoading(false);
        // This widget might not be relevant if no org is selected, or show a message.
        // For now, let's assume an org context is usually present when this widget is shown.
        // If currentOrg can be null/undefined initially, handle appropriately.
        // For this iteration, we'll proceed if currentOrg.id is available.
        // If it's critical to always have an org, the parent component should ensure this.
        console.warn("InstalledAppsWidget: currentOrg.id is not available yet.");
        setIsLoading(false); // Stop loading if no orgId
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await Parse.Cloud.run('getInstalledAppsForOrg', {
          organizationId: currentOrg.id
        });
        
        if (result.success) {
          setInstalledApps(result.installations);
        } else {
          throw new Error('Failed to fetch installations');
        }
      } catch (err: any) {
        console.error("Failed to fetch installed apps:", err);
        setError(err.message || "Failed to load installed applications.");
        toast.error("Failed to load installed applications.");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentOrg?.id) {
        fetchInstalledApps();
    } else {
        // Handle case where orgId is not yet available (e.g. still loading from store)
        // You might want a loading state or a message if orgId is essential and missing.
        // For now, if no orgId, we don't fetch.
        setIsLoading(false);
    }
  }, [currentOrg?.id]); // Re-fetch if orgId changes

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>My Applications</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>My Applications</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!currentOrg?.id) {
     return (
      <Card>
        <CardHeader><CardTitle>My Applications</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Organization context not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {installedApps.length === 0 ? (
          <p className="text-muted-foreground">You have no applications installed yet. Visit the Marketplace to add some!</p>
        ) : (
          <div className="space-y-4">
            {installedApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                <div className="flex items-center space-x-3">
                  {app.appDefinition.icon ? (
                    <img src={app.appDefinition.icon} alt={app.appDefinition.name} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{app.appDefinition.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={app.status === 'active' ? 'default' : app.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {app.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        v{app.installedVersion.version}
                      </span>
                      {app.appDefinition.publisher && (
                        <span className="text-xs text-muted-foreground">
                          by {app.appDefinition.publisher}
                        </span>
                      )}
                    </div>
                    {app.appDefinition.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {app.appDefinition.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.status === 'active' && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/marketplace/apps/${app.appDefinition.id}`}>
                        <Rocket className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/marketplace/apps/${app.appDefinition.id}/settings`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstalledAppsWidget;