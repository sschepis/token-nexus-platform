
import React, { useState, useEffect } from "react";
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
  FileText,
  Bell,
  Link as LinkIcon,
  ChartBar
} from "lucide-react";

const Sidebar = () => {
  const { pathname } = useLocation();
  const { hasPermission, checkAnyPermission } = usePermission();
  const { currentOrg } = useAppSelector(state => state.org);
  const permissions = useAppSelector(state => state.auth.permissions);
  const [collapsed, setCollapsed] = useState(false);
  const [debugItems, setDebugItems] = useState<string[]>([]);

  // Debug: Log permissions on mount and when they change
  useEffect(() => {
    console.log("Current permissions:", permissions);
    const visibleItems = navItems
      .filter(item => permissions.includes(item.permission))
      .map(item => item.name);
    console.log("Menu items that should be visible:", visibleItems);
    setDebugItems(visibleItems);
  }, [permissions]);

  const navItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
      permission: "dashboard:read"
    },
    {
      name: "Objects",
      icon: <Database size={20} />,
      path: "/objects",
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
      name: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
      permission: "settings:read"
    }
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Debug component to show permissions
  const PermissionDebug = () => {
    if (process.env.NODE_ENV !== "development") return null;
    
    return (
      <div className="p-2 text-xs border-t border-sidebar-border">
        <p className="font-semibold">Permissions Debug:</p>
        <ul className="mt-1">
          {permissions.map(perm => (
            <li key={perm}>{perm}</li>
          ))}
        </ul>
        <p className="mt-2 font-semibold">Visible Items:</p>
        <ul className="mt-1">
          {debugItems.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
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
          {navItems.map((item) => {
            // Force show all items for debugging
            const shouldShow = true; // For debugging, we'll show all items
            return shouldShow && (
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
            );
          })}
        </ul>
      </nav>

      {!collapsed && <PermissionDebug />}

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
