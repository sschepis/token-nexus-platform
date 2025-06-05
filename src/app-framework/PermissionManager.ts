/**
 * Permission Manager - Enforces security policies and access controls for apps
 * Part of Phase 3: App Runtime Framework
 */

import {
  Permission,
  PermissionCondition,
  PermissionType,
  SecurityConfiguration,
  AppManifest
} from './types/AppManifest';

export interface PermissionContext {
  appId: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PermissionCheck {
  permission: Permission;
  context: PermissionContext;
  resource: string;
  action: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
  auditLog?: PermissionAuditEntry;
}

export interface PermissionAuditEntry {
  appId: string;
  permission: Permission;
  context: PermissionContext;
  result: boolean;
  reason: string;
  timestamp: Date;
}

export class PermissionManager {
  private appPermissions: Map<string, Permission[]> = new Map();
  private securityConfigs: Map<string, SecurityConfiguration> = new Map();
  private auditLog: PermissionAuditEntry[] = [];
  private readonly MAX_AUDIT_ENTRIES = 10000;

  /**
   * Register permissions for an app
   */
  registerAppPermissions(appId: string, manifest: AppManifest): void {
    this.appPermissions.set(appId, manifest.permissions);
    this.securityConfigs.set(appId, manifest.security);
  }

  /**
   * Remove permissions for an app (when unloaded)
   */
  unregisterAppPermissions(appId: string): void {
    this.appPermissions.delete(appId);
    this.securityConfigs.delete(appId);
  }

  /**
   * Check if an app has permission to perform an action
   */
  checkPermission(check: PermissionCheck): PermissionResult {
    const { permission, context, resource, action } = check;
    const appId = context.appId;
    
    const appPermissions = this.appPermissions.get(appId);
    if (!appPermissions) {
      return this.createResult(false, 'App not registered', check);
    }

    const securityConfig = this.securityConfigs.get(appId);
    if (!securityConfig) {
      return this.createResult(false, 'Security configuration not found', check);
    }

    // Check if API is blocked
    if (securityConfig.blockedAPIs.includes(resource)) {
      return this.createResult(false, 'API is blocked by security configuration', check);
    }

    // Find matching permission
    const matchingPermission = this.findMatchingPermission(appPermissions, check.permission.type, resource, action);
    if (!matchingPermission) {
      return this.createResult(false, 'No matching permission found', check);
    }

    // Check permission conditions
    const conditionResult = this.checkConditions(matchingPermission, context);
    if (!conditionResult.allowed) {
      return this.createResult(false, conditionResult.reason || 'Permission conditions not met', check);
    }

    // Check domain restrictions for network access
    if (check.permission.type === 'network') {
      const domainResult = this.checkDomainRestrictions(securityConfig, resource);
      if (!domainResult.allowed) {
        return this.createResult(false, domainResult.reason || 'Domain not allowed', check);
      }
    }

    return this.createResult(true, 'Permission granted', check);
  }

  /**
   * Check API access permission
   */
  checkAPIAccess(appId: string, endpoint: string, method: string, context: PermissionContext): PermissionResult {
    const check: PermissionCheck = {
      permission: {
        type: 'api',
        resource: endpoint,
        actions: [method.toLowerCase()]
      },
      context,
      resource: endpoint,
      action: method.toLowerCase()
    };

    return this.checkPermission(check);
  }

  /**
   * Check data access permission
   */
  checkDataAccess(appId: string, dataType: string, action: 'read' | 'write', context: PermissionContext): PermissionResult {
    const check: PermissionCheck = {
      permission: {
        type: 'data',
        resource: dataType,
        actions: [action]
      },
      context,
      resource: dataType,
      action
    };

    return this.checkPermission(check);
  }

  /**
   * Check UI control permission
   */
  checkUIAccess(appId: string, uiElement: string, action: string, context: PermissionContext): PermissionResult {
    const check: PermissionCheck = {
      permission: {
        type: 'ui',
        resource: uiElement,
        actions: [action]
      },
      context,
      resource: uiElement,
      action
    };

    return this.checkPermission(check);
  }

  /**
   * Check network access permission
   */
  checkNetworkAccess(appId: string, domain: string, context: PermissionContext): PermissionResult {
    const check: PermissionCheck = {
      permission: {
        type: 'network',
        resource: domain,
        actions: ['request']
      },
      context,
      resource: domain,
      action: 'request'
    };

    return this.checkPermission(check);
  }

  /**
   * Get all permissions for an app
   */
  getAppPermissions(appId: string): Permission[] {
    return this.appPermissions.get(appId) || [];
  }

  /**
   * Get security configuration for an app
   */
  getSecurityConfig(appId: string): SecurityConfiguration | null {
    return this.securityConfigs.get(appId) || null;
  }

  /**
   * Get audit log entries for an app
   */
  getAuditLog(appId: string, limit: number = 100): PermissionAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.appId === appId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get all audit log entries
   */
  getAllAuditLogs(limit: number = 1000): PermissionAuditEntry[] {
    return this.auditLog.slice(-limit).reverse();
  }

  /**
   * Clear audit log for an app
   */
  clearAuditLog(appId: string): void {
    this.auditLog = this.auditLog.filter(entry => entry.appId !== appId);
  }

  /**
   * Find matching permission for a resource and action
   */
  private findMatchingPermission(
    permissions: Permission[],
    type: string,
    resource: string,
    action: string
  ): Permission | null {
    return permissions.find(permission => {
      // Check permission type
      if (permission.type !== type) {
        return false;
      }

      // Check resource match (exact or wildcard)
      if (!this.matchesResource(permission.resource, resource)) {
        return false;
      }

      // Check action match
      if (!permission.actions.includes(action) && !permission.actions.includes('*')) {
        return false;
      }

      return true;
    }) || null;
  }

  /**
   * Check if resource matches permission resource pattern
   */
  private matchesResource(permissionResource: string, actualResource: string): boolean {
    // Exact match
    if (permissionResource === actualResource) {
      return true;
    }

    // Wildcard match
    if (permissionResource === '*') {
      return true;
    }

    // Pattern match (simple glob-style)
    if (permissionResource.includes('*')) {
      const pattern = permissionResource.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(actualResource);
    }

    return false;
  }

  /**
   * Check permission conditions
   */
  private checkConditions(permission: Permission, context: PermissionContext): PermissionResult {
    if (!permission.conditions || permission.conditions.length === 0) {
      return { allowed: true };
    }

    for (const condition of permission.conditions) {
      const result = this.evaluateCondition(condition, context);
      if (!result) {
        return {
          allowed: false,
          reason: `Condition failed: ${condition.field} ${condition.operator} ${condition.value}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate a single permission condition
   */
  private evaluateCondition(condition: PermissionCondition, context: PermissionContext): boolean {
    const fieldValue = this.getContextValue(condition.field, context);
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    const stringValue = String(fieldValue);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return stringValue === conditionValue;
      
      case 'contains':
        return stringValue.includes(conditionValue);
      
      case 'startsWith':
        return stringValue.startsWith(conditionValue);
      
      case 'regex':
        try {
          const regex = new RegExp(conditionValue);
          return regex.test(stringValue);
        } catch (error) {
          return false;
        }
      
      default:
        return false;
    }
  }

  /**
   * Get value from permission context
   */
  private getContextValue(field: string, context: PermissionContext): any {
    switch (field) {
      case 'userId':
        return context.userId;
      case 'organizationId':
        return context.organizationId;
      case 'sessionId':
        return context.sessionId;
      case 'timestamp':
        return context.timestamp;
      default:
        return context.metadata?.[field];
    }
  }

  /**
   * Check domain restrictions for network access
   */
  private checkDomainRestrictions(securityConfig: SecurityConfiguration, domain: string): PermissionResult {
    if (securityConfig.allowedDomains.length === 0) {
      return { allowed: true }; // No restrictions
    }

    // Check if domain is in allowed list
    const isAllowed = securityConfig.allowedDomains.some(allowedDomain => {
      if (allowedDomain === '*') {
        return true;
      }
      
      if (allowedDomain.startsWith('*.')) {
        const baseDomain = allowedDomain.substring(2);
        return domain.endsWith(baseDomain);
      }
      
      return domain === allowedDomain;
    });

    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : `Domain ${domain} not in allowed list`
    };
  }

  /**
   * Create permission result with audit logging
   */
  private createResult(allowed: boolean, reason: string, check: PermissionCheck): PermissionResult {
    const auditEntry: PermissionAuditEntry = {
      appId: check.context.appId,
      permission: check.permission,
      context: check.context,
      result: allowed,
      reason,
      timestamp: new Date()
    };

    // Add to audit log
    this.auditLog.push(auditEntry);

    // Trim audit log if too large
    if (this.auditLog.length > this.MAX_AUDIT_ENTRIES) {
      this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_ENTRIES);
    }

    return {
      allowed,
      reason: allowed ? undefined : reason,
      auditLog: auditEntry
    };
  }

  /**
   * Validate app manifest permissions
   */
  validateManifestPermissions(manifest: AppManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const permission of manifest.permissions) {
      // Validate permission type
      if (!['api', 'data', 'ui', 'network'].includes(permission.type)) {
        errors.push(`Invalid permission type: ${permission.type}`);
      }

      // Validate resource
      if (!permission.resource || permission.resource.trim() === '') {
        errors.push('Permission resource cannot be empty');
      }

      // Validate actions
      if (!permission.actions || permission.actions.length === 0) {
        errors.push('Permission must have at least one action');
      }

      // Validate conditions
      if (permission.conditions) {
        for (const condition of permission.conditions) {
          if (!condition.field || !condition.operator || condition.value === undefined) {
            errors.push('Invalid permission condition');
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get permission statistics
   */
  getPermissionStats(appId?: string): {
    totalChecks: number;
    allowedChecks: number;
    deniedChecks: number;
    byType: Record<string, number>;
  } {
    const relevantEntries = appId 
      ? this.auditLog.filter(entry => entry.appId === appId)
      : this.auditLog;

    const totalChecks = relevantEntries.length;
    const allowedChecks = relevantEntries.filter(entry => entry.result).length;
    const deniedChecks = totalChecks - allowedChecks;

    const byType: Record<string, number> = {};
    relevantEntries.forEach(entry => {
      const type = entry.permission.type;
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      totalChecks,
      allowedChecks,
      deniedChecks,
      byType
    };
  }
}