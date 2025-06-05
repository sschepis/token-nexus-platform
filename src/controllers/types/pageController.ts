// src/controllers/types/pageController.ts
import { ActionDefinition } from './actionDefinitions'; // Assuming actionDefinitions.ts will contain ActionDefinition
import { PageContext } from './actionContexts'; // Assuming actionContexts.ts will contain PageContext

/**
 * Page controller definition
 */
export interface PageController {
  pageId: string;
  pageName: string;
  description: string;
  actions: Map<string, ActionDefinition>;
  context: PageContext;
  metadata: {
    category: string;
    tags: string[];
    permissions: string[];
    version?: string;
  };
  isActive: boolean;
  registeredAt: Date;
}