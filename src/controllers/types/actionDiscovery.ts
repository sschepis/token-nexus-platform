// src/controllers/types/actionDiscovery.ts

import { ActionDefinition } from './actionDefinitions'; // Assuming actionDefinitions.ts will contain ActionDefinition

/**
 * Action discovery query
 */
export interface ActionDiscoveryQuery {
  query: string;
  category?: string;
  permissions?: string[];
  pageId?: string;
  tags?: string[];
  limit?: number;
}

/**
 * Action discovery result
 */
export interface ActionDiscoveryResult {
  actions: ActionDefinition[];
  confidence: number;
  suggestions: string[];
  relatedQueries: string[];
}