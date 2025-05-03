
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppCategory, App } from '@/types/app-marketplace';
import { installApp, setSelectedCategory } from '@/store/slices/appSlice';
import AppCard from './AppCard';
import { Dialog } from '@/components/ui/dialog';
import AppConsentDialog from './AppConsentDialog';

interface AppBrowserProps {
  onViewSettings: (appId: string) => void;
  onUninstall: (appId: string) => void;
}

const AppBrowser: React.FC<AppBrowserProps> = ({ onViewSettings, onUninstall }) => {
  const dispatch = useAppDispatch();
  const { apps, categories, selectedCategory, isLoading } = useAppSelector((state) => state.app);
  
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

  const handleInstall = (appId: string) => {
    const app = apps.find(app => app.id === appId);
    if (app) {
      setSelectedAppForConsent(app);
      setShowConsentDialog(true);
    }
  };

  const confirmInstall = (permissions: string[]) => {
    if (selectedAppForConsent) {
      setInstallingAppId(selectedAppForConsent.id);
      dispatch(installApp({ 
        appId: selectedAppForConsent.id, 
        permissions 
      })).finally(() => {
        setInstallingAppId(null);
      });
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
              {filteredApps.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  onInstall={handleInstall}
                  onUninstall={onUninstall}
                  onViewSettings={onViewSettings}
                  isInstalling={installingAppId === app.id}
                />
              ))}
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
