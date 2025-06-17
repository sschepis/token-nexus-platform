import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserOrganizations, fetchCurrentOrgDetails } from '@/store/slices/orgSlice';

/**
 * Hook to ensure organization context is properly initialized after authentication
 * This hook should be used in the main app layout to ensure organization data is loaded
 */
export const useOrganizationContext = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, orgId } = useAppSelector((state) => state.auth);
  const { currentOrg, userOrgs, isLoading, error } = useAppSelector((state) => state.org);

  useEffect(() => {
    // Only fetch organization data if user is authenticated and we don't have org data
    // Also check if there's no error to prevent infinite retries on failed requests
    if (isAuthenticated && userOrgs.length === 0 && !isLoading && !error) {
      console.log('[OrganizationContext] Fetching user organizations after authentication');
      dispatch(fetchUserOrganizations());
    }
  }, [isAuthenticated, userOrgs.length, isLoading, error, dispatch]);

  useEffect(() => {
    // Fetch detailed organization info if we have an orgId but no current org details
    // Also check if there's no error to prevent infinite retries on failed requests
    if (isAuthenticated && orgId && !currentOrg && !isLoading && !error) {
      console.log('[OrganizationContext] Fetching current organization details:', orgId);
      dispatch(fetchCurrentOrgDetails(orgId));
    }
  }, [isAuthenticated, orgId, currentOrg, isLoading, error, dispatch]);

  return {
    currentOrg,
    userOrgs,
    isLoading,
    hasOrganizationContext: !!currentOrg,
    organizationId: currentOrg?.id || orgId
  };
};

export default useOrganizationContext;