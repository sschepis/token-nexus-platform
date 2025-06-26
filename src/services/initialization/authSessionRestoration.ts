// src/services/initialization/authSessionRestoration.ts
import Parse from 'parse';
import { store } from '../../store/store';
import { loginSuccess, logout } from '../../store/slices/authSlice';
import { fetchCurrentOrgDetails, fetchUserOrganizations, setCurrentOrgById } from '../../store/slices/orgSlice';
import { initializeOrganizationContext } from '../../utils/organizationUtils';
import { getUserPermissions } from '../permissionService';

/**
 * Restores the user's authentication session if a valid session token exists.
 * This function handles Parse session restoration and Redux state synchronization.
 */
export async function restoreAuthSession(): Promise<void> {
  try {
    // First check if Parse has a current user session, regardless of Redux state
    const currentParseUser = Parse.User.current();
    
    if (currentParseUser) {
      console.log('[DEBUG] Found Parse session, restoring to Redux...');
      
      // Extract user data from Parse
      const userData = {
        id: currentParseUser.id,
        email: currentParseUser.get('email') || '',
        firstName: currentParseUser.get('firstName') || '',
        lastName: currentParseUser.get('lastName') || '',
        avatarUrl: currentParseUser.get('avatarUrl'),
        isAdmin: currentParseUser.get('isSystemAdmin') || currentParseUser.get('isAdmin') || false
      };
      
      console.log('[DEBUG] Extracted user data:', userData);
      
      // Get session token
      const sessionToken = currentParseUser.getSessionToken();
      
      // Check for system admin first
      const isSystemAdmin = userData.isAdmin;
      let permissions: string[] = [];
      
      if (isSystemAdmin) {
        console.log('[DEBUG] User is system admin, granting all permissions');
        permissions = ['*'];
      } else {
        // Fetch permissions from roles
        try {
          console.log('[DEBUG] Fetching user permissions from roles...');
          permissions = await getUserPermissions(currentParseUser);
          console.log('[DEBUG] Permissions loaded from roles:', permissions);
        } catch (error) {
          console.error('[DEBUG] Error fetching permissions, using defaults:', error);
          // Default permissions for authenticated users
          permissions = [
            'dashboard:read',
            'objects:read',
            'users:read',
            'notifications:read',
            'settings:read'
          ];
        }
      }
      
      // Get current Redux state for orgId
      const state = store.getState();
      const currentOrgId = state.auth.orgId;
      
      // Update Redux state with Parse session data
      store.dispatch(loginSuccess({
        user: userData,
        token: sessionToken,
        orgId: currentOrgId,
        permissions: permissions,
        isAdmin: isSystemAdmin
      }));
      
      console.log('[DEBUG] Redux state updated with Parse session data');

      // Handle organization setup - skip fetchUserOrganizations during session restoration
      // as it calls getUserDetails which can fail during session restoration
      try {
        // For session restoration, we'll set basic org context and let the app
        // fetch detailed org data after full initialization
        if (currentOrgId) {
          console.log('[DEBUG] Setting current org from session:', currentOrgId);
          store.dispatch(setCurrentOrgById(currentOrgId));
        }
        
        // Note: We skip fetchUserOrganizations here to avoid the getUserDetails call
        // The organization data will be fetched when the user navigates or when needed
        
        console.log('[DEBUG] Session restored successfully');
        (window as any).sessionReady = true;
        window.dispatchEvent(new CustomEvent('sessionReady'));
        
      } catch (error) {
        console.warn('Failed to setup organization context during session restoration:', error);
        (window as any).sessionReady = true;
        window.dispatchEvent(new CustomEvent('sessionReady'));
      }
    } else {
      console.log('[DEBUG] No Parse session found');
      (window as any).sessionReady = false;
    }
  } catch (error) {
    console.error('Error during session restoration:', error);
    (window as any).sessionReady = false;
  }
}