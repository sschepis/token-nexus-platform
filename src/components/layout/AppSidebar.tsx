import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link"; // Keep using Next.js Link
import { useRouter } from "next/router"; // Keep using Next.js router
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { resetOrgState } from "@/store/slices/orgSlice";
import {
  Home,
  LayoutDashboard,
  User,
  Settings as SettingsIcon,
  LogOut,
  Database,
  LayoutPanelLeft,
  Component,
  Bell,
  FileText,
  Clock,
  Key,
  Navigation,
  Store,
  Terminal,
  Code,
  Search,
  Bug,
  FileJson,
  Layers,
  Wrench,
  Shield,
  Cog,
  Package,
  DatabaseZap,
  Fingerprint // Import Fingerprint icon
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar";
import { PlatformState } from "@/services/appInitService";
import { hasSmartContract } from '@/parse/parseService'; // Import the new function

export function AppSidebar() {
  const { user, developerMode, permissions } = useAppSelector(state => state.auth);
  const router = useRouter(); // Using Next.js router
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  const [platformState, setPlatformState] = useState<PlatformState | null>(null);
  const [hasIdentityFactory, setHasIdentityFactory] = useState(false); // New state for IdentityFactory
  const [hasImportedContracts, setHasImportedContracts] = useState(false); // New state for imported contracts

  // Fix hydration mismatch by ensuring server and client render the same initially
  useEffect(() => {
    setMounted(true);
    
    // Get platform state from sessionStorage
    const storedStatus = sessionStorage.getItem('platformStatus');
    if (storedStatus) {
      try {
        const status = JSON.parse(storedStatus);
        setPlatformState(status.status);
      } catch (e) {
        console.error('Error parsing platform status:', e);
      }
    }

    // Check for IdentityFactory contract presence
    const checkIdentityFactoryStatus = async () => {
      const exists = await hasSmartContract('IdentityFactory');
      setHasIdentityFactory(exists);
    };
    checkIdentityFactoryStatus();
     
    // Check for imported contracts status for Alchemy Analytics
    const checkImportedContractsStatus = async () => {
      try {
        const result = await Parse.Cloud.run('getAlchemyAnalyticsEnabledStatus');
        setHasImportedContracts(result.enabled);
      } catch (error) {
        console.error('Error fetching imported contracts status:', error);
        setHasImportedContracts(false); // Default to false on error
      }
    };
    checkImportedContractsStatus();

  }, []);

  // Check if user has system admin permissions
  // Prefer user.isAdmin if available, otherwise fallback to permissions array
  const hasSystemAdminAccess = mounted && (user?.isAdmin === true || (Array.isArray(permissions) && permissions.includes("system:admin")));

  // Check if platform is in initial setup state
  const isInitialSetup = platformState === 'CORE_ARTIFACTS_IMPORTED' || platformState === 'PARENT_ORG_CREATING';
  const isPlatformOperational = platformState === 'OPERATIONAL' || platformState === 'PARENT_ORG_CREATED';

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrgState());
    router.push('/login');
  };

  // Get the first letter of the first name for the avatar fallback
  const getInitials = () => {
    if (user?.firstName) {
      return user.firstName.charAt(0);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const userName = mounted && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "User";

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: "Users",
      path: "/users",
      icon: <User className="h-5 w-5" />
    },
    {
      name: "Routes",
      path: "/routes",
      icon: <Navigation className="h-5 w-5" />
    },
    {
      name: "Object Manager",
      path: "/object-manager",
      icon: <Database className="h-5 w-5" />
    },
    {
      name: "Page Builder",
      path: "/page-builder",
      icon: <LayoutPanelLeft className="h-5 w-5" />
    },
    {
      name: "Component Library",
      path: "/component-library",
      icon: <Component className="h-5 w-5" />
    },
    {
      name: "Reports",
      path: "/reports",
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: "Integrations",
      path: "/integrations",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: "Marketplace",
      path: "/marketplace",
      icon: <Store className="h-5 w-5" />
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <Bell className="h-5 w-5" />
    },
    {
      name: "Audit Logs",
      path: "/audit-logs",
      icon: <Clock className="h-5 w-5" />
    },
    {
      name: "Tokens",
      path: "/tokens",
      icon: <Key className="h-5 w-5" />
    }
  ];

  // Define System Admin navigation items
  const adminNavItems = [
    {
      name: 'Contract Import',
      path: '/system-admin/import',
      icon: <DatabaseZap className="h-5 w-5" />,
    },
    {
      name: 'App Bundles',
      path: '/system-admin/bundles',
      icon: <Package className="h-5 w-5" />,
    },
    {
      name: 'Organizations',
      path: '/system-admin/orgs',
      icon: <Cog className="h-5 w-5" />,
    },
  ];

  // Dynamically add Identity Factory Explorer and Alchemy Analytics to adminNavItems
  const finalAdminNavItems = [...adminNavItems];
  if (hasIdentityFactory && isPlatformOperational) {
    finalAdminNavItems.push({
      name: "Identity Factory",
      path: "/identity-factory",
      icon: <Fingerprint className="h-5 w-5" />
    });
  }

  // Add Alchemy Analytics menu item when platform is operational AND contracts are imported
  if (isPlatformOperational && hasImportedContracts) {
    finalAdminNavItems.push({
      name: "Alchemy Analytics",
      path: "/system-admin/alchemy-analytics",
      icon: <DatabaseZap className="h-5 w-5" />, // Using DatabaseZap for now, can change if a better icon is available
    });
  }


  // Developer tools menu items
  const devItems = [
    {
      name: "GraphQL Explorer",
      path: "/graphql-console",
      icon: <Code className="h-5 w-5" />
    },
    {
      name: "JS Console",
      path: "/js-console",
      icon: <Terminal className="h-5 w-5" />
    },
    {
      name: "API Testing",
      path: "/dev/api-testing",
      icon: <FileJson className="h-5 w-5" />
    },
    {
      name: "Database Explorer",
      path: "/dev/database",
      icon: <Database className="h-5 w-5" />
    },
    {
      name: "Environment Variables",
      path: "/dev/env",
      icon: <Wrench className="h-5 w-5" />
    },
    {
      name: "Logs Viewer",
      path: "/dev/logs",
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: "Performance",
      path: "/dev/performance",
      icon: <Layers className="h-5 w-5" />
    },
    {
      name: "Auth Tester",
      path: "/dev/auth-testing",
      icon: <Key className="h-5 w-5" />
    },
    {
      name: "Storage Explorer",
      path: "/dev/storage",
      icon: <Database className="h-5 w-5" />
    },
    {
      name: "Network Inspector",
      path: "/dev/network",
      icon: <Search className="h-5 w-5" />
    },
    {
      name: "Debug Settings",
      path: "/dev/settings",
      icon: <Bug className="h-5 w-5" />
    }
  ];

  // Use this to avoid hydration errors - only render on client
  if (!mounted) {
    return null; // Return nothing during server-side rendering
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" legacyBehavior>
          <a className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg">Token Nexus</span>
          </a>
        </Link>

        {/* User indicator - only show if user exists */}
        {user && (
          <div className="flex items-center gap-2 mt-4 px-2 py-1 rounded-md bg-muted/50">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              {user?.firstName || user?.email}
            </span>
            {hasSystemAdminAccess && (
              <Shield className="h-3 w-3 text-primary" />
            )}
          </div>
        )}

        {/* Show setup status during initial setup */}
        {isInitialSetup && (
          <div className="mt-4 px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              Initial Setup Mode
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Only show Navigation items if platform is operational and user is authenticated */}
        {isPlatformOperational && user && (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <Link href={item.path} legacyBehavior>
                      <a>
                        <SidebarMenuButton
                          tooltip={item.name}
                          isActive={router.pathname === item.path}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </a>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Show System Admin items during setup or if user has admin access */}
        {(isInitialSetup || hasSystemAdminAccess) && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {isInitialSetup ? 'Setup Tools' : 'System Administration'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {finalAdminNavItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <Link href={item.path} legacyBehavior>
                      <a>
                        <SidebarMenuButton
                          tooltip={item.name}
                          isActive={router.pathname === item.path || (item.path !== "/system-admin" && router.pathname.startsWith(item.path))}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </a>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Developer tools - only show if developer mode is enabled and platform is operational */}
        {developerMode && isPlatformOperational && (
          <SidebarGroup>
            <SidebarGroupLabel>Developer Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <Link href={item.path} legacyBehavior>
                      <a>
                        <SidebarMenuButton
                          tooltip={item.name}
                          isActive={router.pathname === item.path}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </a>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          © 2024 Token Nexus Platform
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
