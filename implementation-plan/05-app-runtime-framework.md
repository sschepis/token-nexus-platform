# App Runtime Framework - Implementation Plan

## Overview

This implementation plan addresses the critical gaps in the App Runtime Framework to enable installable applications to run securely within the Token Nexus Platform. The framework provides isolated execution environments, comprehensive security controls, and seamless platform integration.

**Total Estimated Effort**: 30 days  
**Priority**: Critical (Required for Beta)  
**Dependencies**: Authentication & Authorization, Backend Architecture

## Current State Analysis

### ✅ Completed Components
- Basic AppRuntimeManager class structure
- Permission system foundation
- App manifest type definitions
- Basic resource tracking
- Event system architecture

### ❌ Critical Gaps Identified
- Missing React hooks for frontend integration
- No web worker script for app execution
- Incomplete platform integration
- Missing manifest validation
- Inadequate error handling
- No performance monitoring

## Implementation Phases

## Phase 1: Core Runtime Infrastructure (Days 1-14)

### Task 1.1: Implement React Hooks (Days 1-3)
**Priority**: Critical  
**Effort**: 3 days  
**Dependencies**: None

#### Implementation Details

**File**: [`src/app-framework/hooks/useAppRuntime.ts`](src/app-framework/hooks/useAppRuntime.ts)
```typescript
import { useState, useEffect, useCallback } from 'react';
import { AppRuntimeManager } from '../runtime/AppRuntimeManager';
import { AppRuntimeConfig, AppRuntimeStats, AppMessage } from '../types';

export interface UseAppRuntimeOptions {
  config: AppRuntimeConfig;
  onAppStateChange?: (appId: string, state: string) => void;
  onError?: (error: Error) => void;
  onPerformanceAlert?: (appId: string, metrics: any) => void;
}

export const useAppRuntime = (options: UseAppRuntimeOptions) => {
  const [runtimeManager, setRuntimeManager] = useState<AppRuntimeManager | null>(null);
  const [state, setState] = useState<AppRuntimeStats>({
    totalApps: 0,
    runningApps: 0,
    pausedApps: 0,
    errorApps: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeRuntime = async () => {
      try {
        setLoading(true);
        const manager = new AppRuntimeManager(options.config);
        await manager.initialize();
        setRuntimeManager(manager);

        // Set up event listeners
        manager.on('appStateChanged', (data) => {
          setState(manager.getRuntimeStats());
          options.onAppStateChange?.(data.appId, data.state);
        });

        manager.on('error', (error) => {
          setError(error.message);
          options.onError?.(error);
        });

        manager.on('performanceAlert', (data) => {
          options.onPerformanceAlert?.(data.appId, data.metrics);
        });

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize runtime';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    initializeRuntime();

    return () => {
      if (runtimeManager) {
        runtimeManager.shutdown();
      }
    };
  }, []);

  const loadApp = useCallback(async (appId: string, manifest: any) => {
    if (!runtimeManager) throw new Error('Runtime not initialized');
    return await runtimeManager.loadApp(appId, manifest);
  }, [runtimeManager]);

  const unloadApp = useCallback(async (appId: string) => {
    if (!runtimeManager) throw new Error('Runtime not initialized');
    return await runtimeManager.unloadApp(appId);
  }, [runtimeManager]);

  const sendMessage = useCallback(async (appId: string, message: AppMessage) => {
    if (!runtimeManager) throw new Error('Runtime not initialized');
    return await runtimeManager.sendMessage(appId, message);
  }, [runtimeManager]);

  return {
    runtimeManager,
    state,
    loading,
    error,
    loadApp,
    unloadApp,
    startApp: runtimeManager?.startApp.bind(runtimeManager),
    stopApp: runtimeManager?.stopApp.bind(runtimeManager),
    pauseApp: runtimeManager?.pauseApp.bind(runtimeManager),
    resumeApp: runtimeManager?.resumeApp.bind(runtimeManager),
    sendMessage,
    getAppMetrics: runtimeManager?.getAppMetrics.bind(runtimeManager)
  };
};
```

**File**: [`src/app-framework/hooks/useApp.ts`](src/app-framework/hooks/useApp.ts)
```typescript
import { useState, useCallback, useEffect } from 'react';
import { AppRuntimeManager } from '../runtime/AppRuntimeManager';
import { AppInstance, AppManifest, AppMessage, AppMetrics } from '../types';

export interface UseAppOptions {
  autoStart?: boolean;
  onStateChange?: (state: string) => void;
  onMessage?: (message: AppMessage) => void;
  onError?: (error: Error) => void;
}

export const useApp = (
  appId: string, 
  manifest: AppManifest, 
  runtimeManager: AppRuntimeManager | null,
  options: UseAppOptions = {}
) => {
  const [instance, setInstance] = useState<AppInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<string>('unloaded');
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);

  const loadApp = useCallback(async () => {
    if (!runtimeManager) {
      throw new Error('Runtime manager not available');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const appInstance = await runtimeManager.loadApp(appId, manifest);
      setInstance(appInstance);
      setState('loaded');
      
      if (options.autoStart) {
        await runtimeManager.startApp(appId);
        setState('running');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load app';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [appId, manifest, runtimeManager, options.autoStart, options.onError]);

  const unloadApp = useCallback(async () => {
    if (!runtimeManager) return;
    
    try {
      await runtimeManager.unloadApp(appId);
      setInstance(null);
      setState('unloaded');
      setMetrics(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unload app';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
    }
  }, [appId, runtimeManager, options.onError]);

  const sendMessage = useCallback(async (message: AppMessage) => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    return await runtimeManager.sendMessage(appId, message);
  }, [appId, runtimeManager]);

  // Set up event listeners
  useEffect(() => {
    if (!runtimeManager) return;

    const handleStateChange = (data: { appId: string; state: string }) => {
      if (data.appId === appId) {
        setState(data.state);
        options.onStateChange?.(data.state);
      }
    };

    const handleMessage = (data: { appId: string; message: AppMessage }) => {
      if (data.appId === appId) {
        options.onMessage?.(data.message);
      }
    };

    const handleError = (error: Error) => {
      setError(error.message);
      options.onError?.(error);
    };

    runtimeManager.on('appStateChanged', handleStateChange);
    runtimeManager.on('appMessage', handleMessage);
    runtimeManager.on('error', handleError);

    return () => {
      runtimeManager.off('appStateChanged', handleStateChange);
      runtimeManager.off('appMessage', handleMessage);
      runtimeManager.off('error', handleError);
    };
  }, [appId, runtimeManager, options]);

  // Update metrics periodically
  useEffect(() => {
    if (!runtimeManager || state !== 'running') return;

    const updateMetrics = async () => {
      try {
        const appMetrics = await runtimeManager.getAppMetrics(appId);
        setMetrics(appMetrics);
      } catch (err) {
        // Metrics update failed, but don't throw error
        console.warn('Failed to update app metrics:', err);
      }
    };

    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [appId, runtimeManager, state]);

  return {
    instance,
    loading,
    error,
    state,
    metrics,
    loadApp,
    unloadApp,
    startApp: () => runtimeManager?.startApp(appId),
    stopApp: () => runtimeManager?.stopApp(appId),
    pauseApp: () => runtimeManager?.pauseApp(appId),
    resumeApp: () => runtimeManager?.resumeApp(appId),
    sendMessage,
    restart: async () => {
      if (runtimeManager) {
        await runtimeManager.stopApp(appId);
        await runtimeManager.startApp(appId);
      }
    }
  };
};
```

**File**: [`src/app-framework/hooks/index.ts`](src/app-framework/hooks/index.ts)
```typescript
export { useAppRuntime } from './useAppRuntime';
export { useApp } from './useApp';
export type { UseAppRuntimeOptions } from './useAppRuntime';
export type { UseAppOptions } from './useApp';
```

#### Testing Strategy
```typescript
// tests/hooks/useAppRuntime.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAppRuntime } from '../../src/app-framework/hooks/useAppRuntime';

describe('useAppRuntime', () => {
  it('should initialize runtime manager', async () => {
    const { result } = renderHook(() => useAppRuntime({
      config: { maxApps: 10, memoryLimit: 512 }
    }));

    await act(async () => {
      // Wait for initialization
    });

    expect(result.current.runtimeManager).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('should handle runtime errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useAppRuntime({
      config: { maxApps: 10, memoryLimit: 512 },
      onError
    }));

    // Test error handling
    expect(onError).toHaveBeenCalled();
  });
});
```

### Task 1.2: Create Web Worker Script (Days 4-7)
**Priority**: Critical  
**Effort**: 4 days  
**Dependencies**: Task 1.1

#### Implementation Details

**File**: [`public/app-worker.js`](public/app-worker.js)
```javascript
// App Runtime Web Worker
// Provides isolated execution environment for installable applications

class AppWorkerRuntime {
  constructor() {
    this.apps = new Map();
    this.permissions = new Map();
    this.messageHandlers = new Map();
    this.performanceMonitor = new PerformanceMonitor();
    
    this.setupMessageHandling();
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
  }

  setupMessageHandling() {
    self.addEventListener('message', (event) => {
      const { type, appId, data, messageId } = event.data;
      
      try {
        switch (type) {
          case 'LOAD_APP':
            this.loadApp(appId, data.manifest, data.code);
            break;
          case 'START_APP':
            this.startApp(appId);
            break;
          case 'STOP_APP':
            this.stopApp(appId);
            break;
          case 'SEND_MESSAGE':
            this.sendMessageToApp(appId, data.message);
            break;
          case 'GET_METRICS':
            this.getAppMetrics(appId);
            break;
          case 'UPDATE_PERMISSIONS':
            this.updatePermissions(appId, data.permissions);
            break;
          default:
            throw new Error(`Unknown message type: ${type}`);
        }
        
        // Send success response
        this.postMessage({
          type: 'RESPONSE',
          messageId,
          success: true
        });
      } catch (error) {
        // Send error response
        this.postMessage({
          type: 'RESPONSE',
          messageId,
          success: false,
          error: error.message
        });
      }
    });
  }

  setupErrorHandling() {
    self.addEventListener('error', (event) => {
      this.postMessage({
        type: 'ERROR',
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    self.addEventListener('unhandledrejection', (event) => {
      this.postMessage({
        type: 'ERROR',
        error: {
          message: 'Unhandled Promise Rejection',
          reason: event.reason
        }
      });
    });
  }

  setupPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.performanceMonitor.getMetrics();
      this.postMessage({
        type: 'PERFORMANCE_UPDATE',
        metrics
      });
    }, 5000);
  }

  async loadApp(appId, manifest, code) {
    try {
      // Validate manifest
      this.validateManifest(manifest);
      
      // Create app sandbox
      const sandbox = this.createSandbox(appId, manifest);
      
      // Load app code in sandbox
      const appInstance = await this.executeAppCode(sandbox, code, manifest);
      
      // Store app instance
      this.apps.set(appId, {
        instance: appInstance,
        manifest,
        sandbox,
        state: 'loaded',
        startTime: null,
        metrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          messageCount: 0
        }
      });

      this.postMessage({
        type: 'APP_LOADED',
        appId,
        manifest
      });
    } catch (error) {
      this.postMessage({
        type: 'APP_ERROR',
        appId,
        error: error.message
      });
    }
  }

  validateManifest(manifest) {
    const required = ['id', 'name', 'version', 'capabilities'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required manifest field: ${field}`);
      }
    }

    // Validate permissions
    if (manifest.permissions?.required) {
      for (const permission of manifest.permissions.required) {
        if (!permission.id || !permission.name) {
          throw new Error('Invalid permission definition');
        }
      }
    }

    // Validate capabilities
    if (manifest.capabilities) {
      this.validateCapabilities(manifest.capabilities);
    }
  }

  validateCapabilities(capabilities) {
    // Validate pages
    if (capabilities.pages) {
      for (const page of capabilities.pages) {
        if (!page.id || !page.component) {
          throw new Error('Invalid page definition');
        }
      }
    }

    // Validate widgets
    if (capabilities.widgets) {
      for (const widget of capabilities.widgets) {
        if (!widget.id || !widget.component) {
          throw new Error('Invalid widget definition');
        }
      }
    }

    // Validate cloud functions
    if (capabilities.cloudFunctions) {
      for (const func of capabilities.cloudFunctions) {
        if (!func.name || !func.trigger) {
          throw new Error('Invalid cloud function definition');
        }
      }
    }
  }

  createSandbox(appId, manifest) {
    // Create isolated execution context
    const sandbox = {
      appId,
      manifest,
      console: this.createSandboxConsole(appId),
      setTimeout: this.createSandboxTimeout(appId),
      setInterval: this.createSandboxInterval(appId),
      fetch: this.createSandboxFetch(appId),
      localStorage: this.createSandboxStorage(appId),
      postMessage: (message) => this.handleAppMessage(appId, message),
      
      // Platform APIs
      platform: {
        auth: this.createAuthAPI(appId),
        database: this.createDatabaseAPI(appId),
        ui: this.createUIAPI(appId),
        notifications: this.createNotificationsAPI(appId)
      }
    };

    return sandbox;
  }

  async executeAppCode(sandbox, code, manifest) {
    // Create function with sandbox context
    const appFunction = new Function(
      'sandbox',
      `
        with (sandbox) {
          ${code}
          
          // Return app instance
          if (typeof AppMain === 'function') {
            return new AppMain();
          } else {
            throw new Error('AppMain class not found');
          }
        }
      `
    );

    return appFunction(sandbox);
  }

  startApp(appId) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    try {
      app.state = 'starting';
      app.startTime = Date.now();
      
      // Initialize app
      if (app.instance.initialize) {
        app.instance.initialize();
      }
      
      app.state = 'running';
      
      this.postMessage({
        type: 'APP_STARTED',
        appId
      });
    } catch (error) {
      app.state = 'error';
      this.postMessage({
        type: 'APP_ERROR',
        appId,
        error: error.message
      });
    }
  }

  stopApp(appId) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    try {
      app.state = 'stopping';
      
      // Cleanup app
      if (app.instance.cleanup) {
        app.instance.cleanup();
      }
      
      app.state = 'stopped';
      app.startTime = null;
      
      this.postMessage({
        type: 'APP_STOPPED',
        appId
      });
    } catch (error) {
      this.postMessage({
        type: 'APP_ERROR',
        appId,
        error: error.message
      });
    }
  }

  sendMessageToApp(appId, message) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    if (app.instance.onMessage) {
      app.instance.onMessage(message);
      app.metrics.messageCount++;
    }
  }

  handleAppMessage(appId, message) {
    this.postMessage({
      type: 'APP_MESSAGE',
      appId,
      message
    });
  }

  getAppMetrics(appId) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    const metrics = {
      ...app.metrics,
      uptime: app.startTime ? Date.now() - app.startTime : 0,
      state: app.state
    };

    this.postMessage({
      type: 'APP_METRICS',
      appId,
      metrics
    });
  }

  updatePermissions(appId, permissions) {
    this.permissions.set(appId, permissions);
  }

  // Sandbox API implementations
  createSandboxConsole(appId) {
    return {
      log: (...args) => this.postMessage({
        type: 'CONSOLE_LOG',
        appId,
        level: 'log',
        args
      }),
      warn: (...args) => this.postMessage({
        type: 'CONSOLE_LOG',
        appId,
        level: 'warn',
        args
      }),
      error: (...args) => this.postMessage({
        type: 'CONSOLE_LOG',
        appId,
        level: 'error',
        args
      })
    };
  }

  createSandboxTimeout(appId) {
    return (callback, delay) => {
      return setTimeout(() => {
        try {
          callback();
        } catch (error) {
          this.postMessage({
            type: 'APP_ERROR',
            appId,
            error: error.message
          });
        }
      }, delay);
    };
  }

  createSandboxInterval(appId) {
    return (callback, interval) => {
      return setInterval(() => {
        try {
          callback();
        } catch (error) {
          this.postMessage({
            type: 'APP_ERROR',
            appId,
            error: error.message
          });
        }
      }, interval);
    };
  }

  createSandboxFetch(appId) {
    return async (url, options = {}) => {
      // Check permissions
      const permissions = this.permissions.get(appId) || [];
      if (!permissions.includes('network:fetch')) {
        throw new Error('Network access not permitted');
      }

      // Validate URL
      if (!this.isAllowedURL(url)) {
        throw new Error('URL not allowed');
      }

      return fetch(url, options);
    };
  }

  createSandboxStorage(appId) {
    const storage = new Map();
    
    return {
      getItem: (key) => storage.get(`${appId}:${key}`) || null,
      setItem: (key, value) => storage.set(`${appId}:${key}`, value),
      removeItem: (key) => storage.delete(`${appId}:${key}`),
      clear: () => {
        for (const key of storage.keys()) {
          if (key.startsWith(`${appId}:`)) {
            storage.delete(key);
          }
        }
      }
    };
  }

  createAuthAPI(appId) {
    return {
      getCurrentUser: () => {
        return this.sendPlatformMessage(appId, 'auth:getCurrentUser');
      },
      hasPermission: (permission) => {
        return this.sendPlatformMessage(appId, 'auth:hasPermission', { permission });
      }
    };
  }

  createDatabaseAPI(appId) {
    return {
      query: (className, query) => {
        return this.sendPlatformMessage(appId, 'database:query', { className, query });
      },
      save: (className, object) => {
        return this.sendPlatformMessage(appId, 'database:save', { className, object });
      },
      delete: (className, objectId) => {
        return this.sendPlatformMessage(appId, 'database:delete', { className, objectId });
      }
    };
  }

  createUIAPI(appId) {
    return {
      showNotification: (message, type = 'info') => {
        return this.sendPlatformMessage(appId, 'ui:showNotification', { message, type });
      },
      showModal: (component, props) => {
        return this.sendPlatformMessage(appId, 'ui:showModal', { component, props });
      }
    };
  }

  createNotificationsAPI(appId) {
    return {
      send: (notification) => {
        return this.sendPlatformMessage(appId, 'notifications:send', { notification });
      }
    };
  }

  sendPlatformMessage(appId, action, data = {}) {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      this.messageHandlers.set(messageId, { resolve, reject });
      
      this.postMessage({
        type: 'PLATFORM_REQUEST',
        appId,
        messageId,
        action,
        data
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId);
          reject(new Error('Platform request timeout'));
        }
      }, 30000);
    });
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isAllowedURL(url) {
    // Implement URL whitelist/blacklist logic
    const allowedDomains = [
      'api.tokennexus.com',
      'cdn.tokennexus.com'
    ];
    
    try {
      const urlObj = new URL(url);
      return allowedDomains.includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  postMessage(message) {
    self.postMessage(message);
  }
}

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      messageCount: 0
    };
  }

  getMetrics() {
    // Basic performance metrics
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now()
    };
  }

  updateMetrics(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
  }
}

// Initialize worker runtime
const runtime = new AppWorkerRuntime();

// Handle platform responses
self.addEventListener('message', (event) => {
  const { type, messageId, success, data, error } = event.data;
  
  if (type === 'PLATFORM_RESPONSE') {
    const handler = runtime.messageHandlers.get(messageId);
    if (handler) {
      runtime.messageHandlers.delete(messageId);
      if (success) {
        handler.resolve(data);
      } else {
        handler.reject(new Error(error));
      }
    }
  }
});
```

#### Testing Strategy
```javascript
// tests/worker/app-worker.test.js
describe('App Worker Runtime', () => {
  let worker;

  beforeEach(() => {
    worker = new Worker('/app-worker.js');
  });

  afterEach(() => {
    worker.terminate();
  });

  it('should load and start an app', (done) => {
    const manifest = {
      id: 'test-app',
      name: 'Test App',
      version: '1.0.0',
      capabilities: {}
    };

    const code = `
      class AppMain {
        initialize() {
          console.log('App initialized');
        }
      }
    `;

    worker.postMessage({
      type: 'LOAD_APP',
      appId: 'test-app',
      data: { manifest, code }
    });

    worker.onmessage = (event) => {
      if (event.data.type === 'APP_LOADED') {
        expect(event.data.appId).toBe('test-app');
        done();
      }
    };
  });
});
```

### Task 1.3: Platform Integration (Days 8-12)
**Priority**: Critical  
**Effort**: 5 days  
**Dependencies**: Task 1.1, Task 1.2

#### Implementation Details

**File**: [`src/app-framework/integration/PlatformIntegration.ts`](src/app-framework/integration/PlatformIntegration.ts)
```typescript
import { AppRuntimeManager } from '../runtime/AppRuntimeManager';
import { DashboardService } from '../../services/DashboardService';
import { MarketplaceService } from '../../services/MarketplaceService';
import { PlatformAPIService } from '../../services/PlatformAPIService';
import { AppManifest, AppInstance, PlatformRequest } from '../types';

export class PlatformIntegration {
  private runtimeManager: AppRuntimeManager;
  private dashboardService: DashboardService;
  private marketplaceService: MarketplaceService;
  private platformAPI: PlatformAPIService;

  constructor(
    runtimeManager: AppRuntimeManager,
    dashboardService: DashboardService,
    marketplaceService: MarketplaceService,
    platformAPI: PlatformAPIService
  ) {
    this.runtimeManager = runtimeManager;
    this.dashboardService = dashboardService;
    this.marketplaceService = marketplaceService;
    this.platformAPI = platformAPI;

    this.setupIntegration();
  }

  private setupIntegration() {
    // Handle platform requests from apps
    this.runtimeManager.on('platformRequest', this.handlePlatformRequest.bind(this));
    
    // Handle app lifecycle events
    this.runtimeManager.on('appLoaded', this.handleAppLoaded.bind(this));
    this.runtimeManager.on('appStarted', this.handleAppStarted.bind(this));
    this.runtimeManager.on('appStopped', this.handleAppStopped.bind(this));
    this.runtimeManager.on('appUnloaded', this.handleAppUnloaded.bind(this));
  }

  private async handlePlatformRequest(request: PlatformRequest) {
    const { appId, messageId, action, data } = request;

    try {
      let result;

      switch (action) {
        case 'auth:getCurrentUser':
          result = await this.platformAPI.getCurrentUser();
          break;
        
        case 'auth:hasPermission':
          result = await this.platformAPI.hasPermission(data.permission);
          break;
        
        case 'database:query':
          result = await this.platformAPI.query(data.className, data.query);
          break;
        
        case 'database:save':
          result = await this.platformAPI.save(data.className, data.object);
          break;
        
        case 'database:delete':
          result = await this.platformAPI.delete(data.className, data.objectId);
          break;
        
        case 'ui:showNotification':
          result = await this.platformAPI.showNotification(data.message, data.type);
          break;
        
        case 'ui:showModal':
          result = await this.platformAPI.showModal(data.component, data.props);
          break;
        
        case 'notifications:send':
          result = await this.platformAPI.sendNotification(data.notification);
          break;
        
        default:
          throw new Error(`Unknown platform action: ${action}`);
      }

      // Send success response
      this.runtimeManager.sendPlatformResponse(messageId, true, result);
    } catch (error) {
      // Send error response
      this.runtimeManager.sen
this.runtimeManager.sendPlatformResponse(messageId, false, error.message);
    }
  }

  private async handleAppLoaded(data: { appId: string; manifest: AppManifest }) {
    const { appId, manifest } = data;

    // Register app pages with dashboard
    if (manifest.capabilities?.pages) {
      for (const page of manifest.capabilities.pages) {
        await this.dashboardService.registerAppPage(appId, page);
      }
    }

    // Register app widgets with dashboard
    if (manifest.capabilities?.widgets) {
      for (const widget of manifest.capabilities.widgets) {
        await this.dashboardService.registerAppWidget(appId, widget);
      }
    }

    // Register app with marketplace
    await this.marketplaceService.registerApp(appId, manifest);
  }

  private async handleAppStarted(data: { appId: string }) {
    const { appId } = data;
    
    // Update app status in marketplace
    await this.marketplaceService.updateAppStatus(appId, 'running');
    
    // Enable app pages and widgets
    await this.dashboardService.enableAppComponents(appId);
  }

  private async handleAppStopped(data: { appId: string }) {
    const { appId } = data;
    
    // Update app status in marketplace
    await this.marketplaceService.updateAppStatus(appId, 'stopped');
    
    // Disable app pages and widgets
    await this.dashboardService.disableAppComponents(appId);
  }

  private async handleAppUnloaded(data: { appId: string }) {
    const { appId } = data;
    
    // Unregister app components
    await this.dashboardService.unregisterAppComponents(appId);
    
    // Unregister app from marketplace
    await this.marketplaceService.unregisterApp(appId);
  }
}
```

**File**: [`src/app-framework/integration/DashboardIntegration.ts`](src/app-framework/integration/DashboardIntegration.ts)
```typescript
import { AppRuntimeManager } from '../runtime/AppRuntimeManager';
import { DashboardService } from '../../services/DashboardService';
import { AppPageDefinition, AppWidgetDefinition } from '../types';

export class DashboardIntegration {
  private runtimeManager: AppRuntimeManager;
  private dashboardService: DashboardService;
  private registeredComponents: Map<string, string[]> = new Map();

  constructor(runtimeManager: AppRuntimeManager, dashboardService: DashboardService) {
    this.runtimeManager = runtimeManager;
    this.dashboardService = dashboardService;
  }

  async registerAppPage(appId: string, page: AppPageDefinition) {
    try {
      // Create page route
      const route = {
        path: page.path,
        component: `AppPage_${appId}_${page.id}`,
        permissions: page.permissions,
        scope: page.scope,
        category: page.category,
        appId
      };

      await this.dashboardService.addRoute(route);

      // Track registered component
      const components = this.registeredComponents.get(appId) || [];
      components.push(`page:${page.id}`);
      this.registeredComponents.set(appId, components);

      return route;
    } catch (error) {
      throw new Error(`Failed to register app page: ${error.message}`);
    }
  }

  async registerAppWidget(appId: string, widget: AppWidgetDefinition) {
    try {
      // Create widget definition
      const widgetDef = {
        id: `${appId}_${widget.id}`,
        name: widget.name,
        component: `AppWidget_${appId}_${widget.id}`,
        permissions: widget.permissions,
        defaultSize: widget.defaultSize,
        configurableSize: widget.configurableSize,
        appId
      };

      await this.dashboardService.registerWidget(widgetDef);

      // Track registered component
      const components = this.registeredComponents.get(appId) || [];
      components.push(`widget:${widget.id}`);
      this.registeredComponents.set(appId, components);

      return widgetDef;
    } catch (error) {
      throw new Error(`Failed to register app widget: ${error.message}`);
    }
  }

  async enableAppComponents(appId: string) {
    const components = this.registeredComponents.get(appId) || [];
    
    for (const component of components) {
      const [type, id] = component.split(':');
      
      if (type === 'page') {
        await this.dashboardService.enableRoute(`${appId}_${id}`);
      } else if (type === 'widget') {
        await this.dashboardService.enableWidget(`${appId}_${id}`);
      }
    }
  }

  async disableAppComponents(appId: string) {
    const components = this.registeredComponents.get(appId) || [];
    
    for (const component of components) {
      const [type, id] = component.split(':');
      
      if (type === 'page') {
        await this.dashboardService.disableRoute(`${appId}_${id}`);
      } else if (type === 'widget') {
        await this.dashboardService.disableWidget(`${appId}_${id}`);
      }
    }
  }

  async unregisterAppComponents(appId: string) {
    const components = this.registeredComponents.get(appId) || [];
    
    for (const component of components) {
      const [type, id] = component.split(':');
      
      if (type === 'page') {
        await this.dashboardService.removeRoute(`${appId}_${id}`);
      } else if (type === 'widget') {
        await this.dashboardService.unregisterWidget(`${appId}_${id}`);
      }
    }

    this.registeredComponents.delete(appId);
  }
}
```

#### Testing Strategy
```typescript
// tests/integration/PlatformIntegration.test.ts
import { PlatformIntegration } from '../../src/app-framework/integration/PlatformIntegration';
import { AppRuntimeManager } from '../../src/app-framework/runtime/AppRuntimeManager';

describe('PlatformIntegration', () => {
  let integration: PlatformIntegration;
  let runtimeManager: AppRuntimeManager;

  beforeEach(() => {
    runtimeManager = new AppRuntimeManager({});
    integration = new PlatformIntegration(
      runtimeManager,
      mockDashboardService,
      mockMarketplaceService,
      mockPlatformAPI
    );
  });

  it('should handle platform requests', async () => {
    const request = {
      appId: 'test-app',
      messageId: 'msg-123',
      action: 'auth:getCurrentUser',
      data: {}
    };

    await integration.handlePlatformRequest(request);
    
    expect(mockPlatformAPI.getCurrentUser).toHaveBeenCalled();
  });
});
```

### Task 1.4: Manifest Validation (Days 13-14)
**Priority**: Critical  
**Effort**: 2 days  
**Dependencies**: Task 1.3

#### Implementation Details

**File**: [`src/app-framework/validation/ManifestValidator.ts`](src/app-framework/validation/ManifestValidator.ts)
```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AppManifest, ValidationResult } from '../types';

export class ManifestValidator {
  private ajv: Ajv;
  private manifestSchema: object;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.manifestSchema = this.createManifestSchema();
  }

  validate(manifest: AppManifest): ValidationResult {
    const validate = this.ajv.compile(this.manifestSchema);
    const valid = validate(manifest);

    if (valid) {
      // Perform additional business logic validation
      return this.validateBusinessRules(manifest);
    }

    return {
      valid: false,
      errors: validate.errors?.map(error => ({
        path: error.instancePath,
        message: error.message || 'Validation error',
        value: error.data
      })) || []
    };
  }

  private createManifestSchema(): object {
    return {
      type: 'object',
      required: ['id', 'name', 'version', 'capabilities'],
      properties: {
        id: {
          type: 'string',
          pattern: '^[a-z0-9-]+$',
          minLength: 3,
          maxLength: 50
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+$'
        },
        description: {
          type: 'string',
          maxLength: 500
        },
        author: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            url: { type: 'string', format: 'uri' }
          }
        },
        license: {
          type: 'string',
          minLength: 1
        },
        homepage: {
          type: 'string',
          format: 'uri'
        },
        repository: {
          type: 'object',
          required: ['type', 'url'],
          properties: {
            type: { type: 'string', enum: ['git', 'svn', 'hg'] },
            url: { type: 'string', format: 'uri' }
          }
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10
        },
        category: {
          type: 'string',
          enum: ['productivity', 'finance', 'communication', 'utilities', 'entertainment']
        },
        platform: {
          type: 'object',
          required: ['minVersion'],
          properties: {
            minVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
            maxVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
            compatibility: {
              type: 'array',
              items: { type: 'string', enum: ['web', 'mobile', 'desktop'] }
            }
          }
        },
        capabilities: {
          type: 'object',
          properties: {
            pages: {
              type: 'array',
              items: this.createPageSchema()
            },
            widgets: {
              type: 'array',
              items: this.createWidgetSchema()
            },
            cloudFunctions: {
              type: 'array',
              items: this.createCloudFunctionSchema()
            },
            scheduledJobs: {
              type: 'array',
              items: this.createScheduledJobSchema()
            },
            workflows: {
              type: 'array',
              items: this.createWorkflowSchema()
            },
            routes: {
              type: 'array',
              items: this.createRouteSchema()
            }
          }
        },
        permissions: {
          type: 'object',
          properties: {
            required: {
              type: 'array',
              items: this.createPermissionSchema()
            },
            optional: {
              type: 'array',
              items: this.createPermissionSchema()
            }
          }
        },
        dependencies: {
          type: 'object',
          properties: {
            platform: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            external: {
              type: 'object',
              additionalProperties: { type: 'string' }
            }
          }
        },
        configuration: {
          type: 'object',
          properties: {
            schema: {
              type: 'object'
            },
            ui: {
              type: 'object'
            }
          }
        },
        database: {
          type: 'object',
          properties: {
            classes: {
              type: 'array',
              items: this.createDatabaseClassSchema()
            }
          }
        }
      }
    };
  }

  private createPageSchema(): object {
    return {
      type: 'object',
      required: ['id', 'name', 'path', 'component'],
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        name: { type: 'string', minLength: 1 },
        path: { type: 'string', pattern: '^/[a-z0-9/-]*$' },
        component: { type: 'string', minLength: 1 },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        },
        scope: { type: 'string', enum: ['user', 'organization', 'global'] },
        category: { type: 'string' }
      }
    };
  }

  private createWidgetSchema(): object {
    return {
      type: 'object',
      required: ['id', 'name', 'component'],
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        name: { type: 'string', minLength: 1 },
        component: { type: 'string', minLength: 1 },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        },
        defaultSize: {
          type: 'object',
          required: ['width', 'height'],
          properties: {
            width: { type: 'number', minimum: 1, maximum: 12 },
            height: { type: 'number', minimum: 1, maximum: 12 }
          }
        },
        configurableSize: { type: 'boolean' }
      }
    };
  }

  private createCloudFunctionSchema(): object {
    return {
      type: 'object',
      required: ['name', 'trigger'],
      properties: {
        name: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_]*$' },
        trigger: { type: 'string', enum: ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete'] },
        className: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  private createScheduledJobSchema(): object {
    return {
      type: 'object',
      required: ['name', 'schedule', 'function'],
      properties: {
        name: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_]*$' },
        schedule: { type: 'string' }, // Cron expression
        function: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  private createWorkflowSchema(): object {
    return {
      type: 'object',
      required: ['id', 'name', 'trigger'],
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        name: { type: 'string', minLength: 1 },
        trigger: { type: 'string', enum: ['manual', 'automatic', 'scheduled'] },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  private createRouteSchema(): object {
    return {
      type: 'object',
      required: ['path', 'method', 'function'],
      properties: {
        path: { type: 'string', pattern: '^/[a-z0-9/:_-]*$' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        function: { type: 'string' },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
  }

  private createPermissionSchema(): object {
    return {
      type: 'object',
      required: ['id', 'name', 'description'],
      properties: {
        id: { type: 'string', pattern: '^[a-z0-9_:]+$' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        scope: { type: 'string', enum: ['user', 'organization', 'global'] },
        category: { type: 'string', enum: ['data', 'admin', 'api', 'ui'] }
      }
    };
  }

  private createDatabaseClassSchema(): object {
    return {
      type: 'object',
      required: ['className', 'fields'],
      properties: {
        className: { type: 'string', pattern: '^[A-Z][a-zA-Z0-9]*$' },
        fields: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string' },
              required: { type: 'boolean' },
              default: {},
              targetClass: { type: 'string' }
            }
          }
        },
        indexes: {
          type: 'array',
          items: { type: 'object' }
        },
        classLevelPermissions: {
          type: 'object',
          properties: {
            find: { type: 'object' },
            create: { type: 'object' },
            update: { type: 'object' },
            delete: { type: 'object' }
          }
        }
      }
    };
  }

  private validateBusinessRules(manifest: AppManifest): ValidationResult {
    const errors: Array<{ path: string; message: string; value?: any }> = [];

    // Validate app ID uniqueness (would need to check against database)
    // This is a placeholder for actual implementation
    
    // Validate permission consistency
    if (manifest.capabilities) {
      const allRequiredPermissions = new Set<string>();
      
      // Collect all permissions used in capabilities
      this.collectPermissionsFromCapabilities(manifest.capabilities, allRequiredPermissions);
      
      // Check if all used permissions are declared
      const declaredPermissions = new Set<string>();
      if (manifest.permissions?.required) {
        manifest.permissions.required.forEach(p => declaredPermissions.add(p.id));
      }
      if (manifest.permissions?.optional) {
        manifest.permissions.optional.forEach(p => declaredPermissions.add(p.id));
      }
      
      for (const permission of allRequiredPermissions) {
        if (!declaredPermissions.has(permission)) {
          errors.push({
            path: '/permissions',
            message: `Permission '${permission}' is used but not declared`,
            value: permission
          });
        }
      }
    }

    // Validate version compatibility
    if (manifest.platform?.minVersion && manifest.platform?.maxVersion) {
      if (this.compareVersions(manifest.platform.minVersion, manifest.platform.maxVersion) > 0) {
        errors.push({
          path: '/platform',
          message: 'minVersion cannot be greater than maxVersion'
        });
      }
    }

    // Validate database class names don't conflict with platform classes
    if (manifest.database?.classes) {
      const reservedClassNames = ['_User', '_Role', '_Session', '_Installation'];
      for (const dbClass of manifest.database.classes) {
        if (reservedClassNames.includes(dbClass.className)) {
          errors.push({
            path: '/database/classes',
            message: `Class name '${dbClass.className}' is reserved`,
            value: dbClass.className
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private collectPermissionsFromCapabilities(capabilities: any, permissions: Set<string>) {
    // Collect permissions from pages
    if (capabilities.pages) {
      capabilities.pages.forEach((page: any) => {
        if (page.permissions) {
          page.permissions.forEach((p: string) => permissions.add(p));
        }
      });
    }

    // Collect permissions from widgets
    if (capabilities.widgets) {
      capabilities.widgets.forEach((widget: any) => {
        if (widget.permissions) {
          widget.permissions.forEach((p: string) => permissions.add(p));
        }
      });
    }

    // Collect permissions from cloud functions
    if (capabilities.cloudFunctions) {
      capabilities.cloudFunctions.forEach((func: any) => {
        if (func.permissions) {
          func.permissions.forEach((p: string) => permissions.add(p));
        }
      });
    }

    // Continue for other capability types...
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }
}
```

#### Testing Strategy
```typescript
// tests/validation/ManifestValidator.test.ts
import { ManifestValidator } from '../../src/app-framework/validation/ManifestValidator';

describe('ManifestValidator', () => {
  let validator: ManifestValidator;

  beforeEach(() => {
    validator = new ManifestValidator();
  });

  it('should validate a correct manifest', () => {
    const manifest = {
      id: 'test-app',
      name: 'Test App',
      version: '1.0.0',
      capabilities: {}
    };

    const result = validator.validate(manifest);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid manifest', () => {
    const manifest = {
      id: 'Test App!', // Invalid characters
      name: '',        // Empty name
      version: '1.0',  // Invalid version format
      capabilities: {}
    };

    const result = validator.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

## Phase 2: Enhanced Features (Days 15-23)

### Task 2.1: Error Handling & Recovery (Days 15-16)
**Priority**: High  
**Effort**: 2 days  
**Dependencies**: Phase 1

#### Implementation Details

**File**: [`src/app-framework/error/ErrorHandler.ts`](src/app-framework/error/ErrorHandler.ts)
```typescript
import { AppError, ErrorRecoveryStrategy, ErrorContext } from '../types';
import { Logger } from '../../utils/Logger';

export class AppErrorHandler {
  private logger: Logger;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy>;
  private errorHistory: Map<string, AppError[]>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.recoveryStrategies = new Map();
    this.errorHistory = new Map();
    
    this.setupDefaultRecoveryStrategies();
  }

  async handleError(appId: string, error: Error, context: ErrorContext): Promise<boolean> {
    const appError: AppError = {
      id: this.generateErrorId(),
      appId,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity: this.determineSeverity(error, context)
    };

    // Log error
    this.logger.error('App Runtime Error', {
      appId,
      error: appError,
      context
    });

    // Store error in history
    this.addToErrorHistory(appId, appError);

    // Attempt recovery
    const recovered = await this.attemptRecovery(appId, appError);

    // Notify error handlers
    this.notifyErrorHandlers(appError, recovered);

    return recovered;
  }

  private setupDefaultRecoveryStrategies() {
    // Restart strategy
    this.recoveryStrategies.set('restart', {
      name: 'Restart App',
      canRecover: (error) => error.severity !== 'critical',
      recover: async (appId, error) => {
        try {
          // Stop and restart the app
          await this.restartApp(appId);
          return true;
        } catch (restartError) {
          this.logger.error('Failed to restart app', { appId, restartError });
          return false;
        }
      }
    });

    // Rollback strategy
    this.recoveryStrategies.set('rollback', {
      name: 'Rollback to Previous State',
      canRecover: (error) => error.context.operation === 'state_change',
      recover: async (appId, error) => {
        try {
          await this.rollbackAppState(appId);
          return true;
        } catch (rollbackError) {
          this.logger.error('Failed to rollback app state', { appId, rollbackError });
          return false;
        }
      }
    });

    // Isolation strategy
    this.recoveryStrategies.set('isolate', {
      name: 'Isolate App',
      canRecover: (error) => error.severity === 'critical',
      recover: async (appId, error) => {
        try {
          await this.isolateApp(appId);
          return true;
        } catch (isolationError) {
          this.logger.error('Failed to isolate app', { appId, isolationError });
          return false;
        }
      }
    });
  }

  private async attemptRecovery(appId: string, error: AppError): Promise<boolean> {
    // Try recovery strategies in order of preference
    const strategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.canRecover(error))
      .sort((a, b) => this.getStrategyPriority(b.name) - this.getStrategyPriority(a.name));

    for (const strategy of strategies) {
      this.logger.info(`Attempting recovery strategy: ${strategy.name}`, { appId });
      
      try {
        const recovered = await strategy.recover(appId, error);
        if (recovered) {
          this.logger.info(`Recovery successful: ${strategy.name}`, { appId });
          return true;
        }
      } catch (recoveryError) {
        this.logger.error(`Recovery strategy failed: ${strategy.name}`, {
          appId,
          recoveryError
        });
      }
    }

    this.logger.error('All recovery strategies failed', { appId });
    return false;
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Determine severity based on error type and context
    if (error.name === 'SecurityError' || context.operation === 'permission_check') {
      return 'critical';
    }
    
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'high';
    }
    
    if (context.operation === 'ui_render' || context.operation === 'data_fetch') {
      return 'medium';
    }
    
    return 'low';
  }

  private getStrategyPriority(strategyName: string): number {
    const priorities = {
      'rollback': 3,
      'restart': 2,
      'isolate': 1
    };
    return priorities[strategyName] || 0;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToErrorHistory(appId: string, error: AppError) {
    const history = this.errorHistory.get(appId) || [];
    history.push(error);
    
    // Keep only last 50 errors per app
    if (history.length > 50) {
      history.shift();
    }
    
    this.errorHistory.set(appId, history);
  }

  private async restartApp(appId: string): Promise<void> {
    // Implementation would depend on AppRuntimeManager
    // This is a placeholder
    throw new Error('Not implemented');
  }

  private async rollbackAppState(appId: string): Promise<void> {
    // Implementation would depend on state management
    // This is a placeholder
    throw new Error('Not implemented');
  }

  private async isolateApp(appId: string): Promise<void> {
    // Implementation would depend on isolation mechanism
    // This is a placeholder
    throw new Error('Not implemented');
  }

  private notifyErrorHandlers(error: AppError, recovered: boolean) {
    // Emit events for error monitoring systems
    // This would integrate with platform notification system
  }

  getErrorHistory(appId: string): AppError[] {
    return this.errorHistory.get(appId) || [];
  }

  getErrorStats(appId: string): { total: number; bySeverity: Record<string, number> } {
    const history = this.getErrorHistory(appId);
    const bySeverity = history.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: history.length,
      bySeverity
    };
  }
}
```

### Task 2.2: Performance Monitoring (Days 17-19)
**Priority**: High  
**Effort**: 3 days  
**Dependencies**: Task 2.1

#### Implementation Details

**File**: [`src/app-framework/monitoring/PerformanceMonitor.ts`](src/app-framework/monitoring/PerformanceMonitor.ts)
```typescript
import { AppMetrics, PerformanceAlert, MetricThreshold } from '../types';
import { EventEmitter } from 'events';

export class AppPerformanceMonitor extends EventEmitter {
  private metrics: Map<string, AppMetrics> = new Map();
  private thresholds: Map<string, MetricThreshold> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertHistory: Map<string, PerformanceAlert[]> = new Map();

  constructor() {
    super();
    this.setupDefaultThresholds();
    this.startMonitoring();
  }

  private setupDefaultThresholds() {
    this.thresholds.set('memory', {
      warning: 100 * 1024 * 1024, // 100MB
      critical
: 200 * 1024 * 1024  // 200MB
    });

    this.thresholds.set('cpu', {
      warning: 70, // 70% CPU usage
      critical: 90  // 90% CPU usage
    });

    this.thresholds.set('responseTime', {
      warning: 1000, // 1 second
      critical: 3000  // 3 seconds
    });

    this.thresholds.set('errorRate', {
      warning: 0.05, // 5% error rate
      critical: 0.15  // 15% error rate
    });
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, 5000); // Monitor every 5 seconds
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async collectMetrics() {
    for (const [appId] of this.metrics) {
      try {
        const metrics = await this.gatherAppMetrics(appId);
        this.updateMetrics(appId, metrics);
      } catch (error) {
        console.warn(`Failed to collect metrics for app ${appId}:`, error);
      }
    }
  }

  private async gatherAppMetrics(appId: string): Promise<Partial<AppMetrics>> {
    // This would integrate with the actual app runtime to gather metrics
    // Placeholder implementation
    return {
      memoryUsage: Math.random() * 150 * 1024 * 1024, // Random memory usage
      cpuUsage: Math.random() * 100, // Random CPU usage
      responseTime: Math.random() * 2000, // Random response time
      errorRate: Math.random() * 0.1, // Random error rate
      requestCount: Math.floor(Math.random() * 1000),
      timestamp: Date.now()
    };
  }

  private updateMetrics(appId: string, newMetrics: Partial<AppMetrics>) {
    const currentMetrics = this.metrics.get(appId) || this.createEmptyMetrics(appId);
    const updatedMetrics = { ...currentMetrics, ...newMetrics };
    this.metrics.set(appId, updatedMetrics);
  }

  private createEmptyMetrics(appId: string): AppMetrics {
    return {
      appId,
      memoryUsage: 0,
      cpuUsage: 0,
      responseTime: 0,
      errorRate: 0,
      requestCount: 0,
      uptime: 0,
      timestamp: Date.now()
    };
  }

  private checkThresholds() {
    for (const [appId, metrics] of this.metrics) {
      this.checkMetricThreshold(appId, 'memory', metrics.memoryUsage);
      this.checkMetricThreshold(appId, 'cpu', metrics.cpuUsage);
      this.checkMetricThreshold(appId, 'responseTime', metrics.responseTime);
      this.checkMetricThreshold(appId, 'errorRate', metrics.errorRate);
    }
  }

  private checkMetricThreshold(appId: string, metricName: string, value: number) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    let alertLevel: 'warning' | 'critical' | null = null;

    if (value >= threshold.critical) {
      alertLevel = 'critical';
    } else if (value >= threshold.warning) {
      alertLevel = 'warning';
    }

    if (alertLevel) {
      const alert: PerformanceAlert = {
        id: this.generateAlertId(),
        appId,
        metricName,
        value,
        threshold: threshold[alertLevel],
        level: alertLevel,
        timestamp: new Date(),
        message: `${metricName} ${alertLevel}: ${value} exceeds threshold ${threshold[alertLevel]}`
      };

      this.addAlert(appId, alert);
      this.emit('performanceAlert', alert);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addAlert(appId: string, alert: PerformanceAlert) {
    const alerts = this.alertHistory.get(appId) || [];
    alerts.push(alert);

    // Keep only last 100 alerts per app
    if (alerts.length > 100) {
      alerts.shift();
    }

    this.alertHistory.set(appId, alerts);
  }

  registerApp(appId: string) {
    if (!this.metrics.has(appId)) {
      this.metrics.set(appId, this.createEmptyMetrics(appId));
    }
  }

  unregisterApp(appId: string) {
    this.metrics.delete(appId);
    this.alertHistory.delete(appId);
  }

  getMetrics(appId: string): AppMetrics | null {
    return this.metrics.get(appId) || null;
  }

  getAllMetrics(): Map<string, AppMetrics> {
    return new Map(this.metrics);
  }

  getAlerts(appId: string): PerformanceAlert[] {
    return this.alertHistory.get(appId) || [];
  }

  setThreshold(metricName: string, threshold: MetricThreshold) {
    this.thresholds.set(metricName, threshold);
  }

  getThreshold(metricName: string): MetricThreshold | null {
    return this.thresholds.get(metricName) || null;
  }

  generateReport(appId: string): {
    metrics: AppMetrics | null;
    alerts: PerformanceAlert[];
    summary: {
      totalAlerts: number;
      criticalAlerts: number;
      warningAlerts: number;
      averageResponseTime: number;
      averageCpuUsage: number;
      averageMemoryUsage: number;
    };
  } {
    const metrics = this.getMetrics(appId);
    const alerts = this.getAlerts(appId);

    const summary = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.level === 'critical').length,
      warningAlerts: alerts.filter(a => a.level === 'warning').length,
      averageResponseTime: metrics?.responseTime || 0,
      averageCpuUsage: metrics?.cpuUsage || 0,
      averageMemoryUsage: metrics?.memoryUsage || 0
    };

    return { metrics, alerts, summary };
  }
}
```

### Task 2.3: Security Features (Days 20-22)
**Priority**: High  
**Effort**: 3 days  
**Dependencies**: Task 2.2

#### Implementation Details

**File**: [`src/app-framework/security/SecurityManager.ts`](src/app-framework/security/SecurityManager.ts)
```typescript
import { SecurityPolicy, SecurityViolation, SandboxLevel } from '../types';
import { EventEmitter } from 'events';

export class AppSecurityManager extends EventEmitter {
  private policies: Map<string, SecurityPolicy> = new Map();
  private violations: Map<string, SecurityViolation[]> = new Map();
  private sandboxLevels: Map<string, SandboxLevel> = new Map();

  constructor() {
    super();
    this.setupDefaultPolicies();
  }

  private setupDefaultPolicies() {
    // Network access policy
    this.policies.set('network', {
      id: 'network',
      name: 'Network Access Policy',
      rules: [
        {
          action: 'allow',
          resource: 'https://api.tokennexus.com/*',
          conditions: ['authenticated']
        },
        {
          action: 'deny',
          resource: 'http://*',
          reason: 'Insecure HTTP not allowed'
        },
        {
          action: 'allow',
          resource: 'https://*',
          conditions: ['whitelisted_domain']
        }
      ]
    });

    // File system access policy
    this.policies.set('filesystem', {
      id: 'filesystem',
      name: 'File System Access Policy',
      rules: [
        {
          action: 'deny',
          resource: '/etc/*',
          reason: 'System files access denied'
        },
        {
          action: 'deny',
          resource: '/home/*',
          reason: 'User files access denied'
        },
        {
          action: 'allow',
          resource: '/tmp/app-*',
          conditions: ['app_owned']
        }
      ]
    });

    // API access policy
    this.policies.set('api', {
      id: 'api',
      name: 'Platform API Access Policy',
      rules: [
        {
          action: 'allow',
          resource: 'platform:auth:*',
          conditions: ['valid_permission']
        },
        {
          action: 'allow',
          resource: 'platform:database:*',
          conditions: ['valid_permission', 'organization_scope']
        },
        {
          action: 'deny',
          resource: 'platform:admin:*',
          reason: 'Admin APIs not accessible to apps'
        }
      ]
    });
  }

  setSandboxLevel(appId: string, level: SandboxLevel) {
    this.sandboxLevels.set(appId, level);
  }

  getSandboxLevel(appId: string): SandboxLevel {
    return this.sandboxLevels.get(appId) || 'strict';
  }

  async checkAccess(appId: string, resource: string, action: string, context: any = {}): Promise<boolean> {
    try {
      // Get applicable policies
      const policies = this.getApplicablePolicies(resource);
      
      // Check each policy
      for (const policy of policies) {
        const result = await this.evaluatePolicy(appId, policy, resource, action, context);
        
        if (result.decision === 'deny') {
          await this.recordViolation(appId, {
            id: this.generateViolationId(),
            appId,
            resource,
            action,
            policy: policy.id,
            reason: result.reason || 'Access denied by policy',
            timestamp: new Date(),
            severity: 'medium'
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      await this.recordViolation(appId, {
        id: this.generateViolationId(),
        appId,
        resource,
        action,
        policy: 'system',
        reason: `Security check failed: ${error.message}`,
        timestamp: new Date(),
        severity: 'high'
      });
      return false;
    }
  }

  private getApplicablePolicies(resource: string): SecurityPolicy[] {
    const applicable: SecurityPolicy[] = [];

    for (const policy of this.policies.values()) {
      if (this.isPolicyApplicable(policy, resource)) {
        applicable.push(policy);
      }
    }

    return applicable;
  }

  private isPolicyApplicable(policy: SecurityPolicy, resource: string): boolean {
    return policy.rules.some(rule => this.matchesPattern(resource, rule.resource));
  }

  private matchesPattern(resource: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(resource);
  }

  private async evaluatePolicy(
    appId: string,
    policy: SecurityPolicy,
    resource: string,
    action: string,
    context: any
  ): Promise<{ decision: 'allow' | 'deny'; reason?: string }> {
    // Find matching rules
    const matchingRules = policy.rules.filter(rule => 
      this.matchesPattern(resource, rule.resource)
    );

    // Process rules in order (first match wins)
    for (const rule of matchingRules) {
      if (rule.conditions) {
        const conditionsMet = await this.checkConditions(appId, rule.conditions, context);
        if (!conditionsMet) {
          continue;
        }
      }

      return {
        decision: rule.action as 'allow' | 'deny',
        reason: rule.reason
      };
    }

    // Default to deny if no rules match
    return {
      decision: 'deny',
      reason: 'No matching policy rule found'
    };
  }

  private async checkConditions(appId: string, conditions: string[], context: any): Promise<boolean> {
    for (const condition of conditions) {
      const met = await this.checkCondition(appId, condition, context);
      if (!met) {
        return false;
      }
    }
    return true;
  }

  private async checkCondition(appId: string, condition: string, context: any): Promise<boolean> {
    switch (condition) {
      case 'authenticated':
        return context.user && context.user.authenticated;
      
      case 'valid_permission':
        return context.permission && await this.hasPermission(appId, context.permission);
      
      case 'organization_scope':
        return context.organizationId && await this.isValidOrganization(appId, context.organizationId);
      
      case 'whitelisted_domain':
        return await this.isDomainWhitelisted(context.domain);
      
      case 'app_owned':
        return context.path && context.path.includes(appId);
      
      default:
        return false;
    }
  }

  private async hasPermission(appId: string, permission: string): Promise<boolean> {
    // This would integrate with the permission system
    // Placeholder implementation
    return true;
  }

  private async isValidOrganization(appId: string, organizationId: string): Promise<boolean> {
    // This would validate organization access
    // Placeholder implementation
    return true;
  }

  private async isDomainWhitelisted(domain: string): Promise<boolean> {
    const whitelist = [
      'api.tokennexus.com',
      'cdn.tokennexus.com',
      'docs.tokennexus.com'
    ];
    return whitelist.includes(domain);
  }

  private async recordViolation(appId: string, violation: SecurityViolation) {
    const violations = this.violations.get(appId) || [];
    violations.push(violation);

    // Keep only last 100 violations per app
    if (violations.length > 100) {
      violations.shift();
    }

    this.violations.set(appId, violations);

    // Emit security event
    this.emit('securityViolation', violation);

    // Take action based on severity
    await this.handleViolation(violation);
  }

  private async handleViolation(violation: SecurityViolation) {
    switch (violation.severity) {
      case 'critical':
        // Immediately isolate the app
        this.emit('isolateApp', violation.appId);
        break;
      
      case 'high':
        // Increase monitoring and alert administrators
        this.emit('increaseMonitoring', violation.appId);
        break;
      
      case 'medium':
        // Log and continue monitoring
        console.warn('Security violation detected:', violation);
        break;
      
      case 'low':
        // Just log
        console.info('Minor security violation:', violation);
        break;
    }
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addPolicy(policy: SecurityPolicy) {
    this.policies.set(policy.id, policy);
  }

  removePolicy(policyId: string) {
    this.policies.delete(policyId);
  }

  getPolicy(policyId: string): SecurityPolicy | null {
    return this.policies.get(policyId) || null;
  }

  getViolations(appId: string): SecurityViolation[] {
    return this.violations.get(appId) || [];
  }

  getSecurityReport(appId: string): {
    violations: SecurityViolation[];
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highViolations: number;
      mediumViolations: number;
      lowViolations: number;
    };
    sandboxLevel: SandboxLevel;
  } {
    const violations = this.getViolations(appId);
    const summary = {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      highViolations: violations.filter(v => v.severity === 'high').length,
      mediumViolations: violations.filter(v => v.severity === 'medium').length,
      lowViolations: violations.filter(v => v.severity === 'low').length
    };

    return {
      violations,
      summary,
      sandboxLevel: this.getSandboxLevel(appId)
    };
  }
}
```

### Task 2.4: Development Tools (Days 23)
**Priority**: Medium  
**Effort**: 1 day  
**Dependencies**: Task 2.3

#### Implementation Details

**File**: [`src/app-framework/dev-tools/AppDebugger.ts`](src/app-framework/dev-tools/AppDebugger.ts)
```typescript
import { DebugSession, DebugEvent, Breakpoint } from '../types';
import { EventEmitter } from 'events';

export class AppDebugger extends EventEmitter {
  private sessions: Map<string, DebugSession> = new Map();
  private breakpoints: Map<string, Breakpoint[]> = new Map();
  private debugMode: Map<string, boolean> = new Map();

  enableDebugMode(appId: string) {
    this.debugMode.set(appId, true);
    this.emit('debugModeEnabled', { appId });
  }

  disableDebugMode(appId: string) {
    this.debugMode.set(appId, false);
    this.sessions.delete(appId);
    this.breakpoints.delete(appId);
    this.emit('debugModeDisabled', { appId });
  }

  isDebugMode(appId: string): boolean {
    return this.debugMode.get(appId) || false;
  }

  createDebugSession(appId: string): DebugSession {
    const session: DebugSession = {
      id: this.generateSessionId(),
      appId,
      startTime: new Date(),
      events: [],
      variables: new Map(),
      callStack: []
    };

    this.sessions.set(appId, session);
    return session;
  }

  addBreakpoint(appId: string, breakpoint: Breakpoint) {
    const breakpoints = this.breakpoints.get(appId) || [];
    breakpoints.push(breakpoint);
    this.breakpoints.set(appId, breakpoints);
  }

  removeBreakpoint(appId: string, breakpointId: string) {
    const breakpoints = this.breakpoints.get(appId) || [];
    const filtered = breakpoints.filter(bp => bp.id !== breakpointId);
    this.breakpoints.set(appId, filtered);
  }

  logDebugEvent(appId: string, event: DebugEvent) {
    if (!this.isDebugMode(appId)) return;

    const session = this.sessions.get(appId);
    if (session) {
      session.events.push(event);
      
      // Keep only last 1000 events
      if (session.events.length > 1000) {
        session.events.shift();
      }
    }

    this.emit('debugEvent', { appId, event });
  }

  getDebugSession(appId: string): DebugSession | null {
    return this.sessions.get(appId) || null;
  }

  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Phase 3: Advanced Features (Days 24-30)

### Task 3.1: Hot Reloading (Days 24-26)
**Priority**: Low  
**Effort**: 3 days  
**Dependencies**: Phase 2

#### Implementation Details

**File**: [`src/app-framework/hot-reload/HotReloadManager.ts`](src/app-framework/hot-reload/HotReloadManager.ts)
```typescript
import { AppRuntimeManager } from '../runtime/AppRuntimeManager';
import { FileWatcher } from '../../utils/FileWatcher';
import { EventEmitter } from 'events';

export class HotReloadManager extends EventEmitter {
  private runtimeManager: AppRuntimeManager;
  private fileWatcher: FileWatcher;
  private watchedApps: Map<string, string> = new Map(); // appId -> path

  constructor(runtimeManager: AppRuntimeManager) {
    super();
    this.runtimeManager = runtimeManager;
    this.fileWatcher = new FileWatcher();
    this.setupFileWatcher();
  }

  private setupFileWatcher() {
    this.fileWatcher.on('fileChanged', async (filePath: string) => {
      const appId = this.getAppIdFromPath(filePath);
      if (appId) {
        await this.reloadApp(appId);
      }
    });
  }

  enableHotReload(appId: string, appPath: string) {
    this.watchedApps.set(appId, appPath);
    this.fileWatcher.watch(appPath);
    this.emit('hotReloadEnabled', { appId, appPath });
  }

  disableHotReload(appId: string) {
    const appPath = this.watchedApps.get(appId);
    if (appPath) {
      this.fileWatcher.unwatch(appPath);
      this.watchedApps.delete(appId);
      this.emit('hotReloadDisabled', { appId });
    }
  }

  private async reloadApp(appId: string) {
    try {
      this.emit('reloadStarted', { appId });
      
      // Stop the app
      await this.runtimeManager.stopApp(appId);
      
      // Reload the app code
      await this.runtimeManager.reloadApp(appId);
      
      // Start the app
      await this.runtimeManager.startApp(appId);
      
      this.emit('reloadCompleted', { appId });
    } catch (error) {
      this.emit('reloadFailed', { appId, error });
    }
  }

  private getAppIdFromPath(filePath: string): string | null {
    for (const [appId, appPath] of this.watchedApps) {
      if (filePath.startsWith(appPath)) {
        return appId;
      }
    }
    return null;
  }
}
```

### Task 3.2: Advanced Analytics (Days 27-29)
**Priority**: Low  
**Effort**: 3 days  
**Dependencies**: Task 3.1

#### Implementation Details

**File**: [`src/app-framework/analytics/AppAnalytics.ts`](src/app-framework/analytics/AppAnalytics.ts)
```typescript
import { AnalyticsEvent, UsageMetrics, PerformanceMetrics } from '../types';
import { EventEmitter } from 'events';

export class AppAnalytics extends EventEmitter {
  private events: Map<string, AnalyticsEvent[]> = new Map();
  private usageMetrics: Map<string, UsageMetrics> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();

  trackEvent(appId: string, event: AnalyticsEvent) {
    const events = this.events.get(appId) || [];
    events.push(event);
    
    // Keep only last 10000 events per app
    if (events.length > 10000) {
      events.shift();
    }
    
    this.events.set(appId, events);
    this.updateUsageMetrics(appId, event);
    this.emit('eventTracked', { appId, event });
  }

  private updateUsageMetrics(appId: string, event: AnalyticsEvent) {
    const metrics = this.usageMetrics.get(appId) || this.createEmptyUsageMetrics(appId);
    
    metrics.totalEvents++;
    metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
    metrics.lastActivity = new Date();
    
    this.usageMetrics.set(appId, metrics);
  }

  private createEmptyUsageMetrics(appId: string): UsageMetrics {
    return {
      appId,
      totalEvents: 0,
      eventsByType: {},
      sessionCount: 0,
      averageSessionDuration: 0,
      lastActivity: new Date(),
      createdAt: new Date()
    };
  }

  generateReport(appId: string, timeRange: { start: Date; end: Date }) {
    const events = this.getEventsInRange(appId, timeRange);
    const usageMetrics = this.usageMetrics.get(appId);
    const performanceMetrics = this.performanceMetrics.get(appId);

    return {
      appId,
      timeRange,
      eventCount: events.length,
      events,
      usageMetrics,
      performanceMetrics,
      insights: this.generateInsights(events)
    };
  }

  private getEventsInRange(appId: string, timeRange: { start: Date; end: Date }): AnalyticsEvent[] {
    const events = this.events.get(appId) || [];
    return events.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );
  }

  private generateInsights(events: AnalyticsEvent[]): any {
    // Generate insights from events
    return {
      mostUsedFeatures: this.getMostUsedFeatures(events),
      peakUsageHours: this.getPeakUsageHours(events),
      userBehaviorPatterns: this.getUserBehaviorPatterns(events)
    };
  }

  private getMostUsedFeatures(events: AnalyticsEvent[]): any[] {
    const featureUsage = events.reduce((acc, event) => {
      if (event.properties?.feature) {
        acc[event.properties.feature] = (acc[event.properties.feature] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([feature, count]) => ({ feature, count }));
  }

  private getPeakUsageHours(events: AnalyticsEvent[]): number[] {
    const hourlyUsage = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyUsage[hour]++;
    });

    return hourlyUsage;
  }

  private getUserBehaviorPatterns(events: AnalyticsEvent[]): any {
    // Analyze user behavior patterns
    return {
      averageSessionLength: this.calculateAverageSessionLength(events),
      commonUserFlows: this.identifyCommonUserFlows(events),
      dropOffPoints: this.identifyDropOffPoints(events)
    };
  }

  private calculateAverageSessionLength(events: AnalyticsEvent[]): number {
    // Calculate average session length from events
    return 0; // Placeholder
  }

  private identifyCommonUserFlows(events: AnalyticsEvent[]): any[] {
    // Identify common user flows
    return []; // Placeholder
  }

  private identifyDropOffPoints(events: AnalyticsEvent[]): any[] {
    // Identify where users commonly drop off
    return []; // Placeholder
  }
}
```

### Task 3.3: Documentation Integration (Days 30)
**Priority**: Low  
**Effort**: 1 day  
**Dependencies**: Task 3.2

#### Implementation Details

**File**: [`src/app-framework/docs/DocumentationManager.ts`](src/app-framework/docs/DocumentationManager.ts)
```typescript
import { AppManifest, DocumentationSection } from '../types';

export class DocumentationManager {
  private documentation: Map<string, DocumentationSection[]> = new Map();

  registerAppDocumentation(appId: string, manifest: AppManifest) {
    const sections: DocumentationSection[] = [];

    // Generate documentation from manifest
    sections.push(this.generateOverviewSection(manifest));
    sections.push(this.generateInstallationSection(manifest));
    sections.push(this.generateConfigurationSection(manifest));
    sections.push(this.generateAPISection(manifest));
    sections.push(this.generatePermissionsSection(manifest));

    this.documentation.set(appId, sections);
  }

  private generateOverviewSection(manifest: AppManifest): DocumentationSection {
    return {
      id: 'overview',
      title: 'Overview',
      content: `
# ${manifest.name}

${manifest.description}

**Version:** ${manifest.version}  
**Author:** ${manifest.author?.name}  
**Category:** ${manifest.category}  
**License:** ${manifest.license}

## Features

${this.generateFeaturesList(manifest)}
      `.trim()
    };
  }

  private generateInstallationSection(manifest: AppManifest): DocumentationSection {
    return {
      id: 'installation',
      title: 'Installation',
      content: `
# Installation

This application can be installed through the Token Nexus Platform marketplace.

## Requirements

- Platform version: ${manifest.platform?.minVersion} or higher
- Required permissions: ${manifest.permissions?.required?.map(p => p.name).join(', ') || 'None'}

## Installation Steps

1. Navigate to the marketplace
2. Search for "${manifest.name}"
3. Click "Install"
4. Configure the application settings
5. Grant required permissions
      `.trim()
    };
  }

  private generateConfigurationSection(manifest: AppManifest): DocumentationSection {
    let content = '# Configuration\n\n';

    if (manifest.configuration?.schema) {
      content += 'This application supports the following configuration options:\n\n';
      
      const schema = manifest.configuration.schema;
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties as any)) {
          content += `## ${key}\n\n`;
          content += `- **Type:** ${prop.type}\n`;
          content += `- **Description:** ${prop.description || 'No description available'}\n`;
          if (prop.default !== undefined) {
            content += `- **Default:** ${JSON.stringify(prop.default)}\n`;
          }
          content += '\n';
        }
      }
    } else {
      content += 'This application does not require configuration.\n';
    }

    return {
      id: 'configuration',
      title: 'Configuration',
      content: content.trim()
};
  }

  private generateAPISection(manifest: AppManifest): DocumentationSection {
    let content = '# API Reference\n\n';

    if (manifest.capabilities?.routes) {
      content += '## API Endpoints\n\n';
      
      for (const route of manifest.capabilities.routes) {
        content += `### ${route.method} ${route.path}\n\n`;
        content += `**Function:** ${route.function}\n`;
        if (route.permissions) {
          content += `**Required Permissions:** ${route.permissions.join(', ')}\n`;
        }
        content += '\n';
      }
    }

    if (manifest.capabilities?.cloudFunctions) {
      content += '## Cloud Functions\n\n';
      
      for (const func of manifest.capabilities.cloudFunctions) {
        content += `### ${func.name}\n\n`;
        content += `**Trigger:** ${func.trigger}\n`;
        if (func.className) {
          content += `**Class:** ${func.className}\n`;
        }
        if (func.permissions) {
          content += `**Required Permissions:** ${func.permissions.join(', ')}\n`;
        }
        content += '\n';
      }
    }

    return {
      id: 'api',
      title: 'API Reference',
      content: content.trim()
    };
  }

  private generatePermissionsSection(manifest: AppManifest): DocumentationSection {
    let content = '# Permissions\n\n';

    if (manifest.permissions?.required) {
      content += '## Required Permissions\n\n';
      
      for (const permission of manifest.permissions.required) {
        content += `### ${permission.name}\n\n`;
        content += `**ID:** ${permission.id}\n`;
        content += `**Description:** ${permission.description}\n`;
        content += `**Scope:** ${permission.scope}\n`;
        content += `**Category:** ${permission.category}\n\n`;
      }
    }

    if (manifest.permissions?.optional) {
      content += '## Optional Permissions\n\n';
      
      for (const permission of manifest.permissions.optional) {
        content += `### ${permission.name}\n\n`;
        content += `**ID:** ${permission.id}\n`;
        content += `**Description:** ${permission.description}\n`;
        content += `**Scope:** ${permission.scope}\n`;
        content += `**Category:** ${permission.category}\n\n`;
      }
    }

    return {
      id: 'permissions',
      title: 'Permissions',
      content: content.trim()
    };
  }

  private generateFeaturesList(manifest: AppManifest): string {
    const features: string[] = [];

    if (manifest.capabilities?.pages) {
      features.push(`- **${manifest.capabilities.pages.length} Custom Pages:** Extends the platform with new functionality`);
    }

    if (manifest.capabilities?.widgets) {
      features.push(`- **${manifest.capabilities.widgets.length} Dashboard Widgets:** Provides at-a-glance information`);
    }

    if (manifest.capabilities?.cloudFunctions) {
      features.push(`- **${manifest.capabilities.cloudFunctions.length} Cloud Functions:** Server-side processing capabilities`);
    }

    if (manifest.capabilities?.workflows) {
      features.push(`- **${manifest.capabilities.workflows.length} Workflows:** Automated business processes`);
    }

    return features.join('\n');
  }

  getDocumentation(appId: string): DocumentationSection[] {
    return this.documentation.get(appId) || [];
  }

  getDocumentationSection(appId: string, sectionId: string): DocumentationSection | null {
    const sections = this.getDocumentation(appId);
    return sections.find(section => section.id === sectionId) || null;
  }

  updateDocumentation(appId: string, sections: DocumentationSection[]) {
    this.documentation.set(appId, sections);
  }

  removeDocumentation(appId: string) {
    this.documentation.delete(appId);
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// tests/app-framework/AppRuntimeFramework.test.ts
import { AppRuntimeManager } from '../src/app-framework/runtime/AppRuntimeManager';
import { useAppRuntime } from '../src/app-framework/hooks/useAppRuntime';
import { ManifestValidator } from '../src/app-framework/validation/ManifestValidator';

describe('App Runtime Framework', () => {
  describe('AppRuntimeManager', () => {
    let runtimeManager: AppRuntimeManager;

    beforeEach(() => {
      runtimeManager = new AppRuntimeManager({
        maxApps: 10,
        memoryLimit: 512 * 1024 * 1024
      });
    });

    it('should initialize successfully', async () => {
      await runtimeManager.initialize();
      expect(runtimeManager.isInitialized()).toBe(true);
    });

    it('should load and start an app', async () => {
      const manifest = createTestManifest();
      const instance = await runtimeManager.loadApp('test-app', manifest);
      
      expect(instance).toBeDefined();
      expect(instance.state).toBe('loaded');
      
      await runtimeManager.startApp('test-app');
      expect(instance.state).toBe('running');
    });

    it('should handle app errors gracefully', async () => {
      const manifest = createTestManifest();
      await runtimeManager.loadApp('test-app', manifest);
      
      // Simulate app error
      const errorHandler = jest.fn();
      runtimeManager.on('error', errorHandler);
      
      // Trigger error condition
      await runtimeManager.sendMessage('test-app', { type: 'invalid' });
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('ManifestValidator', () => {
    let validator: ManifestValidator;

    beforeEach(() => {
      validator = new ManifestValidator();
    });

    it('should validate correct manifest', () => {
      const manifest = createValidManifest();
      const result = validator.validate(manifest);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid manifest', () => {
      const manifest = createInvalidManifest();
      const result = validator.validate(manifest);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

function createTestManifest() {
  return {
    id: 'test-app',
    name: 'Test App',
    version: '1.0.0',
    capabilities: {
      pages: [],
      widgets: []
    },
    permissions: {
      required: []
    }
  };
}

function createValidManifest() {
  return {
    id: 'valid-app',
    name: 'Valid App',
    version: '1.0.0',
    description: 'A valid test application',
    author: {
      name: 'Test Author',
      email: 'test@example.com'
    },
    capabilities: {},
    permissions: {
      required: []
    }
  };
}

function createInvalidManifest() {
  return {
    id: 'Invalid App!', // Invalid characters
    name: '',           // Empty name
    version: '1.0',     // Invalid version format
    capabilities: {}
  };
}
```

### Integration Tests
```typescript
// tests/integration/AppRuntimeIntegration.test.ts
import { AppRuntimeManager } from '../src/app-framework/runtime/AppRuntimeManager';
import { PlatformIntegration } from '../src/app-framework/integration/PlatformIntegration';
import { DashboardService } from '../src/services/DashboardService';

describe('App Runtime Integration', () => {
  let runtimeManager: AppRuntimeManager;
  let platformIntegration: PlatformIntegration;
  let dashboardService: DashboardService;

  beforeEach(async () => {
    runtimeManager = new AppRuntimeManager({});
    dashboardService = new DashboardService();
    platformIntegration = new PlatformIntegration(
      runtimeManager,
      dashboardService,
      mockMarketplaceService,
      mockPlatformAPI
    );

    await runtimeManager.initialize();
  });

  it('should integrate app with dashboard', async () => {
    const manifest = {
      id: 'integration-test-app',
      name: 'Integration Test App',
      version: '1.0.0',
      capabilities: {
        pages: [{
          id: 'test-page',
          name: 'Test Page',
          path: '/test',
          component: 'TestPage',
          permissions: []
        }],
        widgets: [{
          id: 'test-widget',
          name: 'Test Widget',
          component: 'TestWidget',
          permissions: []
        }]
      },
      permissions: { required: [] }
    };

    await runtimeManager.loadApp('integration-test-app', manifest);
    
    // Verify dashboard integration
    const routes = await dashboardService.getRoutes();
    expect(routes.some(r => r.appId === 'integration-test-app')).toBe(true);
    
    const widgets = await dashboardService.getWidgets();
    expect(widgets.some(w => w.appId === 'integration-test-app')).toBe(true);
  });
});
```

### End-to-End Tests
```typescript
// tests/e2e/AppRuntime.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('App Runtime E2E', () => {
  test('should install and run an app', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace');
    
    // Install test app
    await page.click('[data-testid="install-test-app"]');
    await page.waitForSelector('[data-testid="app-installed"]');
    
    // Navigate to app page
    await page.goto('/test-app');
    
    // Verify app is running
    await expect(page.locator('[data-testid="app-content"]')).toBeVisible();
    
    // Test app functionality
    await page.click('[data-testid="app-button"]');
    await expect(page.locator('[data-testid="app-result"]')).toContainText('Success');
  });

  test('should handle app errors gracefully', async ({ page }) => {
    // Navigate to app with error
    await page.goto('/error-app');
    
    // Verify error boundary is shown
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('App Error');
    
    // Test recovery
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="app-content"]')).toBeVisible();
  });
});
```

## Deployment Plan

### Phase 1: Core Infrastructure (Days 1-14)
1. **Deploy React Hooks** - Update frontend build process
2. **Deploy Web Worker** - Add worker script to public assets
3. **Deploy Platform Integration** - Update backend services
4. **Deploy Manifest Validation** - Add validation middleware

### Phase 2: Enhanced Features (Days 15-23)
1. **Deploy Error Handling** - Update error handling middleware
2. **Deploy Performance Monitoring** - Add monitoring services
3. **Deploy Security Features** - Update security policies
4. **Deploy Development Tools** - Add debug endpoints

### Phase 3: Advanced Features (Days 24-30)
1. **Deploy Hot Reloading** - Add file watching services
2. **Deploy Analytics** - Add analytics collection
3. **Deploy Documentation** - Update documentation system

## Success Criteria

### Critical Success Criteria (Must Have)
- [ ] React hooks successfully integrate apps with frontend
- [ ] Web worker provides secure app execution environment
- [ ] Platform integration enables seamless app functionality
- [ ] Manifest validation prevents invalid apps from loading
- [ ] Error handling provides graceful failure recovery
- [ ] Performance monitoring tracks app resource usage
- [ ] Security features prevent unauthorized access

### High Priority Success Criteria (Should Have)
- [ ] Development tools enable effective app debugging
- [ ] Hot reloading speeds up development workflow
- [ ] Analytics provide insights into app usage
- [ ] Documentation system generates comprehensive guides

### Performance Benchmarks
- [ ] App loading time < 2 seconds
- [ ] Memory usage per app < 100MB baseline
- [ ] CPU usage per app < 10% baseline
- [ ] Error recovery time < 5 seconds
- [ ] Security policy evaluation < 100ms

### Security Requirements
- [ ] All apps run in isolated sandboxes
- [ ] Permission system prevents unauthorized access
- [ ] Security violations are detected and handled
- [ ] Audit logs capture all security events
- [ ] Network access is properly restricted

## Risk Mitigation

### High Risk: Web Worker Compatibility
- **Risk**: Browser compatibility issues with web workers
- **Mitigation**: Implement fallback execution mode for unsupported browsers
- **Contingency**: Provide server-side execution option

### Medium Risk: Performance Impact
- **Risk**: App runtime framework impacts platform performance
- **Mitigation**: Implement resource limits and monitoring
- **Contingency**: Add app suspension/throttling mechanisms

### Medium Risk: Security Vulnerabilities
- **Risk**: Apps could exploit security weaknesses
- **Mitigation**: Comprehensive security testing and sandboxing
- **Contingency**: Emergency app isolation and removal capabilities

### Low Risk: Integration Complexity
- **Risk**: Complex integration with existing platform components
- **Mitigation**: Incremental integration with thorough testing
- **Contingency**: Rollback mechanisms for failed integrations

## Dependencies

### Internal Dependencies
- **Authentication & Authorization**: Required for app permission validation
- **Backend Architecture**: Required for cloud function integration
- **Frontend Architecture**: Required for UI component integration
- **Dashboard Widgets**: Required for widget registration

### External Dependencies
- **Parse Server**: For cloud function execution
- **React**: For frontend hook integration
- **Web Workers API**: For app isolation
- **File System Watchers**: For hot reloading

## Conclusion

This implementation plan provides a comprehensive roadmap for completing the App Runtime Framework. The 30-day timeline is aggressive but achievable with focused development effort. The framework will enable secure, performant, and well-integrated installable applications that extend the Token Nexus Platform's capabilities while maintaining security and user experience standards.

The phased approach ensures that critical functionality is delivered first, with enhanced and advanced features following in logical progression. Comprehensive testing and security measures ensure the framework meets enterprise-grade requirements for a production platform.