import React from 'react';
import { useAppFramework } from '../../contexts/AppFrameworkContext';
import { AppRoute, AppComponentProps } from '../../types/app-framework';
import { AppWrapper } from '../../contexts/AppFrameworkContext';
import { useAppSelector } from '../../store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle } from 'lucide-react';

interface AppComponentRendererProps {
  appId: string;
  route: AppRoute;
}

export const AppComponentRenderer: React.FC<AppComponentRendererProps> = ({ appId, route }) => {
  const { registeredApps } = useAppFramework();
  const { user, permissions } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  
  const app = registeredApps.get(appId);
  
  if (!app) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            App Not Found
          </CardTitle>
          <CardDescription>
            The app "{appId}" is not registered or available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!app.isActive) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            App Inactive
          </CardTitle>
          <CardDescription>
            The app "{app.manifest.name}" is currently inactive.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const Component = app.components.get(route.component);
  
  if (!Component) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Component Not Found
          </CardTitle>
          <CardDescription>
            The component "{route.component}" is not registered for app "{app.manifest.name}".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Available components:</p>
            <ul className="list-disc list-inside mt-2">
              {Array.from(app.components.keys()).map((componentName) => (
                <li key={componentName}>{componentName}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check permissions if specified
  if (route.permissions && route.permissions.length > 0) {
    // Check if user has required permissions
    const hasPermissions = route.permissions.every(permission =>
      permissions.includes(permission)
    );
    
    if (!hasPermissions) {
      return (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Insufficient Permissions
            </CardTitle>
            <CardDescription>
              You don't have the required permissions to access this component.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>Required permissions:</p>
              <ul className="list-disc list-inside mt-2">
                {route.permissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  const componentProps: AppComponentProps = {
    appId,
    config: app.installation.appSpecificConfig || {},
    organization: currentOrg ? {
      objectId: currentOrg.id || '',
      name: currentOrg.name || '',
      domain: currentOrg.domain,
      settings: currentOrg.settings || {}
    } : {
      objectId: '',
      name: 'Unknown Organization',
      settings: {}
    },
    user: user ? {
      objectId: user.id || '',
      username: `${user.firstName} ${user.lastName}`.trim() || user.email,
      email: user.email || '',
    } : {
      objectId: '',
      username: 'Unknown User',
      email: ''
    },
    permissions: permissions || []
  };

  try {
    // Cast the component to the correct type
    const AppComponent = Component as React.ComponentType<AppComponentProps>;
    
    return (
      <AppWrapper {...componentProps}>
        <div className="app-component" data-app-id={appId} data-component={route.component}>
          <AppComponent {...componentProps} />
        </div>
      </AppWrapper>
    );
  } catch (error) {
    console.error('Error rendering app component:', error);
    
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Component Error
          </CardTitle>
          <CardDescription>
            An error occurred while rendering the "{route.component}" component.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Error details:</p>
            <code className="block mt-2 p-2 bg-muted rounded text-xs">
              {error instanceof Error ? error.message : 'Unknown error'}
            </code>
          </div>
        </CardContent>
      </Card>
    );
  }
};