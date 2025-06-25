// src/services/appInitService.ts
 import Parse from 'parse';
 import { store } from '../store/store';
 import { logout } from '../store/slices/authSlice';
 import { initializeOrganizationContext } from '../utils/organizationUtils';
 import { appRegistry } from './appRegistry';
 import { initializeControllers } from '../controllers/registerControllers';
 import { initializeParse } from './initialization/parseInitialization';
 import { restoreAuthSession } from './initialization/authSessionRestoration';
 import { checkPlatformStatus } from './appStatusService'; // New import
 import type { PlatformStatus } from '../types/app'; // Import for internal use
 export { PlatformStatus }; // Re-export for external use
 
 /**
  * Orchestrates the full application initialization process.
  * This function handles fetching platform status, initializing Parse,
  * and restoring user sessions based on the platform's state.
  * It is called once at application startup.
  */
 export async function initializeApp(): Promise<PlatformStatus> {
   let platformStatus: PlatformStatus;
   try {
     // 1. Check platform status first - this determines the flow
     platformStatus = await checkPlatformStatus(); // Now imported
 
     // 2. Initialize critical services based on platform status
     // Skip installation save during initial setup (PRISTINE, CORE_ARTIFACTS_IMPORTING, CORE_ARTIFACTS_IMPORTED, PARENT_ORG_CREATING)
     // to avoid potential errors like 403 on uninitialized Parse Server.
     const skipInstallation = (
       platformStatus.status === 'PRISTINE' ||
       platformStatus.status === 'CORE_ARTIFACTS_IMPORTING' ||
       platformStatus.status === 'CORE_ARTIFACTS_IMPORTED' ||
       platformStatus.status === 'PARENT_ORG_CREATING'
     );
     
     // Initialize Parse for all states except ERROR - smart contracts are not a dependency for basic functionality
     if (platformStatus.status !== 'ERROR') {
       try {
         await initializeParse();
       } catch (parseError) {
         console.warn('Parse initialization failed, but continuing with setup flow:', parseError);
         // Don't throw here - allow setup flow to continue
       }
     } else {
       console.log('Skipping Parse initialization for setup phase:', platformStatus.status);
     }
 
     // 3. Handle authentication session based on platform status
     if (platformStatus.status === 'OPERATIONAL' || platformStatus.status === 'PARENT_ORG_CREATED' || platformStatus.status === 'CORE_ARTIFACTS_IMPORTED') {
       // Platform has basic functionality, try to restore existing session
       await restoreAuthSession();
       
       // 4. Initialize organization context after authentication is restored
       const orgId = initializeOrganizationContext();
     } else {
       // Platform is not operational (PRISTINE, etc.), clear any stale auth state
       // Clear any Parse session
       Parse.User.logOut();
 
       // Clear Redux auth state
       store.dispatch(logout());
 
       // Clear any stored session data
       if (typeof window !== 'undefined') {
         sessionStorage.removeItem('platformStatus');
         localStorage.removeItem('parse/gemcms_dev/currentUser');
         localStorage.removeItem('parse/gemcms_dev/installationId');
       }
     }
 
     // Initialize app registry and controllers if platform is operational
     if (platformStatus.status === 'OPERATIONAL') {
       try {
         console.log('Loading apps for organization...');
         // Assuming user is authenticated and orgId is available after restoreAuthSession
         const currentUserId = store.getState().auth.user?.id;
         const currentOrgId = store.getState().auth.orgId; // Get orgId from Redux auth state

         // Only load apps if user and org context are available
         if (currentUserId && currentOrgId) {
           await appRegistry.loadAppsForOrganization(currentOrgId);
           console.log('✓ Apps loaded successfully');
         } else {
           console.log('Skipping app loading: User or organization context not fully available.');
         }
 
         // Note: Controllers are initialized in _app.tsx to avoid duplicate registration
         console.log('✓ App registry loaded successfully');
       } catch (error) {
         console.error('❌ Failed to initialize platform infrastructure:', error);
         // Don't throw here - allow the app to continue running even if controllers fail
         // This prevents the "require(...) is not a function" error from blocking the entire app
         console.warn('Platform will continue with limited functionality');
       }
     }
 
     // You can add other module initializations here, for example:
     // await Promise.all([
     //   initializeAnalytics(),
     //   initializeFeatureToggles(),
     //   // other module initializations
     // ]);
 
     return platformStatus; // Return the final platform status
   } catch (error) {
     console.error('A critical error occurred during application initialization:', error);
     // If an error occurs during initialization, return an ERROR status
     return {
       status: 'ERROR',
       error: error instanceof Error ? error.message : String(error)
     };
   }
 }
