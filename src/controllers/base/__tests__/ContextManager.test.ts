import { ContextManager } from '../ContextManager';
import { ActionContext, PageContext } from '../../types/ActionTypes';

// Mock Parse
global.Parse = {
  Query: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    find: jest.fn(),
    equalTo: jest.fn().mockReturnThis(),
    include: jest.fn().mockReturnThis()
  })),
  User: {
    current: jest.fn()
  },
  Error: {
    INVALID_SESSION_TOKEN: 209,
    OBJECT_NOT_FOUND: 101
  }
} as any;

describe('ContextManager', () => {
  let mockUser: any;
  let mockOrganization: any;

  beforeEach(() => {
    mockUser = {
      id: 'user123',
      get: jest.fn((key: string) => {
        const data: any = {
          username: 'testuser',
          email: 'test@example.com',
          organizationId: 'org123',
          roles: ['user'],
          permissions: ['users:read', 'users:write'],
          organizationRoles: ['member']
        };
        return data[key];
      })
    };

    mockOrganization = {
      id: 'org123',
      get: jest.fn((key: string) => {
        const data: any = {
          name: 'Test Organization',
          settings: {},
          permissions: [],
          features: []
        };
        return data[key];
      })
    };

    jest.clearAllMocks();
  });

  describe('Context Validation', () => {
    test('should validate complete context successfully', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
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

      const result = ContextManager.validateContext(context);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect missing user context', () => {
      const context = {
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
      } as ActionContext;

      const result = ContextManager.validateContext(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User context is required');
    });

    test('should detect missing user ID', () => {
      const context: ActionContext = {
        user: {
          userId: '',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
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

      const result = ContextManager.validateContext(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    test('should detect missing page context', () => {
      const context = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
        },
        organization: {
          id: 'org123',
          name: 'Test Organization',
          settings: {},
          permissions: [],
          features: []
        },
        navigation: {
          router: {} as any,
          currentPath: '/test',
          breadcrumbs: []
        },
        timestamp: new Date()
      } as ActionContext;

      const result = ContextManager.validateContext(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Page context is required');
    });

    test('should validate with custom requirements', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
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

      // Should pass when organization is not required
      const result1 = ContextManager.validateContext(context, {
        requireOrganization: false
      });
      expect(result1.valid).toBe(true);

      // Should fail when organization is required
      const result2 = ContextManager.validateContext(context, {
        requireOrganization: true
      });
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Organization context is required');
    });
  });

  describe('Organization ID Extraction', () => {
    test('should extract organization ID from organization context', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
        },
        organization: {
          id: 'org456',
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

      // Should prefer organization.id over user.organizationId
      const orgId = ContextManager.getOrganizationId(context);
      expect(orgId).toBe('org456');
    });

    test('should fall back to user organization ID', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
        },
        organization: undefined,
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

      const orgId = ContextManager.getOrganizationId(context);
      expect(orgId).toBe('org123');
    });

    test('should return null when no organization ID available', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: undefined
        },
        organization: undefined,
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

      const orgId = ContextManager.getOrganizationId(context);
      expect(orgId).toBeNull();
    });
  });

  describe('Organization Membership Validation', () => {
    test('should validate organization membership successfully', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
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

      const isValid = ContextManager.validateOrganizationMembership(context);
      expect(isValid).toBe(true);
    });

    test('should detect invalid organization membership', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
        },
        organization: {
          id: 'org456',
          name: 'Different Organization',
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

      const isValid = ContextManager.validateOrganizationMembership(context);
      expect(isValid).toBe(false);
    });

    test('should return false when organization context is missing', () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
        },
        organization: undefined,
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

      const isValid = ContextManager.validateOrganizationMembership(context);
      expect(isValid).toBe(false);
    });
  });

  describe('Organization Context Enrichment', () => {
    test('should enrich context with organization data', async () => {
      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockOrganization)
      };
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
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

      const enrichedContext = await ContextManager.enrichOrganizationContext(context);

      expect(enrichedContext.organization).toBeDefined();
      expect(enrichedContext.organization!.id).toBe('org123');
      expect(enrichedContext.organization!.name).toBe('Test Organization');
      expect(mockQuery.get).toHaveBeenCalledWith('org123');
    });

    test('should handle organization enrichment with specific org ID', async () => {
      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockOrganization)
      };
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: undefined
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

      const enrichedContext = await ContextManager.enrichOrganizationContext(context, 'org456');

      expect(enrichedContext.organization).toBeDefined();
      expect(mockQuery.get).toHaveBeenCalledWith('org456');
    });

    test('should return original context when no organization ID available', async () => {
      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: undefined
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

      const enrichedContext = await ContextManager.enrichOrganizationContext(context);

      expect(enrichedContext).toBe(context);
      expect(Parse.Query).not.toHaveBeenCalled();
    });

    test('should handle organization fetch errors gracefully', async () => {
      const mockQuery = {
        get: jest.fn().mockRejectedValue(new Error('Organization not found'))
      };
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const context: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
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

      const enrichedContext = await ContextManager.enrichOrganizationContext(context);

      expect(enrichedContext).toBe(context);
      expect(enrichedContext.organization).toBeUndefined();
    });
  });

  describe('System Context Creation', () => {
    test('should create system context with defaults', () => {
      const systemContext = ContextManager.createSystemContext();

      expect(systemContext.user.userId).toBe('system');
      expect(systemContext.user.username).toBe('system');
      expect(systemContext.user.roles).toContain('SystemAdmin');
      expect(systemContext.user.permissions).toContain('*');
      expect(systemContext.page.pageId).toBe('system');
      expect(systemContext.navigation.currentPath).toBe('/system');
      expect(systemContext.timestamp).toBeInstanceOf(Date);
    });

    test('should create system context with overrides', () => {
      const overrides = {
        user: {
          userId: 'test-system',
          username: 'test-system',
          email: 'test@system.com',
          roles: ['TestAdmin'],
          permissions: ['test:*'],
          organizationId: undefined
        }
      };

      const systemContext = ContextManager.createSystemContext(overrides);

      expect(systemContext.user.userId).toBe('test-system');
      expect(systemContext.user.username).toBe('test-system');
      expect(systemContext.user.roles).toContain('TestAdmin');
      expect(systemContext.user.permissions).toContain('test:*');
      expect(systemContext.page.pageId).toBe('system'); // Should keep default page
    });
  });

  describe('User Context Creation', () => {
    test('should create user context successfully', async () => {
      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockUser)
      };
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const pageContext: PageContext = {
        pageId: 'dashboard',
        pageName: 'Dashboard',
        state: {},
        props: {},
        metadata: {
          category: 'main',
          tags: ['dashboard'],
          permissions: ['dashboard:read']
        }
      };

      const context = await ContextManager.createUserContext('user123', pageContext, 'org123');

      expect(context).toBeDefined();
      expect(context!.user.userId).toBe('user123');
      expect(context!.user.username).toBe('testuser');
      expect(context!.user.organizationId).toBe('org123');
      expect(context!.page.pageId).toBe('dashboard');
      expect(context!.navigation.currentPath).toBe('/dashboard');
    });

    test('should handle user fetch errors', async () => {
      const mockQuery = {
        get: jest.fn().mockRejectedValue(new Error('User not found'))
      };
      (Parse.Query as jest.Mock).mockReturnValue(mockQuery);

      const pageContext: PageContext = {
        pageId: 'dashboard',
        pageName: 'Dashboard',
        state: {},
        props: {},
        metadata: {
          category: 'main',
          tags: ['dashboard'],
          permissions: ['dashboard:read']
        }
      };

      const context = await ContextManager.createUserContext('nonexistent', pageContext);

      expect(context).toBeNull();
    });
  });

  describe('Context Cloning', () => {
    test('should clone context with modifications', () => {
      const originalContext: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
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
          state: { mode: 'view' },
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
          breadcrumbs: [{ label: 'Home', path: '/' }]
        },
        timestamp: new Date('2023-01-01')
      };

      const modifications = {
        page: {
          ...originalContext.page,
          state: { mode: 'edit' }
        }
      };

      const clonedContext = ContextManager.cloneContext(originalContext, modifications);

      expect(clonedContext).not.toBe(originalContext);
      expect(clonedContext.user).not.toBe(originalContext.user);
      expect(clonedContext.page.state).toEqual({ mode: 'edit' });
      expect(clonedContext.page.state).not.toBe(originalContext.page.state);
      expect(clonedContext.timestamp).not.toBe(originalContext.timestamp);
      expect(clonedContext.navigation.breadcrumbs).not.toBe(originalContext.navigation.breadcrumbs);
    });

    test('should clone context without modifications', () => {
      const originalContext: ActionContext = {
        user: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['users:read'],
          organizationId: 'org123'
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
        timestamp: new Date('2023-01-01')
      };

      const clonedContext = ContextManager.cloneContext(originalContext);

      expect(clonedContext).not.toBe(originalContext);
      expect(clonedContext.user).toEqual(originalContext.user);
      expect(clonedContext.user).not.toBe(originalContext.user);
      expect(clonedContext.timestamp).toBeInstanceOf(Date);
      expect(clonedContext.timestamp).not.toBe(originalContext.timestamp);
    });
  });
});