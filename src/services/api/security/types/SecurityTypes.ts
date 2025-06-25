export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: 'app_isolation' | 'data_access' | 'api_rate_limit' | 'execution_timeout';
  rules: Record<string, any>;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSecurityContext {
  appId: string;
  appName: string;
  permissions: string[];
  roles: string[];
  policies: string[];
  isolationLevel: 'strict' | 'moderate' | 'relaxed';
  dataAccess: {
    ownData: boolean;
    orgData: boolean;
    crossOrgData: boolean;
  };
  apiAccess: {
    internal: boolean;
    external: boolean;
    rateLimit: number;
  };
}

export interface CreatePermissionParams {
  organizationId: string;
  name: string;
  description: string;
  category: string;
}

export interface CreateRoleParams {
  organizationId: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface CreatePolicyParams {
  organizationId: string;
  name: string;
  description: string;
  type: string;
  rules: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export interface SecurityValidationResult {
  valid: boolean;
  issues: string[];
  recommendations: string[];
}