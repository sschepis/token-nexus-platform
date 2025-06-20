import React, { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalProfile } from '@/components/account/PersonalProfile';
import { PersonalSecurity } from '@/components/account/PersonalSecurity';
import { PersonalPreferences } from '@/components/account/PersonalPreferences';
import { PersonalNotifications } from '@/components/account/PersonalNotifications';

const AccountPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to access your account settings.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-fit w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <PersonalProfile user={user} />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <PersonalSecurity user={user} />
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-4">
          <PersonalPreferences user={user} />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <PersonalNotifications user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountPage;