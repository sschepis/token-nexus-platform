/**
 * App Manifest System - Defines the structure and configuration for apps
 * Part of Phase 3: App Runtime Framework
 */

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  
  // Entry points
  entryPoint: string; // Main app file
  workerScript?: string; // Custom worker script
  
  // Permissions
  permissions: Permission[];
  
  // Dependencies
  dependencies: Dependency[];
  
  // Resource limits
  resources: ResourceLimits;
  
  // UI configuration
  ui: UIConfiguration;
  
  // Security settings
  security: SecurityConfiguration;
}

export interface Permission {
  type: 'api' | 'data' | 'ui' | 'network';
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'regex';
  value: string;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'npm' | 'cdn' | 'internal';
  url?: string;
  required: boolean;
}

export interface ResourceLimits {
  memory: number; // MB
  cpu: number; // % of single core
  storage: number; // MB
  network: number; // requests per minute
  apiCalls: number; // calls per minute
}

export interface UIConfiguration {
  container: 'modal' | 'sidebar' | 'fullscreen' | 'embedded';
  dimensions?: { width: number; height: number };
  resizable?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface SecurityConfiguration {
  sandboxLevel: 'strict' | 'moderate' | 'permissive';
  allowedDomains: string[];
  blockedAPIs: string[];
  dataEncryption: boolean;
  auditLogging: boolean;
}

export enum PermissionType {
  API_ACCESS = 'api_access',
  DATA_READ = 'data_read',
  DATA_WRITE = 'data_write',
  UI_CONTROL = 'ui_control',
  NETWORK_ACCESS = 'network_access',
  FILE_ACCESS = 'file_access'
}

export interface ResourceUsage {
  memory: number;
  cpu: number;
  storage: number;
  networkRequests: number;
  apiCalls: number;
  timestamp: Date;
}

export interface AppInstance {
  id: string;
  worker: Worker;
  permissions: Permission[];
  state: 'loading' | 'running' | 'paused' | 'error';
  resourceUsage: ResourceUsage;
  manifest: AppManifest;
  startTime: Date;
  lastActivity: Date;
}

export interface AppConfig {
  id: string;
  manifest: AppManifest;
  permissions: Permission[];
  resourceLimits: ResourceLimits;
}

export interface APIRequest {
  appId: string;
  endpoint: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage: ResourceUsage;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface UsageReport {
  appId: string;
  timeRange: TimeRange;
  totalUsage: ResourceUsage;
  averageUsage: ResourceUsage;
  peakUsage: ResourceUsage;
  violations: ResourceViolation[];
}

export interface ResourceViolation {
  resource: keyof ResourceUsage;
  limit: number;
  actual: number;
  timestamp: Date;
  action: 'warning' | 'throttle' | 'suspend';
}