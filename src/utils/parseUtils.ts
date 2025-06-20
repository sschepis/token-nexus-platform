import Parse from 'parse';

/**
 * Check if Parse SDK is ready for use
 * This checks both the global flag and Parse properties
 */
export const isParseReady = (): boolean => {
  try {
    // First check the global flag set by appInitService
    if ((window as any).parseReady) {
      return true;
    }
    
    // Fallback: check if Parse is actually initialized
    if (Parse && Parse.applicationId && Parse.serverURL) {
      // Set the global flag if Parse is ready but flag wasn't set
      (window as any).parseReady = true;
      return true;
    }
    
    // Try to initialize Parse if it hasn't been initialized yet
    if (Parse && !Parse.applicationId) {
      const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID;
      const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY;
      const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL;
      
      if (appId && jsKey && serverURL) {
        try {
          Parse.initialize(appId, jsKey);
          Parse.serverURL = serverURL;
          (window as any).parseReady = true;
          console.log('[parseUtils] Parse SDK initialized successfully');
          return true;
        } catch (initError) {
          console.warn('[parseUtils] Failed to initialize Parse:', initError);
        }
      }
    }
    
    return false;
  } catch (error) {
    console.warn('[parseUtils] Parse readiness check failed:', error);
    return false;
  }
};

/**
 * Check if user session is ready
 * This checks if we have a current user session
 */
export const isSessionReady = (): boolean => {
  try {
    // First check if Parse is ready
    if (!isParseReady()) {
      return false;
    }
    
    // Check if Parse User is available and properly initialized
    if (!Parse.User || typeof Parse.User.current !== 'function') {
      return false;
    }
    
    return !!Parse.User.current();
  } catch (error) {
    console.warn('[parseUtils] Session readiness check failed:', error);
    return false;
  }
};

/**
 * System functions that only require Parse to be initialized
 * These don't require user authentication
 */
export const systemFunctions = [
  'getSystemStats',
  'getGlobalStats'
];

/**
 * User functions that require both Parse init and user session
 * These require user authentication
 */
export const userFunctions = [
  'getUserProfile',
  'updateUserProfile',
  'getUserOrganizations',
  'listOrganizationsForAdmin'
];

/**
 * Check if a cloud function requires user session
 */
export const requiresUserSession = (functionName: string): boolean => {
  return userFunctions.includes(functionName);
};

/**
 * Check if a cloud function only requires Parse to be ready
 */
export const requiresOnlyParseReady = (functionName: string): boolean => {
  return systemFunctions.includes(functionName);
};

/**
 * Safe wrapper for Parse cloud function calls
 * Handles Parse readiness and error handling
 */
export const safeParseCloudRun = async (
  functionName: string,
  params: any = {},
  options: { requiresSession?: boolean, timeout?: number } = {}
): Promise<any> => {
  const timeout = options.timeout || 5000; // 5 second default timeout
  const startTime = Date.now();

  // Wait for Parse to be ready
  while (!isParseReady()) {
    if (Date.now() - startTime > timeout) {
      console.warn(`[safeParseCloudRun] Parse SDK not ready after ${timeout}ms timeout for function: ${functionName}`);
      throw new Error(`Parse SDK not ready after timeout`);
    }
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check session requirement
  if (options.requiresSession && !isSessionReady()) {
    throw new Error('User session required');
  }

  try {
    return await Parse.Cloud.run(functionName, params);
  } catch (error) {
    console.error(`[safeParseCloudRun] Error calling ${functionName}:`, error);
    
    // If it's a connection error, provide more helpful error message
    if (error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED')
    )) {
      throw new Error(`Parse server connection failed. Please ensure Parse server is running at ${Parse.serverURL}`);
    }
    
    throw error;
  }
};

/**
 * Parse Query Builder utility class
 * Provides a fluent interface for building Parse queries
 */
export class ParseQueryBuilder {
  private query: Parse.Query;

  constructor(className: string) {
    this.query = new Parse.Query(className);
  }

  equalTo(key: string, value: any): ParseQueryBuilder {
    this.query.equalTo(key, value);
    return this;
  }

  notEqualTo(key: string, value: any): ParseQueryBuilder {
    this.query.notEqualTo(key, value);
    return this;
  }

  greaterThan(key: string, value: any): ParseQueryBuilder {
    this.query.greaterThan(key, value);
    return this;
  }

  lessThan(key: string, value: any): ParseQueryBuilder {
    this.query.lessThan(key, value);
    return this;
  }

  contains(key: string, value: string): ParseQueryBuilder {
    this.query.contains(key, value);
    return this;
  }

  limit(limit: number): ParseQueryBuilder {
    this.query.limit(limit);
    return this;
  }

  skip(skip: number): ParseQueryBuilder {
    this.query.skip(skip);
    return this;
  }

  ascending(key: string): ParseQueryBuilder {
    this.query.ascending(key);
    return this;
  }

  descending(key: string): ParseQueryBuilder {
    this.query.descending(key);
    return this;
  }

  include(key: string): ParseQueryBuilder {
    this.query.include(key);
    return this;
  }

  async find(): Promise<Parse.Object[]> {
    if (!isParseReady()) {
      throw new Error('Parse SDK not ready');
    }
    return await this.query.find();
  }

  async first(): Promise<Parse.Object | undefined> {
    if (!isParseReady()) {
      throw new Error('Parse SDK not ready');
    }
    return await this.query.first();
  }

  async count(): Promise<number> {
    if (!isParseReady()) {
      throw new Error('Parse SDK not ready');
    }
    return await this.query.count();
  }

  getQuery(): Parse.Query {
    return this.query;
  }
}