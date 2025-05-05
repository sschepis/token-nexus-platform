
import React, { useState } from 'react';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import JiraIntegration from '@/components/system-admin/integrations/JiraIntegration';
import SlackIntegration from '@/components/system-admin/integrations/SlackIntegration';
import AIWorkersConfig from '@/components/system-admin/ai/AIWorkersConfig';

const ProjectIntegrations = () => {
  const [activeTab, setActiveTab] = useState('jira');

  return (
    <SystemAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Configure external integrations and AI workers for project management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="jira">JIRA</TabsTrigger>
            <TabsTrigger value="slack">Slack</TabsTrigger>
            <TabsTrigger value="ai">AI Workers</TabsTrigger>
          </TabsList>

          <TabsContent value="jira" className="mt-6">
            <JiraIntegration />
          </TabsContent>

          <TabsContent value="slack" className="mt-6">
            <SlackIntegration />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <AIWorkersConfig />
          </TabsContent>
        </Tabs>
      </div>
    </SystemAdminLayout>
  );
};

export default ProjectIntegrations;
