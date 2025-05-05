import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Cog, Package, Layers, DatabaseZap } from 'lucide-react'; // Example icons
import { Link, useLocation } from 'react-router-dom'; // Assuming react-router-dom is used

interface SystemAdminLayoutProps {
  children: React.ReactNode;
}

// Define a type for the navigation items
interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  exactMatch?: boolean; // For custom active state logic if needed
}

const adminNavItems: AdminNavItem[] = [
  {
    title: 'Dashboard',
    href: '/system-admin', // Link to the main system admin page
    icon: <Cog className="h-4 w-4" />,
    exactMatch: true, // Match only the base path
  },
  {
    title: 'Contract Deployment',
    href: '/system-admin/deploy',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    title: 'Chain Configuration',
    href: '/system-admin/chains',
    icon: <DatabaseZap className="h-4 w-4" />,
  },
  {
    title: 'App Bundles',
    href: '/system-admin/bundles',
    icon: <Package className="h-4 w-4" />,
  },
];

const SystemAdminLayout: React.FC<SystemAdminLayoutProps> = ({ children }) => {
  const location = useLocation(); // Get current location for active state

  // Helper function to determine active state
  const isActive = (href: string, exactMatch?: boolean) => {
    if (exactMatch) {
      return location.pathname === href;
    }
    // Basic check for non-exact match (adjust as needed)
    return location.pathname.startsWith(href);
  };

  return (
    <AppLayout>
      <div className="flex">
        <Sidebar className="hidden lg:block w-64 border-r">
          <SidebarMenu>
            {adminNavItems.map((item) => (
              // Use SidebarMenuButton with asChild and Link for routing
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href, item.exactMatch)}
                  // Add tooltip for collapsed state
                  tooltip={{ children: item.title, side: 'right', align: 'center' }}
                >
                  <Link to={item.href}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </Sidebar>
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AppLayout>
  );
};

export default SystemAdminLayout;