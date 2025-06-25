import { useEffect, useState, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserOrganizations, fetchCurrentOrgDetails } from '@/store/slices/orgSlice';
import { isParseReady } from '@/utils/parseUtils';

/**
 * Hook to ensure organization context is properly initialized after authentication
 * This hook should be used in the main app layout to ensure organization data is loaded
 */
export const useOrganizationContext = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, orgId, user } = useAppSelector((state) => state.auth); // Include user
  const { currentOrg, userOrgs, isLoading, error } = useAppSelector((state) => state.org);
  const [parseReady, setParseReady] = useState(false);
  const fetchAttempts = useRef(0);
  const lastFetchTime = useRef(0);

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
    // Only fetch organization data if Parse is ready, user is authenticated, user ID is available,
    // and we don't already have org data or aren't currently loading.
    // Add retry limits and timing to prevent infinite loops.

    if (!isAuthenticated || !user?.id || userOrgs.length > 0 || isLoading) {
      return; // Do not fetch if not authenticated, no user ID, already have data, or already loading
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    const shouldFetch = parseReady &&
                       fetchAttempts.current < 3 && // Max 3 attempts
                       timeSinceLastFetch > 5000; // Wait at least 5 seconds between attempts
    
    if (shouldFetch) {
      console.log(`[OrganizationContext] Fetching user organizations after authentication for user ID: ${user.id} (attempt ${fetchAttempts.current + 1}/3)`);
      fetchAttempts.current += 1;
      lastFetchTime.current = now;
      dispatch(fetchUserOrganizations());
    }
  }, [parseReady, isAuthenticated, user?.id, userOrgs.length, isLoading, dispatch]); // Added user?.id to dependencies

  // Reset fetch attempts when user changes or when we get successful data
  useEffect(() => {
    if (userOrgs.length > 0 || currentOrg || !isAuthenticated || !user?.id) { // Reset on logout or successful fetch
      fetchAttempts.current = 0;
      lastFetchTime.current = 0;
    }
  }, [userOrgs.length, currentOrg, isAuthenticated, user?.id]); // Added user?.id to dependencies

  useEffect(() => {
    // Fetch detailed organization info if Parse is ready, we have an orgId but no current org details
    if (!isAuthenticated || !orgId || currentOrg || isLoading) {
      return; // Do not fetch if not authenticated, no orgId, already has currentOrg, or already loading
    }
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    const shouldFetchOrgDetails = parseReady &&
                                 fetchAttempts.current < 3 && // Max 3 attempts
                                 timeSinceLastFetch > 5000; // Wait at least 5 seconds between attempts
    
    if (shouldFetchOrgDetails) {
      console.log(`[OrganizationContext] Fetching current organization details: ${orgId} (attempt ${fetchAttempts.current + 1}/3)`);
      fetchAttempts.current += 1;
      lastFetchTime.current = now;
      dispatch(fetchCurrentOrgDetails(orgId));
    }
  }, [parseReady, isAuthenticated, orgId, currentOrg, isLoading, dispatch, user?.id]); // Added user?.id to dependencies

  return {
    currentOrg,
    userOrgs,
    isLoading,
    hasOrganizationContext: !!currentOrg,
    organizationId: currentOrg?.id || orgId
  };
};

export default useOrganizationContext;