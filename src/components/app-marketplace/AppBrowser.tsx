
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppCategory, App, OrgAppInstallation } from '@/types/app-marketplace'; // Added OrgAppInstallation
// installApp will be replaced by installAppToOrg, handled in AppMarketplace.tsx
import { setSelectedCategory } from '@/store/slices/appSlice';
import AppCard from './AppCard';
import { Dialog } from '@/components/ui/dialog';
import AppConsentDialog from './AppConsentDialog';
import { toast } from 'sonner'; // Import toast

interface AppBrowserProps {
  apps: App[]; // All available apps from the catalog
  installedOrgApps: OrgAppInstallation[]; // Apps installed in the current org
  onViewSettings: (appId: string) => void;
  // onInstall now needs appDefinitionId and versionId (of latest published version)
  onInstall: (appDefinitionId: string, latestPublishedVersionId: string) => void;
  onUninstall: (orgAppInstallationId: string) => void; // Needs the specific installation ID
  isLoading?: boolean; // Pass loading state from parent
}

const AppBrowser: React.FC<AppBrowserProps> = ({
  apps,
  installedOrgApps,
  onViewSettings,
  onInstall,
  onUninstall,
  isLoading
}) => {
  const dispatch = useAppDispatch();
  // Categories and selectedCategory are still managed locally or via props if preferred
  const { categories, selectedCategory } = useAppSelector((state) => state.app);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [selectedAppForConsent, setSelectedAppForConsent] = useState<App | null>(null);

  const handleCategoryChange = (category: string) => {
    dispatch(setSelectedCategory(category as AppCategory | 'all'));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleInstallClick = (app: App) => {
    // This is where we need to determine the 'latestPublishedVersionId'
    // For now, let's assume app.version might hold this ID or is a string that the
    // cloud function can resolve. This is a simplification.
    // A more robust solution would involve fetching version details or having this ID in the App object.
    if (!app.version) { // Assuming app.version might be the latest published version ID or string
        console.error("Cannot install app: latest published version ID not available on app object.", app);
        toast.error("Installation information missing for this app.");
        return;
    }
    const appToInstall = apps.find(a => a.id === app.id);
    if (appToInstall) {
      setSelectedAppForConsent(appToInstall); // Use the full App object for consent dialog
      setShowConsentDialog(true);
    }
  };

  const confirmInstall = (grantedPermissions: string[]) => { // Renamed permissions to avoid conflict
    if (selectedAppForConsent) {
      setInstallingAppId(selectedAppForConsent.id);
      // Assuming selectedAppForConsent.version is the ID of the AppVersion to install
      // This is a critical assumption. If app.version is "1.2.0", this won't work directly.
      // The `installAppToOrg` thunk expects a versionId (AppVersion objectId).
      // For now, we pass app.version, implying it's the versionId or the cloud fn handles it.
      onInstall(selectedAppForConsent.id, selectedAppForConsent.version);
      // TODO: The onInstall prop needs to be called from AppMarketplace which dispatches installAppToOrg
      // This dispatch(installApp(...)) call here is from the old structure.
      // dispatch(installApp({
      //   appId: selectedAppForConsent.id,
      //   permissions: grantedPermissions
      // })).finally(() => {
      //   setInstallingAppId(null);
      // });
      setInstallingAppId(null); // Should be managed by parent via isLoading prop or similar
      setShowConsentDialog(false);
    }
  };

  const cancelInstall = () => {
    setShowConsentDialog(false);
    setSelectedAppForConsent(null);
  };

  // Filter apps based on category and search query
  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search apps..."
          value={searchQuery}
          onChange={handleSearch}
          className="flex-1"
        />
      </div>
      
      <Tabs defaultValue="all" onValueChange={handleCategoryChange} value={selectedCategory}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={selectedCategory}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-52 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map(appDef => {
                const installation = installedOrgApps.find(inst => inst.appDefinition?.objectId === appDef.id);
                return (
                  <AppCard
                    key={appDef.id}
                    app={appDef} // appDef is of type App (AppDefinitionForMarketplace)
                    isInstalled={!!installation}
                    orgAppInstallationId={installation?.objectId}
                    onInstall={() => handleInstallClick(appDef)} // Pass the AppDefinition
                    onUninstall={onUninstall} // onUninstall expects orgAppInstallationId, AppCard will provide it
                    onViewSettings={onViewSettings}
                    isInstalling={installingAppId === appDef.id}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No apps found matching your criteria</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        {selectedAppForConsent && (
          <AppConsentDialog
            app={selectedAppForConsent}
            onConfirm={confirmInstall}
            onCancel={cancelInstall}
          />
        )}
      </Dialog>
    </div>
  );
};

export default AppBrowser;
