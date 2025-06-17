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
    const handleInitialRedirect = () => {
      setIsLoading(true);
      const cachedStatus = sessionStorage.getItem('platformStatus');
      
      if (cachedStatus) {
        const status: PlatformStatus = JSON.parse(cachedStatus);
        setPlatformStatus(status);

        // If already authenticated, always go to dashboard, bypassing setup checks from this page
        if (isAuthenticated) {
          router.replace("/dashboard");
          return;
        }

        // If not authenticated, check platform status explicitly from cache
        if (status.status === 'OPERATIONAL') {
          router.replace("/login"); // Go to login if operational but not authenticated
          return;
        } else if (status.status === 'CORE_ARTIFACTS_IMPORTED') {
          router.replace('/setup/bootstrap-login');
          return;
        } else if (status.status === 'PARENT_ORG_CREATING') {
          router.replace('/setup/create-org-admin');
          return;
        }
        // If status is PRISTINE or ERROR, _app.tsx handles it by trying to initialize and redirect
        // Or if status is still 'CORE_ARTIFACTS_IMPORTING', it indicates ongoing setup.
        // In these cases, we do nothing and let _app.tsx manage the redirect.
      } else if (isAuthenticated) {
        // If no cached status but authenticated, assume operational and go to dashboard
        router.replace("/dashboard");
        return;
      } else {
        // If no cached status and not authenticated, we let _app.tsx determine the flow.
        // This page will just show loading, and _app.tsx will perform initializeApp().
        console.log('No cached platform status and not authenticated. Deferring to _app.tsx initialization.');
        // No explicit redirect here, let _app.tsx flow or login redirect take over.
      }
    };

    // Run once on component mount
    handleInitialRedirect();
    setIsLoading(false); // Set to false after initial redirect attempt
  }, [isAuthenticated]); // Remove router from dependencies to prevent infinite loops

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