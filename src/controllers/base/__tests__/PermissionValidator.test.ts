import { PermissionValidator, PermissionConfig, Permissions } from '../PermissionValidator';
import { ActionContext } from '../../types/ActionTypes';

describe('PermissionValidator', () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    mockContext = {
      user: {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['users:read', 'users:write'],
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
  });

  describe('Basic Permission Validation', () => {
    test('should validate single permission successfully', () => {
      const config: PermissionConfig = {
        permissions: ['users:read']
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(true);
      expect(result.missingPermissions).toBeUndefined();
    });

    test('should fail validation for missing permission', () => {
      const config: PermissionConfig = {
        permissions: ['admin:manage']
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(false);
      expect(result.missingPermissions).toEqual(['admin:manage']);
    });

    test('should validate multiple permissions successfully (requireAll=true)', () => {
      const config: PermissionConfig = {
        permissions: ['users:read', 'users:write'],
        requireAll: true
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(true);
    });

    test('should fail validation for some missing permissions (requireAll=true)', () => {
      const config: PermissionConfig = {
        permissions: ['users:read', 'admin:manage', 'users:delete'],
        requireAll: true
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(false);
      expect(result.missingPermissions).toEqual(['admin:manage', 'users:delete']);
    });

    test('should validate with requireAll=false (ANY permission)', () => {
      const config: PermissionConfig = {
        permissions: ['users:read', 'admin:manage'],
        requireAll: false
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(true);
    });

    test('should fail validation when no permissions match (requireAll=false)', () => {
      const config: PermissionConfig = {
        permissions: ['admin:manage', 'system:admin'],
        requireAll: false
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(false);
    });
  });

  describe('System Admin Detection', () => {
    test('should detect system admin by permission', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['system:admin'] }
      };

      const isAdmin = PermissionValidator.isSystemAdmin(adminContext);
      expect(isAdmin).toBe(true);
    });

    test('should detect system admin by role (SystemAdmin)', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, roles: ['SystemAdmin'] }
      };

      const isAdmin = PermissionValidator.isSystemAdmin(adminContext);
      expect(isAdmin).toBe(true);
    });

    test('should detect system admin by role (system:admin)', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, roles: ['system:admin'] }
      };

      const isAdmin = PermissionValidator.isSystemAdmin(adminContext);
      expect(isAdmin).toBe(true);
    });

    test('should not detect regular user as system admin', () => {
      const isAdmin = PermissionValidator.isSystemAdmin(mockContext);
      expect(isAdmin).toBe(false);
    });
  });

  describe('Organization Admin Detection', () => {
    test('should detect organization admin by permission', () => {
      const orgAdminContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['org:admin'] }
      };

      const isOrgAdmin = PermissionValidator.isOrgAdmin(orgAdminContext);
      expect(isOrgAdmin).toBe(true);
    });

    test('should detect organization admin by role (OrgAdmin)', () => {
      const orgAdminContext = {
        ...mockContext,
        user: { ...mockContext.user, roles: ['OrgAdmin'] }
      };

      const isOrgAdmin = PermissionValidator.isOrgAdmin(orgAdminContext);
      expect(isOrgAdmin).toBe(true);
    });

    test('should detect organization admin by organization role', () => {
      const orgAdminContext = {
        ...mockContext,
        user: { ...mockContext.user, organizationRoles: ['admin'] }
      };

      const isOrgAdmin = PermissionValidator.isOrgAdmin(orgAdminContext);
      expect(isOrgAdmin).toBe(true);
    });

    test('should not detect regular user as organization admin', () => {
      const isOrgAdmin = PermissionValidator.isOrgAdmin(mockContext);
      expect(isOrgAdmin).toBe(false);
    });
  });

  describe('Wildcard Permission Support', () => {
    test('should support wildcard permissions', () => {
      const wildcardContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['users:*'] }
      };

      const config: PermissionConfig = {
        permissions: ['users:delete']
      };
      const result = PermissionValidator.validate(wildcardContext, config);
      expect(result.success).toBe(true);
    });

    test('should support global wildcard', () => {
      const wildcardContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['*'] }
      };

      const config: PermissionConfig = {
        permissions: ['any:permission:here']
      };
      const result = PermissionValidator.validate(wildcardContext, config);
      expect(result.success).toBe(true);
    });

    test('should not match incorrect wildcard patterns', () => {
      const wildcardContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['users:*'] }
      };

      const config: PermissionConfig = {
        permissions: ['admin:read']
      };
      const result = PermissionValidator.validate(wildcardContext, config);
      expect(result.success).toBe(false);
    });

    test('should match wildcard with multiple parts', () => {
      const wildcardContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['*:read'] }
      };

      const config: PermissionConfig = {
        permissions: ['users:read']
      };
      const result = PermissionValidator.validate(wildcardContext, config);
      expect(result.success).toBe(true);
    });
  });

  describe('System Admin Bypass', () => {
    test('should allow system admin to bypass permission checks', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, roles: ['SystemAdmin'] }
      };

      const config: PermissionConfig = {
        permissions: ['any:permission'],
        systemAdminBypass: true
      };
      const result = PermissionValidator.validate(adminContext, config);
      expect(result.success).toBe(true);
    });

    test('should not bypass when systemAdminBypass is false', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, roles: ['SystemAdmin'] }
      };

      const config: PermissionConfig = {
        permissions: ['specific:permission'],
        systemAdminBypass: false
      };
      const result = PermissionValidator.validate(adminContext, config);
      expect(result.success).toBe(false);
    });
  });

  describe('Organization Context Validation', () => {
    test('should require organization when organizationRequired is true', () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };

      const config: PermissionConfig = {
        permissions: ['users:read'],
        organizationRequired: true
      };
      const result = PermissionValidator.validate(contextWithoutOrg, config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Organization context is required');
    });

    test('should not require organization when organizationRequired is false', () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };

      const config: PermissionConfig = {
        permissions: ['users:read'],
        organizationRequired: false
      };
      const result = PermissionValidator.validate(contextWithoutOrg, config);
      expect(result.success).toBe(true);
    });
  });

  describe('Permission Configuration Creation', () => {
    test('should create config from string permission', () => {
      const config = PermissionValidator.createConfig('users:read');
      expect(config.permissions).toEqual(['users:read']);
      expect(config.requireAll).toBe(true);
      expect(config.organizationRequired).toBe(true);
      expect(config.systemAdminBypass).toBe(true);
    });

    test('should create config from array of permissions', () => {
      const config = PermissionValidator.createConfig(['users:read', 'users:write']);
      expect(config.permissions).toEqual(['users:read', 'users:write']);
    });

    test('should create config with custom options', () => {
      const config = PermissionValidator.createConfig('users:read', {
        requireAll: false,
        organizationRequired: false,
        systemAdminBypass: false
      });
      expect(config.requireAll).toBe(false);
      expect(config.organizationRequired).toBe(false);
      expect(config.systemAdminBypass).toBe(false);
    });
  });

  describe('Permission Presets', () => {
    test('should create read preset', () => {
      const config = PermissionValidator.presets.read('users');
      expect(config.permissions).toEqual(['users:read']);
    });

    test('should create write preset', () => {
      const config = PermissionValidator.presets.write('users');
      expect(config.permissions).toEqual(['users:write', 'users:create']);
      expect(config.requireAll).toBe(false);
    });

    test('should create manage preset', () => {
      const config = PermissionValidator.presets.manage('users');
      expect(config.permissions).toEqual(['users:read', 'users:write', 'users:delete']);
    });

    test('should create admin preset', () => {
      const config = PermissionValidator.presets.admin();
      expect(config.permissions).toEqual(['admin', 'org:admin']);
      expect(config.requireAll).toBe(false);
    });

    test('should create system admin preset', () => {
      const config = PermissionValidator.presets.systemAdmin();
      expect(config.permissions).toEqual(['system:admin']);
      expect(config.organizationRequired).toBe(false);
      expect(config.systemAdminBypass).toBe(false);
    });

    test('should create public preset', () => {
      const config = PermissionValidator.presets.public();
      expect(config.permissions).toEqual([]);
      expect(config.organizationRequired).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    test('should validate read permissions using helper', () => {
      const result = Permissions.validateRead(mockContext, 'users');
      expect(result.success).toBe(true);
    });

    test('should validate write permissions using helper', () => {
      const result = Permissions.validateWrite(mockContext, 'users');
      expect(result.success).toBe(true);
    });

    test('should validate manage permissions using helper', () => {
      const contextWithDelete = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['users:read', 'users:write', 'users:delete'] }
      };
      const result = Permissions.validateManage(contextWithDelete, 'users');
      expect(result.success).toBe(true);
    });

    test('should validate admin permissions using helper', () => {
      const adminContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['admin'] }
      };
      const result = Permissions.validateAdmin(adminContext);
      expect(result.success).toBe(true);
    });

    test('should validate system admin permissions using helper', () => {
      const sysAdminContext = {
        ...mockContext,
        user: { ...mockContext.user, permissions: ['system:admin'] }
      };
      const result = Permissions.validateSystemAdmin(sysAdminContext);
      expect(result.success).toBe(true);
    });
  });

  describe('Wildcard Matching Logic', () => {
    test('should match exact permissions', () => {
      const result = PermissionValidator.matchesWildcard('users:read', 'users:read');
      expect(result).toBe(true);
    });

    test('should match wildcard permissions', () => {
      const result = PermissionValidator.matchesWildcard('users:*', 'users:read');
      expect(result).toBe(true);
    });

    test('should match global wildcard', () => {
      const result = PermissionValidator.matchesWildcard('*', 'any:permission');
      expect(result).toBe(true);
    });

    test('should not match different permissions', () => {
      const result = PermissionValidator.matchesWildcard('users:read', 'admin:write');
      expect(result).toBe(false);
    });

    test('should not match partial wildcards incorrectly', () => {
      const result = PermissionValidator.matchesWildcard('users:*', 'admin:read');
      expect(result).toBe(false);
    });

    test('should not match different length permission parts', () => {
      const result = PermissionValidator.matchesWildcard('users:*', 'users:read:special');
      expect(result).toBe(false);
    });
  });

  describe('Direct Permission Checking', () => {
    test('should check direct permission match', () => {
      const userPermissions = ['users:read', 'users:write'];
      const result = PermissionValidator.hasPermission(userPermissions, 'users:read');
      expect(result).toBe(true);
    });

    test('should check wildcard permission match', () => {
      const userPermissions = ['users:*'];
      const result = PermissionValidator.hasPermission(userPermissions, 'users:delete');
      expect(result).toBe(true);
    });

    test('should return false for no match', () => {
      const userPermissions = ['users:read'];
      const result = PermissionValidator.hasPermission(userPermissions, 'admin:write');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty permissions array', () => {
      const config: PermissionConfig = {
        permissions: []
      };
      const result = PermissionValidator.validate(mockContext, config);
      expect(result.success).toBe(true);
    });

    test('should handle missing user permissions', () => {
      const contextWithoutPermissions = {
        ...mockContext,
        user: { ...mockContext.user, permissions: undefined }
      };

      const config: PermissionConfig = {
        permissions: ['users:read']
      };
      const result = PermissionValidator.validate(contextWithoutPermissions, config);
      expect(result.success).toBe(false);
    });

    test('should handle null user permissions', () => {
      const contextWithNullPermissions = {
        ...mockContext,
        user: { ...mockContext.user, permissions: null as any }
      };

      const config: PermissionConfig = {
        permissions: ['users:read']
      };
      const result = PermissionValidator.validate(contextWithNullPermissions, config);
      expect(result.success).toBe(false);
    });
  });
});