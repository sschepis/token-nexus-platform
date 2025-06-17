import Parse from 'parse';

/**
 * Utility function to safely call Parse cloud functions with initialization checks
 * @param functionName - Name of the cloud function to call
 * @param params - Parameters to pass to the cloud function
 * @param retries - Number of retries if Parse isn't ready (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 100)
 * @returns Promise with the cloud function result
 */
export async function safeParseCloudRun<T = any>(
  functionName: string,
  params: Record<string, any> = {},
  retries: number = 3,
  retryDelay: number = 100
): Promise<T> {
  const checkParseReady = (): boolean => {
    return !!(Parse.applicationId && Parse.Installation.currentInstallation);
  };

  const attemptCloudRun = async (attempt: number): Promise<T> => {
    if (!checkParseReady()) {
      if (attempt < retries) {
        console.warn(`[safeParseCloudRun] Parse not ready for ${functionName}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptCloudRun(attempt + 1);
      } else {
        throw new Error(`Parse SDK not ready after ${retries} attempts. Cannot call cloud function: ${functionName}`);
      }
    }

    try {
      return await Parse.Cloud.run(functionName, params);
    } catch (error) {
      // If it's a Parse initialization error, retry
      if (error instanceof Error && error.message.includes('currentInstallationId')) {
        if (attempt < retries) {
          console.warn(`[safeParseCloudRun] Parse installation error for ${functionName}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptCloudRun(attempt + 1);
        }
      }
      throw error;
    }
  };

  return attemptCloudRun(0);
}

/**
 * Check if Parse SDK is properly initialized
 * @returns boolean indicating if Parse is ready for cloud function calls
 */
export function isParseReady(): boolean {
  return !!(Parse.applicationId && Parse.Installation.currentInstallation);
}

/**
 * Wait for Parse SDK to be ready
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @param checkInterval - How often to check in ms (default: 100)
 * @returns Promise that resolves when Parse is ready or rejects on timeout
 */
export function waitForParseReady(timeout: number = 5000, checkInterval: number = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (isParseReady()) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Parse SDK not ready after ${timeout}ms timeout`));
        return;
      }
      
      setTimeout(check, checkInterval);
    };
    
    check();
  });
}

/**
 * Create a new Parse object with the given data
 * @param className - Parse class name
 * @param data - Object data to set
 * @returns Promise with the saved Parse object
 */
export async function createParseObject(className: string, data: Record<string, any>): Promise<Parse.Object> {
  const ParseClass = Parse.Object.extend(className);
  const object = new ParseClass();
  
  // Set all the data fields
  Object.keys(data).forEach(key => {
    object.set(key, data[key]);
  });
  
  return await object.save();
}

/**
 * Update an existing Parse object with the given data
 * @param className - Parse class name
 * @param objectId - Object ID to update
 * @param data - Object data to update
 * @param additionalFilters - Additional query filters for security
 * @returns Promise with the updated Parse object
 */
export async function updateParseObject(
  className: string,
  objectId: string,
  data: Record<string, any>,
  additionalFilters?: Record<string, any>
): Promise<Parse.Object | null> {
  let queryBuilder = new ParseQueryBuilder(className)
    .equalTo('objectId', objectId);
  
  // Add additional filters for security (e.g., organizationId)
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      queryBuilder = queryBuilder.equalTo(key, value);
    });
  }
  
  const object = await queryBuilder.first();
  if (!object) {
    return null;
  }
  
  // Update all the data fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      object.set(key, value);
    }
  });
  
  return await object.save();
}

/**
 * Delete a Parse object with security filters
 * @param className - Parse class name
 * @param objectId - Object ID to delete
 * @param additionalFilters - Additional query filters for security
 * @returns Promise with boolean indicating success
 */
export async function deleteParseObject(
  className: string,
  objectId: string,
  additionalFilters?: Record<string, any>
): Promise<boolean> {
  let queryBuilder = new ParseQueryBuilder(className)
    .equalTo('objectId', objectId);
  
  // Add additional filters for security (e.g., organizationId)
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      queryBuilder = queryBuilder.equalTo(key, value);
    });
  }
  
  const object = await queryBuilder.first();
  if (!object) {
    return false;
  }
  
  await object.destroy();
  return true;
}

/**
 * Upsert a Parse object (update if exists, create if not)
 * @param className - Parse class name
 * @param searchFilters - Filters to find existing object
 * @param createData - Data to set when creating new object
 * @param updateData - Data to set when updating existing object
 * @returns Promise with the saved Parse object
 */
export async function upsertParseObject(
  className: string,
  searchFilters: Record<string, any>,
  createData: Record<string, any>,
  updateData: Record<string, any>
): Promise<Parse.Object> {
  // Try to find existing object
  let queryBuilder = new ParseQueryBuilder(className);
  
  Object.entries(searchFilters).forEach(([key, value]) => {
    queryBuilder = queryBuilder.equalTo(key, value);
  });
  
  let object = await queryBuilder.first();
  
  if (!object) {
    // Create new object
    object = await createParseObject(className, { ...searchFilters, ...createData });
  } else {
    // Update existing object
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        object!.set(key, value);
      }
    });
    object = await object.save();
  }
  
  return object;
}

/**
 * Parse Query Builder for common query patterns
 */
export class ParseQueryBuilder {
  private query: any;

  constructor(className: string) {
    this.query = new Parse.Query(className);
  }

  /**
   * Add organization filter
   */
  forOrganization(orgId: string): this {
    this.query.equalTo('organizationId', orgId);
    return this;
  }

  /**
   * Add recipient filter
   */
  forRecipient(recipientId: string): this {
    this.query.equalTo('recipientId', recipientId);
    return this;
  }

  /**
   * Add created by filter
   */
  createdBy(userId: string): this {
    this.query.equalTo('createdBy', userId);
    return this;
  }

  /**
   * Add status filter
   */
  withStatus(status: string): this {
    this.query.equalTo('status', status);
    return this;
  }

  /**
   * Add multiple status filter
   */
  withStatuses(statuses: string[]): this {
    this.query.containedIn('status', statuses);
    return this;
  }

  /**
   * Add type filter
   */
  withType(type: string): this {
    this.query.equalTo('type', type);
    return this;
  }

  /**
   * Add ID filter
   */
  withIds(ids: string[]): this {
    this.query.containedIn('objectId', ids);
    return this;
  }

  /**
   * Add general equalTo filter
   */
  equalTo(field: string, value: any): this {
    this.query.equalTo(field, value);
    return this;
  }

  /**
   * Add contains filter for substring matching
   */
  contains(field: string, value: string): this {
    this.query.contains(field, value);
    return this;
  }

  /**
   * Select specific fields to return
   */
  select(...fields: string[]): this {
    this.query.select(...fields);
    return this;
  }

  /**
   * Add greaterThan filter
   */
  greaterThan(field: string, value: any): this {
    this.query.greaterThan(field, value);
    return this;
  }

  /**
   * Add lessThan filter
   */
  lessThan(field: string, value: any): this {
    this.query.lessThan(field, value);
    return this;
  }

  /**
   * Add notEqualTo filter
   */
  notEqualTo(field: string, value: any): this {
    this.query.notEqualTo(field, value);
    return this;
  }

  /**
   * Add containedIn filter
   */
  containedIn(field: string, values: any[]): this {
    this.query.containedIn(field, values);
    return this;
  }

  /**
   * Create OR query with multiple ParseQueryBuilders
   */
  static or(...queries: ParseQueryBuilder[]): ParseQueryBuilder {
    const parseQueries = queries.map(q => q.getQuery());
    const orQuery = (Parse.Query as any).or(...parseQueries);
    
    // Create a new ParseQueryBuilder with the OR query
    const result = Object.create(ParseQueryBuilder.prototype);
    result.query = orQuery;
    return result;
  }

  /**
   * Add limit
   */
  limit(limit: number): this {
    this.query.limit(limit);
    return this;
  }

  /**
   * Add skip
   */
  skip(skip: number): this {
    this.query.skip(skip);
    return this;
  }

  /**
   * Add descending sort
   */
  descending(field: string): this {
    this.query.descending(field);
    return this;
  }

  /**
   * Add ascending sort
   */
  ascending(field: string): this {
    this.query.ascending(field);
    return this;
  }

  /**
   * Get the built query
   */
  getQuery(): Parse.Query<Parse.Object> {
    return this.query;
  }

  /**
   * Execute find
   */
  async find(): Promise<Parse.Object[]> {
    return this.query.find();
  }

  /**
   * Execute count
   */
  async count(): Promise<number> {
    return this.query.count();
  }

  /**
   * Execute first
   */
  async first(): Promise<Parse.Object | undefined> {
    return this.query.first();
  }
}

/**
 * Factory function to create a query builder
 */
export function createQuery(className: string): ParseQueryBuilder {
  return new ParseQueryBuilder(className);
}

/**
 * Common query patterns used throughout the application
 */
export class CommonQueries {
  /**
   * Create a query for user-specific and organization-specific data
   */
  static createUserOrgQuery(className: string, userId: string, orgId: string): any {
    const userQuery = new Parse.Query(className);
    userQuery.equalTo('recipientId', userId);

    const orgQuery = new Parse.Query(className);
    orgQuery.equalTo('organizationId', orgId);

    return Parse.Query.or(userQuery, orgQuery);
  }

  /**
   * Create a query for user-created items
   */
  static createUserCreatedQuery(className: string, userId: string): any{
    const query = new Parse.Query(className);
    query.equalTo('createdBy', userId);
    return query;
  }

  /**
   * Create a query for organization items
   */
  static createOrgQuery(className: string, orgId: string): any {
    const query = new Parse.Query(className);
    query.equalTo('organizationId', orgId);
    return query;
  }

  /**
   * Create a query for active items (not archived/deleted)
   */
  static createActiveQuery(className: string): any {
    const query = new Parse.Query(className);
    query.notContainedIn('status', ['archived', 'deleted']);
    return query;
  }

  /**
   * Create a paginated query
   */
  static createPaginatedQuery(className: string, page: number = 1, limit: number = 50): any {
    const query = new Parse.Query(className);
    query.limit(limit);
    query.skip((page - 1) * limit);
    query.descending('createdAt');
    return query;
  }
}

/**
 * Batch utilities for Parse operations
 */
export class ParseBatchUtils {
  /**
   * Batch save objects
   */
  static async batchSave(objects: Parse.Object[]): Promise<{
    saved: Parse.Object[];
    errors: Array<{ object: Parse.Object; error: Error }>;
  }> {
    const saved: Parse.Object[] = [];
    const errors: Array<{ object: Parse.Object; error: Error }> = [];

    try {
      const results = await Parse.Object.saveAll(objects as any);
      saved.push(...(results as Parse.Object[]));
    } catch (error: any) {
      // Handle individual errors if batch fails
      for (const obj of objects) {
        try {
          const result = await obj.save();
          saved.push(result);
        } catch (saveError: any) {
          errors.push({ object: obj, error: saveError });
        }
      }
    }

    return { saved, errors };
  }

  /**
   * Batch update objects with new data
   */
  static async batchUpdate(objects: Parse.Object[], updates: Record<string, any>): Promise<{
    updated: Parse.Object[];
    errors: Array<{ object: Parse.Object; error: Error }>;
  }> {
    // Apply updates to all objects
    objects.forEach(obj => {
      Object.keys(updates).forEach(key => {
        obj.set(key, updates[key]);
      });
    });

    const result = await this.batchSave(objects);
    return {
      updated: result.saved,
      errors: result.errors
    };
  }

  /**
   * Batch destroy objects
   */
  static async batchDestroy(objects: Parse.Object[]): Promise<{
    destroyed: Parse.Object[];
    errors: Array<{ object: Parse.Object; error: Error }>;
  }> {
    const destroyed: Parse.Object[] = [];
    const errors: Array<{ object: Parse.Object; error: Error }> = [];

    try {
      await Parse.Object.destroyAll(objects as any);
      destroyed.push(...objects);
    } catch (error: any) {
      // Handle individual errors if batch fails
      for (const obj of objects) {
        try {
          await obj.destroy();
          destroyed.push(obj);
        } catch (destroyError: any) {
          errors.push({ object: obj, error: destroyError });
        }
      }
    }

    return { destroyed, errors };
  }
}