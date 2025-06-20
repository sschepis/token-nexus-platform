import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppFramework } from '../../contexts/AppFrameworkContext';
import MainAppLayout from '../layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Settings, Info } from 'lucide-react';

interface AppLayoutProps {
  type: 'admin' | 'user';
  children: React.ReactNode;
  appId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ type, children, appId }) => {
  const router = useRouter();
  const { registeredApps } = useAppFramework();
  
  // Get appId from props or router
  const currentAppId = appId || (typeof router.query.appId === 'string' ? router.query.appId : undefined);
  const app = currentAppId ? registeredApps.get(currentAppId) : undefined;
  
  if (!app) {
    return (
      <MainAppLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                App Not Found
              </CardTitle>
              <CardDescription>
                The requested app "{appId}" is not installed or not available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/marketplace">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketplace
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainAppLayout>
    );
  }

  if (!app.isActive) {
    return (
      <MainAppLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                App Inactive
              </CardTitle>
              <CardDescription>
                The app "{app.manifest.name}" is currently inactive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/marketplace">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketplace
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings/apps">
                    <Settings className="h-4 w-4 mr-2" />
                    App Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainAppLayout>
    );
  }

  const uiConfig = type === 'admin' ? app.manifest.adminUI : app.manifest.userUI;
  
  if (!uiConfig?.enabled) {
    return (
      <MainAppLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>
                {type === 'admin' ? 'Admin UI Not Available' : 'User UI Not Available'}
              </CardTitle>
              <CardDescription>
                The app "{app.manifest.name}" does not provide a {type} interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainAppLayout>
    );
  }

  return (
    <MainAppLayout>
      <div className="app-layout" data-app-id={appId} data-app-type={type}>
        {/* App Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href={type === 'admin' ? '/system-admin' : '/dashboard'}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                {app.manifest.adminUI?.navigation?.find(nav => nav.path === location.pathname.replace(`/apps/${appId}/${type}`, ''))?.icon && (
                  <span className="text-lg">
                    {app.manifest.adminUI.navigation.find(nav => nav.path === location.pathname.replace(`/apps/${appId}/${type}`, ''))?.icon}
                  </span>
                )}
                <div>
                  <h1 className="text-lg font-semibold">{app.manifest.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {type === 'admin' ? 'Administration' : 'Application'} • v{app.manifest.version}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/settings/apps/${currentAppId}`}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* App Navigation */}
        {uiConfig.routes && uiConfig.routes.length > 1 && (
          <div className="border-b">
            <div className="container">
              <nav className="flex h-12 items-center space-x-6">
                {uiConfig.routes.map((route) => {
                  const routePath = `/apps/${appId}/${type}${route.path}`;
                  const isActive = location.pathname === routePath;
                  
                  return (
                    <Link
                      key={route.path}
                      href={routePath}
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActive 
                          ? 'text-foreground border-b-2 border-primary' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      {route.title}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* App Content */}
        <div className="container py-6">
          {children}
        </div>
      </div>
    </MainAppLayout>
  );
};