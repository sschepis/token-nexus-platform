import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchCurrentOrgDetails } from "@/store/slices/orgSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileSettings from "@/components/settings/ProfileSettings";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import BillingSettings from "@/components/settings/BillingSettings";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const dispatch = useAppDispatch();
  const { currentOrg, isLoading: isOrgLoading, error: orgError } = useAppSelector((state) => state.org);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (currentOrg?.id && !currentOrg.settings) { 
      dispatch(fetchCurrentOrgDetails(currentOrg.id));
    }
  }, [dispatch, currentOrg?.id, currentOrg?.settings]);
  
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 md:w-fit w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings user={user} />
          </TabsContent>
          
          <TabsContent value="organization" className="space-y-4">
            <OrganizationSettings organization={currentOrg} />
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