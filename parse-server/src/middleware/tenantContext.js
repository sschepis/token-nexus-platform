/**
 * Tenant Context Middleware
 * Handles tenant isolation and context propagation
 */

const logger = require('../utils/logger');

class TenantContext {
  constructor(databaseManager) {
    this.dbManager = databaseManager;
    this.resourceLimits = {
      maxRequestsPerMinute: 1000,
      maxConcurrentConnections: 100,
      maxStorageGB: 100,
      maxQueryTimeout: 30000,
    };
  }

  /**
   * Middleware to inject tenant context
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Extract tenant ID from request
        const tenantId = this.extractTenantId(req);

        if (!tenantId) {
          return res.status(400).json({
            error: 'Tenant ID not provided',
          });
        }

        // Validate tenant access
        const hasAccess = await this.validateTenantAccess(tenantId, req);
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Invalid tenant access',
          });
        }

        // Check resource limits
        const withinLimits = await this.checkResourceLimits(tenantId);
        if (!withinLimits.allowed) {
          return res.status(429).json({
            error: `Resource limit exceeded: ${withinLimits.reason}`,
          });
        }

        // Set tenant context
        req.tenantId = tenantId;
        req.tenantDb = await this.dbManager.getTenantPool(tenantId);

        // Track resource usage
        this.trackResourceUsage(req, res);

        next();
      } catch (error) {
        logger.error('Tenant context middleware error:', error);
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    };
  }

  /**
   * Extract tenant ID from request
   */
  extractTenantId(req) {
    // Try different methods to get tenant ID
    return (
      // From subdomain
      this.getTenantFromSubdomain(req) ||
      // From header
      req.get('X-Tenant-ID') ||
      // From query parameter
      req.query.tenantId ||
      // From authenticated user's organization
      (req.user && req.user.organization && req.user.organization.id)
    );
  }

  /**
   * Get tenant ID from subdomain
   */
  getTenantFromSubdomain(req) {
    const host = req.get('host');
    if (!host) return null;

    const subdomain = host.split('.')[0];
    return subdomain !== 'www' ? subdomain : null;
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(tenantId, req) {
    // For authenticated routes
    if (req.user) {
      // Check direct organization membership
      if (req.user.organization && req.user.organization.id === tenantId) {
        return true;
      }

      // Check organization roles and permissions
      if (req.user.organizations) {
        const orgAccess = req.user.organizations.find(
          org =>
            org.id === tenantId &&
            org.roles.some(role => this.hasRequiredPermissions(role, req.method))
        );
        return !!orgAccess;
      }

      return false;
    }

    // For public routes, verify tenant exists and is active
    try {
      const tenantPool = await this.dbManager.getTenantPool(tenantId);
      const client = await tenantPool.connect();

      try {
        const result = await client.query('SELECT status FROM organizations WHERE id = $1', [
          tenantId,
        ]);
        return result.rows[0]?.status === 'active';
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`Invalid tenant access attempt: ${tenantId}`, error);
      return false;
    }
  }

  /**
   * Check if role has required permissions for HTTP method
   */
  hasRequiredPermissions(role, method) {
    const methodPermissions = {
      GET: ['read', 'admin'],
      POST: ['write', 'admin'],
      PUT: ['write', 'admin'],
      DELETE: ['admin'],
    };

    return methodPermissions[method]?.includes(role);
  }

  /**
   * Check tenant resource limits
   */
  async checkResourceLimits(tenantId) {
    try {
      // Get current resource usage
      const usage = await this.dbManager.getTenantResourceUsage(tenantId);

      // Check storage limit
      const totalStorageGB = this.convertBytesToGB(usage.total_size);
      if (totalStorageGB > this.resourceLimits.maxStorageGB) {
        return {
          allowed: false,
          reason: 'Storage limit exceeded',
        };
      }

      // Check request rate
      const requestCount = await this.getRequestCount(tenantId);
      if (requestCount > this.resourceLimits.maxRequestsPerMinute) {
        return {
          allowed: false,
          reason: 'Request rate limit exceeded',
        };
      }

      // Check concurrent connections
      const connectionCount = await this.getConnectionCount(tenantId);
      if (connectionCount > this.resourceLimits.maxConcurrentConnections) {
        return {
          allowed: false,
          reason: 'Connection limit exceeded',
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`Error checking resource limits for tenant: ${tenantId}`, error);
      return { allowed: true }; // Fail open to prevent blocking legitimate requests
    }
  }

  /**
   * Convert bytes to gigabytes
   */
  convertBytesToGB(bytes) {
    return bytes / (1024 * 1024 * 1024);
  }

  /**
   * Get request count for the last minute
   */
  async getRequestCount(tenantId) {
    const client = await this.dbManager.defaultPool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) FROM request_logs 
         WHERE tenant_id = $1 
         AND timestamp > NOW() - INTERVAL '1 minute'`,
        [tenantId]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Get current connection count
   */
  async getConnectionCount(tenantId) {
    const client = await this.dbManager.defaultPool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) FROM pg_stat_activity 
         WHERE application_name LIKE $1`,
        [`tenant_${tenantId}_%`]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Track tenant resource usage
   */
  trackResourceUsage(req, res) {
    const start = process.hrtime();

    // Track response time and log resource usage
    res.on('finish', async () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      // Log request metrics
      const metrics = {
        tenantId: req.tenantId,
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
        timestamp: new Date(),
      };

      // Store metrics in database
      try {
        const client = await this.dbManager.defaultPool.connect();
        try {
          await client.query(
            `INSERT INTO request_logs 
             (tenant_id, path, method, duration, status_code, content_length, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              metrics.tenantId,
              metrics.path,
              metrics.method,
              metrics.duration,
              metrics.statusCode,
              metrics.contentLength,
              metrics.timestamp,
            ]
          );
        } finally {
          client.release();
        }
      } catch (error) {
        logger.error('Error storing request metrics:', error);
      }

      // Log metrics
      logger.info('Tenant resource usage', metrics);
    });
  }
}

module.exports = TenantContext;
