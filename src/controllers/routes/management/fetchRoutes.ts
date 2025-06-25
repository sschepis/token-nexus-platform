import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { Route } from '../../../types/routes';
import { appRegistry } from '../../../services/appRegistry';
import { v4 as uuidv4 } from 'uuid';

export const fetchRoutesAction: ActionDefinition = {
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
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { includeInactive = false } = params;
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
      const systemRoutes = getSystemRoutes();
      routes.push(...systemRoutes);

      // Filter inactive routes if requested
      const filteredRoutes = includeInactive 
        ? routes 
        : routes.filter(route => route.active);

      return {
        success: true,
        data: {
          routes: filteredRoutes,
          total: filteredRoutes.length,
          sources: ['app-registry', 'system-routes']
        },
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchRoutes',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchRoutes',
          userId: context.user.userId
        }
      };
    }
  },
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
};

function getSystemRoutes(): Route[] {
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