// src/controllers/services/ActionDiscoveryService.ts
import { ActionDefinition, ActionExample } from '../types/actionDefinitions';
import { ActionDiscoveryQuery, ActionDiscoveryResult } from '../types/actionDiscovery';

/**
 * Service for discovering and scoring actions
 */
export class ActionDiscoveryService {

  /**
   * Discover actions based on query
   */
  public discoverActions(
    actionIndex: Map<string, { pageId: string; action: ActionDefinition }>,
    query: ActionDiscoveryQuery
  ): ActionDiscoveryResult {
    const { query: searchQuery, category, permissions, pageId, tags, limit = 10 } = query;
    
    const candidateActions: Array<{ actionId: string; action: ActionDefinition; pageId: string }> = [];

    // Collect candidate actions
    actionIndex.forEach(({ pageId: actionPageId, action }, actionId) => {
      // Filter by page if specified
      if (pageId && actionPageId !== pageId) {
        return;
      }

      // Filter by category if specified
      if (category && action.category !== category) {
        return;
      }

      // Filter by permissions if specified
      if (permissions && !permissions.some(perm => action.permissions.includes(perm))) {
        return;
      }

      // Filter by tags if specified
      if (tags && action.metadata?.tags) {
        const hasMatchingTag = tags.some(tag => action.metadata!.tags.includes(tag));
        if (!hasMatchingTag) {
          return;
        }
      }

      candidateActions.push({ actionId, action, pageId: actionPageId });
    });

    // Score actions based on search query
    const scoredActions = candidateActions.map(({ actionId, action, pageId }) => {
      const score = this.calculateActionScore(action, searchQuery);
      return { actionId, action, pageId, score };
    });

    // Sort by score and limit results
    scoredActions.sort((a, b) => b.score - a.score);
    const topActions = scoredActions.slice(0, limit);

    // Generate suggestions and related queries
    const suggestions = this.generateActionSuggestions(topActions.map(a => a.action));
    const relatedQueries = this.generateRelatedQueries(searchQuery, topActions.map(a => a.action)); // Pass searchQuery

    return {
      actions: topActions.map(a => a.action),
      confidence: topActions.length > 0 ? topActions[0].score : 0,
      suggestions,
      relatedQueries
    };
  }

  /**
   * Calculate score for action discovery
   */
  private calculateActionScore(action: ActionDefinition, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();

    // Score based on action name and description
    if (action.name.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }
    if (action.description.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    // Score based on tags
    if (action.metadata?.tags) {
      action.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          score += 10;
        }
      });
    }

    return score;
  }

  /**
   * Generate action suggestions based on top actions
   */
  private generateActionSuggestions(actions: ActionDefinition[]): string[] {
    const suggestions = new Set<string>();
    actions.forEach(action => {
      suggestions.add(action.name);
      action.metadata?.examples?.forEach(example => {
        suggestions.add(example.description);
      });
    });
    return Array.from(suggestions);
  }

  /**
   * Generate related queries based on original query and actions
   */
  private generateRelatedQueries(originalQuery: string, actions: ActionDefinition[]): string[] {
    const related = new Set<string>();
    actions.forEach(action => {
      action.metadata?.tags?.forEach(tag => related.add(tag));
      action.parameters?.forEach(param => related.add(param.name));
      // Add more heuristics as needed
    });
    // Remove original query from related queries
    related.delete(originalQuery);
    return Array.from(related).slice(0, 5); // Limit to 5 related queries
  }
}

export const actionDiscoveryService = new ActionDiscoveryService();