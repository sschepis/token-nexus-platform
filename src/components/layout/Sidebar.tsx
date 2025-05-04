import React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/store/hooks";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { resetOrg } from "@/store/slices/orgSlice";
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
  Shield
} from "lucide-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ isSidebarOpen, closeSidebar }: SidebarProps) => {
  const { user, developerMode, permissions } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Check if user has system admin permissions
  const hasSystemAdminAccess = permissions.includes("system:admin");

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrg());
    navigate('/login');
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

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "User";

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

  // Add System Admin item if user has permission
  if (hasSystemAdminAccess) {
    navItems.push({
      name: "System Admin",
      path: "/system-admin",
      icon: <Shield className="h-5 w-5" />
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

  const SidebarContent = () => (
    <div className="h-full flex flex-col gap-4 p-4 bg-background border-r">
      <Link to="/dashboard" className="font-bold text-xl">
        Logo
      </Link>

      <div className="flex items-center space-x-2">
        <Avatar>
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2 w-full justify-start text-sm font-medium leading-none hover:bg-transparent">
              {userName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to="/settings/profile">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
            <Link to="/settings/account">
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

      <div className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Developer section - only visible when developer mode is enabled */}
        {developerMode && (
          <>
            <div className="mt-6 mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                DEVELOPER TOOLS
              </div>
            </div>
            <ul className="space-y-1">
              {devItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
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
