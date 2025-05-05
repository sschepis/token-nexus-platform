import React from 'react';
import { useStore } from "@/hooks/useStore";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface NavbarProps {
  openSidebar?: () => void;
}

const Navbar = ({ openSidebar }: NavbarProps) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-background p-2 px-4">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center">
          <SidebarTrigger className="md:hidden" />
        </div>
        <div className="flex items-center gap-2">
          {/* Other navbar items */}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
