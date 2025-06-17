/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse
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
async function ensureParseInstallation(): Promise<void> {
  try {
    // First ensure Parse is initialized
    await ensureParseInitialized();

    let installation;
    
    try {
      installation = await Parse.Installation.currentInstallation();
    } catch (error) {
      console.warn('[DEBUG] Error getting current installation, creating new one:', error);
      installation = null;
    }

    // If currentInstallation() returned null or undefined, create a new one.
    if (!installation) {
      console.warn('[DEBUG] Parse.Installation.currentInstallation() returned null/undefined. Creating a new Parse.Installation object.');
      installation = new Parse.Installation();
    }

    // Now, proceed with setting properties if it's a new or uninitialized installation
    if (!installation.id || !installation.get("deviceType")) {
      installation.set("deviceType", "web");
      try {
        await installation.save();
        console.log('[DEBUG] New Parse Installation created and saved successfully with ID:', installation.id);
      } catch (saveError) {
        console.warn('[DEBUG] Could not save Parse Installation, continuing without it:', saveError);
        // Don't throw here - allow the app to continue without Installation
      }
    } else {
      // For existing installations, ensure necessary properties are implicitly consistent.
      try {
        await installation.save();
        console.log('[DEBUG] Existing Parse Installation ensured/updated with ID:', installation.id);
      } catch (saveError) {
        console.warn('[DEBUG] Could not update Parse Installation, continuing without it:', saveError);
        // Don't throw here - allow the app to continue without Installation
      }
    }

  } catch (installationError) {
    console.warn('[DEBUG] Error ensuring Parse Installation, continuing without it:', installationError);
    // Don't throw here - allow the app to continue without Installation
    // Cloud functions should still work even without a proper Installation in most cases
  }
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
      // First ensure Parse is initialized
      await ensureParseInitialized();
      
      // Clear any existing Parse session to avoid "Invalid session token" errors
      try {
        await Parse.User.logOut();
      } catch (logoutError) {
        // Ignore logout errors - there might not be a session to clear
        console.debug('[Auth API] No existing session to clear:', logoutError);
      }
      
      // Ensure Parse Installation is properly set up before making cloud function calls
      await ensureParseInstallation();
      
      // Call the custom Parse Cloud function using our utility
      const result = await callCloudFunction<{ user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean }>(
        'customUserLogin',
        {
          username: credentials.email, // Parse uses 'username' for email by default
          password: credentials.password
        },
        {
          errorMessage: 'Login failed via cloud function'
        }
      );
      
      // The cloud function should return data in the format expected by loginSuccess action
      // including the isAdmin flag.
      // Example expected structure from cloud function:
      // { user: { id, email, firstName, lastName, avatarUrl }, token, orgId, permissions, isAdmin }
      return result.data!;
    } catch (error: any) {
      console.debug('[Auth API] Error calling customUserLogin cloud function:', error);
      throw new Error(error.message || 'Login failed via cloud function');
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

const mockAuthApis = {
  login: (credentials: any) => {
    return mockResponse({
      user: {
        id: 'user-123',
        email: credentials.email,
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: '/avatars/john-doe.png',
      },
      token: 'mock-auth-token',
      orgId: 'org-1',
      permissions: ['admin'],
      isAdmin: true,
    });
  },

  getUserOrgs: () => {
    return mockResponse({
      orgs: [
        { id: 'org-1', name: 'Acme Corp', logo: 'https://cdn-icons-png.flaticon.com/512/1085/1085375.png' },
        { id: 'org-2', name: 'Globex Inc', logo: 'https://cdn-icons-png.flaticon.com/512/2165/2165780.png' },
      ],
    });
  },
};

// Merge Auth APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockAuthApis : authApi);