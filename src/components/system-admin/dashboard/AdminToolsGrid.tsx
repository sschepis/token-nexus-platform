import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { 
  Rocket,
  DatabaseZap,
  LinkIcon,
  Store,
  Building2,
  Users,
  Server,
  Fingerprint,
  Settings,
  FileText,
  Shield,
  BarChart3,
  Wrench,
  Terminal
} from 'lucide-react';

interface AdminTool {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: 'contracts' | 'management' | 'system' | 'analytics';
  isNew?: boolean;
}

export const AdminToolsGrid: React.FC = () => {
  const adminTools: AdminTool[] = [
    // Contract Management
    {
      title: 'Contract Deploy',
      description: 'Deploy new smart contracts to the platform',
      href: '/system-admin/deploy',
      icon: <Rocket className="h-6 w-6" />,
      category: 'contracts'
    },
    {
      title: 'Contract Import',
      description: 'Import existing smart contracts and ABIs',
      href: '/system-admin/import',
      icon: <DatabaseZap className="h-6 w-6" />,
      category: 'contracts'
    },
    {
      title: 'Chain Configuration',
      description: 'Configure blockchain networks and connections',
      href: '/system-admin/chains',
      icon: <LinkIcon className="h-6 w-6" />,
      category: 'contracts'
    },
    
    // Management Tools
    {
      title: 'Organizations',
      description: 'Manage organizations and their settings',
      href: '/system-admin/orgs',
      icon: <Building2 className="h-6 w-6" />,
      category: 'management'
    },
    {
      title: 'Global Users',
      description: 'User management across all organizations',
      href: '/system-admin/users',
      icon: <Users className="h-6 w-6" />,
      category: 'management'
    },
    {
      title: 'App Store',
      description: 'Manage applications and bundles',
      href: '/system-admin/app-store',
      icon: <Store className="h-6 w-6" />,
      category: 'management'
    },
    
    // System Tools
    {
      title: 'Deployment Status',
      description: 'Monitor system deployments and health',
      href: '/system-admin/status',
      icon: <Server className="h-6 w-6" />,
      category: 'system'
    },
    {
      title: 'System Settings',
      description: 'Configure platform-wide settings',
      href: '/system-admin/settings',
      icon: <Settings className="h-6 w-6" />,
      category: 'system'
    },
    {
      title: 'System Logs',
      description: 'View and analyze system logs',
      href: '/system-admin/logs',
      icon: <FileText className="h-6 w-6" />,
      category: 'system'
    },
    {
      title: 'Security Center',
      description: 'Security policies and access control',
      href: '/system-admin/security',
      icon: <Shield className="h-6 w-6" />,
      category: 'system'
    },
    
    // Analytics & Reports
    {
      title: 'Analytics Dashboard',
      description: 'Platform usage and performance analytics',
      href: '/system-admin/analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      category: 'analytics'
    },
    {
      title: 'System Reports',
      description: 'Generate system and usage reports',
      href: '/system-admin/reports',
      icon: <FileText className="h-6 w-6" />,
      category: 'analytics'
    }
  ];

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'contracts':
        return 'Contract Management';
      case 'management':
        return 'Organization & User Management';
      case 'system':
        return 'System Administration';
      case 'analytics':
        return 'Analytics & Reports';
      default:
        return 'Tools';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contracts':
        return <Rocket className="h-5 w-5" />;
      case 'management':
        return <Users className="h-5 w-5" />;
      case 'system':
        return <Wrench className="h-5 w-5" />;
      case 'analytics':
        return <BarChart3 className="h-5 w-5" />;
      default:
        return <Terminal className="h-5 w-5" />;
    }
  };

  const groupedTools = adminTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, AdminTool[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Administrative Tools</h2>
        <p className="text-muted-foreground">
          Access all system administration and management tools
        </p>
      </div>

      {Object.entries(groupedTools).map(([category, tools]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            {getCategoryIcon(category)}
            {getCategoryTitle(category)}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool, index) => (
              <Link key={index} href={tool.href} passHref legacyBehavior>
                <a>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {tool.icon}
                        </div>
                        {tool.isNew && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base">{tool.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm">
                        {tool.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminToolsGrid;