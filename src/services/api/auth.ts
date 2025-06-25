/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService } from './base'; // Import apiService
import { callCloudFunction } from '../../utils/apiUtils';

/**
 * Refactored Auth API using the new utility functions
 * This eliminates repetitive error handling and Parse.Cloud.run patterns
 * while maintaining Parse initialization and installation setup
 */

// Helper function to ensure Parse SDK is initialized
async function ensureParseInitialized(): Promise<void> {
  // Check if Parse is already initialized
  if (Parse.applicationId) {
    return;
  }

  // Initialize Parse SDK
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL;

  if (!appId || !jsKey || !serverURL) {
    throw new Error('Parse environment variables not set');
  }

  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL;
  
  console.log('[DEBUG] Parse SDK initialized for auth service');
}

// Helper function to ensure Parse Installation is properly set up
// Note: Parse Installation is not required for web clients, this is a no-op
async function ensureParseInstallation(): Promise<void> {
  // First ensure Parse is initialized
  await ensureParseInitialized();
  
  console.log('[DEBUG] Parse Installation setup skipped for web client');
  // Parse Installation is not required for web clients to make cloud function calls
}

/**
 * @file Authentication API services.
 * Handles user login and fetching organization data via Parse Cloud Functions.
 */
const authApi = {
  /**
   * Logs in a user using custom Parse Cloud Function.
   * @param {object} credentials - User's login credentials.
   * @param {string} credentials.email - User's email.
   * @param {string} credentials.password - User's password.
   * @throws {Error} Throws an error if login fails.
   * @returns {Promise<{ user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean }>} A promise that resolves with user data, token, orgId, and permissions.
   */
  login: async (credentials: { email: string; password: string }): Promise<{ user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean }> => {
    try {
      await ensureParseInitialized();

      // Ensure no previous session interferes. Parse.User.logOut() will clear
      // local storage and Parse.User.current().
      // Errors during logout are typically ignorable if no user is logged in.
      try {
        if (Parse.User.current()) {
          await Parse.User.logOut();
        }
      } catch (e) {
        console.debug('[Auth API] No active Parse session or error during logout:', e);
      }
      
      // Use Parse's native logIn method
      const user = await Parse.User.logIn(credentials.email, credentials.password);
      
      // After Parse.User.logIn, the Parse SDK should automatically set the current user
      // and store the session token in local storage.

      const sessionToken = user.getSessionToken();
      if (!sessionToken) {
        throw new Error('No session token received after successful Parse.User.logIn.');
      }

      // Extract user information, organization ID, and permissions
      const orgId = user.get('organization')?.id || null;
      const isAdmin = user.get('isAdmin') || false;
      const permissions = user.get('permissions') || [];

      return {
        user: {
          id: user.id,
          email: user.get('email'),
          firstName: user.get('firstName'),
          lastName: user.get('lastName'),
          avatarUrl: user.get('avatarUrl'),
          isAdmin: isAdmin, // Use the isAdmin value already extracted
        },
        token: sessionToken,
        orgId: orgId,
        permissions: permissions, // Use the permissions value already extracted
        isAdmin: isAdmin, // This isAdmin is picked up by loginSuccess payload's isAdmin property for AuthState.user.isAdmin
      };
    } catch (error: any) {
      console.error('[Auth API] Login failed:', error);
      // Re-throw the original error to be handled by the calling component (login.tsx)
      throw error;
    }
  },

  /**
   * Fetches organizations associated with the current user via Parse Cloud Function.
   * @throws {Error} Throws an error if fetching organizations fails.
   * @returns {Promise<{ data: { orgs: any[] } }>} A promise that resolves with an object containing user organizations.
   */
  getUserOrgs: async (): Promise<{ data: { orgs: any[] } }> => {
    try {
      // First ensure Parse is initialized
      await ensureParseInitialized();
      
      // Ensure Parse Installation is properly set up before making cloud function calls
      await ensureParseInstallation();
      
      // Call the existing Parse Cloud function using our utility
      const result = await callCloudFunction<any[]>(
        'getUserOrganizations',
        {},
        {
          errorMessage: 'Failed to fetch user organizations'
        }
      );
      
      // Transform the response to match the expected mock API structure
      return {
        data: {
          orgs: result.data || []
        }
      };
    } catch (error: any) {
      console.debug('[Auth API] Error calling getUserOrganizations cloud function:', error);
      throw new Error(error.message || 'Failed to fetch user organizations');
    }
  },
};

// Merge Auth APIs into the global apiService
Object.assign(apiService, authApi);