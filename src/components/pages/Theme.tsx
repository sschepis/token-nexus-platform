import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { usePageController } from '@/hooks/usePageController';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Sparkles, RefreshCw, Zap, Settings, Eye, Brush } from 'lucide-react';
import { ThemeManagement } from '@/theming/components/ThemeManagement/ThemeManagement';

/**
 * Theme Management Page Component
 *
 * This page provides comprehensive theme management capabilities for organizations.
 * Users can customize visual appearance, branding, colors, typography, and components
 * to create a cohesive brand experience across the platform.
 *
 * Features:
 * - Apply built-in theme templates
 * - Create custom themes with advanced customization
 * - Real-time theme preview
 * - Theme validation and consistency checking
 * - Organization-wide theme deployment
 * - Theme history and version management
 */
const Theme = () => {
  const { toast } = useToast();
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  const { currentTheme, templates, isLoading, error } = useAppSelector((state) => state.theme);

  // Initialize page controller with proper configuration
  const pageController = usePageController({
    pageId: 'theme',
    pageName: 'Theme Management',
    description: 'Customize your organization\'s visual appearance and branding with comprehensive theme management tools',
    category: 'customization',
    permissions: ['theme:read', 'theme:write', 'theme:manage', 'system:admin'],
    tags: ['theme', 'styling', 'appearance', 'customization', 'branding', 'ui']
  });

  // Permission checks using the correct pattern
  const { hasPermission, checkAnyPermission } = usePermission();
  const canReadThemes = checkAnyPermission(['theme:read', 'system:admin']);
  const canWriteThemes = checkAnyPermission(['theme:write', 'system:admin']);
  const canManageThemes = checkAnyPermission(['theme:manage', 'system:admin']);

  // Local state
  const [activeTab, setActiveTab] = useState('templates');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState(false);

  // Use currentOrg.id if available, otherwise fall back to authOrgId
  const effectiveOrgId = currentOrg?.id || authOrgId;

  const handleLoadCurrentTheme = useCallback(async () => {
    if (!pageController.isRegistered || !effectiveOrgId || isLoading || isLoadingTheme) return;
    
    setIsLoadingTheme(true);
    try {
      const result = await pageController.executeAction('getCurrentTheme', {});
      if (!result.success) {
        // Only set error if it's not a temporary issue
        if (!result.error?.includes('Organization context')) {
          setControllerError(result.error || 'Failed to load current theme');
        }
      }
    } catch (error) {
      console.error('Failed to load current theme:', error);
      // Prevent error cascading by only setting critical errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('Invalid function') && !errorMessage.includes('Organization context')) {
        setControllerError(`Failed to load current theme: ${errorMessage}`);
      }
    } finally {
      setIsLoadingTheme(false);
    }
  }, [pageController.isRegistered, pageController.executeAction, effectiveOrgId, isLoading, isLoadingTheme]);

  // Load theme data on component mount - with proper guards to prevent infinite loops
  useEffect(() => {
    if (pageController.isRegistered && effectiveOrgId && !isLoading && !currentTheme && !error && !isLoadingTheme) {
      handleLoadCurrentTheme();
    }
  }, [pageController.isRegistered, effectiveOrgId, isLoading, currentTheme, error, isLoadingTheme, handleLoadCurrentTheme]);

  // Handle errors
  useEffect(() => {
    if (controllerError) {
      toast({
        title: "Error",
        description: controllerError,
        variant: "destructive",
      });
      setControllerError(null);
    }
  }, [controllerError, toast]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !pageController.isRegistered || !effectiveOrgId) return;
    
    setIsRefreshing(true);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('refreshThemes', {
        organizationId: effectiveOrgId
      });
      if (result.success) {
        toast({
          title: "Success",
          description: "Themes refreshed successfully",
        });
      } else {
        setControllerError(result.error || 'Failed to refresh themes');
      }
    } catch (error) {
      console.error('Failed to refresh themes:', error);
      setControllerError(`Failed to refresh themes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, pageController.isRegistered, pageController.executeAction, effectiveOrgId, toast]);

  // Show organization required message if no org context
  if (!effectiveOrgId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Management</h1>
            <p className="text-muted-foreground">
              Customize your organization's visual appearance and branding
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Organization Required
            </CardTitle>
            <CardDescription>
              Please select an organization to manage themes and branding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Theme management requires an active organization context. 
              Please ensure you're logged in and have access to an organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show permission denied if user can't read themes
  if (!canReadThemes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Management</h1>
            <p className="text-muted-foreground">
              Customize your organization's visual appearance and branding
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access theme management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please contact your organization administrator to request theme management permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Management</h1>
            <p className="text-muted-foreground">
              Customize your organization's visual appearance and branding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pageController.isRegistered && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {pageController.getAvailableActions().length} AI actions
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || !canReadThemes}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {controllerError && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {controllerError}
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Customization</CardTitle>
          <CardDescription>
            Manage your organization's visual identity and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Brush className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="customize" disabled={!canWriteThemes} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Theme Templates</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose from pre-built theme templates or create your own
                    </p>
                  </div>
                </div>
                
                <ThemeManagement
                  organizationId={effectiveOrgId}
                  pageController={pageController}
                  className="w-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="customize" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Theme Customization</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize colors, typography, and component styling
                    </p>
                  </div>
                </div>
                
                {canWriteThemes ? (
                  <ThemeManagement
                    organizationId={effectiveOrgId}
                    pageController={pageController}
                    className="w-full"
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground text-center">
                        You need theme write permissions to customize themes.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Theme Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      Preview your theme changes before applying them
                    </p>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">
                      Theme preview functionality will be available here.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Theme;