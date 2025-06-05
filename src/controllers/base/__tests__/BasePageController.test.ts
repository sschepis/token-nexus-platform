import { BasePageController, PageControllerConfig, ActionConfig } from '../BasePageController';
import { ActionContext, ActionResult } from '../../types/ActionTypes';

// Mock Parse
global.Parse = {
  Query: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    equalTo: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis()
  })),
  Error: {
    INVALID_SESSION_TOKEN: 209,
    INVALID_JSON: 107,
    OPERATION_FORBIDDEN: 119,
    OBJECT_NOT_FOUND: 101,
    INTERNAL_SERVER_ERROR: 1
  }
} as any;

// Test implementation of BasePageController
class TestPageController extends BasePageController {
  constructor() {
    const config: PageControllerConfig = {
      pageId: 'test',
      pageName: 'Test Page',
      description: 'Test page controller',
      category: 'test',
      tags: ['test', 'example'],
      permissions: ['test:read'],
      version: '1.0.0'
    };
    super(config);
  }

  protected initializeActions(): void {
    // Test action with organization requirement
    this.registerAction(
      {
        id: 'testAction',
        name: 'Test Action',
        description: 'A test action',
        category: 'data',
        permissions: ['test:read'],
        requiresOrganization: true
      },
      async (params, context) => {
        return { message: 'Test action executed', params };
      }
    );

    // Test action without organization requirement
    this.registerAction(
      {
        id: 'publicAction',
        name: 'Public Action',
        description: 'A public test action',
        category: 'data',
        permissions: ['test:read'],
        requiresOrganization: false
      },
      async (params, context) => {
        return { message: 'Public action executed', params };
      }
    );

    // Test action that throws error
    this.registerAction(
      {
        id: 'errorAction',
        name: 'Error Action',
        description: 'An action that throws an error',
        category: 'data',
        permissions: ['test:read']
      },
      async (params, context) => {
        throw new Error('Test error');
      }
    );
  }
}

describe('BasePageController', () => {
  let controller: TestPageController;
  let mockContext: ActionContext;

  beforeEach(() => {
    controller = new TestPageController();
    
    mockContext = {
      user: {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['test:read'],
        organizationId: 'org123'
      },
      organization: {
        id: 'org123',
        name: 'Test Organization',
        settings: {},
        permissions: [],
        features: []
      },
      page: {
        pageId: 'test',
        pageName: 'Test Page',
        state: {},
        props: {},
        metadata: {
          category: 'test',
          tags: ['test'],
          permissions: ['test:read']
        }
      },
      navigation: {
        router: {} as any,
        currentPath: '/test',
        breadcrumbs: []
      },
      timestamp: new Date()
    };
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(controller.pageId).toBe('test');
      expect(controller.pageName).toBe('Test Page');
      expect(controller.description).toBe('Test page controller');
      expect(controller.metadata.category).toBe('test');
      expect(controller.metadata.tags).toEqual(['test', 'example']);
      expect(controller.metadata.permissions).toEqual(['test:read']);
      expect(controller.isActive).toBe(true);
      expect(controller.registeredAt).toBeInstanceOf(Date);
    });

    test('should initialize actions', () => {
      expect(controller.actions.size).toBe(3);
      expect(controller.getAction('testAction')).toBeDefined();
      expect(controller.getAction('publicAction')).toBeDefined();
      expect(controller.getAction('errorAction')).toBeDefined();
    });
  });

  describe('Action Registration', () => {
    test('should register actions correctly', () => {
      const testAction = controller.getAction('testAction');
      expect(testAction).toBeDefined();
      expect(testAction!.id).toBe('testAction');
      expect(testAction!.name).toBe('Test Action');
      expect(testAction!.category).toBe('data');
      expect(testAction!.permissions).toEqual(['test:read']);
    });

    test('should get all actions', () => {
      const allActions = controller.getAllActions();
      expect(allActions).toHaveLength(3);
      expect(allActions.map(a => a.id)).toContain('testAction');
    });

    test('should get actions by category', () => {
      const dataActions = controller.getActionsByCategory('data');
      expect(dataActions).toHaveLength(3);
    });

    test('should get actions by permission', () => {
      const readActions = controller.getActionsByPermission('test:read');
      expect(readActions).toHaveLength(3);
    });
  });

  describe('Organization Context Validation', () => {
    test('should validate organization context successfully', () => {
      const validation = controller['validateOrganizationContext'](mockContext);
      expect(validation.success).toBe(true);
    });

    test('should fail validation when organization is missing', () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };
      
      const validation = controller['validateOrganizationContext'](contextWithoutOrg);
      expect(validation.success).toBe(false);
      expect(validation.error).toContain('Organization ID is required');
    });

    test('should get organization ID from context', () => {
      const orgId = controller['getOrganizationId'](mockContext);
      expect(orgId).toBe('org123');
    });
  });

  describe('Action Execution', () => {
    test('should execute action successfully with organization context', async () => {
      const testAction = controller.getAction('testAction')!;
      const result = await testAction.execute({ testParam: 'value' }, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Test action executed',
        params: { testParam: 'value' }
      });
      expect(result.message).toBe('Test Action executed successfully');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.actionId).toBe('testAction');
      expect(result.metadata!.userId).toBe('user123');
    });

    test('should execute public action without organization context', async () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };
      
      const publicAction = controller.getAction('publicAction')!;
      const result = await publicAction.execute({}, contextWithoutOrg);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Public action executed',
        params: {}
      });
    });

    test('should fail when organization is required but missing', async () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };
      
      const testAction = controller.getAction('testAction')!;
      const result = await testAction.execute({}, contextWithoutOrg);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Organization ID is required');
    });

    test('should handle action execution errors', async () => {
      const errorAction = controller.getAction('errorAction')!;
      const result = await errorAction.execute({}, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Result Creation', () => {
    test('should create success result correctly', () => {
      const startTime = Date.now();
      const result = controller['createSuccessResult'](
        'testAction',
        'user123',
        { test: 'data' },
        'Success message',
        startTime
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'data' });
      expect(result.message).toBe('Success message');
      expect(result.metadata!.actionId).toBe('testAction');
      expect(result.metadata!.userId).toBe('user123');
      expect(result.metadata!.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should create error result correctly', () => {
      const startTime = Date.now();
      const result = controller['createErrorResult'](
        'testAction',
        'user123',
        'Error message',
        startTime
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error message');
      expect(result.metadata!.actionId).toBe('testAction');
      expect(result.metadata!.userId).toBe('user123');
    });
  });

  describe('Parse Query Helpers', () => {
    test('should create organization query', () => {
      const query = controller['createOrganizationQuery']('TestClass', mockContext);
      expect(Parse.Query).toHaveBeenCalledWith('TestClass');
      expect(query.equalTo).toHaveBeenCalledWith('organizationId', 'org123');
    });

    test('should execute query safely', async () => {
      const mockQuery = {
        find: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        first: jest.fn().mockResolvedValue({ id: '1' }),
        count: jest.fn().mockResolvedValue(5)
      } as any;

      const findResult = await controller['executeQuery'](mockQuery, 'find');
      expect(findResult).toEqual([{ id: '1' }, { id: '2' }]);

      const firstResult = await controller['executeQuery'](mockQuery, 'first');
      expect(firstResult).toEqual({ id: '1' });

      const countResult = await controller['executeQuery'](mockQuery, 'count');
      expect(countResult).toBe(5);
    });

    test('should handle query errors gracefully', async () => {
      const mockQuery = {
        find: jest.fn().mockRejectedValue(new Error('Query failed')),
        count: jest.fn().mockRejectedValue(new Error('Count failed'))
      } as any;

      const findResult = await controller['executeQuery'](mockQuery, 'find');
      expect(findResult).toEqual([]);

      const countResult = await controller['executeQuery'](mockQuery, 'count');
      expect(countResult).toBe(0);
    });
  });

  describe('Lifecycle Methods', () => {
    test('should call initialize method', () => {
      const initializeSpy = jest.spyOn(controller, 'initialize');
      controller.initialize();
      expect(initializeSpy).toHaveBeenCalled();
    });

    test('should call destroy method and clear actions', () => {
      expect(controller.actions.size).toBeGreaterThan(0);
      controller.destroy();
      expect(controller.actions.size).toBe(0);
    });
  });
});