import React from 'react';
import { useRouter } from 'next/router';
import { useAppFramework } from '../../contexts/AppFrameworkContext';
import { AppLayout } from './AppLayout';
import { AppComponentRenderer } from './AppComponentRenderer';

export const AppRouter: React.FC = () => {
  const router = useRouter();
  const { appId, ...rest } = router.query;
  const { registeredApps } = useAppFramework();

  // This component is now mainly for compatibility
  // In Next.js, routing is handled by the file system
  // This component can be used within specific app pages
  
  if (!appId || typeof appId !== 'string') {
    return <div>Invalid app ID</div>;
  }

  const app = registeredApps.get(appId);
  
  if (!app) {
    return <div>App not found</div>;
  }

  // Determine if this is an admin route based on the path
  const isAdminRoute = router.pathname.includes('/admin');
  
  return (
    <AppLayout type={isAdminRoute ? 'admin' : 'user'} appId={appId}>
      <AppRouteRenderer appId={appId} type={isAdminRoute ? 'admin' : 'user'} />
    </AppLayout>
  );
};

export const AppDefaultAdminPage: React.FC<{ appId: string }> = ({ appId }) => {
  const { registeredApps } = useAppFramework();
  
  const app = registeredApps.get(appId);
  
  if (!app?.manifest.adminUI?.routes?.length) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to the {app?.manifest.name} administration interface.
        </p>
      </div>
    );
  }

  // Show first available route
  const firstRoute = app.manifest.adminUI.routes[0];
  return <AppComponentRenderer appId={appId} route={firstRoute} />;
};

export const AppDefaultUserPage: React.FC<{ appId: string }> = ({ appId }) => {
  const { registeredApps } = useAppFramework();
  
  const app = registeredApps.get(appId);
  
  if (!app?.manifest.userUI?.routes?.length) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">{app?.manifest.name}</h2>
        <p className="text-muted-foreground">
          Welcome to {app?.manifest.name}.
        </p>
      </div>
    );
  }

  // Show first available route
  const firstRoute = app.manifest.userUI.routes[0];
  return <AppComponentRenderer appId={appId} route={firstRoute} />;
};

interface AppRouteRendererProps {
  appId: string;
  type: 'admin' | 'user';
}

const AppRouteRenderer: React.FC<AppRouteRendererProps> = ({ appId, type }) => {
  const { registeredApps } = useAppFramework();
  const router = useRouter();
  
  const app = registeredApps.get(appId);
  
  if (!app) {
    return <div>App not found</div>;
  }

  const routes = type === 'admin' ? app.manifest.adminUI?.routes : app.manifest.userUI?.routes;
  
  if (!routes) {
    return <div>No routes configured for this app</div>;
  }

  // Extract the route path from Next.js router
  const currentPath = router.asPath.replace(`/apps/${appId}${type === 'admin' ? '/admin' : ''}`, '') || '/';
  const matchingRoute = routes.find(route => route.path === currentPath);
  
  if (!matchingRoute) {
    // Show default page if no specific route matches
    return type === 'admin' ?
      <AppDefaultAdminPage appId={appId} /> :
      <AppDefaultUserPage appId={appId} />;
  }

  return <AppComponentRenderer appId={appId} route={matchingRoute} />;
};