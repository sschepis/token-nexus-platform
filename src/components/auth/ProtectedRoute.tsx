import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Changed from react-router-dom
import { useAppSelector } from '@/store/hooks';
import { PlatformState } from '@/services/appInitService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  const router = useRouter(); // Changed from useLocation
  const [platformState, setPlatformState] = useState<PlatformState | null>(null);
  const [initialStateChecked, setInitialStateChecked] = useState(false);

  // Get platform state from sessionStorage on component mount
  useEffect(() => {
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

  // Handle redirects based on auth and platform state
  useEffect(() => {
    if (isLoading || !initialStateChecked) return;

    // Check if we're in initial setup mode
    const isInitialSetup = platformState === 'CORE_ARTIFACTS_IMPORTED' || platformState === 'PARENT_ORG_CREATING';
    const isSetupRoute = router.pathname.startsWith('/setup/');

    // Allow access to setup routes during initial setup regardless of auth state
    if (isInitialSetup && isSetupRoute) {
      return;
    }

    // During initial setup, redirect to appropriate setup route if trying to access protected routes
    if (isInitialSetup && requireAuth) {
      const setupRoute = platformState === 'CORE_ARTIFACTS_IMPORTED' 
        ? '/setup/bootstrap-login' 
        : '/setup/create-org-admin';
      
      router.push(setupRoute);
      return;
    }

    // Normal auth flow - if authentication is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      // Save the attempted location for redirect after login
      router.push({
        pathname: redirectTo,
        query: { from: router.asPath }
      });
      return;
    }

    // If user is authenticated but trying to access login page
    if (!requireAuth && isAuthenticated && router.pathname === '/login') {
      // Redirect to dashboard or the location they were trying to access
      const from = router.query.from as string || '/dashboard';
      router.push(from);
      return;
    }
  }, [isAuthenticated, isLoading, initialStateChecked, platformState, requireAuth, redirectTo]);

  // Show loading while checking authentication and platform state
  if (isLoading || !initialStateChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;