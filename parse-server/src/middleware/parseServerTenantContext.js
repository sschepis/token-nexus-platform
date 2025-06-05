/**
 * Parse Server Tenant Context Middleware
 * Injects tenant context into Parse Server routes to enable schema-separated multi-tenancy
 */

const logger = require('../utils/logger');

class ParseServerTenantContext {
  constructor(databaseManager, tenantContext) {
    this.dbManager = databaseManager;
    this.tenantContext = tenantContext;
    this.resourceLimits = {
      maxRequestsPerMinute: 1000,
      maxConcurrentConnections: 100,
      maxStorageGB: 100,
      maxQueryTimeout: 30000,
    };
  }

  /**
   * Middleware to inject tenant context into Parse Server requests
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Extract tenant ID from request
        const tenantId = this.extractTenantId(req);

        if (!tenantId) {
          logger.warn('[Parse Tenant] No tenant ID found in request', {
            path: req.path,
            method: req.method,
            headers: this.sanitizeHeaders(req.headers)
          });
          
          return res.status(400).json({
            error: 'Tenant ID not provided for Parse Server request',
            code: 400
          });
        }

        // Validate tenant access
        const hasAccess = await this.validateTenantAccess(tenantId, req);
        if (!hasAccess) {
          logger.warn('[Parse Tenant] Invalid tenant access attempt', {
            tenantId,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent')
          });
          
          return res.status(403).json({
            error: 'Invalid tenant access for Parse Server',
            code: 403
          });
        }

        // Check resource limits
        const withinLimits = await this.checkResourceLimits(tenantId);
        if (!withinLimits.allowed) {
          logger.warn('[Parse Tenant] Resource limit exceeded', {
            tenantId,
            reason: withinLimits.reason,
            path: req.path
          });
          
          return res.status(429).json({
            error: `Resource limit exceeded: ${withinLimits.reason}`,
            code: 429
          });
        }

        // Set global tenant context for Parse adapter
        global.currentTenantId = tenantId;
        
        // Store in request for other middleware
        req.tenantId = tenantId;
        req.tenantDb = await this.dbManager.getTenantPool(tenantId);

        // Track resource usage
        this.trackResourceUsage(req, res);

        logger.debug('[Parse Tenant] Tenant context set successfully', {
          tenantId,
          path: req.path,
          method: req.method
        });
        
        next();
      } catch (error) {
        logger.error('[Parse Tenant] Tenant context middleware error:', error);
        res.status(500).json({
          error: 'Internal server error in tenant context',
          code: 500
        });
      }
    };
  }

  /**
   * Extract tenant ID from request using multiple methods
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
      // From authenticated user's organization (if available)
      (req.user && req.user.organization && req.user.organization.id) ||
      // From Parse session token (extract user and org)
      this.getTenantFromParseSession(req)
    );
  }

  /**
   * Get tenant ID from subdomain
   */
  getTenantFromSubdomain(req) {
    const host = req.get('host');
    if (!host) return null;

    const subdomain = host.split('.')[0];
    return subdomain !== 'www' && subdomain !== 'localhost' ? subdomain : null;
  }

  /**
   * Extract tenant ID from Parse session token
   */
  getTenantFromParseSession(req) {
    // This would require Parse Server integration to decode session token
    // For now, we'll implement a basic version
    const sessionToken = req.get('X-Parse-Session-Token');
    if (!sessionToken) return null;

    // TODO: Implement session token decoding to extract user organization
    // This would involve querying the _Session class to get user info
    return null;
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(tenantId, req) {
    try {
      // For authenticated routes with Parse session
      const sessionToken = req.get('X-Parse-Session-Token');
      if (sessionToken) {
        // TODO: Validate that the user's organization matches the tenant ID
        // This would involve Parse Server session validation
        return true; // For now, allow all authenticated requests
      }

      // For public routes, verify tenant exists and is active
      if (this.dbManager) {
        const tenantPool = await this.dbManager.getTenantPool(tenantId);
        const client = await tenantPool.connect();

        try {
          // Check if organization exists and is active
          const result = await client.query(
            'SELECT status FROM organizations WHERE id = $1',
            [tenantId]
          );
          
          const isActive = result.rows[0]?.status === 'active';
          logger.debug('[Parse Tenant] Tenant validation result', {
            tenantId,
            exists: result.rows.length > 0,
            isActive
          });
          
          return isActive;
        } finally {
          client.release();
        }
      }

      return true; // Fallback to allow access
    } catch (error) {
      logger.error(`[Parse Tenant] Tenant validation error for ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Check tenant resource limits
   */
  async checkResourceLimits(tenantId) {
    try {
      if (!this.dbManager) {
        return { allowed: true };
      }

      // Get current resource usage
      const usage = await this.dbManager.getTenantResourceUsage(tenantId);

      // Check storage limit (if usage data is available)
      if (usage && usage.total_size) {
        const totalStorageGB = this.convertBytesToGB(usage.total_size);
        if (totalStorageGB > this.resourceLimits.maxStorageGB) {
          return {
            allowed: false,
            reason: 'Storage limit exceeded',
          };
        }
      }

      // Check request rate
      const requestCount = await this.getRequestCount(tenantId);
      if (requestCount > this.resourceLimits.maxRequestsPerMinute) {
        return {
          allowed: false,
          reason: 'Request rate limit exceeded',
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`[Parse Tenant] Resource limit check error for ${tenantId}:`, error);
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
    if (!this.dbManager) return 0;

    try {
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
    } catch (error) {
      logger.error('[Parse Tenant] Request count query error:', error);
      return 0;
    }
  }

  /**
   * Track tenant resource usage
   */
  trackResourceUsage(req, res) {
    const start = process.hrtime();

    // Track response time and log resource usage
    res.on('finish', async () => {
      try {
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
          userAgent: req.get('User-Agent'),
          parseOperation: this.extractParseOperation(req)
        };

        // Store metrics in database
        if (this.dbManager) {
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
        }

        // Log metrics
        logger.info('[Parse Tenant] Request completed', metrics);
      } catch (error) {
        logger.error('[Parse Tenant] Error tracking resource usage:', error);
      }
    });
  }

  /**
   * Extract Parse operation type from request
   */
  extractParseOperation(req) {
    const path = req.path;
    
    if (path.startsWith('/classes/')) {
      return `${req.method}:${path.split('/')[2]}`;
    } else if (path.startsWith('/functions/')) {
      return `FUNCTION:${path.split('/')[2]}`;
    } else if (path.startsWith('/users')) {
      return `${req.method}:User`;
    } else if (path.startsWith('/login')) {
      return 'LOGIN';
    } else if (path.startsWith('/logout')) {
      return 'LOGOUT';
    }
    
    return `${req.method}:${path}`;
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized['x-parse-session-token'];
    delete sanitized['x-parse-master-key'];
    delete sanitized['authorization'];
    delete sanitized['cookie'];
    
    return sanitized;
  }
}

module.exports = ParseServerTenantContext;