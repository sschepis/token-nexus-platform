import React, { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { usePageController } from '@/hooks/usePageController';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { ThemeManagement } from '@/theming/components/ThemeManagement/ThemeManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Sparkles, RefreshCw } from 'lucide-react';

const Theme = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  
  // Use modern page controller integration
  const pageController = usePageController('theme');
  const canManageThemes = usePermission('themes:manage');
  const { toast } = useToast();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);
  
  // Use currentOrg.id if available, otherwise fall back to authOrgId
  const effectiveOrgId = currentOrg?.id || authOrgId;

  const handleRefresh = async () => {
    if (!pageController.isRegistered || !effectiveOrgId) return;
    
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
  };

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

  return (
    <div className="space-y-6">
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

        {controllerError && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
            {controllerError}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || !canManageThemes}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <ThemeManagement
        organizationId={effectiveOrgId}
        className="w-full"
      />
    </div>
  );
};

export default Theme;