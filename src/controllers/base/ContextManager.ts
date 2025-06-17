import { ActionContext, PageContext, UserContext, OrganizationContext } from '../types/ActionTypes';

/**
 * Utility class for managing page and action contexts
 * Provides helpers for context validation, transformation, and enrichment
 */
export class ContextManager {
  /**
   * Validate that context has required properties
   */
  static validateContext(context: ActionContext, requirements?: {
    requireUser?: boolean;
    requireOrganization?: boolean;
    requirePage?: boolean;
    requireNavigation?: boolean;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const req = requirements || {};

    if (req.requireUser !== false && !context.user) {
      errors.push('User context is required');
    }

    if (req.requireOrganization && !context.organization) {
      errors.push('Organization context is required');
    }

    if (req.requirePage !== false && !context.page) {
      errors.push('Page context is required');
    }

    if (req.requireNavigation !== false && !context.navigation) {
      errors.push('Navigation context is required');
    }

    // Validate user context properties
    if (context.user) {
      if (!context.user.userId) {
        errors.push('User ID is required');
      }
      if (!context.user.permissions) {
        errors.push('User permissions are required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract organization ID from various context sources
   */
  static getOrganizationId(context: ActionContext): string | null {
    return context.organization?.id || 
           context.user.organizationId || 
           null;
  }

  /**
   * Check if user belongs to the organization in context
   */
  static validateOrganizationMembership(context: ActionContext): boolean {
    const contextOrgId = context.organization?.id;
    const userOrgId = context.user.organizationId;
    
    if (!contextOrgId || !userOrgId) {
      return false;
    }
    
    return contextOrgId === userOrgId;
  }

  /**
   * Enrich context with additional organization data
   */
  static async enrichOrganizationContext(
    context: ActionContext, 
    orgId?: string
  ): Promise<ActionContext> {
    const targetOrgId = orgId || this.getOrganizationId(context);
    
    if (!targetOrgId) {
      return context;
    }

    try {
      // Fetch organization data from Parse
      const orgQuery = new Parse.Query('Organization');
      const organization = await orgQuery.get(targetOrgId);
      
      const orgContext: OrganizationContext = {
        id: organization.id,
        name: organization.get('name') || 'Unknown Organization',
        settings: organization.get('settings') || {},
        permissions: organization.get('permissions') || [],
        features: organization.get('features') || []
      };

      return {
        ...context,
        organization: orgContext
      };
    } catch (error) {
      console.warn('[ContextManager] Failed to enrich organization context:', error);
      return context;
    }
  }

  /**
   * Create a minimal context for testing or system operations
   */
  static createSystemContext(overrides?: Partial<ActionContext>): ActionContext {
    const defaultContext: ActionContext = {
      user: {
        userId: 'system',
        username: 'system',
        email: 'system@internal',
        roles: ['SystemAdmin'],
        permissions: ['*'],
        organizationId: undefined
      },
      page: {
        pageId: 'system',
        pageName: 'System',
        state: {},
        props: {},
        metadata: {
          category: 'system',
          tags: ['system'],
          permissions: ['*']
        }
      },
      navigation: {
        router: {} as any, // Mock router for system context
        currentPath: '/system',
        breadcrumbs: []
      },
      timestamp: new Date()
    };

    return { ...defaultContext, ...overrides };
  }

  /**
   * Create context for a specific user
   */
  static async createUserContext(
    userId: string, 
    pageContext: PageContext,
    organizationId?: string
  ): Promise<ActionContext | null> {
    try {
      // Fetch user data using cloud function
      const result = await Parse.Cloud.run('getUserDetails', {
        userId: userId,
        organizationId: organizationId
      });
      
      if (!result.success) {
        throw new Error('Failed to fetch user details');
      }
      
      const user = result.user;
      const userContext: UserContext = {
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
        organizationId: organizationId || user.organizationId,
        organizationRoles: user.get('organizationRoles') || []
      };

      const context: ActionContext = {
        user: userContext,
        page: pageContext,
        navigation: {
          router: {} as any, // Will be populated by frontend
          currentPath: `/${pageContext.pageId}`,
          breadcrumbs: []
        },
        timestamp: new Date()
      };

      // Enrich with organization context if available
      return await this.enrichOrganizationContext(context);
    } catch (error) {
      console.error('[ContextManager] Failed to create user context:', error);
      return null;
    }
  }

  /**
   * Clone context with modifications
   */
  static cloneContext(context: ActionContext, modifications?: Partial<ActionContext>): ActionContext {
    return {
      user: { ...context.user },
      organization: context.organization ? { ...context.organization } : undefined,
      page: { ...context.page, metadata: { ...context.page.metadata } },
      navigation: { ...context.navigation, breadcrumbs: [...context.navigation.breadcrumbs] },
      componentRefs: context.componentRefs ? new Map(context.componentRefs) : undefined,
      timestamp: new Date(),
      ...modifications
    };
  }

  /**
   * Extract context metadata for logging/auditing
   */
  static extractMetadata(context: ActionContext): Record<string, any> {
    return {
      userId: context.user.userId,
      username: context.user.username,
      organizationId: this.getOrganizationId(context),
      pageId: context.page.pageId,
      currentPath: context.navigation.currentPath,
      timestamp: context.timestamp.toISOString(),
      userRoles: context.user.roles,
      userPermissions: context.user.permissions.slice(0, 10), // Limit for logging
      organizationName: context.organization?.name
    };
  }

  /**
   * Check if context represents a system/admin operation
   */
  static isSystemContext(context: ActionContext): boolean {
    return context.user.userId === 'system' ||
           context.user.roles.includes('SystemAdmin') ||
           context.user.permissions.includes('*');
  }

  /**
   * Check if context represents an organization admin operation
   */
  static isOrgAdminContext(context: ActionContext): boolean {
    return context.user.roles.includes('OrgAdmin') ||
           context.user.organizationRoles?.includes('admin') === true ||
           context.user.permissions.includes('org:admin');
  }

  /**
   * Sanitize context for client-side usage (remove sensitive data)
   */
  static sanitizeForClient(context: ActionContext): Partial<ActionContext> {
    return {
      user: {
        userId: context.user.userId,
        username: context.user.username,
        email: context.user.email,
        roles: context.user.roles,
        permissions: [], // Don't send permissions to client
        organizationId: context.user.organizationId
      },
      organization: context.organization ? {
        id: context.organization.id,
        name: context.organization.name,
        settings: {}, // Don't send full settings to client
        permissions: [],
        features: context.organization.features
      } : undefined,
      page: context.page,
      timestamp: context.timestamp
    };
  }

  /**
   * Validate context permissions for a specific action
   */
  static validateActionPermissions(
    context: ActionContext, 
    requiredPermissions: string[]
  ): { valid: boolean; missing: string[] } {
    const userPermissions = context.user.permissions || [];
    const missing: string[] = [];

    for (const required of requiredPermissions) {
      const hasPermission = userPermissions.includes(required) ||
                           userPermissions.includes('*') ||
                           userPermissions.some(perm => this.matchesWildcard(perm, required));
      
      if (!hasPermission) {
        missing.push(required);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Helper method for wildcard permission matching
   */
  private static matchesWildcard(userPermission: string, requiredPermission: string): boolean {
    if (userPermission === '*') return true;
    
    const userParts = userPermission.split(':');
    const requiredParts = requiredPermission.split(':');
    
    if (userParts.length !== requiredParts.length) return false;
    
    for (let i = 0; i < userParts.length; i++) {
      if (userParts[i] !== '*' && userParts[i] !== requiredParts[i]) {
        return false;
      }
    }
    
    return true;
  }
}