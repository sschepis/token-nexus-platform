import React, { useEffect } from 'react';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Wallet, Layers } from 'lucide-react';
import { useRouter } from 'next/router';
import { usePageController } from '@/hooks/usePageController';

const DfnsManagementPage: React.FC = () => {
  const router = useRouter();

  // Register this page with the controller registry
  const pageController = usePageController({
    pageId: 'dfns-management',
    pageName: 'Dfns Management Dashboard',
    description: 'System administration dashboard for Dfns wallet management across all organizations',
    category: 'system-admin',
    permissions: ['system-admin'],
    tags: ['dfns', 'wallets', 'system-admin']
  });

  // Register navigation action
  useEffect(() => {
    pageController.registerAction({
      id: 'view-org-integrations',
      name: 'View Organization Integrations',
      description: 'Navigate to organization-specific Dfns integration settings page',
      category: 'navigation',
      permissions: ['system-admin'],
      parameters: [
        {
          name: 'orgId',
          type: 'string',
          required: true,
          description: 'Organization ID to navigate to',
          validation: [
            {
              type: 'format',
              pattern: '^[a-zA-Z0-9_-]+$',
              message: 'Organization ID must contain only alphanumeric characters, underscores, and hyphens'
            }
          ]
        }
      ],
      execute: async ({ orgId }, context) => {
        const targetPath = `/system-admin/organizations/${orgId}/integrations`;
        await router.push(targetPath);
        
        return {
          success: true,
          message: `Navigated to integrations page for organization ${orgId}`,
          data: { targetPath, orgId }
        };
      },
      metadata: {
        tags: ['navigation', 'organization', 'dfns'],
        examples: [
          {
            params: { orgId: 'org123' },
            description: 'Navigate to integrations for organization org123'
          }
        ],
        relatedActions: []
      }
    });
  }, [pageController, router]);

  const handleViewOrgIntegrations = async (orgId: string) => {
    try {
      await pageController.executeAction('view-org-integrations', { orgId });
    } catch (error) {
      console.error('Failed to navigate to organization integrations:', error);
      // Fallback to direct navigation
      router.push(`/system-admin/organizations/${orgId}/integrations`);
    }
  };

  return (
    <SystemAdminLayout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dfns Management Dashboard (System Admin)</h1>
            <p className="text-muted-foreground">
              This dashboard provides a global overview of Dfns wallet activities and integrations across all organizations.
              System administrators can monitor Dfns usage, manage policies, and access organization-specific Dfns settings.
            </p>
          </div>
          {pageController.isRegistered && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Controller Registry: <span className="text-green-600 font-medium">Active</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {pageController.getAvailableActions().length} actions available
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dfns Wallets</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> {/* Placeholder for actual data */}
              <p className="text-xs text-muted-foreground">Across all organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations with Dfns</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> {/* Placeholder for actual data */}
              <p className="text-xs text-muted-foreground">Active Dfns integrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div> {/* Placeholder for actual data */}
              <p className="text-xs text-muted-foreground">User actions awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <section className="my-6 p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 className="text-xl font-semibold mb-3">Organization-Specific Dfns Overview</h2>
          <p className="mb-4">
            Manage Dfns configurations and operational details for individual organizations.
          </p>
          {/* Placeholder for a list of organizations and links to their Dfns integration settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <span className="font-medium">Example Organization A</span>
              <Button variant="outline" onClick={() => handleViewOrgIntegrations('orgA_Id_placeholder')}>
                View Dfns Settings
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <span className="font-medium">Example Organization B</span>
              <Button variant="outline" onClick={() => handleViewOrgIntegrations('orgB_Id_placeholder')}>
                View Dfns Settings
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              (Actual organization data will be fetched from Parse in a future step)
            </p>
          </div>
        </section>
      </div>
    </SystemAdminLayout>
  );
};

export default DfnsManagementPage;