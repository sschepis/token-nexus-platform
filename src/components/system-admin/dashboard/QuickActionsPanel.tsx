import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Rocket, 
  Building2, 
  DatabaseZap, 
  FileText,
  Plus,
  Upload,
  Settings,
  Users
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline';
}

export const QuickActionsPanel: React.FC = () => {
  const quickActions: QuickAction[] = [
    {
      title: 'Deploy Contract',
      description: 'Deploy new smart contracts to the platform',
      href: '/system-admin/deploy',
      icon: <Rocket className="h-4 w-4" />,
      variant: 'default'
    },
    {
      title: 'Create Organization',
      description: 'Set up a new organization',
      href: '/system-admin/orgs?action=create',
      icon: <Building2 className="h-4 w-4" />,
      variant: 'secondary'
    },
    {
      title: 'Import Contracts',
      description: 'Import existing smart contracts',
      href: '/system-admin/import',
      icon: <DatabaseZap className="h-4 w-4" />,
      variant: 'outline'
    },
    {
      title: 'View System Logs',
      description: 'Monitor system activity and errors',
      href: '/system-admin/logs',
      icon: <FileText className="h-4 w-4" />,
      variant: 'outline'
    },
    {
      title: 'Manage Users',
      description: 'Global user management',
      href: '/system-admin/users',
      icon: <Users className="h-4 w-4" />,
      variant: 'outline'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      href: '/system-admin/settings',
      icon: <Settings className="h-4 w-4" />,
      variant: 'outline'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common administrative tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href} passHref legacyBehavior>
            <a className="block">
              <Button
                variant={action.variant || 'outline'}
                className="w-full justify-start h-auto p-4"
                asChild
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {action.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            </a>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;