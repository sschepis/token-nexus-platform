import React, { useEffect } from 'react';
import Parse from 'parse';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchCurrentOrgDetails, setCurrentOrgById, fetchUserOrganizations, setCurrentOrganization } from '@/store/slices/orgSlice';
import { switchOrg } from '@/store/slices/authSlice';
import { initializeOrganizationContext } from '@/utils/organizationUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface OrganizationSelectorProps {
  className?: string;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { currentOrg, userOrgs, isLoading, error } = useAppSelector((state) => state.org);
  const { orgId, user } = useAppSelector((state) => state.auth);

  // Fetch user organizations on mount if not already loaded
  useEffect(() => {
    // Temporarily commented out to reduce console noise and isolate SDK init issues
    /*
    if (user && userOrgs.length === 0 && !isLoading) {
      // Fetch user organizations with error handling
      dispatch(fetchUserOrganizations()).unwrap().catch((error) => {
        console.warn('Failed to fetch user organizations in selector:', error);
        // Don't show error toast as this might be called automatically
      });
    }
    
    if (user && orgId && !currentOrg && !isLoading) {
      // Fetch current organization details
      dispatch(fetchCurrentOrgDetails(orgId));
    }
    */
    console.log('[DEBUG OrganizationSelector.tsx] useEffect - Data fetching temporarily disabled.');
  }, [user, userOrgs.length, orgId, currentOrg, isLoading]);

  const handleOrgChange = async (newOrgId: string) => {
    if (newOrgId !== currentOrg?.id) {
      try {
        // Use Redux action to set current organization
        const result = await dispatch(setCurrentOrganization(newOrgId)).unwrap();
        
        // Update auth state with new orgId
        dispatch(switchOrg(newOrgId));
        
        // Initialize organization context for Parse cloud functions
        console.log('[DEBUG OrganizationSelector] Initializing organization context for:', newOrgId);
        initializeOrganizationContext();
        
        console.log(`Successfully switched to organization: ${result.name}`);
      } catch (error) {
        console.error('Failed to switch organization:', error);
        // Error toast is already shown by the Redux action
      }
    }
  };

  // Loading and error state handling
  
  // Show loading state when orgId exists but currentOrg is still loading
  if (orgId && !currentOrg && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading organization...</span>
      </div>
    );
  }

  // Show error state when organization fetch fails
  if (orgId && !currentOrg && !isLoading && error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">Organization unavailable</span>
      </div>
    );
  }

  // Show loading state when fetching user organizations
  if (!orgId && userOrgs.length === 0 && isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  // If no current org and not loading, show appropriate message
  if (!currentOrg && !isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {userOrgs.length === 0 ? 'No organizations' : 'No organization selected'}
        </span>
      </div>
    );
  }

  // If still no current org but we have an orgId, something is wrong
  if (!currentOrg) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No organization</span>
      </div>
    );
  }

  // If user only has one org, show it without dropdown
  if (userOrgs.length <= 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[150px]">
          {currentOrg.name}
        </span>
        {currentOrg.status && currentOrg.status !== 'Active' && (
          <Badge variant="secondary" className="text-xs">
            {currentOrg.status}
          </Badge>
        )}
      </div>
    );
  }

  // If user has multiple orgs, show dropdown selector
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`h-8 justify-start gap-2 ${className}`}>
          <Building2 className="h-4 w-4" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {currentOrg.name}
          </span>
          <ChevronDown className="h-3 w-3 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrgChange(org.id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{org.name}</span>
              {org.description && (
                <span className="text-xs text-muted-foreground truncate">
                  {org.description}
                </span>
              )}
            </div>
            {org.id === currentOrg.id && (
              <Badge variant="default" className="text-xs">
                Current
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSelector;