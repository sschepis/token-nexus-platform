import Parse from 'parse';

/**
 * Generic Parse query builder with common patterns
 */
export class ParseQueryBuilder {
  private query: any;

  constructor(className: string) {
    this.query = new (Parse.Query as any)(className);
  }

  /**
   * Add organization filter - most common pattern in the codebase
   */
  forOrganization(orgId: string): this {
    this.query.equalTo('organizationId', orgId);
    return this;
  }

  /**
   * Add user filter
   */
  forUser(userId: string): this {
    this.query.equalTo('userId', userId);
    return this;
  }

  /**
   * Add recipient filter (for notifications)
   */
  forRecipient(userId: string): this {
    this.query.equalTo('recipientId', userId);
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
   * Add date range filter
   */
  dateRange(field: string, startDate?: Date, endDate?: Date): this {
    if (startDate) {
      this.query.greaterThanOrEqualTo(field, startDate);
    }
    if (endDate) {
      this.query.lessThanOrEqualTo(field, endDate);
    }
    return this;
  }

  /**
   * Add search filter (case-insensitive contains)
   */
  search(field: string, searchTerm: string): this {
    this.query.matches(field, new RegExp(searchTerm, 'i'));
    return this;
  }

  /**
   * Add pagination
   */
  paginate(limit: number, skip: number = 0): this {
    this.query.limit(limit);
    if (skip > 0) {
      this.query.skip(skip);
    }
    return this;
  }

  /**
   * Add sorting
   */
  sortBy(field: string, ascending: boolean = true): this {
    if (ascending) {
      this.query.ascending(field);
    } else {
      this.query.descending(field);
    }
    return this;
  }

  /**
   * Add multiple object IDs filter
   */
  withIds(ids: string[]): this {
    this.query.containedIn('objectId', ids);
    return this;
  }

  /**
   * Add single object ID filter
   */
  withId(id: string): this {
    this.query.equalTo('objectId', id);
    return this;
  }

  /**
   * Include related objects
   */
  include(fields: string[]): this {
    fields.forEach(field => this.query.include(field));
    return this;
  }

  /**
   * Select specific fields
   */
  select(fields: string[]): this {
    this.query.select(fields);
    return this;
  }

  /**
   * Get the underlying Parse.Query
   */
  getQuery(): Parse.Query {
    return this.query;
  }

  /**
   * Execute find with error handling
   */
  async find(): Promise<Parse.Object[]> {
    try {
      return await this.query.find();
    } catch (error) {
      console.error('Parse query find error:', error);
      return [];
    }
  }

  /**
   * Execute first with error handling
   */
  async first(): Promise<Parse.Object | undefined> {
    try {
      const result = await this.query.first();
      return result || undefined;
    } catch (error) {
      console.error('Parse query first error:', error);
      return undefined;
    }
  }

  /**
   * Execute count with error handling
   */
  async count(): Promise<number> {
    try {
      return await this.query.count();
    } catch (error) {
      console.error('Parse query count error:', error);
      return 0;
    }
  }

  /**
   * Execute get with error handling
   */
  async get(id: string): Promise<Parse.Object | undefined> {
    try {
      return await this.query.get(id);
    } catch (error) {
      console.error('Parse query get error:', error);
      return undefined;
    }
  }
}

/**
 * Factory function for creating query builders
 */
export function createQuery(className: string): ParseQueryBuilder {
  return new ParseQueryBuilder(className);
}

/**
 * Common query patterns used throughout the application
 */
export class CommonQueries {
  /**
   * Create user/org combined query for notifications (very common pattern)
   */
  static createUserOrgQuery(className: string, userId: string, orgId: string): Parse.Query {
    const userQuery = new Parse.Query(className);
    userQuery.equalTo('recipientId', userId);

    const orgQuery = new Parse.Query(className);
    orgQuery.equalTo('organizationId', orgId);

    return (Parse.Query as any).or(userQuery, orgQuery);
  }

  /**
   * Create user/created-by combined query (for deletions)
   */
  static createUserCreatedQuery(className: string, userId: string): Parse.Query {
    const userQuery = new Parse.Query(className);
    userQuery.equalTo('recipientId', userId);

    const createdQuery = new Parse.Query(className);
    createdQuery.equalTo('createdBy', userId);

    return (Parse.Query as any).or(userQuery, createdQuery);
  }

  /**
   * Create organization-scoped query with common filters
   */
  static createOrgScopedQuery(
    className: string,
    orgId: string,
    options: {
      status?: string;
      type?: string;
      limit?: number;
      sortField?: string;
      sortAscending?: boolean;
    } = {}
  ): ParseQueryBuilder {
    const builder = createQuery(className).forOrganization(orgId);

    if (options.status) {
      builder.withStatus(options.status);
    }
    if (options.type) {
      builder.withType(options.type);
    }
    if (options.limit) {
      builder.paginate(options.limit);
    }
    if (options.sortField) {
      builder.sortBy(options.sortField, options.sortAscending !== false);
    }

    return builder;
  }
}

/**
 * Utility for batch operations on Parse objects
 */
export class ParseBatchUtils {
  /**
   * Batch save objects with error handling
   */
  static async batchSave(objects: any[]): Promise<{
    saved: any[];
    errors: Array<{ object: any; error: Error }>;
  }> {
    const saved: any[] = [];
    const errors: Array<{ object: any; error: Error }> = [];

    try {
      const results = await (Parse.Object as any).saveAll(objects);
      saved.push(...results);
    } catch (error: any) {
      // If batch save fails, try individual saves
      for (const obj of objects) {
        try {
          const result = await obj.save();
          saved.push(result);
        } catch (individualError: any) {
          errors.push({ object: obj, error: individualError });
        }
      }
    }

    return { saved, errors };
  }

  /**
   * Batch destroy objects with error handling
   */
  static async batchDestroy(objects: any[]): Promise<{
    destroyed: any[];
    errors: Array<{ object: any; error: Error }>;
  }> {
    const destroyed: any[] = [];
    const errors: Array<{ object: any; error: Error }> = [];

    try {
      await (Parse.Object as any).destroyAll(objects);
      destroyed.push(...objects);
    } catch (error: any) {
      // If batch destroy fails, try individual destroys
      for (const obj of objects) {
        try {
          await obj.destroy();
          destroyed.push(obj);
        } catch (individualError: any) {
          errors.push({ object: obj, error: individualError });
        }
      }
    }

    return { destroyed, errors };
  }

  /**
   * Batch update objects with the same field values
   */
  static async batchUpdate(
    objects: any[],
    updates: Record<string, any>
  ): Promise<{
    updated: any[];
    errors: Array<{ object: any; error: Error }>;
  }> {
    // Apply updates to all objects
    objects.forEach(obj => {
      Object.entries(updates).forEach(([key, value]) => {
        obj.set(key, value);
      });
    });

    const result = await this.batchSave(objects);
    return {
      updated: result.saved,
      errors: result.errors
    };
  }
}