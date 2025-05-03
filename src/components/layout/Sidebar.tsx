import React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ModeToggle } from "@/components/layout/ModeToggle";
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
  Component
} from "lucide-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ isSidebarOpen, closeSidebar }: SidebarProps) => {
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetOrg());
    navigate('/login');
  };

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
      icon: <Home className="h-5 w-5" />
    },
    {
      name: "Integrations",
      path: "/integrations",
      icon: <Home className="h-5 w-5" />
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <Home className="h-5 w-5" />
    },
    {
      name: "Audit Logs",
      path: "/audit-logs",
      icon: <Home className="h-5 w-5" />
    },
    {
      name: "Tokens",
      path: "/tokens",
      icon: <Home className="h-5 w-5" />
    }
  ];

  return (
    <Sheet open={isSidebarOpen} onOpenChange={closeSidebar}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-64 flex flex-col gap-4 z-50">
        <Link to="/dashboard" className="font-bold text-xl">
          Logo
        </Link>

        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage src={user?.image} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="pl-2 w-full justify-start text-sm font-medium leading-none hover:bg-transparent">
                {user?.name}
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
                  onClick={closeSidebar}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="pb-3 pt-4">
          <ModeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
