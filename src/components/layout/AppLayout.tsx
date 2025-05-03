
import React, { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { useStore } from "@/hooks/useStore";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { isSidebarOpen, setSidebarOpen } = useStore().app;
  const navigate = useNavigate();

  // Sidebar handlers
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* This is the desktop sidebar - always visible on larger screens */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <div className="h-full border-r">
          <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        </div>
      </div>
      
      {/* Mobile sidebar - only visible when isSidebarOpen is true */}
      <div className="md:hidden">
        <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar openSidebar={openSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
