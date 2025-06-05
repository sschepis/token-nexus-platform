/**
 * Database Configuration
 * Handles multi-tenant database isolation and connection pooling
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.pools = new Map();

    // Configure default pool with pgBouncer settings
    this.defaultPool = this.createPool({
      ...config.database,
      // PgBouncer configuration
      application_name: 'gemcms_default',
      pool_mode: 'transaction',
      min: 5,
      max: 20,
      idle_timeout: 10000,
      connect_timeout: 3000,
      max_client_conn: 1000,
      default_pool_size: 100,
      max_db_connections: 300,
      max_user_connections: 100,
    });

    // Initialize resource tracking tables
    this.initializeResourceTables();
  }

  /**
   * Initialize system-wide resource tracking tables
   */
  async initializeResourceTables() {
    const client = await this.defaultPool.connect();
    try {
      await client.query('BEGIN');

      // Create request logs table for tracking API usage
      await client.query(`
        CREATE TABLE IF NOT EXISTS request_logs (
          id SERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          duration INTEGER NOT NULL,
          status_code INTEGER NOT NULL,
          content_length INTEGER,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create resource quotas table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_quotas (
          tenant_id TEXT PRIMARY KEY,
          max_storage_gb INTEGER NOT NULL DEFAULT 100,
          max_requests_per_minute INTEGER NOT NULL DEFAULT 1000,
          max_concurrent_connections INTEGER NOT NULL DEFAULT 100,
          max_query_timeout INTEGER NOT NULL DEFAULT 30000,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create resource usage table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_resource_usage (
          tenant_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          usage_value NUMERIC NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tenant_id, resource_type, timestamp)
        )
      `);

      // Create index for request logs querying
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_request_logs_tenant_timestamp 
        ON request_logs (tenant_id, timestamp)
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize resource tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a connection pool for a specific tenant
   */
  createPool(dbConfig) {
    const poolConfig = {
      user: dbConfig.user,
      host: dbConfig.host,
      database: dbConfig.database,
      password: dbConfig.password,
      port: dbConfig.port,
      application_name: dbConfig.application_name,

      // PgBouncer configuration
      min: dbConfig.min || 1,
      max: dbConfig.max || 10,
      idleTimeoutMillis: dbConfig.idle_timeout || 30000,
      connectionTimeoutMillis: dbConfig.connect_timeout || 2000,
      statement_timeout: dbConfig.max_query_timeout || 30000,

      // Connection handling
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // Error handling
      allowExitOnIdle: false,
      retry_on_failure: true,
      max_retries: 3,
      retry_delay: 100,
    };

    return new Pool(poolConfig);
  }

  /**
   * Get or create a connection pool for a tenant
   */
  async getTenantPool(tenantId) {
    if (!this.pools.has(tenantId)) {
      const schema = `org_${tenantId}`;
      const pool = this.createPool({
        ...this.config.database,
        application_name: `tenant_${tenantId}`,
      });

      // Initialize schema for tenant if it doesn't exist
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
          await client.query(`SET search_path TO ${schema},public`);

          // Initialize tenant-specific tables
          await this.initializeTenantSchema(client, schema);

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        this.pools.set(tenantId, pool);
      } catch (error) {
        logger.error(`Failed to initialize tenant schema: ${tenantId}`, error);
        throw error;
      }
    }

    return this.pools.get(tenantId);
  }

  /**
   * Initialize schema for a new tenant
   */
  async initializeTenantSchema(client, schema) {
    const tables = [
      // Content tables
      `CREATE TABLE IF NOT EXISTS ${schema}.pages (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        content JSONB NOT NULL,
        status TEXT DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Media tables
      `CREATE TABLE IF NOT EXISTS ${schema}.media (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        size INTEGER NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Template tables
      `CREATE TABLE IF NOT EXISTS ${schema}.templates (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        content JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Workflow tables
      `CREATE TABLE IF NOT EXISTS ${schema}.workflows (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        steps JSONB NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const createTable of tables) {
      await client.query(createTable);
    }

    // Create indexes for better query performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_pages_status ON ${schema}.pages (status)`,
      `CREATE INDEX IF NOT EXISTS idx_media_type ON ${schema}.media (type)`,
      `CREATE INDEX IF NOT EXISTS idx_templates_name ON ${schema}.templates (name)`,
      `CREATE INDEX IF NOT EXISTS idx_workflows_status ON ${schema}.workflows (status)`,
    ];

    for (const createIndex of indexes) {
      await client.query(createIndex);
    }
  }

  /**
   * Execute query in tenant context
   */
  async executeForTenant(tenantId, callback) {
    const pool = await this.getTenantPool(tenantId);
    const client = await pool.connect();

    try {
      await client.query(`SET search_path TO org_${tenantId},public`);
      return await callback(client);
    } finally {
      client.release();
    }
  }

  /**
   * Get tenant resource usage
   */
  async getTenantResourceUsage(tenantId) {
    return this.executeForTenant(tenantId, async client => {
      // Get table sizes
      const sizeQuery = await client.query(`
        SELECT 
          pg_size_pretty(pg_total_relation_size('org_${tenantId}.pages')) as pages_size,
          pg_size_pretty(pg_total_relation_size('org_${tenantId}.media')) as media_size,
          pg_size_pretty(pg_total_relation_size('org_${tenantId}.templates')) as templates_size,
          pg_size_pretty(pg_total_relation_size('org_${tenantId}.workflows')) as workflows_size,
          pg_size_pretty(
            pg_total_relation_size('org_${tenantId}.pages') +
            pg_total_relation_size('org_${tenantId}.media') +
            pg_total_relation_size('org_${tenantId}.templates') +
            pg_total_relation_size('org_${tenantId}.workflows')
          ) as total_size
      `);

      // Get connection count
      const connectionQuery = await client.query(
        `
        SELECT COUNT(*) as connection_count
        FROM pg_stat_activity
        WHERE application_name = $1
      `,
        [`tenant_${tenantId}`]
      );

      return {
        ...sizeQuery.rows[0],
        connections: connectionQuery.rows[0].connection_count,
      };
    });
  }

  /**
   * Set resource limits for tenant
   */
  async setTenantResourceLimits(tenantId, limits) {
    const client = await this.defaultPool.connect();
    try {
      await client.query(
        `
        INSERT INTO tenant_quotas (
          tenant_id,
          max_storage_gb,
          max_requests_per_minute,
          max_concurrent_connections,
          max_query_timeout,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          max_storage_gb = $2,
          max_requests_per_minute = $3,
          max_concurrent_connections = $4,
          max_query_timeout = $5,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
          tenantId,
          limits.maxStorageGB || 100,
          limits.maxRequestsPerMinute || 1000,
          limits.maxConcurrentConnections || 100,
          limits.maxQueryTimeout || 30000,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await Promise.all([
      this.defaultPool.end(),
      ...Array.from(this.pools.values()).map(pool => pool.end()),
    ]);
  }
}

module.exports = DatabaseManager;
