/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

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
      // Call the custom Parse Cloud function
      const result = await Parse.Cloud.run('customUserLogin', {
        username: credentials.email, // Parse uses 'username' for email by default
        password: credentials.password
      });
      // The cloud function should return data in the format expected by loginSuccess action
      // including the isAdmin flag.
      // Example expected structure from cloud function:
      // { user: { id, email, firstName, lastName, avatarUrl }, token, orgId, permissions, isAdmin }
      return result as { user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean };
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
      // Call the existing Parse Cloud function
      const organizations = await Parse.Cloud.run('getUserOrganizations');
      
      // Transform the response to match the expected mock API structure
      return {
        data: {
          orgs: organizations || []
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