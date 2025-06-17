import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebhookIcon, Link as LinkIcon, Database, Lock, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { WebhookManagement } from "@/components/integrations/WebhookManagement";
import { OAuthAppManagement } from "@/components/integrations/OAuthAppManagement";
import { ApiKeyManagement } from "@/components/integrations/ApiKeyManagement";
import { usePageController } from "@/hooks/usePageController";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const IntegrationsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = useState("webhooks");
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('integrations:read');
  const canWrite = hasPermission('integrations:write');
  const canManageAPI = hasPermission('api:manage');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'integrations',
    pageName: 'Integrations & API',
    description: 'Manage external service integrations and API connections',
    category: 'connectivity',
    permissions: ['integrations:read', 'integrations:write', 'api:manage'],
    tags: ['integrations', 'api', 'external', 'services']
  });

  // Load integrations from controller
  const loadIntegrations = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchIntegrations', { includeInactive: true });
      
      if (result.success && result.data) {
        const integrationsData = result.data as { integrations: any[] };
        setIntegrations(integrationsData.integrations || []);
        toast({
          title: "Integrations loaded",
          description: "Integrations loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load integrations');
        toast({
          title: "Error loading integrations",
          description: result.error || 'Failed to load integrations',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      setError('Failed to load integrations');
      toast({
        title: "Error loading integrations",
        description: 'Failed to load integrations',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load integrations on component mount
  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadIntegrations();
    }
  }, [pageController.isRegistered, canRead]);

  const handleRefreshIntegrations = async () => {
    await loadIntegrations();
  };

  // Show permission error if user can't read integrations
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrations & API</h1>
            <p className="text-muted-foreground mt-2">
              Manage external service integrations, webhooks, OAuth apps, and API keys
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view integrations. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations & API</h1>
          <p className="text-muted-foreground mt-2">
            Manage external service integrations, webhooks, OAuth apps, and API keys
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshIntegrations}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="webhooks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full md:w-[450px]">
          <TabsTrigger value="webhooks" disabled={!canWrite}>
            <WebhookIcon className="mr-2 h-4 w-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="oauth" disabled={!canWrite}>
            <LinkIcon className="mr-2 h-4 w-4" /> OAuth Apps
          </TabsTrigger>
          <TabsTrigger value="apikeys" disabled={!canManageAPI}>
            <Lock className="mr-2 h-4 w-4" /> API Keys
          </TabsTrigger>
        </TabsList>

        {canWrite && (
          <TabsContent value="webhooks" className="space-y-6">
            <WebhookManagement />
          </TabsContent>
        )}

        {canWrite && (
          <TabsContent value="oauth" className="space-y-6">
            <OAuthAppManagement />
          </TabsContent>
        )}

        {canManageAPI && (
          <TabsContent value="apikeys" className="space-y-6">
            <ApiKeyManagement />
          </TabsContent>
        )}

        {!canWrite && !canManageAPI && (
          <div className="mt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have read-only access to integrations. Contact your administrator for write permissions.
              </AlertDescription>
            </Alert>
          </div>
        )}

      </Tabs>
    </div>
  );
};

export default IntegrationsPage;