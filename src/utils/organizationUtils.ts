/**
 * Organization utilities for accessing current organization context
 * This provides a centralized way to get the current organization ID
 * from various sources (Redux store, URL, Parse user, etc.)
 */

import { store } from '@/store/store';

/**
 * Retrieves the current organization ID from various sources with a defined fallback hierarchy.
 * This is the primary function that should be used throughout the application to get the organization context.
 *
 * It attempts to get the organization ID in the following order:
 * 1. From the Redux authentication slice (`state.auth.orgId`).
 * 2. From the Redux organization slice (`state.org.currentOrg.id`).
 * 3. Fallback methods (URL parameters, subdomain, or Parse user).
 *
 * @returns {string | null} The current organization ID as a string, or `null` if no organization ID is found.
 */
export function getCurrentOrganizationId(): string | null {
  try {
    // First priority: Get from Redux store (auth slice)
    const state = store.getState();
    
    if (state.auth.orgId) {
      console.debug('[organizationUtils] Found orgId in Redux auth state:', state.auth.orgId);
      return state.auth.orgId;
    }
    
    // Also check org slice for currentOrg
    if (state.org.currentOrg?.id) {
      console.debug('[organizationUtils] Found orgId in Redux org state:', state.org.currentOrg.id);
      return state.org.currentOrg.id;
    }
    
    // Check if user has any organizations at all
    if (state.org.userOrgs && state.org.userOrgs.length === 0) {
      console.debug('[organizationUtils] User has no organizations, returning null');
      return null;
    }
    
    console.debug('[organizationUtils] No orgId found in Redux store, trying fallbacks...');
  } catch (error) {
    console.debug('[organizationUtils] Error accessing Redux store:', error);
  }
  
  // Fallback methods
  return getCurrentOrganizationIdFallback();
}

/**
 * Fallback method to get organization ID from URL, subdomain, or Parse user
 */
function getCurrentOrganizationIdFallback(): string | null {
  if (typeof window === 'undefined') {
    console.debug('[organizationUtils] Server-side, no organization context available');
    return null;
  }
  
  // Check subdomain
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
    console.debug('[organizationUtils] Using subdomain as orgId:', subdomain);
    return subdomain;
  }
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const orgFromUrl = urlParams.get('orgId') || urlParams.get('organizationId');
  if (orgFromUrl) {
    console.debug('[organizationUtils] Found orgId in URL params:', orgFromUrl);
    return orgFromUrl;
  }
  
  // Try Parse user (requires Parse to be loaded)
  try {
    if (typeof window !== 'undefined' && (window as any).Parse) {
      const Parse = (window as any).Parse;
      const currentUser = Parse.User.current();
      if (currentUser) {
        // Check both 'currentOrganization' and 'organization' for compatibility
        const currentOrganization = currentUser.get('currentOrganization');
        const organization = currentUser.get('organization');
        
        if (currentOrganization && currentOrganization.id) {
          console.debug('[organizationUtils] Found orgId from Parse user currentOrganization:', currentOrganization.id);
          return currentOrganization.id;
        }
        
        if (organization && organization.id) {
          console.debug('[organizationUtils] Found orgId from Parse user organization:', organization.id);
          return organization.id;
        }
      }
    }
  } catch (error) {
    console.debug('[organizationUtils] Error accessing Parse user:', error);
  }
  
  // No organization context available
  console.debug('[organizationUtils] No organization context available');
  return null;
}

/**
 * Retrieves the current organization data from the Redux store.
 *
 * @returns {object | null} The current organization object from the Redux store, or `null` if an error occurs.
 */
export function getCurrentOrganization() {
  try {
    const state = store.getState();
    return state.org.currentOrg;
  } catch (error) {
    console.debug('[organizationUtils] Error getting current organization:', error);
    return null;
  }
}

/**
 * Checks if the current user is associated with multiple organizations.
 *
 * @returns {boolean} `true` if the user has more than one organization, `false` otherwise (including errors or no organizations).
 */
export function hasMultipleOrganizations(): boolean {
  try {
    const state = store.getState();
    return (state.org.userOrgs?.length || 0) > 1;
  } catch (error) {
    console.debug('[organizationUtils] Error checking multiple organizations:', error);
    return false;
  }
}

/**
 * Retrieves the display name of the current organization from the Redux store.
 *
 * @returns {string} The name of the current organization, or 'Unknown Organization' if not found or an error occurs.
 */
export function getOrganizationDisplayName(): string {
  try {
    const state = store.getState();
    return state.org.currentOrg?.name || 'Unknown Organization';
  } catch (error) {
    console.debug('[organizationUtils] Error getting organization name:', error);
    return 'Unknown Organization';
  }
}

/**
 * Sets the global organization context in the window object, primarily for Parse cloud functions.
 * This makes the current organization ID accessible globally.
 *
 * @param {string | null} organizationId - The ID of the organization to set as the global context.
 */
export function setGlobalOrganizationContext(organizationId: string | null) {
  if (typeof window !== 'undefined') {
    (window as any).currentOrganizationId = organizationId;
    console.debug('[organizationUtils] Set global organization context:', organizationId);
  }
}

/**
 * Initializes the global organization context by calling `getCurrentOrganizationId` and
 * then `setGlobalOrganizationContext`. This function should be called whenever the
 * organization context might have changed (e.g., on app load, user login, organization switch).
 *
 * @returns {string | null} The initialized organization ID, or `null` if no organization context could be established.
 */
export function initializeOrganizationContext() {
  const orgId = getCurrentOrganizationId();
  if (orgId) {
    setGlobalOrganizationContext(orgId);
  } else {
    console.debug('[organizationUtils] No organization context to initialize');
  }
  return orgId;
}