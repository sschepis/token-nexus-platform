/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base';
import { CustomComponent } from '@/types/component-library'; // Assuming CustomComponent needs to be imported

/**
 * @file Page Builder API services.
 * Handles operations related to page content and components via Parse Cloud Functions.
 */
const pageBuilderApi = {
  /**
   * Fetches available components for the Page Builder.
   * This includes both built-in and custom components.
   * @param {object} params - Parameters for fetching components.
   * @param {string} [params.organizationId] - Optional: Filter components by organization ID.
   * @returns {Promise<{ data: CustomComponent[] }>} A promise that resolves with an array of CustomComponent objects.
   * @throws {Error} Throws an error if fetching components fails.
   */
  getAvailableComponents: async (params: { organizationId?: string }): Promise<{ data: CustomComponent[] }> => {
    try {
      const result = await Parse.Cloud.run('getAvailableComponents', params);
      return { data: result.components || [] };
    } catch (error: any) {
      console.debug('[PageBuilder API] Error calling getAvailableComponents cloud function:', error);
      throw new Error(error.message || 'Failed to fetch available components');
    }
  },
};

// Mock APIs for development if needed, but per instruction, no mock data EVER AGAIN.
const mockPageBuilderApis = {
  getAvailableComponents: (params: { organizationId?: string }) => {
    // This part should technically be deleted completely, but for structure
    // it can remain to be removed once real implementation is in place everywhere.
    // However, for strict adherence to "NO MOCK DATA AT ALL", this section should not return data.
    return mockResponse({ data: [] }); // Return empty array instead of mock data
  },
};

// Merge Page Builder APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockPageBuilderApis : pageBuilderApi);