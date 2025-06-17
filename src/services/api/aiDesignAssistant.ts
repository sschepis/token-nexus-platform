import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { CustomComponent } from '@/types/component-library';
import { PageElement } from '@/types/page-builder';
import { ComponentSuggestion, LayoutSuggestion, BindingSuggestion } from '@/store/pageBuilderStore';

/**
 * Refactored AI Design Assistant API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface DesignContext {
  currentElements: PageElement[];
  selectedElement?: PageElement;
  pageType?: string;
  userIntent?: string;
  availableObjects?: string[];
}

export interface ContentType {
  type: 'text' | 'image' | 'data' | 'layout';
  context: string;
  requirements?: string[];
}

export interface GeneratedContent {
  id: string;
  type: string;
  content: any;
  metadata: {
    confidence: number;
    source: string;
    generatedAt: string;
  };
}

export interface DataSource {
  objectName: string;
  fields: Array<{
    name: string;
    type: string;
    label: string;
  }>;
}

export const aiDesignAssistantApi = {
  /**
   * Get AI-powered component suggestions based on design context
   */
  async suggestComponents(context: DesignContext) {
    return callCloudFunctionForArray('aiSuggestComponents', { context }, {
      errorMessage: 'Failed to get component suggestions'
    });
  },

  /**
   * Get layout optimization suggestions for current page elements
   */
  async optimizeLayout(elements: PageElement[]) {
    return callCloudFunctionForArray('aiOptimizeLayout', { elements }, {
      errorMessage: 'Failed to get layout optimizations'
    });
  },

  /**
   * Generate content based on type and context
   */
  async generateContent(contentType: ContentType, context: any) {
    return callCloudFunction('aiGenerateContent', { contentType, context }, {
      errorMessage: 'Failed to generate content'
    });
  },

  /**
   * Suggest optimal data bindings for a component
   */
  async suggestDataBindings(component: CustomComponent, availableData: DataSource[]) {
    return callCloudFunctionForArray('aiSuggestDataBindings', { component, availableData }, {
      errorMessage: 'Failed to get data binding suggestions'
    });
  },

  /**
   * Analyze page performance and suggest improvements
   */
  async analyzePagePerformance(elements: PageElement[]) {
    return callCloudFunction('aiAnalyzePagePerformance', { elements }, {
      errorMessage: 'Failed to analyze page performance'
    });
  },

  /**
   * Get accessibility suggestions for current design
   */
  async getAccessibilitySuggestions(elements: PageElement[]) {
    return callCloudFunctionForArray('aiGetAccessibilitySuggestions', { elements }, {
      errorMessage: 'Failed to get accessibility suggestions'
    });
  },

  /**
   * Batch analyze multiple design contexts
   */
  async batchAnalyzeDesigns(contexts: DesignContext[]) {
    const operations = contexts.map(context => 
      () => this.suggestComponents(context)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch generate multiple content pieces
   */
  async batchGenerateContent(requests: Array<{ contentType: ContentType; context: any }>) {
    const operations = requests.map(({ contentType, context }) => 
      () => this.generateContent(contentType, context)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Comprehensive page analysis (performance + accessibility + layout)
   */
  async comprehensivePageAnalysis(elements: PageElement[]) {
    const operations = [
      () => this.analyzePagePerformance(elements),
      () => this.getAccessibilitySuggestions(elements),
      () => this.optimizeLayout(elements)
    ];

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementation for development
const mockAiDesignAssistantApi = {
  suggestComponents: (context: DesignContext) => {
    const mockSuggestions: ComponentSuggestion[] = [
      {
        id: 'suggestion-1',
        component: {
          id: 'comp-suggested-1',
          name: 'Customer Data Table',
          description: 'Perfect for displaying customer information in a structured format',
          type: 'display',
          objectBinding: 'Customer__c',
          preview: '/placeholder.svg',
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        relevanceScore: 0.95,
        confidence: 0.95,
        reason: 'Based on your current page layout, a data table would complement the existing form components',
        context: 'Page contains form elements for customer data entry'
      },
      {
        id: 'suggestion-2',
        component: {
          id: 'comp-suggested-2',
          name: 'Sales Chart Widget',
          description: 'Interactive chart showing sales performance over time',
          type: 'chart',
          objectBinding: 'Sale__c',
          preview: '/placeholder.svg',
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        relevanceScore: 0.87,
        confidence: 0.87,
        reason: 'Analytics components work well with data entry forms for comprehensive dashboards',
        context: 'Dashboard-style layout detected'
      },
      {
        id: 'suggestion-3',
        component: {
          id: 'comp-suggested-3',
          name: 'Quick Action Buttons',
          description: 'Common actions for customer management',
          type: 'custom',
          objectBinding: 'Customer__c',
          preview: '/placeholder.svg',
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        relevanceScore: 0.78,
        confidence: 0.78,
        reason: 'Action buttons enhance user workflow efficiency',
        context: 'Form-based interface benefits from quick actions'
      }
    ];

    return Promise.resolve({
      success: true,
      data: mockSuggestions
    });
  },

  optimizeLayout: (elements: PageElement[]) => {
    const mockOptimizations: LayoutSuggestion[] = [
      {
        id: 'opt-1',
        type: 'spacing',
        description: 'Increase spacing between form sections for better readability',
        elementIds: elements.slice(0, 2).map(e => e.id),
        changes: {
          marginBottom: '24px',
          paddingTop: '16px'
        },
        impact: 'medium'
      },
      {
        id: 'opt-2',
        type: 'alignment',
        description: 'Align form labels consistently for better visual hierarchy',
        elementIds: elements.filter(e => e.type === 'input').map(e => e.id),
        changes: {
          textAlign: 'left',
          marginBottom: '8px'
        },
        impact: 'low'
      },
      {
        id: 'opt-3',
        type: 'responsive',
        description: 'Optimize layout for mobile devices by stacking elements vertically',
        elementIds: elements.map(e => e.id),
        changes: {
          flexDirection: 'column',
          width: '100%'
        },
        impact: 'high'
      }
    ];

    return Promise.resolve({
      success: true,
      data: mockOptimizations
    });
  },

  generateContent: (contentType: ContentType, context: any) => {
    const mockContent: GeneratedContent = {
      id: `content-${Date.now()}`,
      type: contentType.type,
      content: {
        text: contentType.type === 'text' ? 'AI-generated content based on your requirements...' : null,
        data: contentType.type === 'data' ? { sampleField: 'Sample Value' } : null,
        layout: contentType.type === 'layout' ? { columns: 2, spacing: 'medium' } : null
      },
      metadata: {
        confidence: 0.85,
        source: 'AI Content Generator',
        generatedAt: new Date().toISOString()
      }
    };

    return Promise.resolve({
      success: true,
      data: { content: mockContent }
    });
  },

  suggestDataBindings: (component: CustomComponent, availableData: DataSource[]) => {
    const mockBindings: BindingSuggestion[] = availableData.slice(0, 3).map((dataSource, index) => ({
      id: `binding-${index + 1}`,
      componentId: component.id,
      sourceObject: dataSource.objectName,
      sourceField: dataSource.fields[0]?.name || 'id',
      targetProperty: 'data',
      confidence: 0.9 - (index * 0.1),
      description: `Bind ${dataSource.fields[0]?.label || 'ID'} from ${dataSource.objectName} to component data`
    }));

    return Promise.resolve({
      success: true,
      data: mockBindings
    });
  },

  analyzePagePerformance: (elements: PageElement[]) => {
    const mockAnalysis = {
      score: 85,
      metrics: {
        loadTime: '1.2s',
        bundleSize: '245KB',
        renderTime: '0.8s'
      },
      suggestions: [
        'Consider lazy loading for images',
        'Optimize component bundle size',
        'Use virtual scrolling for large lists'
      ],
      issues: [
        {
          type: 'performance',
          severity: 'medium',
          description: 'Large image files detected',
          elements: elements.filter(e => e.type === 'image').map(e => e.id)
        }
      ]
    };

    return Promise.resolve({
      success: true,
      data: { analysis: mockAnalysis }
    });
  },

  getAccessibilitySuggestions: (elements: PageElement[]) => {
    const mockSuggestions = [
      {
        id: 'a11y-1',
        type: 'aria-labels',
        description: 'Add aria-labels to form inputs for screen readers',
        elementIds: elements.filter(e => e.type === 'input').map(e => e.id),
        severity: 'high',
        fix: 'Add aria-label attributes to input elements'
      },
      {
        id: 'a11y-2',
        type: 'color-contrast',
        description: 'Improve color contrast for better readability',
        elementIds: elements.filter(e => e.type === 'text').map(e => e.id),
        severity: 'medium',
        fix: 'Use darker text colors or lighter backgrounds'
      },
      {
        id: 'a11y-3',
        type: 'keyboard-navigation',
        description: 'Ensure all interactive elements are keyboard accessible',
        elementIds: elements.filter(e => e.type === 'button').map(e => e.id),
        severity: 'high',
        fix: 'Add proper tabindex and focus management'
      }
    ];

    return Promise.resolve({
      success: true,
      data: mockSuggestions
    });
  },

  batchAnalyzeDesigns: (contexts: DesignContext[]) => {
    return Promise.resolve({
      results: contexts.map(() => ({ success: true })),
      successCount: contexts.length,
      errorCount: 0
    });
  },

  batchGenerateContent: (requests: Array<{ contentType: ContentType; context: any }>) => {
    return Promise.resolve({
      results: requests.map(() => ({ success: true })),
      successCount: requests.length,
      errorCount: 0
    });
  },

  comprehensivePageAnalysis: (elements: PageElement[]) => {
    return Promise.resolve({
      results: [
        { success: true, data: { analysis: { score: 85 } } },
        { success: true, data: { suggestions: [] } },
        { success: true, data: { optimizations: [] } }
      ],
      successCount: 3,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  suggestComponents,
  optimizeLayout,
  generateContent,
  suggestDataBindings,
  analyzePagePerformance,
  getAccessibilitySuggestions,
  batchAnalyzeDesigns,
  batchGenerateContent,
  comprehensivePageAnalysis
} = aiDesignAssistantApi;

// Use mock or real API based on environment
const finalAiDesignAssistantApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockAiDesignAssistantApi : aiDesignAssistantApi;

// Default export
export default finalAiDesignAssistantApi;