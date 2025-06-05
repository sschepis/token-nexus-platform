import React from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { resetOrgState } from "@/store/slices/orgSlice"; // Corrected import
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
  Cog,
  Shield,
  MessageSquare,
  Building2,
  Users,
  Rocket,
  Link as LinkIcon,
  Server,
  HardDrive
} from "lucide-react";
 
interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

// Define a type for navigation items
interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  role?: string; // Optional role for RBAC
}

const Sidebar = ({ isSidebarOpen, closeSidebar }: SidebarProps) => {
  const { user, developerMode, permissions } = useAppSelector(state => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const [mounted, setMounted] = React.useState(false);
  const [navigationOpen, setNavigationOpen] = React.useState(true);
  const [systemAdminOpen, setSystemAdminOpen] = React.useState(false);

  // Fix hydration mismatch by ensuring server and client render the same initially
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user has system admin permissions
  const hasSystemAdminAccess = mounted && permissions.includes("system:admin");

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrgState()); // Corrected usage
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

  const userName = mounted && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || "User" : "User";

  const navItems: NavItem[] = [
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
      icon: <LinkIcon className="h-5 w-5" />
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
      icon: <MessageSquare className="h-5 w-5" />
    }
  ];

  // System Admin navigation items
  const systemAdminItems: NavItem[] = [
    {
      name: "Organizations",
      path: "/system-admin/orgs",
      icon: <Building2 className="h-5 w-5" />
    },
    {
      name: "Global Users",
      path: "/system-admin/users",
      icon: <Users className="h-5 w-5" />
    },
    {
      name: "Contract Deploy",
      path: "/system-admin/deploy",
      icon: <Rocket className="h-5 w-5" />
    },
    {
      name: "Contract Import",
      path: "/system-admin/import",
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: "Chain Config",
      path: "/system-admin/chains",
      icon: <LinkIcon className="h-5 w-5" />
    },
    {
      name: "App Store",
      path: "/system-admin/store",
      icon: <Store className="h-5 w-5" />
    },
    {
      name: "Deployment Status",
      path: "/system-admin/status",
      icon: <Server className="h-5 w-5" />
    },
    {
      name: "DFNS Management",
      path: "/system-admin/dfns",
      icon: <Shield className="h-5 w-5" />
    },
    {
      name: "SSH Management",
      path: "/system-admin/ssh",
      icon: <Terminal className="h-5 w-5" />
    }
  ];

  // Developer tools menu items
  const devItems: NavItem[] = [ // Apply NavItem type
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

  const SidebarContent = () => (
    <div className="h-full flex flex-col gap-4 p-4 bg-background border-r">
      <Link href="/dashboard" className="font-bold text-xl">
        Logo
      </Link>

      <div className="flex items-center space-x-2">
        <Avatar>
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback>{mounted ? getInitials() : "U"}</AvatarFallback>
        </Avatar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2 w-full justify-start text-sm font-medium leading-none hover:bg-transparent">
              {mounted ? userName : "User"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href="/settings/profile">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/settings/account">
              <DropdownMenuItem>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Navigation Section */}
        <Collapsible open={navigationOpen} onOpenChange={setNavigationOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-semibold text-sm text-muted-foreground hover:bg-secondary"
            >
              <span>NAVIGATION</span>
              {navigationOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary transition-colors"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* System Administration Section - only visible if user has permission */}
        {hasSystemAdminAccess && (
          <Collapsible open={systemAdminOpen} onOpenChange={setSystemAdminOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto font-semibold text-sm text-muted-foreground hover:bg-secondary"
              >
                <span>SYSTEM ADMINISTRATION</span>
                {systemAdminOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-2">
              {systemAdminItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary transition-colors"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Developer section - only visible when developer mode is enabled */}
        {developerMode && (
          <div className="mt-4">
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                DEVELOPER TOOLS
              </div>
            </div>
            <div className="space-y-1">
              {devItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary transition-colors"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pb-3 pt-4">
        <ModeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <div className="h-full border-r">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={closeSidebar}>
        <SheetContent className="w-64 p-0" side="left">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Sidebar;
