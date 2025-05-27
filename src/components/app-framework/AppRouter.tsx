import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAppFramework } from '../../contexts/AppFrameworkContext';
import { AppLayout } from './AppLayout';
import { AppComponentRenderer } from './AppComponentRenderer';

export const AppRouter: React.FC = () => {
  const { registeredApps } = useAppFramework();

  return (
    <Routes>
      {/* Admin routes for each app */}
      <Route path="/apps/:appId/admin" element={<AppLayout type="admin" />}>
        <Route index element={<AppDefaultAdminPage />} />
        <Route path="*" element={<AppRouteRenderer type="admin" />} />
      </Route>

      {/* User routes for each app */}
      <Route path="/apps/:appId" element={<AppLayout type="user" />}>
        <Route index element={<AppDefaultUserPage />} />
        <Route path="*" element={<AppRouteRenderer type="user" />} />
      </Route>
    </Routes>
  );
};

const AppDefaultAdminPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const { registeredApps } = useAppFramework();
  
  const app = appId ? registeredApps.get(appId) : undefined;
  
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

  // Redirect to first available route
  const firstRoute = app.manifest.adminUI.routes[0];
  return <AppComponentRenderer appId={appId!} route={firstRoute} />;
};

const AppDefaultUserPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const { registeredApps } = useAppFramework();
  
  const app = appId ? registeredApps.get(appId) : undefined;
  
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

  // Redirect to first available route
  const firstRoute = app.manifest.userUI.routes[0];
  return <AppComponentRenderer appId={appId!} route={firstRoute} />;
};

interface AppRouteRendererProps {
  type: 'admin' | 'user';
}

const AppRouteRenderer: React.FC<AppRouteRendererProps> = ({ type }) => {
  const { appId } = useParams<{ appId: string }>();
  const { registeredApps } = useAppFramework();
  const location = window.location;
  
  const app = appId ? registeredApps.get(appId) : undefined;
  
  if (!app) {
    return <div>App not found</div>;
  }

  const routes = type === 'admin' ? app.manifest.adminUI?.routes : app.manifest.userUI?.routes;
  
  if (!routes) {
    return <div>No routes configured for this app</div>;
  }

  // Find matching route
  const currentPath = location.pathname.replace(`/apps/${appId}${type === 'admin' ? '/admin' : ''}`, '');
  const matchingRoute = routes.find(route => route.path === currentPath);
  
  if (!matchingRoute) {
    return <div>Route not found</div>;
  }

  return <AppComponentRenderer appId={appId} route={matchingRoute} />;
};