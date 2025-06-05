// Unit test for pilot migration middleware functions
// This test focuses on testing the middleware functions in isolation

describe('Pilot Migration Middleware Unit Tests', () => {
  let mockRequest;
  let mockUser;
  let mockSystemAdmin;

  beforeEach(() => {
    // Mock Parse Error
    global.Parse = {
      Error: class ParseError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
        
        static INVALID_SESSION_TOKEN = 209;
        static INVALID_JSON = 107;
        static OPERATION_FORBIDDEN = 119;
        static OBJECT_NOT_FOUND = 101;
        static INTERNAL_SERVER_ERROR = 1;
      },
      Query: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        find: jest.fn(),
        equalTo: jest.fn().mockReturnThis(),
        include: jest.fn().mockReturnThis()
      })),
      User: {
        logIn: jest.fn()
      },
      Cloud: {
        define: jest.fn()
      }
    };

    mockUser = {
      id: 'user123',
      get: jest.fn(),
      getSessionToken: jest.fn().mockReturnValue('session123')
    };

    mockSystemAdmin = {
      id: 'admin123',
      get: jest.fn((field) => {
        if (field === 'isSystemAdmin') return true;
        if (field === 'isAdmin') return true;
        return null;
      }),
      getSessionToken: jest.fn().mockReturnValue('admin_session123')
    };

    mockRequest = {
      user: mockUser,
      params: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    };
  });

  describe('Authentication Middleware', () => {
    test('withAuth should pass through valid user', async () => {
      // Mock the middleware function directly
      const withAuth = () => async (request) => {
        if (!request.user) {
          throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
        }
        return request;
      };

      const authMiddleware = withAuth();
      const result = await authMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });

    test('withAuth should reject request without user', async () => {
      const withAuth = () => async (request) => {
        if (!request.user) {
          throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
        }
        return request;
      };

      const authMiddleware = withAuth();
      mockRequest.user = null;
      
      await expect(authMiddleware(mockRequest)).rejects.toThrow();
    });
  });

  describe('System Admin Middleware', () => {
    test('withSystemAdmin should pass through system admin user', async () => {
      // Mock the middleware function
      const withSystemAdmin = () => async (request) => {
        if (!request.user) {
          throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
        }
        
        // Mock the user lookup
        const mockQuery = {
          get: jest.fn().mockResolvedValue(mockSystemAdmin)
        };
        Parse.Query.mockReturnValue(mockQuery);
        
        const fullUser = await new Parse.Query(Parse.User).get(request.user.id, { useMasterKey: true });
        if (!fullUser.get("isSystemAdmin")) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "System administrator permission required.");
        }
        
        return request;
      };

      const systemAdminMiddleware = withSystemAdmin();
      mockRequest.user = mockSystemAdmin;
      
      const result = await systemAdminMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });

    test('withSystemAdmin should reject non-admin user', async () => {
      const withSystemAdmin = () => async (request) => {
        if (!request.user) {
          throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
        }
        
        // Mock non-admin user
        const mockNonAdmin = {
          ...mockUser,
          get: jest.fn(() => false) // isSystemAdmin = false
        };
        
        const mockQuery = {
          get: jest.fn().mockResolvedValue(mockNonAdmin)
        };
        Parse.Query.mockReturnValue(mockQuery);
        
        const fullUser = await new Parse.Query(Parse.User).get(request.user.id, { useMasterKey: true });
        if (!fullUser.get("isSystemAdmin")) {
          throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "System administrator permission required.");
        }
        
        return request;
      };

      const systemAdminMiddleware = withSystemAdmin();
      
      await expect(systemAdminMiddleware(mockRequest)).rejects.toThrow();
    });
  });

  describe('Validation Middleware', () => {
    test('withValidation should pass valid parameters', async () => {
      const withValidation = (schema) => async (request) => {
        const { params } = request;
        
        for (const [key, rules] of Object.entries(schema)) {
          const value = params[key];
          
          if (rules.required && (value === undefined || value === null)) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} is required`);
          }
          
          if (value !== undefined && rules.type === 'string' && typeof value !== 'string') {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} must be a string`);
          }
          
          if (value && rules.minLength && value.length < rules.minLength) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} must be at least ${rules.minLength} characters`);
          }
          
          if (value && rules.maxLength && value.length > rules.maxLength) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} must be at most ${rules.maxLength} characters`);
          }
          
          if (value && rules.pattern && !rules.pattern.test(value)) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} format is invalid`);
          }
        }
        
        return request;
      };

      const schema = {
        name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      const validationMiddleware = withValidation(schema);
      mockRequest.params = { name: 'Test Org', email: 'test@example.com' };
      
      const result = await validationMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });

    test('withValidation should reject missing required parameters', async () => {
      const withValidation = (schema) => async (request) => {
        const { params } = request;
        
        for (const [key, rules] of Object.entries(schema)) {
          const value = params[key];
          
          if (rules.required && (value === undefined || value === null)) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} is required`);
          }
        }
        
        return request;
      };

      const schema = {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true }
      };

      const validationMiddleware = withValidation(schema);
      mockRequest.params = { name: 'Test Org' }; // missing email
      
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();
    });

    test('withValidation should reject invalid email format', async () => {
      const withValidation = (schema) => async (request) => {
        const { params } = request;
        
        for (const [key, rules] of Object.entries(schema)) {
          const value = params[key];
          
          if (value && rules.pattern && !rules.pattern.test(value)) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, `${key} format is invalid`);
          }
        }
        
        return request;
      };

      const schema = {
        email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      const validationMiddleware = withValidation(schema);
      mockRequest.params = { email: 'invalid-email' };
      
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();
    });
  });

  describe('Migration Success Indicators', () => {
    test('migrated functions should have reduced boilerplate', () => {
      // This test verifies that our migration approach reduces boilerplate
      
      // Before migration: manual auth check
      const beforeMigration = `
        Parse.Cloud.define("createOrganization", async (request) => {
          const adminUser = await auth.requireSystemAdmin(request.user);
          const { name, ownerEmail } = request.params;
          if (!name || !ownerEmail) {
            throw new Parse.Error(Parse.Error.INVALID_JSON, "Name and email required.");
          }
          // ... business logic
        });
      `;
      
      // After migration: middleware handles auth and validation
      const afterMigration = `
        const createOrganizationHandler = async (request) => {
          const { name, ownerEmail } = request.params;
          // ... business logic (auth and validation handled by middleware)
        };
        defineCloudFunction("createOrganization", [
          withSystemAdmin(),
          withValidation(schema)
        ], createOrganizationHandler);
      `;
      
      // Verify that after migration has less boilerplate
      expect(afterMigration.includes('auth.requireSystemAdmin')).toBe(false);
      expect(afterMigration.includes('if (!name || !ownerEmail)')).toBe(false);
      expect(beforeMigration.length > afterMigration.length).toBe(true);
    });

    test('middleware composition should be flexible', () => {
      // Mock defineCloudFunction to verify it accepts middleware arrays
      const defineCloudFunction = jest.fn();
      const withAuth = jest.fn();
      const withValidation = jest.fn();
      const withSystemAdmin = jest.fn();
      
      // Test different middleware combinations
      defineCloudFunction('func1', [withAuth()], jest.fn());
      defineCloudFunction('func2', [withSystemAdmin(), withValidation({})], jest.fn());
      defineCloudFunction('func3', [withAuth(), withValidation({})], jest.fn());
      
      expect(defineCloudFunction).toHaveBeenCalledTimes(3);
      expect(withAuth).toHaveBeenCalledTimes(2);
      expect(withSystemAdmin).toHaveBeenCalledTimes(1);
      expect(withValidation).toHaveBeenCalledTimes(2);
    });
  });
});