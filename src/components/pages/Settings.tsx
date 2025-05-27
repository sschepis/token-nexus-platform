
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
// updateOrgTheme and updateOrgLogo might be deprecated if handled by updateCurrentOrgSettings
import { fetchCurrentOrgDetails } from "@/store/slices/orgSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileSettings from "@/components/settings/ProfileSettings";
import OrganizationSettings from "@/components/settings/OrganizationSettings";
import OrganizationMembers from "@/components/settings/OrganizationMembers";
import SecuritySettings from "@/components/settings/SecuritySettings";
import BillingSettings from "@/components/settings/BillingSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const dispatch = useAppDispatch();
  const { currentOrg, isLoading: isOrgLoading, error: orgError } = useAppSelector((state) => state.org);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Fetch detailed org settings if currentOrg is set but might be missing details (e.g., the 'settings' object)
    // Or if it's the first load and currentOrg.id is available from a summary list.
    if (currentOrg?.id && !currentOrg.settings) { // Simple check: if settings object is missing, fetch details
      dispatch(fetchCurrentOrgDetails(currentOrg.id));
    }
  }, [dispatch, currentOrg?.id, currentOrg?.settings]);
  
  // Show loading or error state for org details
  if (isOrgLoading && activeTab === 'organization') {
    return (
            <div className="flex items-center justify-center h-64">
                <p>Loading organization details...</p>
            </div>
    );
  }
  
  // It's possible currentOrg is null initially if not set by auth flow or org selection yet.
  // The `OrganizationSettings` component will also need to handle currentOrg potentially being null.
  if (!user) return <p>Please log in.</p>; // Or redirect to login

  // If currentOrg is still null after attempting to load, and we are on the org tab, show a message.
  // For other tabs like 'profile', currentOrg might not be strictly necessary.
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
          <TabsList className="grid grid-cols-5 md:w-fit w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings user={user} />
          </TabsContent>
          
          <TabsContent value="organization" className="space-y-4">
            <OrganizationSettings />
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4">
            <OrganizationMembers />
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

export default Settings;
