import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { Route, HttpMethod } from '../../../types/routes';
import { v4 as uuidv4 } from 'uuid';

export const addRouteAction: ActionDefinition = {
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
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { path, method, handlerType, target, protected: isProtected } = params;

      // Validate path
      if (!path || typeof path !== 'string' || !path.startsWith('/')) {
        return {
          success: false,
          error: 'Route path must start with /',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'addRoute',
            userId: context.user.userId
          }
        };
      }

      // Validate method
      const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      if (!validMethods.includes(method as HttpMethod)) {
        return {
          success: false,
          error: `Invalid HTTP method: ${method}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'addRoute',
            userId: context.user.userId
          }
        };
      }

      // Validate handler type
      const validTypes = ['page', 'function', 'redirect'];
      if (!validTypes.includes(handlerType as string)) {
        return {
          success: false,
          error: `Invalid handler type: ${handlerType}`,
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'addRoute',
            userId: context.user.userId
          }
        };
      }

      const newRoute: Route = {
        id: uuidv4(),
        path: path as string,
        methods: {
          [method as HttpMethod]: {
            id: uuidv4(),
            type: handlerType as 'page' | 'function' | 'redirect',
            target: target as string,
            description: `${handlerType} handler for ${path}`
          }
        },
        active: true,
        protected: (isProtected as boolean) ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // TODO: Persist to backend/database
      // For now, we'll emit an event that the UI can listen to
      
      return {
        success: true,
        data: { route: newRoute },
        message: `Route ${path} created successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'addRoute',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add route',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'addRoute',
          userId: context.user.userId
        }
      };
    }
  },
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
};