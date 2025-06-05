import { ActionBuilder, createAction, ActionBuilderPresets } from '../ActionBuilder';
import { ActionDefinition, ActionContext } from '../../types/ActionTypes';

describe('ActionBuilder', () => {
  let mockContext: ActionContext;
  let mockExecutor: jest.Mock;

  beforeEach(() => {
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

    mockExecutor = jest.fn().mockResolvedValue({ success: true, data: {} });
  });

  describe('Basic Action Building', () => {
    test('should build basic action definition', () => {
      const action = createAction('testAction', 'Test Action')
        .description('A test action')
        .category('data')
        .permissions('test:read')
        .build(mockExecutor);

      expect(action.id).toBe('testAction');
      expect(action.name).toBe('Test Action');
      expect(action.description).toBe('A test action');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['test:read']);
      expect(action.execute).toBe(mockExecutor);
    });

    test('should build action with all properties', () => {
      const action = createAction('complexAction', 'Complex Action')
        .description('A complex test action')
        .category('data')
        .permissions('admin:write')
        .tags('complex', 'test')
        .version('1.0')
        .build(mockExecutor);

      expect(action.id).toBe('complexAction');
      expect(action.name).toBe('Complex Action');
      expect(action.description).toBe('A complex test action');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['admin:write']);
      expect(action.metadata?.tags).toEqual(['complex', 'test']);
      expect(action.metadata?.version).toBe('1.0');
    });
  });

  describe('Parameter Building', () => {
    test('should add string parameter', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .stringParam('name', true, 'User name')
        .build(mockExecutor);

      expect(action.parameters).toHaveLength(1);
      expect(action.parameters![0]).toEqual({
        name: 'name',
        type: 'string',
        description: 'User name',
        required: true
      });
    });

    test('should add number parameter with validation', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .numberParam('age', false, 'User age', { min: 0, max: 120 })
        .build(mockExecutor);

      expect(action.parameters).toHaveLength(1);
      expect(action.parameters![0].name).toBe('age');
      expect(action.parameters![0].type).toBe('number');
      expect(action.parameters![0].description).toBe('User age');
      expect(action.parameters![0].required).toBe(false);
      expect(action.parameters![0].validation).toBeDefined();
    });

    test('should add boolean parameter', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .booleanParam('active', true, 'Is active')
        .build(mockExecutor);

      expect(action.parameters).toHaveLength(1);
      expect(action.parameters![0]).toEqual({
        name: 'active',
        type: 'boolean',
        description: 'Is active',
        required: true
      });
    });

    test('should add multiple parameters', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .stringParam('name', true, 'Name')
        .numberParam('age', false, 'Age')
        .booleanParam('active', true, 'Active')
        .build(mockExecutor);

      expect(action.parameters).toHaveLength(3);
      expect(action.parameters!.map(p => p.name)).toEqual(['name', 'age', 'active']);
    });

    test('should add string parameter with validation options', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .stringParam('status', true, 'Status', { 
          enum: ['active', 'inactive', 'pending'],
          minLength: 3,
          maxLength: 10
        })
        .build(mockExecutor);

      expect(action.parameters).toHaveLength(1);
      expect(action.parameters![0].name).toBe('status');
      expect(action.parameters![0].validation).toBeDefined();
      expect(action.parameters![0].validation).toHaveLength(2); // enum and range validation
    });
  });

  describe('Metadata Building', () => {
    test('should add tags', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .tags('tag1', 'tag2', 'tag3')
        .build(mockExecutor);

      expect(action.metadata?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should add examples', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .example({ name: 'John' }, 'Create user John', { id: '123', name: 'John' })
        .build(mockExecutor);

      expect(action.metadata?.examples).toHaveLength(1);
      expect(action.metadata?.examples![0]).toEqual({
        params: { name: 'John' },
        description: 'Create user John',
        expectedResult: { id: '123', name: 'John' }
      });
    });

    test('should add related actions', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .relatedActions('action1', 'action2')
        .build(mockExecutor);

      expect(action.metadata?.relatedActions).toEqual(['action1', 'action2']);
    });

    test('should mark as deprecated', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .deprecated('Use newAction instead')
        .build(mockExecutor);

      expect(action.metadata?.deprecated).toBe(true);
      expect(action.metadata?.deprecationMessage).toBe('Use newAction instead');
    });

    test('should set version', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .version('2.1.0')
        .build(mockExecutor);

      expect(action.metadata?.version).toBe('2.1.0');
    });
  });

  describe('Pre-configured Builders', () => {
    test('should create data fetch action', () => {
      const action = ActionBuilderPresets.dataFetch('fetchUsers', 'Fetch Users', 'Fetch all users')
        .stringParam('filter', false, 'Filter criteria')
        .build(mockExecutor);

      expect(action.id).toBe('fetchUsers');
      expect(action.name).toBe('Fetch Users');
      expect(action.description).toBe('Fetch all users');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['read']);
      expect(action.metadata?.tags).toContain('data');
      expect(action.metadata?.tags).toContain('fetch');
      expect(action.parameters).toHaveLength(1);
    });

    test('should create create action', () => {
      const action = ActionBuilderPresets.dataCreate('createUser', 'Create User', 'Create a new user')
        .stringParam('name', true, 'User name')
        .stringParam('email', true, 'User email')
        .build(mockExecutor);

      expect(action.id).toBe('createUser');
      expect(action.name).toBe('Create User');
      expect(action.description).toBe('Create a new user');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['write']);
      expect(action.metadata?.tags).toContain('data');
      expect(action.metadata?.tags).toContain('create');
      expect(action.parameters).toHaveLength(2);
    });

    test('should create update action', () => {
      const action = ActionBuilderPresets.dataUpdate('updateUser', 'Update User', 'Update an existing user')
        .stringParam('name', false, 'User name')
        .build(mockExecutor);

      expect(action.id).toBe('updateUser');
      expect(action.name).toBe('Update User');
      expect(action.description).toBe('Update an existing user');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['write']);
      expect(action.metadata?.tags).toContain('data');
      expect(action.metadata?.tags).toContain('update');
      expect(action.parameters).toHaveLength(2); // id param is pre-added + name param
    });

    test('should create delete action', () => {
      const action = ActionBuilderPresets.dataDelete('deleteUser', 'Delete User', 'Delete a user')
        .build(mockExecutor);

      expect(action.id).toBe('deleteUser');
      expect(action.name).toBe('Delete User');
      expect(action.description).toBe('Delete a user');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['delete']);
      expect(action.metadata?.tags).toContain('data');
      expect(action.metadata?.tags).toContain('delete');
      expect(action.parameters).toHaveLength(1); // id param is pre-added
    });

    test('should create navigation action', () => {
      const action = ActionBuilderPresets.navigation('navigateToPage', 'Navigate to Page', 'Navigate to a specific page')
        .stringParam('pageId', true, 'Page ID')
        .build(mockExecutor);

      expect(action.id).toBe('navigateToPage');
      expect(action.name).toBe('Navigate to Page');
      expect(action.description).toBe('Navigate to a specific page');
      expect(action.category).toBe('navigation');
      expect(action.permissions).toEqual(['read']);
      expect(action.metadata?.tags).toContain('navigation');
      expect(action.parameters).toHaveLength(1);
    });

    test('should create UI action', () => {
      const action = ActionBuilderPresets.uiAction('showModal', 'Show Modal', 'Display a modal dialog')
        .stringParam('title', true, 'Modal title')
        .build(mockExecutor);

      expect(action.id).toBe('showModal');
      expect(action.name).toBe('Show Modal');
      expect(action.description).toBe('Display a modal dialog');
      expect(action.category).toBe('ui');
      expect(action.permissions).toEqual(['read']);
      expect(action.metadata?.tags).toContain('ui');
      expect(action.metadata?.tags).toContain('interaction');
      expect(action.parameters).toHaveLength(1);
    });
  });

  describe('Builder Chaining', () => {
    test('should support method chaining', () => {
      const action = createAction('chainTest', 'Chain Test')
        .description('Testing method chaining')
        .category('data')
        .permissions('test:read')
        .tags('chain', 'test')
        .version('1.0')
        .stringParam('param1', true, 'Parameter 1')
        .numberParam('param2', false, 'Parameter 2')
        .build(mockExecutor);

      expect(action.id).toBe('chainTest');
      expect(action.description).toBe('Testing method chaining');
      expect(action.category).toBe('data');
      expect(action.permissions).toEqual(['test:read']);
      expect(action.metadata?.tags).toEqual(['chain', 'test']);
      expect(action.metadata?.version).toBe('1.0');
      expect(action.parameters).toHaveLength(2);
      expect(action.execute).toBe(mockExecutor);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for missing required fields', () => {
      expect(() => {
        createAction('', 'Test Action')
          .description('Test')
          .category('data')
          .build(mockExecutor);
      }).toThrow('Action must have id, name, description, and category');
    });

    test('should throw error for missing description', () => {
      expect(() => {
        createAction('testAction', 'Test Action')
          .category('data')
          .build(mockExecutor);
      }).toThrow('Action must have id, name, description, and category');
    });

    test('should throw error for missing category', () => {
      expect(() => {
        createAction('testAction', 'Test Action')
          .description('Test description')
          .build(mockExecutor);
      }).toThrow('Action must have id, name, description, and category');
    });
  });

  describe('Constructor Validation', () => {
    test('should create ActionBuilder with valid parameters', () => {
      const builder = new ActionBuilder('testId', 'Test Name');
      expect(builder).toBeInstanceOf(ActionBuilder);
    });

    test('should create action using factory function', () => {
      const builder = createAction('testId', 'Test Name');
      expect(builder).toBeInstanceOf(ActionBuilder);
    });
  });

  describe('Permission Handling', () => {
    test('should add single permission', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .permissions('read')
        .build(mockExecutor);

      expect(action.permissions).toEqual(['read']);
    });

    test('should add multiple permissions', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .permissions('read', 'write', 'delete')
        .build(mockExecutor);

      expect(action.permissions).toEqual(['read', 'write', 'delete']);
    });

    test('should accumulate permissions from multiple calls', () => {
      const action = createAction('testAction', 'Test Action')
        .description('Test action')
        .category('data')
        .permissions('read')
        .permissions('write')
        .permissions('delete')
        .build(mockExecutor);

      expect(action.permissions).toEqual(['read', 'write', 'delete']);
    });
  });
});