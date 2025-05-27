
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { App } from '@/types/app-marketplace';

interface AppCardProps {
  app: App; // App here is actually AppDefinitionForMarketplace from our types
  isInstalled: boolean;
  orgAppInstallationId?: string;
  onInstall: (appDefinitionId: string, latestPublishedVersionId: string) => void;
  onUninstall: (orgAppInstallationId: string) => void;
  onViewSettings: (appId: string) => void; // appId here refers to appDefinitionId
  isInstalling?: boolean;
}

const AppCard: React.FC<AppCardProps> = ({
  app,
  isInstalled,
  orgAppInstallationId,
  onInstall,
  onUninstall,
  onViewSettings,
  isInstalling = false,
}) => {
  // const isInstalled = app.status === 'installed'; // Now using prop

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {app.icon ? (
              <img src={app.icon} alt={app.name} className="w-10 h-10 rounded" />
            ) : (
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg font-bold">
                {app.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold">{app.name}</h3>
              <p className="text-xs text-muted-foreground">v{app.version} • {app.publisher}</p>
            </div>
          </div>
          <div>
            <Badge variant={app.pricing === 'free' ? 'secondary' : 'default'}>
              {app.pricing === 'free' ? 'Free' : app.pricing === 'freemium' ? 'Freemium' : 'Paid'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground h-12 line-clamp-2">{app.description}</p>
        
        {app.permissions.length > 0 && (
          <div className="mt-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                    <span>Requires {app.permissions.length} permission{app.permissions.length > 1 ? 's' : ''}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="text-xs list-disc pl-4">
                    {app.permissions.map((permission, index) => (
                      <li key={index}>{permission}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant="outline">{app.category}</Badge>
        <div className="flex gap-2">
          {isInstalled ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onViewSettings(app.id)}>
                Settings
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (orgAppInstallationId) {
                    onUninstall(orgAppInstallationId);
                  } else {
                    console.error("Cannot uninstall: orgAppInstallationId is missing.");
                    // Optionally show a toast error
                  }
                }}
              >
                Uninstall
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              // Assuming app.version holds the ID of the latest published AppVersion object
              // This is a simplification. A more robust way would be to ensure this ID is correctly fetched and passed.
              onClick={() => onInstall(app.id, app.version)}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AppCard;
