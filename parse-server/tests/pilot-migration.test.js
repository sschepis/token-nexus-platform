// Test file for pilot migration functions
const { defineCloudFunction, withAuth, withSystemAdmin, withValidation } = require('../index');

describe('Pilot Migration Functions', () => {
  let mockRequest;
  let mockUser;
  let mockSystemAdmin;

  beforeEach(() => {
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

    // Mock Parse.Query
    global.Parse = {
      Error: {
        INVALID_SESSION_TOKEN: 209,
        INVALID_JSON: 107,
        OPERATION_FORBIDDEN: 119,
        OBJECT_NOT_FOUND: 101,
        INTERNAL_SERVER_ERROR: 1
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
  });

  describe('createOrganization migration', () => {
    test('should validate required parameters', async () => {
      const schema = {
        name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        ownerEmail: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      const validationMiddleware = withValidation(schema);
      
      // Test missing name
      mockRequest.params = { ownerEmail: 'test@example.com' };
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test invalid email
      mockRequest.params = { name: 'Test Org', ownerEmail: 'invalid-email' };
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test valid parameters
      mockRequest.params = { name: 'Test Org', ownerEmail: 'test@example.com' };
      const result = await validationMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });

    test('should require system admin access', async () => {
      const systemAdminMiddleware = withSystemAdmin();
      
      // Mock Parse.Query for user lookup
      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockSystemAdmin)
      };
      Parse.Query.mockReturnValue(mockQuery);

      mockRequest.user = mockSystemAdmin;
      const result = await systemAdminMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
      expect(mockQuery.get).toHaveBeenCalledWith('admin123', { useMasterKey: true });
    });
  });

  describe('getUserOrganizations migration', () => {
    test('should require authentication', async () => {
      const authMiddleware = withAuth();
      
      // Test with valid user
      const result = await authMiddleware(mockRequest);
      expect(result).toBe(mockRequest);

      // Test with no user
      mockRequest.user = null;
      await expect(authMiddleware(mockRequest)).rejects.toThrow();
    });
  });

  describe('setCurrentOrganization migration', () => {
    test('should validate orgId parameter', async () => {
      const schema = {
        orgId: { type: 'string', required: true, minLength: 10, maxLength: 10 }
      };

      const validationMiddleware = withValidation(schema);
      
      // Test missing orgId
      mockRequest.params = {};
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test invalid orgId length
      mockRequest.params = { orgId: 'short' };
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test valid orgId
      mockRequest.params = { orgId: '1234567890' };
      const result = await validationMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });

    test('should require authentication and validation', async () => {
      const authMiddleware = withAuth();
      const validationMiddleware = withValidation({
        orgId: { type: 'string', required: true, minLength: 10, maxLength: 10 }
      });

      mockRequest.params = { orgId: '1234567890' };
      
      // Test auth middleware
      const authResult = await authMiddleware(mockRequest);
      expect(authResult).toBe(mockRequest);

      // Test validation middleware
      const validationResult = await validationMiddleware(mockRequest);
      expect(validationResult).toBe(mockRequest);
    });
  });

  describe('customUserLogin migration', () => {
    test('should validate login parameters', async () => {
      const schema = {
        username: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        password: { type: 'string', required: true, minLength: 1 }
      };

      const validationMiddleware = withValidation(schema);
      
      // Test missing username
      mockRequest.params = { password: 'password123' };
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test missing password
      mockRequest.params = { username: 'testuser' };
      await expect(validationMiddleware(mockRequest)).rejects.toThrow();

      // Test valid parameters
      mockRequest.params = { username: 'testuser', password: 'password123' };
      const result = await validationMiddleware(mockRequest);
      expect(result).toBe(mockRequest);
    });
  });

  describe('defineCloudFunction', () => {
    test('should register cloud function with middleware', () => {
      const mockHandler = jest.fn();
      const mockMiddleware = [withAuth()];

      defineCloudFunction('testFunction', mockMiddleware, mockHandler);

      expect(Parse.Cloud.define).toHaveBeenCalledWith(
        'testFunction',
        expect.any(Function)
      );
    });
  });
});