import { useAppSelector } from '@/store/hooks';
import { Organization } from '@/store/slices/orgSlice';

/**
 * Custom hook to access current organization information
 * Provides easy access to the user's current organization and related state
 */
export const useCurrentOrganization = () => {
  const { currentOrg, userOrgs, isLoading, error } = useAppSelector((state) => state.org);
  const { orgId } = useAppSelector((state) => state.auth);

  return {
    // Current organization data
    currentOrg,
    
    // Organization ID from auth state (for consistency)
    orgId,
    
    // All user organizations
    userOrgs,
    
    // Loading and error states
    isLoading,
    error,
    
    // Computed values
    hasMultipleOrgs: userOrgs.length > 1,
    hasCurrentOrg: !!currentOrg,
    
    // Helper functions
    isCurrentOrg: (orgId: string) => currentOrg?.id === orgId,
    getOrgById: (orgId: string) => userOrgs.find(org => org.id === orgId),
    
    // Organization settings helpers
    getOrgSetting: (key: string, defaultValue?: any) => {
      return currentOrg?.settings?.[key] ?? defaultValue;
    },
    
    getOrgTheme: () => {
      return currentOrg?.settings?.theme || {};
    },
    
    // Organization status helpers
    isOrgActive: () => currentOrg?.status === 'Active',
    isOrgSuspended: () => currentOrg?.status === 'Suspended',
    
    // Plan information
    getOrgPlan: () => currentOrg?.planType || currentOrg?.plan || 'free',
    isEnterprisePlan: () => {
      const plan = currentOrg?.planType || currentOrg?.plan;
      return plan === 'enterprise';
    },
    
    // Organization metadata
    getOrgDisplayName: () => currentOrg?.name || 'Unknown Organization',
    getOrgSubdomain: () => currentOrg?.subdomain,
    getOrgLogo: () => currentOrg?.logo || currentOrg?.settings?.theme?.logoUrl,
  };
};

export default useCurrentOrganization;