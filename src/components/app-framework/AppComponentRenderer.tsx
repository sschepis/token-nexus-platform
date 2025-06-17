import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useAppFramework } from '../../contexts/AppFrameworkContext';
import { AppRoute, AppComponentProps } from '../../types/app-framework';
import { AppWrapper } from '../../contexts/AppFrameworkContext';
import { useAppSelector } from '../../store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '../ui/button';

interface AppComponentRendererProps {
  appId: string;
  route: AppRoute;
}

// Error Boundary for App Components
interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode; appId: string; componentName: string; onRetry: () => void },
  AppErrorBoundaryState
> {
  constructor(props: { children: ReactNode; appId: string; componentName: string; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App component error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log error to app framework
    this.logComponentError(error, errorInfo);
  }

  private async logComponentError(error: Error, errorInfo: ErrorInfo) {
    try {
      // In a real implementation, this would send error data to the backend
      console.log('Logging component error for app:', this.props.appId);
      // Parse.Cloud.run('logAppComponentError', {
      //   appId: this.props.appId,
      //   componentName: this.props.componentName,
      //   error: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack
      // });
    } catch (logError) {
      console.error('Failed to log component error:', logError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-2xl mx-auto border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Bug className="h-5 w-5" />
              App Component Error
            </CardTitle>
            <CardDescription>
              The "{this.props.componentName}" component in app "{this.props.appId}" encountered an error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium mb-2">Error Details:</p>
              <code className="block p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            
            {this.state.error?.stack && (
              <details className="text-sm">
                <summary className="font-medium cursor-pointer hover:text-primary">
                  Stack Trace
                </summary>
                <code className="block mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-48">
                  {this.state.error.stack}
                </code>
              </details>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export const AppComponentRenderer: React.FC<AppComponentRendererProps> = ({ appId, route }) => {
  const { registeredApps } = useAppFramework();
  const { user, permissions } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  const [retryKey, setRetryKey] = React.useState(0);
  
  const app = registeredApps.get(appId);
  
  const handleRetry = React.useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);
  
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

  // Permission checking with app-specific permissions
  if (route.permissions && route.permissions.length > 0) {
    const hasPermissions = route.permissions.every(permission => {
      // Check global permissions (app-specific permissions would be checked via backend)
      return permissions.includes(permission);
    });
    
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

  // Component props with app framework context
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
    permissions: permissions || [],
    // Context for app framework features
    appFramework: {
      manifest: app.manifest,
      installation: app.installation,
      // API for apps to interact with the framework
      api: {
        // Trigger custom events
        triggerEvent: async (eventName: string, data: any) => {
          try {
            // In a real implementation, this would call the backend
            console.log('Triggering custom event:', eventName, data);
            // return Parse.Cloud.run('fireCustomTrigger', {
            //   organizationId: currentOrg?.id,
            //   customEvent: eventName,
            //   data
            // });
          } catch (error) {
            console.error('Failed to trigger event:', error);
            throw error;
          }
        },
        // Call app APIs
        callAPI: async (path: string, method: string = 'GET', data?: any) => {
          try {
            console.log('Calling app API:', method, path, data);
            // return Parse.Cloud.run('callAppAPI', {
            //   organizationId: currentOrg?.id,
            //   path,
            //   method,
            //   data
            // });
          } catch (error) {
            console.error('Failed to call API:', error);
            throw error;
          }
        },
        // Update app configuration
        updateConfig: async (newConfig: any) => {
          try {
            console.log('Updating app config:', newConfig);
            // return Parse.Cloud.run('updateAppConfiguration', {
            //   organizationId: currentOrg?.id,
            //   installationId: app.installation.objectId,
            //   configuration: newConfig
            // });
          } catch (error) {
            console.error('Failed to update config:', error);
            throw error;
          }
        }
      }
    }
  };

  // Cast the component to the correct type
  const AppComponent = Component as React.ComponentType<AppComponentProps>;
  
  return (
    <AppErrorBoundary
      key={retryKey}
      appId={appId}
      componentName={route.component}
      onRetry={handleRetry}
    >
      <AppWrapper {...componentProps}>
        <div
          className="app-component"
          data-app-id={appId}
          data-component={route.component}
          data-app-version={app.manifest.version}
        >
          <AppComponent {...componentProps} />
        </div>
      </AppWrapper>
    </AppErrorBoundary>
  );
};