import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserOrganizations, fetchCurrentOrgDetails } from '@/store/slices/orgSlice';
import { isParseReady } from '@/utils/parseUtils';

/**
 * Hook to ensure organization context is properly initialized after authentication
 * This hook should be used in the main app layout to ensure organization data is loaded
 */
export const useOrganizationContext = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, orgId } = useAppSelector((state) => state.auth);
  const { currentOrg, userOrgs, isLoading, error } = useAppSelector((state) => state.org);
  const [parseReady, setParseReady] = useState(false);

  // Check if Parse is ready
  useEffect(() => {
    const checkParseReadyStatus = () => {
      const ready = isParseReady();
      setParseReady(ready);
      
      if (!ready) {
        // If Parse isn't ready, check again in 100ms
        setTimeout(checkParseReadyStatus, 100);
      }
    };
    
    checkParseReadyStatus();
  }, []);

  useEffect(() => {
    // Only fetch organization data if Parse is ready, user is authenticated and we don't have org data
    // Also check if there's no error to prevent infinite retries on failed requests
    if (parseReady && isAuthenticated && userOrgs.length === 0 && !isLoading && !error) {
      console.log('[OrganizationContext] Fetching user organizations after authentication');
      dispatch(fetchUserOrganizations());
    }
  }, [parseReady, isAuthenticated, userOrgs.length, isLoading, error, dispatch]);

  useEffect(() => {
    // Fetch detailed organization info if Parse is ready, we have an orgId but no current org details
    // Also check if there's no error to prevent infinite retries on failed requests
    if (parseReady && isAuthenticated && orgId && !currentOrg && !isLoading && !error) {
      console.log('[OrganizationContext] Fetching current organization details:', orgId);
      dispatch(fetchCurrentOrgDetails(orgId));
    }
  }, [parseReady, isAuthenticated, orgId, currentOrg, isLoading, error, dispatch]);

  return {
    currentOrg,
    userOrgs,
    isLoading,
    hasOrganizationContext: !!currentOrg,
    organizationId: currentOrg?.id || orgId
  };
};

export default useOrganizationContext;