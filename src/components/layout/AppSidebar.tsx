import Parse from 'parse'; // Import Parse SDK
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
  Fingerprint, // Import Fingerprint icon
  Bot,
  Zap,
  Plus,
  Palette,
  Rocket,
  Link as LinkIcon,
  ShoppingCart,
  Building2,
  Users,
  Server,
  GitBranch
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
import { PlatformStatus } from "@/services/appInitService";
import { hasSmartContract } from '@/parse/parseService'; // Import the new function

export function AppSidebar() {
  const { user, developerMode, permissions } = useAppSelector(state => state.auth);
  const router = useRouter(); // Using Next.js router
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);
  const [platformState, setPlatformState] = useState<PlatformStatus | null>(null);
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
        setPlatformState(status);
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
      if (!user) { // Only run if user is authenticated
        setHasImportedContracts(false); // Reset if user logs out
        return;
      }
      
      // Check if platform is in setup mode - no contracts available during setup
      const platformStatus = process.env.NEXT_PUBLIC_PLATFORM_STATUS || 'PRISTINE';
      if (platformStatus === 'PRISTINE' || platformStatus === 'CORE_ARTIFACTS_IMPORTING') {
        setHasImportedContracts(false);
        return;
      }
      
      try {
        const result = await Parse.Cloud.run('getAlchemyAnalyticsEnabledStatus');
        setHasImportedContracts(result.enabled);
      } catch (error) {
        console.error('Error calling Parse.Cloud.run("getAlchemyAnalyticsEnabledStatus"):', error);
        setHasImportedContracts(false); // Default to false on error
      }
    };
    if (user) { // Call only if user object is available
      checkImportedContractsStatus();
    }
  }, [user]); // Add user to dependency array

  // Check if user has system admin permissions
  // Prefer user.isAdmin if available, otherwise fallback to permissions array
  const hasSystemAdminAccess = mounted && (user?.isAdmin === true || (Array.isArray(permissions) && permissions.includes("system:admin")));

  // Check if platform is in initial setup state
  const isInitialSetup = platformState?.status === 'CORE_ARTIFACTS_IMPORTED' || platformState?.status === 'PARENT_ORG_CREATING';
  const isPlatformOperational = platformState?.status === 'OPERATIONAL' || platformState?.status === 'PARENT_ORG_CREATED';

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
      name: "Reports",
      path: "/reports",
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: "Integrations",
      path: "/integrations",
      icon: <LinkIcon className="h-5 w-5" /> // Fixed: Changed from LayoutDashboard to LinkIcon
    },
    {
      name: "MCP Servers",
      path: "/mcp-servers",
      icon: <Server className="h-5 w-5" />
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
    },
    {
      name: "AI Assistant",
      path: "/ai-assistant",
      icon: <Bot className="h-5 w-5" />
    },
    {
      name: "Cloud Functions",
      path: "/cloud-functions",
      icon: <Zap className="h-5 w-5" />
    },
    {
      name: "Workflows",
      path: "/workflows",
      icon: <GitBranch className="h-5 w-5" />
    },
    {
      name: "Triggers",
      path: "/triggers",
      icon: <Zap className="h-5 w-5" />
    },
    {
      name: "Scheduled Jobs",
      path: "/scheduled-jobs",
      icon: <Clock className="h-5 w-5" />
    },
    {
      name: "Theme",
      path: "/theme",
      icon: <Palette className="h-5 w-5" />
    }
  ];

  // Define System Admin navigation items
  const adminNavItems = [
    {
      name: 'Contract Deploy',
      path: '/system-admin/deploy',
      icon: <Rocket className="h-5 w-5" />,
    },
    {
      name: 'Contract Import',
      path: '/system-admin/import',
      icon: <DatabaseZap className="h-5 w-5" />,
    },
    {
      name: 'Chain Config',
      path: '/system-admin/chains',
      icon: <LinkIcon className="h-5 w-5" />,
    },
    {
      name: 'App Store',
      path: '/system-admin/app-store',
      icon: <Store className="h-5 w-5" />,
    },
    {
      name: 'Organizations',
      path: '/system-admin/orgs',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      name: 'Global Users',
      path: '/system-admin/users',
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: 'Deployment Status',
      path: '/system-admin/status',
      icon: <Server className="h-5 w-5" />,
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
      path: "/dev/database-explorer", // Fixed: Updated to match actual file
      icon: <Database className="h-5 w-5" />
    },
    {
      name: "Environment Manager",
      path: "/dev/env-manager", // Fixed: Updated to match actual file
      icon: <Wrench className="h-5 w-5" />
    },
    {
      name: "Logs Viewer",
      path: "/dev/logs-viewer", // Fixed: Updated to match actual file
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: "Performance Monitor",
      path: "/dev/performance-monitor", // Fixed: Updated to match actual file
      icon: <Layers className="h-5 w-5" />
    },
    {
      name: "Auth Tester",
      path: "/dev/auth-tester", // Fixed: Updated to match actual file
      icon: <Key className="h-5 w-5" />
    },
    {
      name: "Storage Explorer",
      path: "/dev/storage-explorer", // Fixed: Updated to match actual file
      icon: <Database className="h-5 w-5" />
    },
    {
      name: "Network Inspector",
      path: "/dev/network-inspector", // Fixed: Updated to match actual file
      icon: <Search className="h-5 w-5" />
    },
    {
      name: "Debug Settings",
      path: "/dev/debug-settings", // Fixed: Updated to match actual file
      icon: <Bug className="h-5 w-5" />
    },
    {
      name: "Create Token",
      path: "/tokens/create", // Fixed: Updated to match actual file
      icon: <Plus className="h-5 w-5" />
    }
  ];

  // Helper function to check if a path is active
  const isPathActive = (itemPath: string, currentPath: string) => {
    // Exact match for most paths
    if (currentPath === itemPath) return true;
    
    // Special handling for system-admin paths with dynamic segments
    if (itemPath === '/system-admin' && currentPath.startsWith('/system-admin')) {
      return currentPath === '/system-admin' || currentPath === '/system-admin/';
    }
    
    // For other system-admin sub-paths, check if current path starts with item path
    if (itemPath.startsWith('/system-admin/') && currentPath.startsWith(itemPath)) {
      return true;
    }
    
    // For tokens path, handle both /tokens and /tokens/create
    if (itemPath === '/tokens' && (currentPath === '/tokens' || currentPath.startsWith('/tokens/'))) {
      return true;
    }
    
    // For AI assistant, handle sub-paths
    if (itemPath === '/ai-assistant' && currentPath.startsWith('/ai-assistant')) {
      return true;
    }
    
    return false;
  };

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
                          isActive={isPathActive(item.path, router.pathname)}
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
                          isActive={isPathActive(item.path, router.pathname)}
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
                          isActive={isPathActive(item.path, router.pathname)}
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
        {/* Logout button */}
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Logout"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        
        <div className="text-xs text-muted-foreground text-center mt-2">
          © 2024 Token Nexus Platform
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
