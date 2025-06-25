import { callCloudFunction } from '@/utils/apiUtils';
import { CustomComponent } from '@/types/component-library';

/**
 * Page Builder API using the proper cloud function pattern
 * This eliminates direct Parse SDK calls that require master key on client
 */

export interface ComponentFilters {
  organizationId?: string;
}

export interface ListPagesParams {
  organizationId: string;
  limit?: number;
  skip?: number;
  status?: 'draft' | 'published' | 'archived';
}

export interface SavePageParams {
  pageId?: string;
  title: string;
  slug: string;
  html: string;
  css: string;
  js: string;
  status?: string;
  organizationId: string;
}

export interface GetPageParams {
  pageId: string;
}

export interface GenerateTokenParams {
  pageId: string;
  expiresIn?: string;
}

export interface GetObjectsParams {
  organizationId: string;
}

export const pageBuilderApi = {
  /**
   * Fetches available components for the Page Builder.
   */
  async getAvailableComponents(params: ComponentFilters = {}) {
    return await callCloudFunction<CustomComponent[]>(
      'getAvailableComponents',
      params as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch available components'
      }
    );
  },

  /**
   * Lists all pages for an organization.
   */
  async listPages(params: ListPagesParams) {
    return await callCloudFunction<any[]>(
      'listPages',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to load pages'
      }
    );
  },

  /**
   * Saves a page to cloud storage.
   */
  async savePageToCloud(params: SavePageParams) {
    return await callCloudFunction<{ pageId: string; message: string }>(
      'savePageToCloud',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to save page'
      }
    );
  },

  /**
   * Gets a specific page from cloud storage.
   */
  async getPageFromCloud(params: GetPageParams) {
    return await callCloudFunction<{ page: any }>(
      'getPageFromCloud',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to load page'
      }
    );
  },

  /**
   * Generates an access token for a page.
   */
  async generatePageAccessToken(params: GenerateTokenParams) {
    return await callCloudFunction<{ token: string }>(
      'generatePageAccessToken',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to generate access token'
      }
    );
  },

  /**
   * Gets available custom objects for the organization.
   */
  async getAvailableObjects(params: GetObjectsParams) {
    return await callCloudFunction<any[]>(
      'getAvailableObjects',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch custom objects'
      }
    );
  }
};

// Export individual functions for backward compatibility
export const {
  getAvailableComponents,
  listPages,
  savePageToCloud,
  getPageFromCloud,
  generatePageAccessToken,
  getAvailableObjects
} = pageBuilderApi;

// Default export
export default pageBuilderApi;