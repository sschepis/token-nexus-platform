import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAppSelector } from "@/store/hooks";

interface PlatformStatus {
  status: string;
  message: string;
  coreContractsImportedForNetwork?: string;
  parentOrgId?: string;
  timestamp: string;
}

const IndexPage = () => {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check platform status first before any redirects
    const checkPlatformStatus = async () => {
      try {
        // First check if we have cached platform status from _app.tsx initialization
        const cachedStatus = sessionStorage.getItem('platformStatus');
        if (cachedStatus) {
          const status = JSON.parse(cachedStatus);
          setPlatformStatus(status);
          
          // Handle setup flow redirects
          if (status.status === 'CORE_ARTIFACTS_IMPORTED') {
            console.log('Redirecting to bootstrap login from index...');
            router.replace('/setup/bootstrap-login');
            return;
          }
          
          if (status.status === 'PARENT_ORG_CREATING') {
            console.log('Redirecting to create org admin from index...');
            router.replace('/setup/create-org-admin');
            return;
          }
        }

        // If no cached status, fetch it directly
        const response = await fetch('/api/app-status');
        const status = await response.json();
        setPlatformStatus(status);
        
        // Handle setup flow redirects
        if (status.status === 'CORE_ARTIFACTS_IMPORTED') {
          console.log('Redirecting to bootstrap login from index...');
          router.replace('/setup/bootstrap-login');
          return;
        }
        
        if (status.status === 'PARENT_ORG_CREATING') {
          console.log('Redirecting to create org admin from index...');
          router.replace('/setup/create-org-admin');
          return;
        }

        // Only redirect based on auth if platform is fully operational
        if (status.status === 'OPERATIONAL') {
          if (isAuthenticated) {
            router.push("/dashboard");
          } else {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error('Failed to check platform status:', error);
        // Fallback to login on error
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkPlatformStatus();
  }, [isAuthenticated, router]);

  // Show loading screen while checking platform status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading Token Nexus Platform...</p>
        </div>
      </div>
    );
  }

  // This should rarely be seen as redirects happen in useEffect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary"></div>
        </div>
        <p className="text-muted-foreground mt-4">Initializing...</p>
      </div>
    </div>
  );
};

export default IndexPage;