/**
 * Middleware Test Suite
 * Comprehensive tests for all middleware functions
 */

const { 
  withAuth, 
  withMasterKey, 
  withSystemAdmin,
  withValidation,
  withRateLimit,
  withErrorHandler,
  withOrganizationContext,
  compose,
  pipeline,
  when,
  stacks
} = require('../index');

// Mock Parse
global.Parse = {
  Error: {
    INVALID_SESSION_TOKEN: 209,
    OPERATION_FORBIDDEN: 119,
    INVALID_QUERY: 102,
    INTERNAL_SERVER_ERROR: 1,
    EXCEEDED_QUOTA: 140,
    TIMEOUT: 124,
    CONNECTION_FAILED: 100,
    DUPLICATE_VALUE: 137,
    OBJECT_NOT_FOUND: 101
  },
  Query: jest.fn(),
  Object: {
    extend: jest.fn(() => ({
      set: jest.fn(),
      save: jest.fn()
    }))
  },
  Cloud: {
    define: jest.fn()
  }
};

Parse.Error = class ParseError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};

describe('Authentication Middleware', () => {
  describe('withAuth', () => {
    it('should pass through authenticated requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withAuth(mockHandler);
      
      const request = {
        user: { id: 'user123' },
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
    
    it('should reject unauthenticated requests', async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);
      
      const request = {
        user: null,
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
  
  describe('withMasterKey', () => {
    it('should pass through master key requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withMasterKey(mockHandler);
      
      const request = {
        master: true,
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
    
    it('should reject non-master key requests', async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = withMasterKey(mockHandler);
      
      const request = {
        master: false,
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
  
  describe('withSystemAdmin', () => {
    it('should pass through system admin requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withSystemAdmin(mockHandler);
      
      const request = {
        user: { 
          id: 'admin123',
          get: jest.fn().mockReturnValue(true)
        },
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
    
    it('should reject non-admin requests', async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = withSystemAdmin(mockHandler);
      
      const request = {
        user: { 
          id: 'user123',
          get: jest.fn().mockReturnValue(false)
        },
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});

describe('Validation Middleware', () => {
  describe('withValidation', () => {
    it('should validate required fields', async () => {
      const schema = {
        email: { type: 'email', required: true },
        name: { type: 'string', required: true }
      };
      
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withValidation(schema)(mockHandler);
      
      const request = {
        params: {
          email: 'test@example.com',
          name: 'Test User'
        },
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalled();
    });
    
    it('should reject invalid email format', async () => {
      const schema = {
        email: { type: 'email', required: true }
      };
      
      const mockHandler = jest.fn();
      const wrappedHandler = withValidation(schema)(mockHandler);
      
      const request = {
        params: {
          email: 'invalid-email'
        },
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
    
    it('should reject missing required fields', async () => {
      const schema = {
        name: { type: 'string', required: true }
      };
      
      const mockHandler = jest.fn();
      const wrappedHandler = withValidation(schema)(mockHandler);
      
      const request = {
        params: {},
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
    
    it('should validate string length constraints', async () => {
      const schema = {
        name: { type: 'string', minLength: 2, maxLength: 50 }
      };
      
      const mockHandler = jest.fn();
      const wrappedHandler = withValidation(schema)(mockHandler);
      
      const request = {
        params: {
          name: 'A' // Too short
        },
        functionName: 'testFunction'
      };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
      expect(mockHandler).not.toHaveBeenCalled();
    });
    
    it('should validate number ranges', async () => {
      const schema = {
        age: { type: 'number', min: 0, max: 120 }
      };
      
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withValidation(schema)(mockHandler);
      
      const request = {
        params: {
          age: 25
        },
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      expect(result).toBe('success');
    });
  });
  
  describe('withRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withRateLimit({ maxRequests: 5, windowMs: 60000 })(mockHandler);
      
      const request = {
        user: { id: 'user123' },
        functionName: 'testFunction'
      };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
    
    it('should reject requests exceeding rate limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withRateLimit({ maxRequests: 1, windowMs: 60000 })(mockHandler);
      
      const request = {
        user: { id: 'user123' },
        functionName: 'testFunction'
      };
      
      // First request should succeed
      await wrappedHandler(request);
      
      // Second request should fail
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
    });
  });
});

describe('Error Handling Middleware', () => {
  describe('withErrorHandler', () => {
    it('should pass through successful requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withErrorHandler(mockHandler);
      
      const request = { functionName: 'testFunction' };
      
      const result = await wrappedHandler(request);
      
      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith(request);
    });
    
    it('should handle Parse.Error correctly', async () => {
      const parseError = new Parse.Error(Parse.Error.INVALID_QUERY, 'Test error');
      const mockHandler = jest.fn().mockRejectedValue(parseError);
      const wrappedHandler = withErrorHandler(mockHandler);
      
      const request = { functionName: 'testFunction' };
      
      await expect(wrappedHandler(request)).rejects.toThrow(parseError);
    });
    
    it('should convert generic errors to Parse.Error', async () => {
      const genericError = new Error('Generic error');
      const mockHandler = jest.fn().mockRejectedValue(genericError);
      const wrappedHandler = withErrorHandler(mockHandler);
      
      const request = { functionName: 'testFunction' };
      
      await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
    });
  });
});

describe('Middleware Composition', () => {
  describe('compose', () => {
    it('should compose middleware in correct order', async () => {
      const order = [];
      
      const middleware1 = (handler) => async (request) => {
        order.push('middleware1-start');
        const result = await handler(request);
        order.push('middleware1-end');
        return result;
      };
      
      const middleware2 = (handler) => async (request) => {
        order.push('middleware2-start');
        const result = await handler(request);
        order.push('middleware2-end');
        return result;
      };
      
      const mockHandler = jest.fn().mockImplementation(async (request) => {
        order.push('handler');
        return 'success';
      });
      
      const composedHandler = compose(middleware1, middleware2)(mockHandler);
      
      const result = await composedHandler({ functionName: 'test' });
      
      expect(result).toBe('success');
      expect(order).toEqual([
        'middleware1-start',
        'middleware2-start',
        'handler',
        'middleware2-end',
        'middleware1-end'
      ]);
    });
  });
  
  describe('pipeline', () => {
    it('should apply middleware in forward order', async () => {
      const order = [];
      
      const middleware1 = (handler) => async (request) => {
        order.push('middleware1');
        return await handler(request);
      };
      
      const middleware2 = (handler) => async (request) => {
        order.push('middleware2');
        return await handler(request);
      };
      
      const mockHandler = jest.fn().mockImplementation(async (request) => {
        order.push('handler');
        return 'success';
      });
      
      const pipelineHandler = pipeline(middleware1, middleware2)(mockHandler);
      
      const result = await pipelineHandler({ functionName: 'test' });
      
      expect(result).toBe('success');
      expect(order).toEqual(['middleware1', 'middleware2', 'handler']);
    });
  });
  
  describe('when', () => {
    it('should apply middleware when condition is true', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const mockMiddleware = jest.fn().mockImplementation((handler) => handler);
      
      const conditionalHandler = when(true, mockMiddleware)(mockHandler);
      
      const result = await conditionalHandler({ functionName: 'test' });
      
      expect(result).toBe('success');
      expect(mockMiddleware).toHaveBeenCalled();
    });
    
    it('should skip middleware when condition is false', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const mockMiddleware = jest.fn().mockImplementation((handler) => handler);
      
      const conditionalHandler = when(false, mockMiddleware)(mockHandler);
      
      const result = await conditionalHandler({ functionName: 'test' });
      
      expect(result).toBe('success');
      expect(mockMiddleware).not.toHaveBeenCalled();
    });
    
    it('should evaluate function conditions', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const mockMiddleware = jest.fn().mockImplementation((handler) => handler);
      
      const condition = jest.fn().mockReturnValue(true);
      const conditionalHandler = when(condition, mockMiddleware)(mockHandler);
      
      const request = { functionName: 'test' };
      const result = await conditionalHandler(request);
      
      expect(result).toBe('success');
      expect(condition).toHaveBeenCalledWith(request);
      expect(mockMiddleware).toHaveBeenCalled();
    });
  });
});

describe('Pre-configured Stacks', () => {
  it('should have standard stack', () => {
    expect(stacks.standard).toBeDefined();
    expect(typeof stacks.standard).toBe('function');
  });
  
  it('should have systemAdmin stack', () => {
    expect(stacks.systemAdmin).toBeDefined();
    expect(typeof stacks.systemAdmin).toBe('function');
  });
  
  it('should have public stack', () => {
    expect(stacks.public).toBeDefined();
    expect(typeof stacks.public).toBe('function');
  });
  
  it('should have validated stack factory', () => {
    expect(stacks.validated).toBeDefined();
    expect(typeof stacks.validated).toBe('function');
    
    const schema = { name: { type: 'string', required: true } };
    const validatedStack = stacks.validated(schema);
    expect(typeof validatedStack).toBe('function');
  });
});

describe('Integration Tests', () => {
  it('should work with complete middleware stack', async () => {
    const mockHandler = jest.fn().mockResolvedValue({ success: true });
    
    // Create a complete middleware stack
    const stack = compose(
      withErrorHandler,
      withAuth,
      withValidation({
        name: { type: 'string', required: true }
      })
    );
    
    const wrappedHandler = stack(mockHandler);
    
    const request = {
      user: { id: 'user123' },
      params: { name: 'Test User' },
      functionName: 'testFunction'
    };
    
    const result = await wrappedHandler(request);
    
    expect(result).toEqual({ success: true });
    expect(mockHandler).toHaveBeenCalled();
  });
  
  it('should handle errors in middleware stack', async () => {
    const mockHandler = jest.fn().mockResolvedValue({ success: true });
    
    const stack = compose(
      withErrorHandler,
      withAuth,
      withValidation({
        email: { type: 'email', required: true }
      })
    );
    
    const wrappedHandler = stack(mockHandler);
    
    const request = {
      user: { id: 'user123' },
      params: { email: 'invalid-email' }, // Invalid email
      functionName: 'testFunction'
    };
    
    await expect(wrappedHandler(request)).rejects.toThrow(Parse.Error);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});