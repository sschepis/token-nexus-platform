import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { CustomComponent } from '@/types/component-library';

/**
 * Refactored Component Library API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface GetComponentsParams {
  category?: string;
  type?: string;
  tags?: string[];
  objectBinding?: string;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface CreateComponentData {
  name: string;
  description: string;
  type: 'display' | 'form' | 'list' | 'chart' | 'custom';
  objectBinding: string;
  elements: any[];
  category?: string;
  tags?: string[];
  preview?: string;
}

export interface UpdateComponentData {
  name?: string;
  description?: string;
  type?: 'display' | 'form' | 'list' | 'chart' | 'custom';
  objectBinding?: string;
  elements?: any[];
  category?: string;
  tags?: string[];
  preview?: string;
  isActive?: boolean;
}

export interface AppDeployment {
  id: string;
  componentId: string;
  appId: string;
  status: 'pending' | 'deployed' | 'failed';
  url?: string;
  permissions: string[];
  createdAt: string;
}

export const componentLibraryApi = {
  /**
   * Fetches a list of components based on provided parameters
   */
  async getComponents(params: GetComponentsParams = {}) {
    return callCloudFunctionForArray('getCustomComponents', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch components'
    });
  },

  /**
   * Retrieves details for a specific component by its ID
   */
  async getComponent(id: string) {
    return callCloudFunction('getCustomComponent', { componentId: id }, {
      errorMessage: 'Failed to fetch component'
    });
  },

  /**
   * Creates a new component with the given data
   */
  async createComponent(data: CreateComponentData) {
    return callCloudFunction('createCustomComponent', data as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create component'
    });
  },

  /**
   * Updates an existing component
   */
  async updateComponent(id: string, data: UpdateComponentData) {
    return callCloudFunction('updateCustomComponent', { componentId: id, ...data }, {
      errorMessage: 'Failed to update component'
    });
  },

  /**
   * Deletes a component by its ID
   */
  async deleteComponent(id: string) {
    return callCloudFunction('deleteCustomComponent', { componentId: id }, {
      errorMessage: 'Failed to delete component'
    });
  },

  /**
   * Deploys a component as a mini-app
   */
  async deployAsApp(componentId: string) {
    return callCloudFunction('deployComponentAsApp', { componentId }, {
      errorMessage: 'Failed to deploy component as app'
    });
  },

  /**
   * Fetches component categories
   */
  async getComponentCategories() {
    return callCloudFunctionForArray('getComponentCategories', {}, {
      errorMessage: 'Failed to fetch component categories'
    });
  },

  /**
   * Batch delete multiple components
   */
  async batchDeleteComponents(componentIds: string[]) {
    const operations = componentIds.map(id => 
      () => this.deleteComponent(id)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple components
   */
  async batchUpdateComponents(updates: Array<{ id: string; data: UpdateComponentData }>) {
    const operations = updates.map(({ id, data }) => 
      () => this.updateComponent(id, data)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch deploy multiple components as apps
   */
  async batchDeployComponents(componentIds: string[]) {
    const operations = componentIds.map(componentId => 
      () => this.deployAsApp(componentId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getComponents,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
  deployAsApp,
  getComponentCategories,
  batchDeleteComponents,
  batchUpdateComponents,
  batchDeployComponents
} = componentLibraryApi;

// Default export
export default componentLibraryApi;