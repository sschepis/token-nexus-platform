/**
 * App Framework - Main exports for Phase 3: App Runtime Framework
 * Provides a complete hybrid web worker approach for secure app execution
 */

// Core Types
export * from './types/AppManifest';

// Core Components
export { AppRuntimeManager } from './AppRuntimeManager';
export { PermissionManager } from './PermissionManager';
export { ResourceMonitor } from './ResourceMonitor';
export { APIProxy } from './APIProxy';

// Worker Runtime (for worker context)
export { AppWorkerRuntime } from './AppWorker';

// Re-export key interfaces for convenience
export type {
  AppManifest,
  AppInstance,
  AppConfig,
  Permission,
  ResourceLimits,
  ResourceUsage,
  APIRequest,
  APIResponse,
  SecurityConfiguration,
  UIConfiguration
} from './types/AppManifest';

export type {
  PermissionContext,
  PermissionResult,
  PermissionCheck
} from './PermissionManager';

export type {
  ProxyConfig,
  RequestMetrics,
  RateLimitInfo
} from './APIProxy';

export type {
  AppRuntimeConfig,
  AppLoadOptions,
  AppMessage
} from './AppRuntimeManager';