import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { CustomComponent } from '@/types/component-library';
import { PageElement } from '@/types/page-builder';
import { ComponentSuggestion, LayoutSuggestion, BindingSuggestion } from '@/store/pageBuilderStore';
import { DesignContext, ContentType, GeneratedContent, DataSource } from './aiDesignAssistant/types/AIDesignAssistantTypes';

/**
 * AI Design Assistant API
 * Provides methods for interacting with AI design suggestions and content generation.
 */
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

// Default export
export default aiDesignAssistantApi;