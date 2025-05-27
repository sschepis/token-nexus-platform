import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  AppFrameworkContext, 
  RegisteredApp, 
  AppRoute, 
  AppNavigation,
  AppManifest,
  AppComponentProps 
} from '../types/app-framework';
import { OrgAppInstallation } from '../types/app-marketplace';

const AppFrameworkContextInstance = createContext<AppFrameworkContext | null>(null);

export const useAppFramework = () => {
  const context = useContext(AppFrameworkContextInstance);
  if (!context) {
    throw new Error('useAppFramework must be used within an AppFrameworkProvider');
  }
  return context;
};

interface AppFrameworkProviderProps {
  children: React.ReactNode;
}

export const AppFrameworkProvider: React.FC<AppFrameworkProviderProps> = ({ children }) => {
  const [registeredApps, setRegisteredApps] = useState<Map<string, RegisteredApp>>(new Map());
  const [currentApp, setCurrentApp] = useState<RegisteredApp | undefined>();

  const registerApp = useCallback((app: RegisteredApp) => {
    setRegisteredApps(prev => new Map(prev.set(app.manifest.id, app)));
  }, []);

  const unregisterApp = useCallback((appId: string) => {
    setRegisteredApps(prev => {
      const newMap = new Map(prev);
      newMap.delete(appId);
      return newMap;
    });
    
    if (currentApp?.manifest.id === appId) {
      setCurrentApp(undefined);
    }
  }, [currentApp?.manifest.id]);

  const getAppRoutes = useCallback((): AppRoute[] => {
    const routes: AppRoute[] = [];
    
    registeredApps.forEach((app) => {
      if (app.isActive) {
        if (app.manifest.adminUI?.enabled && app.manifest.adminUI.routes) {
          routes.push(...app.manifest.adminUI.routes.map(route => ({
            ...route,
            path: `/apps/${app.manifest.id}/admin${route.path}`
          })));
        }
        
        if (app.manifest.userUI?.enabled && app.manifest.userUI.routes) {
          routes.push(...app.manifest.userUI.routes.map(route => ({
            ...route,
            path: `/apps/${app.manifest.id}${route.path}`
          })));
        }
      }
    });
    
    return routes;
  }, [registeredApps]);

  const getAppNavigation = useCallback((): AppNavigation[] => {
    const navigation: AppNavigation[] = [];
    
    registeredApps.forEach((app) => {
      if (app.isActive && app.manifest.adminUI?.enabled && app.manifest.adminUI.navigation) {
        navigation.push(...app.manifest.adminUI.navigation.map(nav => ({
          ...nav,
          path: `/apps/${app.manifest.id}/admin${nav.path}`
        })));
      }
    });
    
    return navigation.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [registeredApps]);

  const contextValue: AppFrameworkContext = {
    registeredApps,
    currentApp,
    registerApp,
    unregisterApp,
    getAppRoutes,
    getAppNavigation,
  };

  return (
    <AppFrameworkContextInstance.Provider value={contextValue}>
      {children}
    </AppFrameworkContextInstance.Provider>
  );
};

// App component wrapper that provides app context
export interface AppWrapperProps extends AppComponentProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ 
  appId, 
  config, 
  organization, 
  user, 
  permissions,
  children 
}) => {
  return (
    <div className="app-wrapper" data-app-id={appId}>
      {children}
    </div>
  );
};