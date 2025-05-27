// src/services/appInitService.ts
import Parse from 'parse';
import { store } from '../store/store';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { appRegistry } from './appRegistry'; // Import appRegistry

// Private function to initialize Parse SDK
async function initializeParse(skipInstallation: boolean = false): Promise<void> {
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
    console.error(errorMessage);
    throw new Error(errorMessage); // Throw an error to be caught by initializeApp
  }

  try {
    // Clear any existing Parse session before initialization if skipping installation
    if (skipInstallation) {
      if (typeof window !== 'undefined') {
        // Clear Parse-related localStorage items during setup
        localStorage.removeItem('parse/gemcms_dev/currentUser');
        localStorage.removeItem('parse/gemcms_dev/installationId');
        sessionStorage.removeItem('platformStatus');
      }
      
      try {
        Parse.User.logOut();
      } catch (error) {
        // Ignore errors if no session exists
      }
    }
    
    Parse.initialize(appId, jsKey);
    Parse.serverURL = serverURL;
    console.log('Parse SDK initialized successfully.');

    // Only try to save installation if we're not skipping it
    if (!skipInstallation) {
      try {
        // Create a new Installation object.
        // Saving it will either create a new one on the server or update the existing one.
        const installation = new Parse.Installation();
        // Set required deviceType field for web applications
        installation.set("deviceType", "web");
        // You can set custom fields on the installation object before saving if needed
        // For example: installation.set("appName", "MyAwesomeApp");

        await installation.save();
        console.log('Parse Installation saved/updated successfully with ID:', installation.id);
      } catch (installationError) {
        console.error('Error ensuring Parse Installation is saved:', installationError);
        // During normal operation, this is not critical
      }
    } else {
      console.log('Skipping Parse Installation during initial setup');
    }

  } catch (error) {
    console.error('Failed to initialize Parse SDK:', error);
    throw error; // Re-throw to be caught by initializeApp
  }
}

// Function to restore authentication session
async function restoreAuthSession(): Promise<void> {
  try {
    const state = store.getState();
    const { token, user, orgId, permissions, isAuthenticated } = state.auth;
    
    if (isAuthenticated && token && user) {
      console.log('Attempting to restore authentication session...');
      
      try {
        // Set the session token in Parse
        Parse.User.become(token);
        
        // Verify the session is still valid by getting current user
        const currentUser = Parse.User.current();
        if (currentUser) {
          console.log('Authentication session restored successfully for user:', user.email);
          
          // Update Redux state to ensure everything is in sync
          store.dispatch(loginSuccess({
            user,
            token,
            orgId,
            permissions,
            isAdmin: user.isAdmin
          }));
        } else {
          console.log('Session token is invalid, clearing auth state');
          store.dispatch(logout());
        }
      } catch (sessionError) {
        console.error('Failed to restore Parse session:', sessionError);
        console.log('Clearing invalid auth state');
        store.dispatch(logout());
      }
    } else {
      console.log('No authentication session to restore');
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

/**
 * Orchestrates the full application initialization process.
 * This function handles fetching platform status, initializing Parse,
 * and restoring user sessions based on the platform's state.
 * It is called once at application startup.
 */
export async function initializeApp(): Promise<PlatformStatus> {
  console.log('Starting application initialization...');
  let platformStatus: PlatformStatus;
  try {
    // 1. Check platform status first - this determines the flow
    platformStatus = await checkPlatformStatus();
    console.log('Platform status:', platformStatus.status);
    
    // 2. Initialize critical services based on platform status
    // Skip installation save during initial setup (PRISTINE, CORE_ARTIFACTS_IMPORTING, CORE_ARTIFACTS_IMPORTED, PARENT_ORG_CREATING) 
    // to avoid potential errors like 403 on uninitialized Parse Server.
    const skipInstallation = (
      platformStatus.status === 'PRISTINE' ||
      platformStatus.status === 'CORE_ARTIFACTS_IMPORTING' ||
      platformStatus.status === 'CORE_ARTIFACTS_IMPORTED' ||
      platformStatus.status === 'PARENT_ORG_CREATING' 
    );
    await initializeParse(skipInstallation);
    
    // 3. Handle authentication session based on platform status
    if (platformStatus.status === 'OPERATIONAL' || platformStatus.status === 'PARENT_ORG_CREATED') {
      // Platform is operational, try to restore existing session
      await restoreAuthSession();
    } else {
      // Platform is not operational (PRISTINE, etc.), clear any stale auth state
      console.log('Platform not operational, clearing any stale authentication state');
      
      // Clear any Parse session
      try {
        Parse.User.logOut();
      } catch (error) {
        console.log('No Parse session to clear');
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

    // Initialize app registry if platform is operational
    if (platformStatus.status === 'OPERATIONAL') {
      appRegistry.initializeBuiltInApps();
    }

    // You can add other module initializations here, for example:
    // await Promise.all([
    //   initializeAnalytics(),
    //   initializeFeatureToggles(),
    //   // other module initializations
    // ]);

    console.log('Application initialization completed successfully.');
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