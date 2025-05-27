import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router"; // Keep using Next.js router
import { useAppSelector } from "@/store/hooks";
import Navbar from "./Navbar";
import { motion } from "framer-motion";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import FloatingAIChatButton from "@/components/ai-assistant/FloatingAIChatButton";
import AIChatPopup from "@/components/ai-assistant/AIChatPopup";
import { PlatformState } from "@/services/appInitService";

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
  const router = useRouter(); // Using Next.js router
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [platformState, setPlatformState] = useState<PlatformState | null>(null);

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setMounted(true);
    
    // Get platform state from sessionStorage
    const storedStatus = sessionStorage.getItem('platformStatus');
    if (storedStatus) {
      try {
        const status = JSON.parse(storedStatus);
        setPlatformState(status.status);
      } catch (e) {
        console.error('Error parsing platform status:', e);
      }
    }
  }, []);

  // Check if we're in initial setup mode
  const isInitialSetup = 
    platformState === 'CORE_ARTIFACTS_IMPORTED' || 
    platformState === 'PARENT_ORG_CREATING';
  
  // Check if currently on a setup route
  const isSetupRoute = router.pathname.startsWith('/setup/');

  // Redirect logic based on auth state and platform state
  useEffect(() => {
    if (!mounted) return;

    // If in setup mode but not on a setup route, redirect to create-org-admin
    if (isInitialSetup && !isSetupRoute) {
      router.push('/setup/create-org-admin');
      return;
    }

    // Only redirect to login if not in setup mode and not authenticated
    if (!isInitialSetup && !isAuthenticated && !router.pathname.startsWith('/login')) {
      router.push({
        pathname: "/login",
        query: { from: router.asPath }
      });
    }
  }, [isAuthenticated, mounted, platformState, isInitialSetup, isSetupRoute, router.pathname, router.asPath]);

  const toggleChatPopup = () => {
    setIsChatPopupOpen(prev => !prev);
  };

  // For setup routes, use a simpler layout without sidebar and navbar
  if (isSetupRoute) {
    return (
      <div className="h-screen bg-background">
        <motion.main
          className="h-full overflow-y-auto"
          variants={mainVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatedContainer animation="fade" duration={0.5} delay={0.15}>
            {children}
          </AnimatedContainer>
        </motion.main>
      </div>
    );
  }

  // Prevent hydration errors by rendering minimal content during server-side rendering
  if (!mounted) {
    return (
      <div className="h-screen bg-background">
        <div className="h-full overflow-y-auto">
          {/* Minimal structure to match client render but without dynamic content */}
          <div>{children}</div>
        </div>
      </div>
    );
  }

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
        
        {/* AI Chat Components */}
        {isAuthenticated && !isInitialSetup && (
          <>
            <FloatingAIChatButton onClick={toggleChatPopup} />
            <AIChatPopup isOpen={isChatPopupOpen} onClose={toggleChatPopup} />
          </>
        )}
      </motion.div>
    </SidebarProvider>
  );
};

export default AppLayout;
