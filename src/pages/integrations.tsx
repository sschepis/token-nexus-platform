import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebhookIcon, Link as LinkIcon, Database, Lock } from "lucide-react";
import { WebhookManagement } from "@/components/integrations/WebhookManagement";
import { OAuthAppManagement } from "@/components/integrations/OAuthAppManagement";
import { ApiKeyManagement } from "@/components/integrations/ApiKeyManagement";
import { AppMarketplaceTab } from "@/components/integrations/AppMarketplaceTab";

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState("webhooks");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Integrations & API</h1>

      <Tabs defaultValue="webhooks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="webhooks">
            <WebhookIcon className="mr-2 h-4 w-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="oauth">
            <LinkIcon className="mr-2 h-4 w-4" /> OAuth Apps
          </TabsTrigger>
          <TabsTrigger value="apikeys">
            <Lock className="mr-2 h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="marketplace">
            <Database className="mr-2 h-4 w-4" /> App Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhookManagement />
        </TabsContent>

        <TabsContent value="oauth" className="space-y-6">
          <OAuthAppManagement />
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-6">
          <ApiKeyManagement />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <AppMarketplaceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;