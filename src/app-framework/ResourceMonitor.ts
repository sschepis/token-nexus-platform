/**
 * Resource Monitor - Tracks and enforces resource usage limits for apps
 * Part of Phase 3: App Runtime Framework
 */

import {
  ResourceUsage,
  ResourceLimits,
  ResourceViolation,
  TimeRange,
  UsageReport,
  AppInstance
} from './types/AppManifest';

export class ResourceMonitor {
  private usage: Map<string, ResourceUsage[]> = new Map();
  private limits: Map<string, ResourceLimits> = new Map();
  private violations: Map<string, ResourceViolation[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 5000; // 5 seconds
  private readonly MAX_USAGE_HISTORY = 1000; // Keep last 1000 measurements

  constructor() {
    this.startMonitoring();
  }

  /**
   * Set resource limits for an app
   */
  setLimits(appId: string, limits: ResourceLimits): void {
    this.limits.set(appId, limits);
  }

  /**
   * Track resource usage for an app
   */
  trackUsage(appId: string, usage: ResourceUsage): void {
    if (!this.usage.has(appId)) {
      this.usage.set(appId, []);
    }

    const appUsage = this.usage.get(appId)!;
    appUsage.push(usage);

    // Keep only recent usage data
    if (appUsage.length > this.MAX_USAGE_HISTORY) {
      appUsage.splice(0, appUsage.length - this.MAX_USAGE_HISTORY);
    }

    // Check for limit violations
    this.checkLimits(appId, usage);
  }

  /**
   * Check if an action is allowed based on current resource usage
   */
  enforceLimit(appId: string, resource: keyof ResourceUsage): boolean {
    const limits = this.limits.get(appId);
    if (!limits) {
      return true; // No limits set, allow action
    }

    const currentUsage = this.getCurrentUsage(appId);
    if (!currentUsage) {
      return true; // No usage data, allow action
    }

    const limit = limits[resource];
    const current = currentUsage[resource];

    return current < limit;
  }

  /**
   * Get current resource usage for an app
   */
  getCurrentUsage(appId: string): ResourceUsage | null {
    const appUsage = this.usage.get(appId);
    if (!appUsage || appUsage.length === 0) {
      return null;
    }

    return appUsage[appUsage.length - 1];
  }

  /**
   * Get average resource usage over a time period
   */
  getAverageUsage(appId: string, timeRange: TimeRange): ResourceUsage | null {
    const appUsage = this.usage.get(appId);
    if (!appUsage || appUsage.length === 0) {
      return null;
    }

    const filteredUsage = appUsage.filter(
      usage => usage.timestamp >= timeRange.start && usage.timestamp <= timeRange.end
    );

    if (filteredUsage.length === 0) {
      return null;
    }

    const totals = filteredUsage.reduce(
      (acc, usage) => ({
        memory: acc.memory + usage.memory,
        cpu: acc.cpu + usage.cpu,
        storage: acc.storage + usage.storage,
        networkRequests: acc.networkRequests + usage.networkRequests,
        apiCalls: acc.apiCalls + usage.apiCalls,
        timestamp: new Date() // Will be overwritten
      }),
      { memory: 0, cpu: 0, storage: 0, networkRequests: 0, apiCalls: 0, timestamp: new Date() }
    );

    const count = filteredUsage.length;
    return {
      memory: totals.memory / count,
      cpu: totals.cpu / count,
      storage: totals.storage / count,
      networkRequests: totals.networkRequests / count,
      apiCalls: totals.apiCalls / count,
      timestamp: new Date()
    };
  }

  /**
   * Generate comprehensive usage report
   */
  generateReport(appId: string, timeRange: TimeRange): UsageReport | null {
    const appUsage = this.usage.get(appId);
    if (!appUsage || appUsage.length === 0) {
      return null;
    }

    const filteredUsage = appUsage.filter(
      usage => usage.timestamp >= timeRange.start && usage.timestamp <= timeRange.end
    );

    if (filteredUsage.length === 0) {
      return null;
    }

    // Calculate total usage
    const totalUsage = filteredUsage.reduce(
      (acc, usage) => ({
        memory: acc.memory + usage.memory,
        cpu: acc.cpu + usage.cpu,
        storage: acc.storage + usage.storage,
        networkRequests: acc.networkRequests + usage.networkRequests,
        apiCalls: acc.apiCalls + usage.apiCalls,
        timestamp: new Date()
      }),
      { memory: 0, cpu: 0, storage: 0, networkRequests: 0, apiCalls: 0, timestamp: new Date() }
    );

    // Calculate average usage
    const count = filteredUsage.length;
    const averageUsage: ResourceUsage = {
      memory: totalUsage.memory / count,
      cpu: totalUsage.cpu / count,
      storage: totalUsage.storage / count,
      networkRequests: totalUsage.networkRequests / count,
      apiCalls: totalUsage.apiCalls / count,
      timestamp: new Date()
    };

    // Calculate peak usage
    const peakUsage: ResourceUsage = filteredUsage.reduce(
      (peak, usage) => ({
        memory: Math.max(peak.memory, usage.memory),
        cpu: Math.max(peak.cpu, usage.cpu),
        storage: Math.max(peak.storage, usage.storage),
        networkRequests: Math.max(peak.networkRequests, usage.networkRequests),
        apiCalls: Math.max(peak.apiCalls, usage.apiCalls),
        timestamp: new Date()
      }),
      { memory: 0, cpu: 0, storage: 0, networkRequests: 0, apiCalls: 0, timestamp: new Date() }
    );

    // Get violations in time range
    const appViolations = this.violations.get(appId) || [];
    const violations = appViolations.filter(
      violation => violation.timestamp >= timeRange.start && violation.timestamp <= timeRange.end
    );

    return {
      appId,
      timeRange,
      totalUsage,
      averageUsage,
      peakUsage,
      violations
    };
  }

  /**
   * Get resource violations for an app
   */
  getViolations(appId: string): ResourceViolation[] {
    return this.violations.get(appId) || [];
  }

  /**
   * Clear usage data for an app (when app is unloaded)
   */
  clearUsage(appId: string): void {
    this.usage.delete(appId);
    this.limits.delete(appId);
    this.violations.delete(appId);
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, this.MONITORING_INTERVAL_MS);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform periodic resource checks
   */
  private performPeriodicChecks(): void {
    // Clean up old usage data
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    this.usage.forEach((appUsage, appId) => {
      const filteredUsage = appUsage.filter(usage => usage.timestamp > cutoffTime);
      this.usage.set(appId, filteredUsage);
    });

    // Clean up old violations
    this.violations.forEach((appViolations, appId) => {
      const filteredViolations = appViolations.filter(violation => violation.timestamp > cutoffTime);
      this.violations.set(appId, filteredViolations);
    });
  }

  /**
   * Check resource limits and record violations
   */
  private checkLimits(appId: string, usage: ResourceUsage): void {
    const limits = this.limits.get(appId);
    if (!limits) {
      return;
    }

    const violations: ResourceViolation[] = [];

    // Check each resource type
    const resourceTypes: (keyof ResourceUsage)[] = ['memory', 'cpu', 'storage', 'networkRequests', 'apiCalls'];
    
    for (const resource of resourceTypes) {
      if (resource === 'timestamp') continue;
      
      const limit = limits[resource];
      const actual = usage[resource];

      if (actual > limit) {
        const violation: ResourceViolation = {
          resource,
          limit,
          actual,
          timestamp: usage.timestamp,
          action: this.determineViolationAction(resource, actual, limit)
        };

        violations.push(violation);
      }
    }

    // Record violations
    if (violations.length > 0) {
      if (!this.violations.has(appId)) {
        this.violations.set(appId, []);
      }
      this.violations.get(appId)!.push(...violations);
    }
  }

  /**
   * Determine appropriate action for a resource violation
   */
  private determineViolationAction(
    resource: keyof ResourceUsage,
    actual: number,
    limit: number
  ): 'warning' | 'throttle' | 'suspend' {
    const overageRatio = actual / limit;

    if (overageRatio > 2.0) {
      return 'suspend'; // More than 200% of limit
    } else if (overageRatio > 1.5) {
      return 'throttle'; // More than 150% of limit
    } else {
      return 'warning'; // Over limit but less than 150%
    }
  }

  /**
   * Get resource usage statistics for all apps
   */
  getAllUsageStats(): Map<string, ResourceUsage | null> {
    const stats = new Map<string, ResourceUsage | null>();
    
    this.usage.forEach((_, appId) => {
      stats.set(appId, this.getCurrentUsage(appId));
    });

    return stats;
  }

  /**
   * Check if app should be throttled or suspended
   */
  shouldThrottleApp(appId: string): boolean {
    const recentViolations = this.getRecentViolations(appId, 5 * 60 * 1000); // Last 5 minutes
    return recentViolations.some(v => v.action === 'throttle' || v.action === 'suspend');
  }

  /**
   * Check if app should be suspended
   */
  shouldSuspendApp(appId: string): boolean {
    const recentViolations = this.getRecentViolations(appId, 5 * 60 * 1000); // Last 5 minutes
    return recentViolations.some(v => v.action === 'suspend');
  }

  /**
   * Get recent violations within a time window
   */
  private getRecentViolations(appId: string, timeWindowMs: number): ResourceViolation[] {
    const appViolations = this.violations.get(appId) || [];
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return appViolations.filter(violation => violation.timestamp > cutoffTime);
  }
}