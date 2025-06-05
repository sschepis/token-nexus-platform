import { CRUDActionFactory, CRUDConfig } from '../CRUDActionFactory';
import { ActionContext } from '../../types/ActionTypes';

// Mock Parse
global.Parse = {
  Query: jest.fn().mockImplementation((className) => ({
    className,
    get: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    first: jest.fn(),
    equalTo: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    ascending: jest.fn().mockReturnThis(),
    descending: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis()
  })),
  Object: {
    extend: jest.fn().mockImplementation((className) => {
      const MockClass = function(this: any, attributes: any) {
        Object.assign(this, attributes);
        this.className = className;
        this.id = 'mock-id-' + Math.random();
      };
      MockClass.prototype.save = jest.fn().mockResolvedValue(new MockClass({}));
      MockClass.prototype.destroy = jest.fn().mockResolvedValue({});
      MockClass.prototype.set = jest.fn();
      MockClass.prototype.get = jest.fn();
      MockClass.prototype.toJSON = jest.fn().mockReturnValue({ id: 'mock-id', name: 'Mock Object' });
      return MockClass;
    })
  },
  Error: {
    INVALID_SESSION_TOKEN: 209,
    INVALID_JSON: 107,
    OPERATION_FORBIDDEN: 119,
    OBJECT_NOT_FOUND: 101,
    INTERNAL_SERVER_ERROR: 1
  }
} as any;

describe('CRUDActionFactory', () => {
  let mockContext: ActionContext;
  let basicConfig: CRUDConfig;

  beforeEach(() => {
    mockContext = {
      user: {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['users:read', 'users:write', 'users:create', 'users:delete'],
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
          permissions: ['users:read']
        }
      },
      navigation: {
        router: {} as any,
        currentPath: '/test',
        breadcrumbs: []
      },
      timestamp: new Date()
    };

    basicConfig = {
      resource: 'Users',
      className: 'User',
      permissions: {
        read: ['users:read'],
        create: ['users:create'],
        update: ['users:write'],
        delete: ['users:delete']
      }
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Factory Methods', () => {
    test('should create all CRUD actions', () => {
      const actions = CRUDActionFactory.createAll(basicConfig);

      expect(actions.size).toBe(5);
      expect(actions.has('listUsers')).toBe(true);
      expect(actions.has('getUsers')).toBe(true);
      expect(actions.has('createUsers')).toBe(true);
      expect(actions.has('updateUsers')).toBe(true);
      expect(actions.has('deleteUsers')).toBe(true);
    });

    test('should create individual actions', () => {
      const listAction = CRUDActionFactory.createListAction(basicConfig);
      const getAction = CRUDActionFactory.createGetAction(basicConfig);
      const createAction = CRUDActionFactory.createCreateAction(basicConfig);
      const updateAction = CRUDActionFactory.createUpdateAction(basicConfig);
      const deleteAction = CRUDActionFactory.createDeleteAction(basicConfig);

      expect(listAction.id).toBe('listUsers');
      expect(listAction.name).toBe('List Users');
      expect(listAction.category).toBe('data');
      expect(listAction.permissions).toEqual(['users:read']);

      expect(getAction.id).toBe('getUsers');
      expect(createAction.id).toBe('createUsers');
      expect(updateAction.id).toBe('updateUsers');
      expect(deleteAction.id).toBe('deleteUsers');
    });
  });

  describe('List Action', () => {
    test('should execute list action successfully', async () => {
      const mockQuery = {
        find: jest.fn().mockResolvedValue([
          { toJSON: () => ({ id: '1', name: 'User 1' }) },
          { toJSON: () => ({ id: '2', name: 'User 2' }) }
        ]),
        count: jest.fn().mockResolvedValue(2),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      const result = await listAction.execute({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('total');
      expect((result.data as any).items).toHaveLength(2);
      expect((result.data as any).total).toBe(2);
      expect(mockQuery.equalTo).toHaveBeenCalledWith('organizationId', 'org123');
      expect(mockQuery.limit).toHaveBeenCalledWith(50); // default limit
      expect(mockQuery.skip).toHaveBeenCalledWith(0); // default skip
    });

    test('should handle list action with pagination', async () => {
      const mockQuery = {
        find: jest.fn().mockResolvedValue([{ toJSON: () => ({ id: '1', name: 'User 1' }) }]),
        count: jest.fn().mockResolvedValue(10),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      const result = await listAction.execute({
        limit: 5,
        skip: 5
      }, mockContext);

      expect(result.success).toBe(true);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(mockQuery.skip).toHaveBeenCalledWith(5);
    });

    test('should handle list action with sorting', async () => {
      const mockQuery = {
        find: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        ascending: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      
      // Test ascending sort
      await listAction.execute({
        sortBy: 'name',
        sortOrder: 'asc'
      }, mockContext);

      expect(mockQuery.ascending).toHaveBeenCalledWith('name');

      // Reset and test descending sort
      jest.clearAllMocks();
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      await listAction.execute({
        sortBy: 'name',
        sortOrder: 'desc'
      }, mockContext);

      expect(mockQuery.descending).toHaveBeenCalledWith('name');
    });

    test('should handle list action with search', async () => {
      const mockQuery = {
        find: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis(),
        matches: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      await listAction.execute({ search: 'john' }, mockContext);

      expect(mockQuery.matches).toHaveBeenCalledWith('name', expect.any(RegExp));
    });

    test('should handle custom query modifications', async () => {
      const customConfig: CRUDConfig = {
        ...basicConfig,
        customQueries: {
          list: (query, context) => {
            query.equalTo('status', 'active');
            return query;
          }
        }
      };

      const mockQuery = {
        find: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(customConfig);
      await listAction.execute({}, mockContext);

      expect(mockQuery.equalTo).toHaveBeenCalledWith('organizationId', 'org123');
      expect(mockQuery.equalTo).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('Get Action', () => {
    test('should create get action with correct parameters', () => {
      const getAction = CRUDActionFactory.createGetAction(basicConfig);

      expect(getAction.id).toBe('getUsers');
      expect(getAction.name).toBe('Get Users');
      expect(getAction.category).toBe('data');
      expect(getAction.permissions).toEqual(['users:read']);
      
      // Check that it has an id parameter
      const idParam = getAction.parameters?.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.required).toBe(true);
      expect(idParam?.type).toBe('string');
    });
  });

  describe('Create Action', () => {
    test('should create create action with correct configuration', () => {
      const createAction = CRUDActionFactory.createCreateAction(basicConfig);

      expect(createAction.id).toBe('createUsers');
      expect(createAction.name).toBe('Create Users');
      expect(createAction.category).toBe('data');
      expect(createAction.permissions).toEqual(['users:create']);
    });

    test('should create action with field validation', () => {
      const configWithFields: CRUDConfig = {
        ...basicConfig,
        fields: {
          required: ['name', 'email'],
          optional: ['phone'],
          readonly: ['id', 'createdAt']
        }
      };

      const createAction = CRUDActionFactory.createCreateAction(configWithFields);
      
      // Should have parameters for required and optional fields
      const nameParam = createAction.parameters?.find(p => p.name === 'name');
      const emailParam = createAction.parameters?.find(p => p.name === 'email');
      const phoneParam = createAction.parameters?.find(p => p.name === 'phone');
      
      expect(nameParam?.required).toBe(true);
      expect(emailParam?.required).toBe(true);
      expect(phoneParam?.required).toBe(false);
    });
  });

  describe('Update Action', () => {
    test('should create update action with correct configuration', () => {
      const updateAction = CRUDActionFactory.createUpdateAction(basicConfig);

      expect(updateAction.id).toBe('updateUsers');
      expect(updateAction.name).toBe('Update Users');
      expect(updateAction.category).toBe('data');
      expect(updateAction.permissions).toEqual(['users:write']);
      
      // Should have id parameter
      const idParam = updateAction.parameters?.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.required).toBe(true);
    });
  });

  describe('Delete Action', () => {
    test('should create delete action with correct configuration', () => {
      const deleteAction = CRUDActionFactory.createDeleteAction(basicConfig);

      expect(deleteAction.id).toBe('deleteUsers');
      expect(deleteAction.name).toBe('Delete Users');
      expect(deleteAction.category).toBe('data');
      expect(deleteAction.permissions).toEqual(['users:delete']);
      
      // Should have id parameter
      const idParam = deleteAction.parameters?.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.required).toBe(true);
    });
  });

  describe('Permission Handling', () => {
    test('should use default permissions when not specified', () => {
      const configWithoutPermissions: CRUDConfig = {
        resource: 'Products',
        className: 'Product'
      };

      const listAction = CRUDActionFactory.createListAction(configWithoutPermissions);
      expect(listAction.permissions).toEqual(['products:read']);
    });

    test('should use custom permissions when specified', () => {
      const configWithCustomPermissions: CRUDConfig = {
        resource: 'Products',
        className: 'Product',
        permissions: {
          read: ['custom:read', 'admin:read']
        }
      };

      const listAction = CRUDActionFactory.createListAction(configWithCustomPermissions);
      expect(listAction.permissions).toEqual(['custom:read', 'admin:read']);
    });
  });

  describe('Error Handling', () => {
    test('should handle permission validation errors', async () => {
      const contextWithoutPermissions = {
        ...mockContext,
        user: { ...mockContext.user, permissions: [] }
      };

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      
      await expect(listAction.execute({}, contextWithoutPermissions))
        .rejects.toThrow();
    });

    test('should handle Parse query errors', async () => {
      const mockQuery = {
        find: jest.fn().mockRejectedValue(new Error('Parse error')),
        count: jest.fn().mockResolvedValue(0),
        equalTo: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        descending: jest.fn().mockReturnThis()
      };

      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const listAction = CRUDActionFactory.createListAction(basicConfig);
      
      await expect(listAction.execute({}, mockContext))
        .rejects.toThrow('Parse error');
    });
  });

  describe('Configuration Validation', () => {
    test('should handle missing resource name', () => {
      const invalidConfig = {
        resource: '',
        className: 'Test'
      } as CRUDConfig;

      expect(() => CRUDActionFactory.createListAction(invalidConfig))
        .not.toThrow(); // Should handle gracefully
    });

    test('should handle missing class name', () => {
      const invalidConfig = {
        resource: 'Test',
        className: ''
      } as CRUDConfig;

      expect(() => CRUDActionFactory.createListAction(invalidConfig))
        .not.toThrow(); // Should handle gracefully
    });
  });

  describe('Action Metadata', () => {
    test('should include correct tags and metadata', () => {
      const listAction = CRUDActionFactory.createListAction(basicConfig);
      
      expect(listAction.metadata?.tags).toContain('crud');
      expect(listAction.metadata?.tags).toContain('list');
      expect(listAction.metadata?.tags).toContain('users');
    });

    test('should have proper descriptions', () => {
      const listAction = CRUDActionFactory.createListAction(basicConfig);
      
      expect(listAction.description).toContain('Get all users');
      expect(listAction.description).toContain('organization');
    });
  });
});