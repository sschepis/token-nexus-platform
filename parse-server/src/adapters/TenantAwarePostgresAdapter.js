/**
 * Tenant-Aware PostgreSQL Storage Adapter for Parse Server
 * Integrates Parse Server with the existing schema-separated multi-tenant system
 */

const { PostgresStorageAdapter } = require('@parse/postgres-storage-adapter');
const logger = require('../utils/logger');

class TenantAwarePostgresAdapter extends PostgresStorageAdapter {
  constructor(options) {
    super(options);
    this.dbManager = options.dbManager;
    this.tenantContext = options.tenantContext;
    this.defaultTenantId = options.defaultTenantId || 'default';
    
    logger.info('TenantAwarePostgresAdapter initialized');
  }

  /**
   * Get the current tenant ID from global context
   */
  getCurrentTenantId() {
    // Extract tenant ID from global context set by middleware
    const tenantId = global.currentTenantId || this.defaultTenantId;
    logger.debug(`[Parse Adapter] Current tenant ID: ${tenantId}`);
    return tenantId;
  }

  /**
   * Get tenant-specific database connection
   */
  async getTenantConnection() {
    const tenantId = this.getCurrentTenantId();
    
    if (this.dbManager && tenantId !== this.defaultTenantId) {
      try {
        const tenantPool = await this.dbManager.getTenantPool(tenantId);
        const client = await tenantPool.connect();
        
        // Set search path to tenant schema
        await client.query(`SET search_path TO org_${tenantId}, public`);
        logger.debug(`[Parse Adapter] Set search_path to org_${tenantId}`);
        
        return client;
      } catch (error) {
        logger.error(`[Parse Adapter] Failed to get tenant connection for ${tenantId}:`, error);
        throw error;
      }
    }
    
    // Fallback to default connection
    return super.connect();
  }

  /**
   * Override connect to use tenant-specific connection
   */
  async connect() {
    return this.getTenantConnection();
  }

  /**
   * Ensure tenant context is set for all operations
   */
  async ensureTenantContext(client) {
    const tenantId = this.getCurrentTenantId();
    
    if (tenantId && tenantId !== this.defaultTenantId && client) {
      try {
        await client.query(`SET search_path TO org_${tenantId}, public`);
        logger.debug(`[Parse Adapter] Ensured tenant context: org_${tenantId}`);
      } catch (error) {
        logger.error(`[Parse Adapter] Failed to set tenant context:`, error);
        throw error;
      }
    }
  }

  /**
   * Override _ensureSchemaCollectionExists to work with tenant schemas
   */
  async _ensureSchemaCollectionExists(conn) {
    await this.ensureTenantContext(conn);
    return super._ensureSchemaCollectionExists(conn);
  }

  /**
   * Override find to ensure tenant context
   */
  async find(className, schema, query, options) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Find operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      // Use the tenant-aware client for the operation
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.find(className, schema, query, options);
      
      // Restore original connect method
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override create to ensure tenant context
   */
  async create(className, schema, object, options) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Create operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.create(className, schema, object, options);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override update to ensure tenant context
   */
  async update(className, schema, query, update, options) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Update operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.update(className, schema, query, update, options);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override destroy to ensure tenant context
   */
  async destroy(className, schema, query, options) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Destroy operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.destroy(className, schema, query, options);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override count to ensure tenant context
   */
  async count(className, schema, query, readPreference, estimate) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Count operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.count(className, schema, query, readPreference, estimate);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override distinct to ensure tenant context
   */
  async distinct(className, schema, query, fieldName) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Distinct operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.distinct(className, schema, query, fieldName);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override aggregate to ensure tenant context
   */
  async aggregate(className, schema, pipeline, readPreference, hint, explain) {
    const tenantId = this.getCurrentTenantId();
    logger.debug(`[Parse Adapter] Aggregate operation for ${className} in tenant ${tenantId}`);
    
    const client = await this.getTenantConnection();
    try {
      await this.ensureTenantContext(client);
      
      const originalConnect = this.connect;
      this.connect = () => Promise.resolve(client);
      
      const result = await super.aggregate(className, schema, pipeline, readPreference, hint, explain);
      
      this.connect = originalConnect;
      
      return result;
    } finally {
      if (client && client.release) {
        client.release();
      }
    }
  }

  /**
   * Override performInitialization to ensure tenant schemas exist
   */
  async performInitialization(options) {
    logger.info('[Parse Adapter] Performing initialization with tenant awareness');
    
    // First, perform standard initialization
    await super.performInitialization(options);
    
    // Then ensure tenant schemas are properly set up
    if (this.dbManager) {
      try {
        // This will be called during Parse Server startup
        // The tenant schemas should already exist from the DatabaseManager
        logger.info('[Parse Adapter] Tenant schemas initialization completed');
      } catch (error) {
        logger.error('[Parse Adapter] Failed to initialize tenant schemas:', error);
        throw error;
      }
    }
  }

  /**
   * Get adapter info with tenant context
   */
  async getAdapterInfo() {
    const baseInfo = await super.getAdapterInfo();
    const tenantId = this.getCurrentTenantId();
    
    return {
      ...baseInfo,
      tenantAware: true,
      currentTenant: tenantId,
      adapterType: 'TenantAwarePostgresAdapter'
    };
  }
}

module.exports = TenantAwarePostgresAdapter;