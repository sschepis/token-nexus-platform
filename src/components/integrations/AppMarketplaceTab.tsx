import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database } from "lucide-react";
import NextLink from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAppDefinitions,
  fetchOrgAppInstallations,
} from "@/store/slices/appMarketplaceSlice";
import { AppDefinitionForMarketplace } from "@/types/app-marketplace.d";
import { useToast } from "@/hooks/use-toast";

export const AppMarketplaceTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { appDefinitions, orgAppInstallations, isLoading, error } = useAppSelector(
    (state) => state.appMarketplace
  );

  useEffect(() => {
    dispatch(fetchAppDefinitions({}));
    dispatch(fetchOrgAppInstallations());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "App Marketplace Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleInstallApp = (appId: string) => {
    // This would typically open a dialog for permissions/config
    // For now, a simple example:
    toast({
      title: "App Installation Triggered",
      description: `Attempting to install app: ${appId}`,
    });
    // In a real app, you'd dispatch an installApp thunk with permissions based on user input
    // dispatch(installApp({ appId, permissions: [] }));
  };

  const isInstalled = (appId: string) => {
    return orgAppInstallations.some(
      (installation) => installation.appDefinition.id === appId && installation.status === 'active'
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Marketplace</CardTitle>
        <CardDescription>
          Discover and integrate third-party applications to extend your platform's capabilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-10">
            <Loader2 className="mr-2 h-6 w-6 animate-spin inline-block text-primary" /> Loading Apps...
          </div>
        ) : appDefinitions.length === 0 ? (
          <div className="text-center py-10">
            <Database className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold mt-4">No Apps Found</h3>
            <p className="text-muted-foreground mt-2">
              It looks like there are no applications available in the marketplace right now.
            </p>
            <NextLink href="/marketplace">
              <Button className="mt-4">Refresh Marketplace</Button>
            </NextLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appDefinitions.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {app.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.iconUrl} alt={`${app.name} icon`} className="w-10 h-10 rounded-md" />
                    )}
                    <div>
                      <CardTitle>{app.name}</CardTitle>
                      <CardDescription>{app.publisherName}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {app.tags?.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {app.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    {isInstalled(app.id) ? (
                      <Button variant="outline" disabled>Installed</Button>
                    ) : (
                      <Button onClick={() => handleInstallApp(app.id)}>Install App</Button>
                    )}
                    {/* Add more info like rating, versions, etc. */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};