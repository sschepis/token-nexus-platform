import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // Changed from react-router-dom
import { useAppSelector } from "@/store/hooks";
import { PlatformState } from "@/services/appInitService";
import InitialSetupModal from "@/components/setup/InitialSetupModal";

const Index = () => {
  const router = useRouter(); // Changed from useNavigate
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [platformState, setPlatformState] = useState<PlatformState | null>(null);
  const [initialStateChecked, setInitialStateChecked] = useState(false);

  useEffect(() => {
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
    setInitialStateChecked(true);
  }, []);

  useEffect(() => {
    if (!initialStateChecked) return;

    // Check if we're in initial setup mode
    const isInitialSetup = 
      platformState === 'CORE_ARTIFACTS_IMPORTED' || 
      platformState === 'PARENT_ORG_CREATING';

    // If in setup mode, navigate to appropriate setup route
    if (isInitialSetup) {
      const setupRoute = platformState === 'CORE_ARTIFACTS_IMPORTED' 
        ? '/setup/bootstrap-login' 
        : '/setup/create-org-admin';
      
      router.push(setupRoute);
      return;
    }

    // Normal app flow - redirect to dashboard if authenticated, otherwise to login
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router, platformState, initialStateChecked]);

  // This is just a loading screen while redirecting
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading Token Nexus Platform...</p>
        </div>
      </div>
      
      {/* Initial Setup Modal */}
      <InitialSetupModal />
    </>
  );
};

export default Index;
