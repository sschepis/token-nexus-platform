/**
 * API Proxy Layer - Controls and monitors app access to platform APIs
 * Part of Phase 3: App Runtime Framework
 */

import {
  APIRequest,
  APIResponse,
  ResourceUsage
} from './types/AppManifest';
import { PermissionManager, PermissionContext } from './PermissionManager';
import { ResourceMonitor } from './ResourceMonitor';

export interface ProxyConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  rateLimitWindow: number; // milliseconds
  maxRequestsPerWindow: number;
}

export interface RequestMetrics {
  appId: string;
  endpoint: string;
  method: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  bytesTransferred: number;
}

export interface RateLimitInfo {
  appId: string;
  requests: number;
  windowStart: Date;
  windowEnd: Date;
}

export class APIProxy {
  private permissionManager: PermissionManager;
  private resourceMonitor: ResourceMonitor;
  private config: ProxyConfig;
  private requestMetrics: RequestMetrics[] = [];
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private readonly MAX_METRICS_HISTORY = 10000;

  constructor(
    permissionManager: PermissionManager,
    resourceMonitor: ResourceMonitor,
    config: ProxyConfig
  ) {
    this.permissionManager = permissionManager;
    this.resourceMonitor = resourceMonitor;
    this.config = config;
  }

  /**
   * Proxy an API request with full security and monitoring
   */
  async proxyRequest(appId: string, request: APIRequest): Promise<APIResponse> {
    const startTime = new Date();
    const context: PermissionContext = {
      appId,
      timestamp: startTime
    };

    try {
      // Validate permissions
      const permissionResult = await this.validatePermission(appId, request.endpoint, context);
      if (!permissionResult.allowed) {
        return this.createErrorResponse(
          `Permission denied: ${permissionResult.reason}`,
          { appId, endpoint: request.endpoint, method: request.method, startTime, success: false, bytesTransferred: 0 }
        );
      }

      // Check rate limits
      const rateLimitResult = this.checkRateLimit(appId);
      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(
          'Rate limit exceeded',
          { appId, endpoint: request.endpoint, method: request.method, startTime, success: false, bytesTransferred: 0 }
        );
      }

      // Check resource limits
      if (!this.resourceMonitor.enforceLimit(appId, 'apiCalls')) {
        return this.createErrorResponse(
          'API call limit exceeded',
          { appId, endpoint: request.endpoint, method: request.method, startTime, success: false, bytesTransferred: 0 }
        );
      }

      // Transform request if needed
      const transformedRequest = this.transformRequest(request);

      // Execute the actual request
      const response = await this.executeRequest(transformedRequest);

      // Record successful metrics
      const endTime = new Date();
      const metrics: RequestMetrics = {
        appId,
        endpoint: request.endpoint,
        method: request.method,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: true,
        statusCode: 200,
        bytesTransferred: this.calculateResponseSize(response)
      };

      this.recordMetrics(metrics);
      this.updateRateLimit(appId);
      this.trackResourceUsage(appId, metrics);

      return {
        success: true,
        data: response.data,
        usage: this.calculateUsage(metrics)
      };

    } catch (error) {
      const endTime = new Date();
      const errorMetrics: RequestMetrics = {
        appId,
        endpoint: request.endpoint,
        method: request.method,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        bytesTransferred: 0
      };

      this.recordMetrics(errorMetrics);

      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Request failed',
        errorMetrics
      );
    }
  }

  /**
   * Validate app permission for API endpoint
   */
  async validatePermission(appId: string, endpoint: string, context: PermissionContext): Promise<{ allowed: boolean; reason?: string }> {
    const result = this.permissionManager.checkAPIAccess(appId, endpoint, 'request', context);
    return {
      allowed: result.allowed,
      reason: result.reason
    };
  }

  /**
   * Check rate limits for an app
   */
  checkRateLimit(appId: string): { allowed: boolean; reason?: string } {
    const now = new Date();
    const rateLimitInfo = this.rateLimits.get(appId);

    if (!rateLimitInfo) {
      // First request, create new rate limit window
      this.rateLimits.set(appId, {
        appId,
        requests: 0,
        windowStart: now,
        windowEnd: new Date(now.getTime() + this.config.rateLimitWindow)
      });
      return { allowed: true };
    }

    // Check if current window has expired
    if (now > rateLimitInfo.windowEnd) {
      // Reset window
      this.rateLimits.set(appId, {
        appId,
        requests: 0,
        windowStart: now,
        windowEnd: new Date(now.getTime() + this.config.rateLimitWindow)
      });
      return { allowed: true };
    }

    // Check if within rate limit
    if (rateLimitInfo.requests >= this.config.maxRequestsPerWindow) {
      const resetTime = Math.ceil((rateLimitInfo.windowEnd.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        reason: `Rate limit exceeded. Reset in ${resetTime} seconds.`
      };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(appId: string): void {
    const rateLimitInfo = this.rateLimits.get(appId);
    if (rateLimitInfo) {
      rateLimitInfo.requests++;
    }
  }

  /**
   * Transform request before execution
   */
  private transformRequest(request: APIRequest): APIRequest {
    // Add authentication headers, transform data, etc.
    const transformedRequest = { ...request };

    // Add default headers
    if (!transformedRequest.headers) {
      transformedRequest.headers = {};
    }

    transformedRequest.headers['Content-Type'] = 'application/json';
    transformedRequest.headers['X-App-Request'] = 'true';
    transformedRequest.headers['X-Request-ID'] = this.generateRequestId();

    return transformedRequest;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest(request: APIRequest): Promise<{ data: any; status: number }> {
    const url = `${this.config.baseURL}${request.endpoint}`;
    
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: request.headers,
      body: request.data ? JSON.stringify(request.data) : undefined,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return { data, status: response.status };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on the last attempt
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Record request metrics
   */
  private recordMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);

    // Trim metrics history
    if (this.requestMetrics.length > this.MAX_METRICS_HISTORY) {
      this.requestMetrics = this.requestMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Track resource usage
   */
  private trackResourceUsage(appId: string, metrics: RequestMetrics): void {
    const usage: ResourceUsage = {
      memory: 0, // Will be updated by runtime manager
      cpu: 0, // Will be updated by runtime manager
      storage: 0, // Will be updated by runtime manager
      networkRequests: 1,
      apiCalls: 1,
      timestamp: new Date()
    };

    this.resourceMonitor.trackUsage(appId, usage);
  }

  /**
   * Calculate resource usage from metrics
   */
  private calculateUsage(metrics: RequestMetrics): ResourceUsage {
    return {
      memory: 0,
      cpu: 0,
      storage: 0,
      networkRequests: 1,
      apiCalls: 1,
      timestamp: new Date()
    };
  }

  /**
   * Calculate response size in bytes
   */
  private calculateResponseSize(response: any): number {
    try {
      return JSON.stringify(response).length;
    } catch {
      return 0;
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string, metrics: RequestMetrics): APIResponse {
    this.recordMetrics(metrics);
    
    return {
      success: false,
      error,
      usage: this.calculateUsage(metrics)
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get request metrics for an app
   */
  getAppMetrics(appId: string, limit: number = 100): RequestMetrics[] {
    return this.requestMetrics
      .filter(metric => metric.appId === appId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get rate limit status for an app
   */
  getRateLimitStatus(appId: string): RateLimitInfo | null {
    return this.rateLimits.get(appId) || null;
  }

  /**
   * Get API usage statistics
   */
  getUsageStats(appId?: string): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalBytesTransferred: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const relevantMetrics = appId 
      ? this.requestMetrics.filter(metric => metric.appId === appId)
      : this.requestMetrics;

    const totalRequests = relevantMetrics.length;
    const successfulRequests = relevantMetrics.filter(metric => metric.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const totalResponseTime = relevantMetrics
      .filter(metric => metric.duration !== undefined)
      .reduce((sum, metric) => sum + (metric.duration || 0), 0);
    
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const totalBytesTransferred = relevantMetrics.reduce(
      (sum, metric) => sum + metric.bytesTransferred, 0
    );

    // Calculate top endpoints
    const endpointCounts = new Map<string, number>();
    relevantMetrics.forEach(metric => {
      const count = endpointCounts.get(metric.endpoint) || 0;
      endpointCounts.set(metric.endpoint, count + 1);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      totalBytesTransferred,
      topEndpoints
    };
  }

  /**
   * Clear metrics for an app
   */
  clearAppMetrics(appId: string): void {
    this.requestMetrics = this.requestMetrics.filter(metric => metric.appId !== appId);
    this.rateLimits.delete(appId);
  }

  /**
   * Update proxy configuration
   */
  updateConfig(newConfig: Partial<ProxyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current proxy configuration
   */
  getConfig(): ProxyConfig {
    return { ...this.config };
  }
}