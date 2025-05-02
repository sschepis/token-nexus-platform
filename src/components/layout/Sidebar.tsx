import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import usePermission from "@/hooks/usePermission";
import { useAppSelector } from "@/store/hooks";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Coins,
  Users,
  Settings,
  Database,
  Code,
  Calendar,
  File,
  Shield,
  Bell,
  FileText,
  Link as LinkIcon,
  ChartBar
} from "lucide-react";

const Sidebar = () => {
  const { pathname } = useLocation();
  const { hasPermission } = usePermission();
  const { currentOrg } = useAppSelector(state => state.org);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
      permission: "dashboard:read"
    },
    {
      name: "Object Manager",
      icon: <Database size={20} />,
      path: "/object-manager",
      permission: "objects:read"
    },
    {
      name: "Tokens",
      icon: <Coins size={20} />,
      path: "/tokens",
      permission: "tokens:read"
    },
    {
      name: "Users",
      icon: <Users size={20} />,
      path: "/users",
      permission: "users:read"
    },
    {
      name: "Integrations",
      icon: <LinkIcon size={20} />,
      path: "/integrations",
      permission: "integrations:read"
    },
    {
      name: "Reports",
      icon: <ChartBar size={20} />,
      path: "/reports",
      permission: "reports:read"
    },
    {
      name: "Audit Logs",
      icon: <FileText size={20} />,
      path: "/audit-logs",
      permission: "audit:read"
    },
    {
      name: "Notifications",
      icon: <Bell size={20} />,
      path: "/notifications",
      permission: "notifications:read"
    },
    {
      name: "Data",
      icon: <Database size={20} />,
      path: "/data",
      permission: "data:read"
    },
    {
      name: "Cloud Functions",
      icon: <Code size={20} />,
      path: "/functions",
      permission: "cloudFunctions:read"
    },
    {
      name: "Scheduled Jobs",
      icon: <Calendar size={20} />,
      path: "/jobs",
      permission: "jobs:read"
    },
    {
      name: "Pages",
      icon: <File size={20} />,
      path: "/pages",
      permission: "pages:read"
    },
    {
      name: "Roles",
      icon: <Shield size={20} />,
      path: "/roles",
      permission: "roles:read"
    },
    {
      name: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
      permission: "settings:read"
    }
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("p-4 flex items-center gap-2 border-b border-sidebar-border h-16", 
                          collapsed && "justify-center")}>
        {!collapsed && currentOrg?.logo && (
          <img
            src={currentOrg.logo}
            alt={`${currentOrg.name} logo`}
            className="h-8 w-auto"
          />
        )}
        {!collapsed && (
          <span className="font-semibold text-lg truncate">
            {currentOrg?.name || "Token Nexus"}
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "ml-auto p-1 rounded-full hover:bg-sidebar-accent",
            collapsed && "ml-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(
            (item) =>
              hasPermission(item.permission) && (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md transition-colors",
                      pathname === item.path
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center"
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              )
          )}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            <p>Platform v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
