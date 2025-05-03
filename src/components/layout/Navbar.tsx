
import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useAppSelector } from "@/store/hooks";

interface NavbarProps {
  openSidebar: () => void;
}

const Navbar = ({ openSidebar }: NavbarProps) => {
  const { currentOrg } = useAppSelector(state => state.org);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={openSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            {currentOrg?.name || "Organization"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
