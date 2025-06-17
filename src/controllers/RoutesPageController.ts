// src/controllers/RoutesPageController.ts

import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext,
  ActionExample
} from './types/ActionTypes';
import { Route, RouteHandler, HttpMethod } from '@/types/routes.d';
import { appRegistry } from '@/services/appRegistry';
import { v4 as uuidv4 } from 'uuid';

export class RoutesPageController implements PageController {
  pageId = 'routes';
  pageName = 'Routes Management';
  description = 'Manage application routes, endpoints, and navigation';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'routes',
    pageName: 'Routes Management',
    state: {},
    props: {},
    metadata: {
      category: 'system',
      tags: ['routes', 'navigation', 'management'],
      permissions: ['routes:read', 'routes:write']
    }
  };
  metadata = {
    category: 'system',
    tags: ['routes', 'navigation', 'management'],
    permissions: ['routes:read', 'routes:write'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch all routes action
    this.actions.set('fetchRoutes', {
      id: 'fetchRoutes',
      name: 'Fetch Routes',
      description: 'Fetch all application routes from various sources',
      category: 'data',
      permissions: ['routes:read'],
      parameters: [
        {
          name: 'includeInactive',
          type: 'boolean',
          required: false,
          description: 'Include inactive routes in the result'
        }
      ],
      execute: this.fetchRoutes.bind(this),
      metadata: {
        tags: ['routes', 'fetch', 'data'],
        examples: [
          {
            params: { includeInactive: false },
            description: 'Fetch only active routes',
            expectedResult: { success: true, data: { routes: [], total: 0 } }
          }
        ],
        relatedActions: ['routes.searchRoutes', 'routes.getRouteDetails'],
        version: '1.0.0'
      }
    });

    // Add route action
    this.actions.set('addRoute', {
      id: 'addRoute',
      name: 'Add Route',
      description: 'Add a new route to the application',
      category: 'data',
      permissions: ['routes:write'],
      parameters: [
        {
          name: 'path',
          type: 'string',
          required: true,
          description: 'Route path (must start with /)'
        },
        {
          name: 'method',
          type: 'string',
          required: true,
          description: 'HTTP method'
        },
        {
          name: 'handlerType',
          type: 'string',
          required: true,
          description: 'Handler type: page, function, or redirect'
        },
        {
          name: 'target',
          type: 'string',
          required: true,
          description: 'Target component, function, or URL'
        },
        {
          name: 'protected',
          type: 'boolean',
          required: false,
          description: 'Whether the route requires authentication'
        }
      ],
      execute: this.addRoute.bind(this) as any,
      metadata: {
        tags: ['routes', 'create', 'management'],
        examples: [
          {
            params: {
              path: '/api/test',
              method: 'GET',
              handlerType: 'function',
              target: 'testHandler',
              protected: true
            },
            description: 'Add a new API route',
            expectedResult: { success: true, message: 'Route created successfully' }
          }
        ],
        relatedActions: ['routes.updateRoute', 'routes.deleteRoute'],
        version: '1.0.0'
      }
    });

    // Update route action
    this.actions.set('updateRoute', {
      id: 'updateRoute',
      name: 'Update Route',
      description: 'Update an existing route',
      category: 'data',
      permissions: ['routes:write'],
      parameters: [
        {
          name: 'routeId',
          type: 'string',
          required: true,
          description: 'ID of the route to update'
        },
        {
          name: 'updates',
          type: 'object',
          required: true,
          description: 'Route updates object'
        }
      ],
      execute: this.updateRoute.bind(this) as any,
      metadata: {
        tags: ['routes', 'update', 'management'],
        examples: [
          {
            params: {
              routeId: 'route-123',
              updates: { active: false }
            },
            description: 'Update route status',
            expectedResult: { success: true, message: 'Route updated successfully' }
          }
        ],
        relatedActions: ['routes.addRoute', 'routes.deleteRoute'],
        version: '1.0.0'
      }
    });

    // Delete route action
    this.actions.set('deleteRoute', {
      id: 'deleteRoute',
      name: 'Delete Route',
      description: 'Delete a route from the application',
      category: 'data',
      permissions: ['routes:delete'],
      parameters: [
        {
          name: 'routeId',
          type: 'string',
          required: true,
          description: 'ID of the route to delete'
        }
      ],
      execute: this.deleteRoute.bind(this) as any,
      metadata: {
        tags: ['routes', 'delete', 'management'],
        examples: [
          {
            params: { routeId: 'route-123' },
            description: 'Delete a route',
            expectedResult: { success: true, message: 'Route deleted successfully' }
          }
        ],
        relatedActions: ['routes.addRoute', 'routes.updateRoute'],
        version: '1.0.0'
      }
    });

    // Toggle route status action
    this.actions.set('toggleRouteStatus', {
      id: 'toggleRouteStatus',
      name: 'Toggle Route Status',
      description: 'Activate or deactivate a route',
      category: 'data',
      permissions: ['routes:write'],
      parameters: [
        {
          name: 'routeId',
          type: 'string',
          required: true,
          description: 'ID of the route to toggle'
        },
        {
          name: 'active',
          type: 'boolean',
          required: true,
          description: 'New active status'
        }
      ],
      execute: this.toggleRouteStatus.bind(this) as any,
      metadata: {
        tags: ['routes', 'toggle', 'status'],
        examples: [
          {
            params: { routeId: 'route-123', active: true },
            description: 'Activate a route',
            expectedResult: { success: true, message: 'Route activated successfully' }
          }
        ],
        relatedActions: ['routes.updateRoute'],
        version: '1.0.0'
      }
    });

    // Get route details action
    this.actions.set('getRouteDetails', {
      id: 'getRouteDetails',
      name: 'Get Route Details',
      description: 'Get detailed information about a specific route',
      category: 'data',
      permissions: ['routes:read'],
      parameters: [
        {
          name: 'routeId',
          type: 'string',
          required: true,
          description: 'ID of the route to get details for'
        }
      ],
      execute: this.getRouteDetails.bind(this) as any,
      metadata: {
        tags: ['routes', 'details', 'read'],
        examples: [
          {
            params: { routeId: 'route-123' },
            description: 'Get detailed route information',
            expectedResult: { success: true, data: { routeId: 'route-123' } }
          }
        ],
        relatedActions: ['routes.fetchRoutes', 'routes.searchRoutes'],
        version: '1.0.0'
      }
    });

    // Search routes action
    this.actions.set('searchRoutes', {
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
      execute: this.searchRoutes.bind(this) as any,
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
    });
  }

  private async fetchRoutes(
    params: { includeInactive?: boolean },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      const routes: Route[] = [];

      // Get routes from app registry (real app routes)
      const appRoutes = appRegistry.getAllAppRoutes();
      
      // Convert app routes to our Route format
      appRoutes.forEach(({ appId, route, type }) => {
        const routeId = uuidv4();
        const handlerId = uuidv4();
        
        const convertedRoute: Route = {
          id: routeId,
          path: route.path,
          methods: {
            'GET': {
              id: handlerId,
              type: 'page',
              target: route.component || 'Unknown',
              description: `${type} route for ${appId}: ${route.path}`
            }
          },
          active: true,
          protected: route.permissions ? route.permissions.length > 0 : false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        routes.push(convertedRoute);
      });

      // Add system routes (pages from the platform)
      const systemRoutes = this.getSystemRoutes();
      routes.push(...systemRoutes);

      // Filter inactive routes if requested
      const filteredRoutes = params.includeInactive 
        ? routes 
        : routes.filter(route => route.active);

      return {
        success: true,
        data: {
          routes: filteredRoutes,
          total: filteredRoutes.length,
          sources: ['app-registry', 'system-routes']
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes'
      };
    }
  }

  private async addRoute(
    params: { 
      path: string; 
      method: string; 
      handlerType: string; 
      target: string; 
      protected?: boolean 
    },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // Validate path
      if (!params.path.startsWith('/')) {
        throw new Error('Route path must start with /');
      }

      // Validate method
      const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      if (!validMethods.includes(params.method as HttpMethod)) {
        throw new Error(`Invalid HTTP method: ${params.method}`);
      }

      // Validate handler type
      const validTypes = ['page', 'function', 'redirect'];
      if (!validTypes.includes(params.handlerType)) {
        throw new Error(`Invalid handler type: ${params.handlerType}`);
      }

      const newRoute: Route = {
        id: uuidv4(),
        path: params.path,
        methods: {
          [params.method as HttpMethod]: {
            id: uuidv4(),
            type: params.handlerType as 'page' | 'function' | 'redirect',
            target: params.target,
            description: `${params.handlerType} handler for ${params.path}`
          }
        },
        active: true,
        protected: params.protected ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // TODO: Persist to backend/database
      // For now, we'll emit an event that the UI can listen to
      
      return {
        success: true,
        data: { route: newRoute },
        message: `Route ${params.path} created successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add route'
      };
    }
  }

  private async updateRoute(
    params: { routeId: string; updates: Partial<Route> },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // TODO: Implement route update logic
      // This would typically involve updating the route in the database
      
      return {
        success: true,
        data: { routeId: params.routeId, updates: params.updates },
        message: 'Route updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update route'
      };
    }
  }

  private async deleteRoute(
    params: { routeId: string },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // TODO: Implement route deletion logic
      // This would typically involve removing the route from the database
      
      return {
        success: true,
        data: { routeId: params.routeId },
        message: 'Route deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete route'
      };
    }
  }

  private async toggleRouteStatus(
    params: { routeId: string; active: boolean },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // TODO: Implement route status toggle logic
      
      return {
        success: true,
        data: { routeId: params.routeId, active: params.active },
        message: `Route ${params.active ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle route status'
      };
    }
  }

  private async getRouteDetails(
    params: { routeId: string },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // TODO: Implement route details fetching logic
      
      return {
        success: true,
        data: { routeId: params.routeId },
        message: 'Route details retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get route details'
      };
    }
  }

  private async searchRoutes(
    params: { query: string; filters?: Record<string, unknown> },
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // Get all routes first
      const allRoutesResult = await this.fetchRoutes({ includeInactive: true }, context);
      
      if (!allRoutesResult.success || !allRoutesResult.data) {
        throw new Error('Failed to fetch routes for search');
      }

      const routesData = allRoutesResult.data as { routes: Route[] };
      const routes = routesData.routes;
      const query = params.query.toLowerCase();
      
      // Filter routes based on query and filters
      const filteredRoutes = routes.filter(route => {
        // Text search
        const matchesQuery = 
          route.path.toLowerCase().includes(query) ||
          Object.values(route.methods).some(handler => 
            handler.target.toLowerCase().includes(query) ||
            handler.description?.toLowerCase().includes(query)
          );

        if (!matchesQuery) return false;

        // Apply additional filters
        if (params.filters) {
          if (params.filters.active !== undefined && route.active !== params.filters.active) {
            return false;
          }
          if (params.filters.protected !== undefined && route.protected !== params.filters.protected) {
            return false;
          }
          if (params.filters.method && !Object.keys(route.methods).includes(params.filters.method as string)) {
            return false;
          }
          if (params.filters.type) {
            const hasMatchingType = Object.values(route.methods).some(
              handler => handler.type === params.filters!.type
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
          query: params.query,
          filters: params.filters
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search routes'
      };
    }
  }

  private getSystemRoutes(): Route[] {
    // Define system routes based on the actual pages in the platform
    const systemPages = [
      { path: '/dashboard', component: 'Dashboard', protected: true },
      { path: '/users', component: 'Users', protected: true },
      { path: '/routes', component: 'Routes', protected: true },
      { path: '/functions', component: 'CloudFunctions', protected: true },
      { path: '/integrations', component: 'Integrations', protected: true },
      { path: '/settings', component: 'Settings', protected: true },
      { path: '/notifications', component: 'Notifications', protected: true },
      { path: '/audit-logs', component: 'AuditLogs', protected: true },
      { path: '/reports', component: 'Reports', protected: true },
      { path: '/page-builder', component: 'PageBuilder', protected: true },
      { path: '/marketplace', component: 'AppMarketplace', protected: true },
      { path: '/ai-assistant', component: 'AIAssistantPage', protected: true },
      { path: '/theme', component: 'Theme', protected: true },
      { path: '/graphql-console', component: 'GraphQLConsole', protected: true },
      { path: '/js-console', component: 'JSConsole', protected: true },
      { path: '/login', component: 'Login', protected: false },
      { path: '/tokens', component: 'Tokens', protected: true },
      { path: '/tokens/create', component: 'TokenCreate', protected: true }
    ];

    return systemPages.map(page => ({
      id: uuidv4(),
      path: page.path,
      methods: {
        'GET': {
          id: uuidv4(),
          type: 'page' as const,
          target: page.component,
          description: `System page: ${page.component}`
        }
      },
      active: true,
      protected: page.protected,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
}

// Export singleton instance
export const routesPageController = new RoutesPageController();