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

// Mock implementation for development
const mockComponentLibraryApi = {
  getComponents: (params: GetComponentsParams = {}) => {
    const mockComponents: CustomComponent[] = [
      {
        id: 'comp-1',
        name: 'Customer Card',
        description: 'Displays customer information in a card format',
        type: 'display',
        objectBinding: 'Customer__c',
        preview: '/placeholder.svg',
        elements: [
          {
            id: 'el-1',
            type: 'card',
            props: { title: 'Customer Information' },
            position: { x: 0, y: 0 },
            size: { width: 400, height: 300 },
            children: []
          }
        ],
        createdAt: '2023-06-10T14:45:00Z',
        updatedAt: '2023-06-12T11:30:00Z'
      },
      {
        id: 'comp-2',
        name: 'Project Form',
        description: 'Form for creating or editing projects',
        type: 'form',
        objectBinding: 'Project__c',
        preview: '/placeholder.svg',
        elements: [
          {
            id: 'el-2',
            type: 'form',
            props: { submitLabel: 'Save Project' },
            position: { x: 0, y: 0 },
            size: { width: 400, height: 300 },
            children: []
          }
        ],
        createdAt: '2023-06-15T09:30:00Z',
        updatedAt: '2023-06-16T13:45:00Z'
      },
      {
        id: 'comp-3',
        name: 'Sales Chart',
        description: 'Interactive sales performance chart',
        type: 'chart',
        objectBinding: 'Sale__c',
        preview: '/placeholder.svg',
        elements: [
          {
            id: 'el-3',
            type: 'chart',
            props: { chartType: 'line', dataSource: 'Sale__c' },
            position: { x: 0, y: 0 },
            size: { width: 600, height: 400 },
            children: []
          }
        ],
        createdAt: '2023-06-20T10:15:00Z',
        updatedAt: '2023-06-21T16:20:00Z'
      }
    ];

    // Apply filters
    let filteredComponents = mockComponents;
    
    if (params.category) {
      // Filter by category logic would go here
    }
    
    if (params.searchTerm) {
      filteredComponents = filteredComponents.filter(comp =>
        comp.name.toLowerCase().includes(params.searchTerm!.toLowerCase()) ||
        comp.description.toLowerCase().includes(params.searchTerm!.toLowerCase())
      );
    }

    return Promise.resolve({
      success: true,
      data: filteredComponents
    });
  },

  getComponent: (id: string) => {
    const mockComponent: CustomComponent = {
      id,
      name: 'Mock Component',
      description: 'A mock component for development',
      type: 'display',
      objectBinding: 'MockObject__c',
      preview: '/placeholder.svg',
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return Promise.resolve({
      success: true,
      data: { component: mockComponent }
    });
  },

  createComponent: (data: CreateComponentData) => {
    const newComponent: CustomComponent = {
      id: `comp-${Date.now()}`,
      name: data.name,
      description: data.description,
      type: data.type,
      objectBinding: data.objectBinding,
      preview: data.preview || '/placeholder.svg',
      elements: data.elements,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return Promise.resolve({
      success: true,
      data: { component: newComponent }
    });
  },

  updateComponent: (id: string, data: UpdateComponentData) => {
    const updatedComponent: CustomComponent = {
      id,
      name: data.name || 'Updated Component',
      description: data.description || 'Updated description',
      type: data.type || 'display',
      objectBinding: data.objectBinding || 'Object__c',
      preview: data.preview || '/placeholder.svg',
      elements: data.elements || [],
      createdAt: '2023-06-10T14:45:00Z',
      updatedAt: new Date().toISOString()
    };

    return Promise.resolve({
      success: true,
      data: { component: updatedComponent }
    });
  },

  deleteComponent: (id: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `Component ${id} deleted successfully` }
    });
  },

  deployAsApp: (componentId: string) => {
    const deployment: AppDeployment = {
      id: `deploy-${Date.now()}`,
      componentId,
      appId: `app-${Date.now()}`,
      status: 'deployed',
      url: `/apps/component-${componentId}`,
      permissions: ['data:read', 'ui:render'],
      createdAt: new Date().toISOString()
    };

    return Promise.resolve({
      success: true,
      data: { deployment }
    });
  },

  getComponentCategories: () => {
    const categories = [
      { id: 'layout', name: 'Layout', description: 'Layout components', icon: 'layout', order: 1 },
      { id: 'data-display', name: 'Data Display', description: 'Data display components', icon: 'table', order: 2 },
      { id: 'forms', name: 'Forms', description: 'Form components', icon: 'form-input', order: 3 },
      { id: 'charts', name: 'Charts', description: 'Chart components', icon: 'bar-chart', order: 4 },
      { id: 'apps', name: 'Apps', description: 'Mini-app components', icon: 'app-window', order: 5 },
      { id: 'custom', name: 'Custom', description: 'Custom components', icon: 'puzzle', order: 6 }
    ];

    return Promise.resolve({
      success: true,
      data: categories
    });
  },

  batchDeleteComponents: (componentIds: string[]) => {
    return Promise.resolve({
      results: componentIds.map(() => ({ success: true })),
      successCount: componentIds.length,
      errorCount: 0
    });
  },

  batchUpdateComponents: (updates: Array<{ id: string; data: UpdateComponentData }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchDeployComponents: (componentIds: string[]) => {
    return Promise.resolve({
      results: componentIds.map(() => ({ success: true })),
      successCount: componentIds.length,
      errorCount: 0
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

// Use mock or real API based on environment
const finalComponentLibraryApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockComponentLibraryApi : componentLibraryApi;

// Default export
export default finalComponentLibraryApi;