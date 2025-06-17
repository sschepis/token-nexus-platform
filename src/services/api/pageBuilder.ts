import { callCloudFunction } from '@/utils/apiUtils';
import { CustomComponent } from '@/types/component-library';

/**
 * Refactored Page Builder API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface ComponentFilters {
  organizationId?: string;
}

export const pageBuilderApi = {
  /**
   * Fetches available components for the Page Builder.
   * This includes both built-in and custom components.
   */
  async getAvailableComponents(params: ComponentFilters = {}) {
    const response = await callCloudFunction<{ components: CustomComponent[] }>(
      'getAvailableComponents',
      params as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch available components'
      }
    );
    
    // Transform the response to match the expected format
    return {
      success: response.success,
      data: response.data?.components || [],
      error: response.error
    };
  },
};

// Mock implementation for development
if (process.env.NODE_ENV === 'development') {
  const mockComponents: CustomComponent[] = [
    {
      id: 'comp1',
      name: 'Hero Section',
      description: 'A customizable hero section component',
      type: 'display',
      objectBinding: 'HeroSection',
      preview: '/previews/hero-section.png',
      elements: [
        {
          id: 'hero-title',
          type: 'text',
          props: {
            label: 'Hero Title',
            fieldBinding: 'title'
          },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          children: [],
          style: { fontSize: '2rem', fontWeight: 'bold' }
        },
        {
          id: 'hero-subtitle',
          type: 'text',
          props: {
            label: 'Hero Subtitle',
            fieldBinding: 'subtitle'
          },
          position: { x: 0, y: 60 },
          size: { width: 100, height: 30 },
          children: [],
          style: { fontSize: '1.2rem', color: '#666' }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'comp2',
      name: 'Feature Grid',
      description: 'A responsive grid for showcasing features',
      type: 'display',
      objectBinding: 'FeatureGrid',
      preview: '/previews/feature-grid.png',
      elements: [
        {
          id: 'grid-container',
          type: 'container',
          props: {
            label: 'Feature Grid Container'
          },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 200 },
          children: [],
          style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'comp3',
      name: 'Custom Dashboard Widget',
      description: 'Organization-specific dashboard widget',
      type: 'chart',
      objectBinding: 'DashboardWidget',
      preview: '/previews/dashboard-widget.png',
      elements: [
        {
          id: 'widget-chart',
          type: 'chart',
          props: {
            label: 'Dashboard Chart',
            fieldBinding: 'chartData'
          },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 300 },
          children: [],
          style: { width: '100%', height: '300px' }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Override with mock implementation
  Object.assign(pageBuilderApi, {
    async getAvailableComponents(params: ComponentFilters = {}) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Filter by organization if specified (for this mock, we'll just return all components)
      let filteredComponents = mockComponents;
      if (params.organizationId) {
        // In a real implementation, this would filter based on organization-specific components
        filteredComponents = mockComponents;
      }
      
      return { 
        success: true, 
        data: filteredComponents, 
        error: null 
      };
    }
  });
}