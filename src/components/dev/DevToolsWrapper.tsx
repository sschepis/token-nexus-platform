import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DevToolsWrapperProps {
  children: React.ReactNode;
  toolName: string;
  description?: string;
}

/**
 * Security wrapper for development tools
 * Ensures dev tools are only accessible to authorized users in appropriate environments
 */
export const DevToolsWrapper: React.FC<DevToolsWrapperProps> = ({
  children,
  toolName,
  description
}) => {
  const router = useRouter();
  const { permissions, user } = useAppSelector((state) => state.auth);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = () => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const devToolsEnabled = isDevelopment && process.env.NEXT_PUBLIC_DEV_TOOLS_ENABLED === 'true'; // Allow dev tools to be explicitly enabled in development
      const isSystemAdmin = permissions?.includes('system:admin') || user?.isAdmin;
      
      // Access is granted only if in development with dev tools enabled, AND user is system admin.
      // Or in production, access is explicitly denied for dev tools.
      if (!devToolsEnabled || !isSystemAdmin) {
        // If not explicitly enabled for dev, or not a system admin, or in production, redirect.
        router.replace('/dashboard');
        return;
      }
      
      setHasAccess(true);
      setIsLoading(false);
    };

    // Small delay to ensure auth state is loaded
    const timer = setTimeout(checkAccess, 100);
    return () => clearTimeout(timer);
  }, [permissions, user, router]);

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container py-6 space-y-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. Development tools are only available to system administrators in production environments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <div className="container py-6 space-y-6">

      {/* Tool Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <CardTitle>{toolName}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isProduction ? 'destructive' : 'secondary'}>
                {process.env.NODE_ENV || 'development'}
              </Badge>
              <Badge variant="outline">Dev Tool</Badge>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Tool Content */}
      {children}
    </div>
  );
};

export default DevToolsWrapper;