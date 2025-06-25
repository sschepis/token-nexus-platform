import { CustomComponent } from '@/types/component-library';
import { PageElement } from '@/types/page-builder';
import { ComponentSuggestion, LayoutSuggestion, BindingSuggestion } from '@/store/pageBuilderStore';

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