import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { Route, RouteHandler } from '../../../types/routes.d';
import { fetchRoutesAction } from '../management/fetchRoutes';

export const searchRoutesAction: ActionDefinition = {
  id: 'searchRoutes',
  name: 'Search Routes',
  description: 'Search routes by path, method, or type',
  category: 'data',
  permissions: ['routes:read'],
  parameters: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Search query'
    },
    {
      name: 'filters',
      type: 'object',
      required: false,
      description: 'Additional filters (active, protected, method, type)'
    }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { query, filters } = params;

      if (!query) {
        return {
          success: false,
          error: 'Search query is required',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'searchRoutes',
            userId: context.user.userId
          }
        };
      }

      // Get all routes first using the fetchRoutes action
      const allRoutesResult = await fetchRoutesAction.execute({ includeInactive: true }, context);
      
      if (!allRoutesResult.success || !allRoutesResult.data) {
        return {
          success: false,
          error: 'Failed to fetch routes for search',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'searchRoutes',
            userId: context.user.userId
          }
        };
      }

      const routesData = allRoutesResult.data as { routes: Route[] };
      const routes = routesData.routes;
      const searchQuery = (query as string).toLowerCase();
      
      // Filter routes based on query and filters
      const filteredRoutes = routes.filter(route => {
        // Text search
        const matchesQuery = 
          route.path.toLowerCase().includes(searchQuery) ||
          Object.values(route.methods).some((handler: RouteHandler) =>
            handler.target.toLowerCase().includes(searchQuery) ||
            handler.description?.toLowerCase().includes(searchQuery)
          );

        if (!matchesQuery) return false;

        // Apply additional filters
        if (filters) {
          const filterObj = filters as Record<string, unknown>;
          
          if (filterObj.active !== undefined && route.active !== filterObj.active) {
            return false;
          }
          if (filterObj.protected !== undefined && route.protected !== filterObj.protected) {
            return false;
          }
          if (filterObj.method && !Object.keys(route.methods).includes(filterObj.method as string)) {
            return false;
          }
          if (filterObj.type) {
            const hasMatchingType = Object.values(route.methods).some(
              (handler: RouteHandler) => handler.type === filterObj.type
            );
            if (!hasMatchingType) return false;
          }
        }

        return true;
      });

      return {
        success: true,
        data: {
          routes: filteredRoutes,
          total: filteredRoutes.length,
          query: query as string,
          filters: filters as Record<string, unknown>
        },
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'searchRoutes',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search routes',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'searchRoutes',
          userId: context.user.userId
        }
      };
    }
  },
  metadata: {
    tags: ['routes', 'search', 'filter'],
    examples: [
      {
        params: {
          query: 'api',
          filters: { active: true, method: 'GET' }
        },
        description: 'Search for active GET API routes',
        expectedResult: { success: true, data: { routes: [], total: 0 } }
      }
    ],
    relatedActions: ['routes.fetchRoutes', 'routes.getRouteDetails'],
    version: '1.0.0'
  }
};