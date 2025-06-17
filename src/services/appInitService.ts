// src/services/appInitService.ts
import Parse from 'parse';
import { store } from '../store/store';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { fetchCurrentOrgDetails, fetchUserOrganizations, setCurrentOrganization, setCurrentOrgById } from '../store/slices/orgSlice';
import { initializeOrganizationContext } from '../utils/organizationUtils';
import { appRegistry } from './appRegistry'; // Import appRegistry
import { initializeControllers } from '../controllers/registerControllers';

// Helper function to ensure Parse Installation is properly set up
// This function orchestrates the creation or retrieval and update of the Parse Installation object.
async function ensureParseInstallation(): Promise<void> {
  try {
    // Skip installation setup during development to avoid errors
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Skipping Parse Installation setup in development mode');
      return;
    }

    let installation = await Parse.Installation.currentInstallation();

    // If currentInstallation() returned null or undefined, create a new one.
    if (!installation) {
      console.warn('[DEBUG] Parse.Installation.currentInstallation() returned null/undefined. Creating a new Parse.Installation object.');
      installation = new Parse.Installation();
    }

    // Now, proceed with setting properties if it's a new or uninitialized installation
    if (!installation.id || !installation.get("deviceType")) {
      installation.set("deviceType", "web");
      await installation.save();
      console.log('[DEBUG] New Parse Installation created and saved successfully with ID:', installation.id);
    } else {
      // For existing installations, ensure necessary properties are implicitly consistent.
      // A simple save will update its `updatedAt` field, ensuring it's recent.
      // This is generally good practice to keep the installation object fresh.
      await installation.save();
      console.log('[DEBUG] Existing Parse Installation ensured/updated with ID:', installation.id);
    }

  } catch (installationError) {
    console.warn('[DEBUG] Error ensuring Parse Installation is saved:', installationError);
    // Don't throw in development - just log the warning and continue
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Critical: Unable to set up Parse Installation. Cloud functions or certain features may not work.');
    }
  }
}

// Private function to initialize Parse SDK
async function initializeParse(): Promise<void> {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID as string | undefined;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY as string | undefined;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL as string | undefined;


  if (!appId || !jsKey || !serverURL) {
    const missingVars = [
      !appId ? 'NEXT_PUBLIC_PARSE_APP_ID' : null,
      !jsKey ? 'NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY' : null,
      !serverURL ? 'NEXT_PUBLIC_PARSE_SERVER_URL' : null,
    ].filter(Boolean).join(', ');

    const errorMessage = `Parse initialization error: Missing environment variable(s): ${missingVars}. Please ensure these are set in your .env file (prefixed with NEXT_PUBLIC_) or in your deployment environment.`;
    console.error('[DEBUG] ' + errorMessage);
    throw new Error(errorMessage); // Throw an error to be caught by initializeApp
  }

  try {

    try {
      Parse.initialize(appId, jsKey);
      Parse.serverURL = serverURL;
      
    } catch (error) {
      console.error('[DEBUG appInitService] Parse.initialize FAILED:', error);
      throw error;
    }

    // Always ensure installation is set up to prevent installation errors
    // This is required for cloud function calls to work properly
    await ensureParseInstallation();

  } catch (error) {
    console.error('[DEBUG] Failed to initialize Parse SDK:', error);
    throw error; // Re-throw to be caught by initializeApp
  }
}

// Function to restore authentication session
async function restoreAuthSession(): Promise<void> {
  try {
    const state = store.getState();
    const { token, user, orgId, permissions, isAuthenticated } = state.auth;

    if (isAuthenticated && token && user) {

      try {
        // Set the session token in Parse
        Parse.User.become(token);

        // Verify the session is still valid by getting current user
        const currentUser = Parse.User.current();
        if (currentUser) {

          
          // Update Redux state to ensure everything is in sync
          store.dispatch(loginSuccess({
            user,
            token,
            orgId,
            permissions,
            isAdmin: user.isAdmin
          }));

          // Enhanced organization data fetching with fallback mechanisms
          try {
            await store.dispatch(fetchUserOrganizations()).unwrap();
            
            // After fetching user organizations, set the current organization
            const userOrgs = store.getState().org.userOrgs;
            
            if (orgId && userOrgs.some(org => org.id === orgId)) {
              // If we have a stored orgId and it exists in user's organizations, use it
              store.dispatch(setCurrentOrgById(orgId));
              
              // Try to fetch detailed organization data
              try {
                await store.dispatch(fetchCurrentOrgDetails(orgId)).unwrap();
              } catch (error) {
                console.warn('Failed to fetch org details for stored orgId:', error);
              }
            } else if (userOrgs.length > 0) {
              // If no valid stored orgId, use the first available organization
              const firstOrgId = userOrgs[0].id;
              store.dispatch(setCurrentOrgById(firstOrgId));
              
              // Try to fetch detailed organization data
              try {
                await store.dispatch(fetchCurrentOrgDetails(firstOrgId)).unwrap();
              } catch (error) {
                console.warn('Failed to fetch org details for first org:', error);
              }
            }
            
            // Update Parse User object with current organization
            const updatedCurrentUser = Parse.User.current();
            const currentOrgInRedux = store.getState().org.currentOrg;
            
            if (updatedCurrentUser && currentOrgInRedux?.id) {
              const currentOrgPointer = updatedCurrentUser.get('currentOrganization');
              
              // Only update if the Parse user doesn't have the correct currentOrganization set
              if (!currentOrgPointer || currentOrgPointer.id !== currentOrgInRedux.id) {
                const orgPointer = Parse.Object.extend('Organization').createWithoutData(currentOrgInRedux.id);
                updatedCurrentUser.set('currentOrganization', orgPointer);
                await updatedCurrentUser.save(null, { useMasterKey: true })
                  .catch((err: any) => console.error('[DEBUG appInitService] Error updating Parse User currentOrganization:', err));
              }
            }
            
          } catch (error) {
            console.warn('Failed to fetch user organizations during init:', error);
            // Continue initialization even if organization fetching fails
          }
        } else {
          store.dispatch(logout());
        }
      } catch (sessionError) {
        console.error('Failed to restore Parse session:', sessionError);
        store.dispatch(logout());
      }
    }
  } catch (error) {
    console.error('Error during session restoration:', error);
    // Don't throw here as this shouldn't prevent app initialization
  }
}

// Platform status types
export type PlatformState = 'PRISTINE' | 'CORE_ARTIFACTS_IMPORTING' | 'CORE_ARTIFACTS_IMPORTED' |
  'PARENT_ORG_CREATING' | 'PARENT_ORG_CREATED' | 'OPERATIONAL' | 'ERROR';

export interface PlatformStatus {
  status: PlatformState;
  message?: string;
  coreContractsImportedForNetwork?: string;
  parentOrgId?: string;
  error?: string;
}

// Function to check platform status
export async function checkPlatformStatus(): Promise<PlatformStatus> {
  try {
    const response = await fetch('/api/app-status');
    const data = await response.json();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('platformStatus', JSON.stringify(data)); // Cache the status
    }
    return data;
  } catch (error) {
    console.error('Failed to check platform status:', error);
    return {
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Failed to check platform status'
    };
  }
}

// Complete initial setup function
export async function completeInitialSetup(setupData: {
  parentOrgName: string;
  adminUserEmail: string;
  adminUserPassword: string;
  adminUserFirstName?: string;
  adminUserLastName?: string;
}): Promise<{ success: boolean; parentOrgId?: string; error?: string }> {
  try {
    const response = await fetch('/api/setup/complete-initial-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(setupData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Complete setup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
    };
  }
}

// Bootstrap login function
export async function bootstrapLogin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/bootstrap-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Bootstrap login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bootstrap login failed',
    };
  }
}

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
    platformStatus = await checkPlatformStatus();

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
      try {
        Parse.User.logOut();
      } catch (error) {
      }

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
        console.log('Initializing built-in apps...');
        appRegistry.initializeBuiltInApps();
        console.log('✓ Built-in apps initialized successfully');

        // Register page controllers
        console.log('Initializing controllers...');
        initializeControllers();
        console.log('✓ Controllers initialized successfully');
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
