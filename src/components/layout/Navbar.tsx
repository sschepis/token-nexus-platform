import React from 'react';
import { useAppSelector } from "@/store/hooks";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import Link from "next/link";
import { logout } from "@/store/slices/authSlice";
import { resetOrgState } from "@/store/slices/orgSlice";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ModeToggle } from "./ModeToggle";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import {
  Settings,
  User,
  LogOut,
  Shield,
  LayoutDashboard,
  Database,
  Users,
  Navigation as NavigationIcon,
  Store,
  FileText,
  Layers,
  Component,
  Key
} from "lucide-react";

interface NavbarProps {
  openSidebar?: () => void;
}

const Navbar = ({ openSidebar }: NavbarProps) => {
  const { user, isAuthenticated, permissions } = useAppSelector(state => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  // Fix hydration mismatch by ensuring server and client render the same initially
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrgState());
    router.push('/login');
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user?.firstName) {
      return user.firstName.charAt(0);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const userName = mounted && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || "User" : "User";
  const hasSystemAdminAccess = mounted && (user?.isAdmin === true || (Array.isArray(permissions) && permissions.includes("system:admin")));

  // Quick navigation items for the navbar
  const quickNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      title: "Users",
      href: "/users",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Objects",
      href: "/object-manager",
      icon: <Database className="h-4 w-4" />,
    },
    {
      title: "Apps",
      href: "/marketplace",
      icon: <Store className="h-4 w-4" />,
    }
  ];

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left section - Sidebar trigger and brand */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          
          <Link href="/dashboard" className="hidden md:block">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-semibold text-lg">Token Nexus</span>
            </div>
          </Link>

          {/* Quick navigation - hidden on smaller screens */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-8 bg-transparent hover:bg-accent">
                  Quick Access
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {quickNavItems.map((item) => (
                      <Link key={item.href} href={item.href} passHref legacyBehavior>
                        <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <div className="flex items-center gap-2 text-sm font-medium leading-none">
                            {item.icon}
                            {item.title}
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {item.title === "Dashboard" && "View your application dashboard and metrics"}
                            {item.title === "Users" && "Manage users and permissions"}
                            {item.title === "Objects" && "Configure data objects and schemas"}
                            {item.title === "Apps" && "Browse and install applications"}
                          </p>
                        </NavigationMenuLink>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right section - Actions and user menu */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <GlobalSearch />

          {/* Notifications */}
          <NotificationDropdown />

          {/* Theme toggle */}
          <ModeToggle />

          {/* Admin badge */}
          {hasSystemAdminAccess && (
            <Badge variant="secondary" className="hidden md:flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} alt={userName} />
                  <AvatarFallback className="text-xs">{mounted ? getInitials() : "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{mounted ? userName : "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {mounted ? user?.email : ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <Link href="/settings/profile" passHref legacyBehavior>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </Link>
              
              <Link href="/settings" passHref legacyBehavior>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>

              {hasSystemAdminAccess && (
                <>
                  <DropdownMenuSeparator />
                  <Link href="/system-admin" passHref legacyBehavior>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>System Admin</span>
                    </DropdownMenuItem>
                  </Link>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
