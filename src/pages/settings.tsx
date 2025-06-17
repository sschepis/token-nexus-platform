import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { fetchCurrentOrgDetails } from "@/store/slices/orgSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import BillingSettings from "@/components/settings/BillingSettings";
import AIAssistantSettings from "@/components/settings/AIAssistantSettings";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const dispatch = useAppDispatch();
  const { currentOrg, isLoading: isOrgLoading, error: orgError } = useAppSelector((state) => state.org);
  const { user } = useAppSelector((state) => state.auth);

  // Use modern page controller integration
  const pageController = usePageController('settings');
  const canManageSettings = usePermission('settings:manage');
  const { toast } = useToast();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg?.id && !currentOrg.settings) {
      dispatch(fetchCurrentOrgDetails(currentOrg.id));
    }
  }, [dispatch, currentOrg?.id, currentOrg?.settings]);

  const handleRefresh = async () => {
    if (!pageController.isRegistered) return;
    
    setIsRefreshing(true);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('refreshSettings', {
        orgId: currentOrg?.id,
        activeTab
      });
      if (result.success) {
        if (currentOrg?.id) {
          dispatch(fetchCurrentOrgDetails(currentOrg.id));
        }
        toast({
          title: "Success",
          description: "Settings refreshed successfully",
        });
      } else {
        setControllerError(result.error || 'Failed to refresh settings');
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error);
      setControllerError(`Failed to refresh settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  if (isOrgLoading && activeTab === 'organization') {
    return (
            <div className="flex items-center justify-center h-64">
                <p>Loading organization details...</p>
            </div>
    );
  }
  
  if (!user) return <p>Please log in.</p>;

  if (!currentOrg && (activeTab === 'organization' || activeTab === 'billing')) {
      return (
              <div className="space-y-6">
                  <div>
                      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                      <p className="text-muted-foreground">Manage your account settings and preferences.</p>
                  </div>
                  <p>No organization selected or available. Please select an organization.</p>
              </div>
      );
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
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
              disabled={isRefreshing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 md:w-fit w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings user={user} />
          </TabsContent>
          
          <TabsContent value="organization" className="space-y-4">
            <OrganizationSettings />
          </TabsContent>
          
          <TabsContent value="ai-assistant" className="space-y-4">
            <AIAssistantSettings />
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <SecuritySettings />
          </TabsContent>
          
          <TabsContent value="billing" className="space-y-4">
            <BillingSettings organization={currentOrg} />
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default SettingsPage;