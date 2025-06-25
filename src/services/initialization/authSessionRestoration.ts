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

      // Handle organization setup
      try {
        await store.dispatch(fetchUserOrganizations()).unwrap();
        const userOrgs = store.getState().org.userOrgs;
        
        let finalOrgId = currentOrgId;
        
        if (currentOrgId && userOrgs.some(org => org.id === currentOrgId)) {
          store.dispatch(setCurrentOrgById(currentOrgId));
          try {
            await store.dispatch(fetchCurrentOrgDetails(currentOrgId)).unwrap();
          } catch (error) {
            console.warn('Failed to fetch org details for stored orgId:', error);
          }
        } else if (userOrgs.length > 0) {
          finalOrgId = userOrgs[0].id;
          store.dispatch(setCurrentOrgById(finalOrgId));
          try {
            await store.dispatch(fetchCurrentOrgDetails(finalOrgId)).unwrap();
          } catch (error) {
            console.warn('Failed to fetch org details for first org:', error);
          }
        }
        
        // Refresh permissions if organization changed
        if (finalOrgId !== currentOrgId) {
          console.log('[DEBUG] Organization changed, refreshing permissions...');
          let updatedPermissions: string[] = [];
          
          if (isSystemAdmin) {
            console.log('[DEBUG] System admin - keeping all permissions');
            updatedPermissions = ['*'];
          } else {
            try {
              updatedPermissions = await getUserPermissions(currentParseUser, finalOrgId || undefined);
              console.log('[DEBUG] Updated permissions for new org:', updatedPermissions);
            } catch (error) {
              console.error('[DEBUG] Error fetching updated permissions:', error);
              updatedPermissions = permissions; // Keep existing permissions
            }
          }
          
          // Update Redux state with new permissions and orgId
          store.dispatch(loginSuccess({
            user: userData,
            token: sessionToken,
            orgId: finalOrgId,
            permissions: updatedPermissions,
            isAdmin: isSystemAdmin
          }));
        }
        
        // Update Parse user's current organization (without master key)
        const currentOrgInRedux = store.getState().org.currentOrg;
        
        if (currentParseUser && currentOrgInRedux?.id) {
          const currentOrgPointer = currentParseUser.get('currentOrganization');
          if (!currentOrgPointer || currentOrgPointer.id !== currentOrgInRedux.id) {
            const orgPointer = Parse.Object.extend('Organization').createWithoutData(currentOrgInRedux.id);
            currentParseUser.set('currentOrganization', orgPointer);
            // Save without master key - user can update their own record
            await currentParseUser.save()
              .catch((err: any) => console.warn('[DEBUG authSessionRestoration] Could not update Parse User currentOrganization (non-critical):', err));
          }
        }
        
        console.log('[DEBUG] Session restored successfully');
        (window as any).sessionReady = true;
        window.dispatchEvent(new CustomEvent('sessionReady'));
        
      } catch (error) {
        console.warn('Failed to fetch user organizations during init:', error);
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