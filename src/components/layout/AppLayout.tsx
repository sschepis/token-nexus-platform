
import React, { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { useStore } from "@/hooks/useStore";
import Navbar from "./Navbar";
import { motion } from "framer-motion";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { 
  SidebarProvider, 
  SidebarInset,
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader, 
  SidebarFooter
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const mainVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.4
    }
  }
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <SidebarProvider defaultOpen={true}>
      <motion.div 
        className="h-screen flex overflow-hidden bg-background w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AppSidebar />
        
        <SidebarInset>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar />
            <motion.main 
              className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
              variants={mainVariants}
            >
              <AnimatedContainer animation="fade" duration={0.5} delay={0.15}>
                {children}
              </AnimatedContainer>
            </motion.main>
          </div>
        </SidebarInset>
      </motion.div>
    </SidebarProvider>
  );
};

export default AppLayout;
