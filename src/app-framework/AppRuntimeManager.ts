/**
 * App Runtime Manager - Core orchestration for app loading, execution, and lifecycle management
 * Part of Phase 3: App Runtime Framework
 */

import {
  AppConfig,
  AppInstance,
  AppManifest,
  ResourceLimits,
  ResourceUsage,
  Permission
} from './types/AppManifest';
import { PermissionManager, PermissionContext } from './PermissionManager';
import { ResourceMonitor } from './ResourceMonitor';
import { APIProxy, ProxyConfig } from './APIProxy';

export interface AppRuntimeConfig {
  maxConcurrentApps: number;
  defaultResourceLimits: ResourceLimits;
  workerScriptPath: string;
  apiProxyConfig: ProxyConfig;
}

export interface AppLoadOptions {
  autoStart?: boolean;
  customConfig?: Record<string, any>;
  resourceOverrides?: Partial<ResourceLimits>;
}

export interface AppMessage {
  type: string;
  payload: any;
  requestId?: string;
}

export class AppRuntimeManager {
  private instances: Map<string, AppInstance> = new Map();
  private permissionManager: PermissionManager;
  private resourceMonitor: ResourceMonitor;
  private apiProxy: APIProxy;
  private config: AppRuntimeConfig;
  private messageHandlers: Map<string, Map<string, (payload: any) => void>> = new Map();

  constructor(config: AppRuntimeConfig) {
    this.config = config;
    this.permissionManager = new PermissionManager();
    this.resourceMonitor = new ResourceMonitor();
    this.apiProxy = new APIProxy(
      this.permissionManager,
      this.resourceMonitor,
      config.apiProxyConfig
    );

    this.setupGlobalHandlers();
  }

  /**
   * Load and initialize an app
   */
  async loadApp(appId: string, manifest: AppManifest, options: AppLoadOptions = {}): Promise<AppInstance> {
    try {
      // Check if app is already loaded
      if (this.instances.has(appId)) {
        throw new Error(`App ${appId} is already loaded`);
      }

      // Check concurrent app limit
      if (this.instances.size >= this.config.maxConcurrentApps) {
        throw new Error('Maximum concurrent apps limit reached');
      }

      // Validate manifest
      const validationResult = this.permissionManager.validateManifestPermissions(manifest);
      if (!validationResult.valid) {
        throw new Error(`Invalid manifest: ${validationResult.errors.join(', ')}`);
      }

      // Create resource limits
      const resourceLimits = {
        ...this.config.defaultResourceLimits,
        ...manifest.resources,
        ...options.resourceOverrides
      };

      // Register permissions
      this.permissionManager.registerAppPermissions(appId, manifest);
      this.resourceMonitor.setLimits(appId, resourceLimits);

      // Create web worker
      const worker = await this.createWorker(appId, manifest);

      // Create app instance
      const instance: AppInstance = {
        id: appId,
        worker,
        permissions: manifest.permissions,
        state: 'loading',
        resourceUsage: {
          memory: 0,
          cpu: 0,
          storage: 0,
          networkRequests: 0,
          apiCalls: 0,
          timestamp: new Date()
        },
        manifest,
        startTime: new Date(),
        lastActivity: new Date()
      };

      // Store instance
      this.instances.set(appId, instance);

      // Set up worker message handling
      this.setupWorkerHandlers(appId, worker);

      // Initialize app in worker
      await this.initializeWorker(appId, manifest);

      // Auto-start if requested
      if (options.autoStart !== false) {
        await this.startApp(appId);
      }

      return instance;

    } catch (error) {
      // Cleanup on failure
      this.permissionManager.unregisterAppPermissions(appId);
      this.resourceMonitor.clearUsage(appId);
      this.instances.delete(appId);
      
      throw new Error(`Failed to load app ${appId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unload an app and cleanup resources
   */
  async unloadApp(appId: string): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    try {
      // Stop app if running
      if (instance.state === 'running') {
        await this.stopApp(appId);
      }

      // Send shutdown message to worker
      instance.worker.postMessage({
        type: 'SHUTDOWN',
        payload: { appId }
      });

      // Terminate worker
      instance.worker.terminate();

      // Cleanup resources
      this.permissionManager.unregisterAppPermissions(appId);
      this.resourceMonitor.clearUsage(appId);
      this.apiProxy.clearAppMetrics(appId);
      this.messageHandlers.delete(appId);

      // Remove instance
      this.instances.delete(appId);

    } catch (error) {
      throw new Error(`Failed to unload app ${appId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start an app
   */
  async startApp(appId: string): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    if (instance.state === 'running') {
      return; // Already running
    }

    // Check resource limits
    if (this.resourceMonitor.shouldSuspendApp(appId)) {
      throw new Error(`App ${appId} is suspended due to resource violations`);
    }

    // Send start command
    instance.worker.postMessage({
      type: 'APP_COMMAND',
      payload: {
        command: 'start',
        data: {}
      }
    });

    instance.state = 'running';
    instance.lastActivity = new Date();
  }

  /**
   * Stop an app
   */
  async stopApp(appId: string): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    if (instance.state !== 'running') {
      return; // Not running
    }

    // Send stop command
    instance.worker.postMessage({
      type: 'APP_COMMAND',
      payload: {
        command: 'stop',
        data: {}
      }
    });

    instance.state = 'paused';
    instance.lastActivity = new Date();
  }

  /**
   * Pause an app
   */
  async pauseApp(appId: string): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    if (instance.state !== 'running') {
      return;
    }

    instance.worker.postMessage({
      type: 'APP_COMMAND',
      payload: {
        command: 'pause',
        data: {}
      }
    });

    instance.state = 'paused';
    instance.lastActivity = new Date();
  }

  /**
   * Resume a paused app
   */
  async resumeApp(appId: string): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    if (instance.state !== 'paused') {
      return;
    }

    // Check resource limits
    if (this.resourceMonitor.shouldSuspendApp(appId)) {
      throw new Error(`App ${appId} cannot be resumed due to resource violations`);
    }

    instance.worker.postMessage({
      type: 'APP_COMMAND',
      payload: {
        command: 'resume',
        data: {}
      }
    });

    instance.state = 'running';
    instance.lastActivity = new Date();
  }

  /**
   * Send message to an app
   */
  async sendMessage(appId: string, message: AppMessage): Promise<any> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error(`App ${appId} is not loaded`);
    }

    // Validate message permissions if needed
    const context: PermissionContext = {
      appId,
      timestamp: new Date()
    };

    // Send message to worker
    instance.worker.postMessage(message);
    instance.lastActivity = new Date();

    return new Promise((resolve, reject) => {
      if (message.requestId) {
        // Set up response handler
        const handlers = this.messageHandlers.get(appId) || new Map();
        handlers.set(message.requestId, (payload) => {
          resolve(payload);
        });
        this.messageHandlers.set(appId, handlers);

        // Timeout after 30 seconds
        setTimeout(() => {
          const handlers = this.messageHandlers.get(appId);
          if (handlers) {
            handlers.delete(message.requestId!);
          }
          reject(new Error('Message timeout'));
        }, 30000);
      } else {
        resolve(undefined);
      }
    });
  }

  /**
   * Send UI event to an app
   */
  async sendUIEvent(appId: string, event: any): Promise<void> {
    await this.sendMessage(appId, {
      type: 'UI_EVENT',
      payload: event
    });
  }

  /**
   * Get app instance
   */
  getAppInstance(appId: string): AppInstance | null {
    return this.instances.get(appId) || null;
  }

  /**
   * Get all loaded apps
   */
  getLoadedApps(): AppInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get app status
   */
  getAppStatus(appId: string): { state: string; resourceUsage: ResourceUsage; lastActivity: Date } | null {
    const instance = this.instances.get(appId);
    if (!instance) {
      return null;
    }

    return {
      state: instance.state,
      resourceUsage: instance.resourceUsage,
      lastActivity: instance.lastActivity
    };
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats(): {
    totalApps: number;
    runningApps: number;
    pausedApps: number;
    errorApps: number;
    totalResourceUsage: ResourceUsage;
  } {
    const apps = Array.from(this.instances.values());
    
    return {
      totalApps: apps.length,
      runningApps: apps.filter(app => app.state === 'running').length,
      pausedApps: apps.filter(app => app.state === 'paused').length,
      errorApps: apps.filter(app => app.state === 'error').length,
      totalResourceUsage: this.calculateTotalResourceUsage(apps)
    };
  }

  /**
   * Create web worker for app
   */
  private async createWorker(appId: string, manifest: AppManifest): Promise<Worker> {
    try {
      const worker = new Worker(this.config.workerScriptPath);
      return worker;
    } catch (error) {
      throw new Error(`Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up worker message handlers
   */
  private setupWorkerHandlers(appId: string, worker: Worker): void {
    worker.onmessage = (event: MessageEvent) => {
      this.handleWorkerMessage(appId, event.data);
    };

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(appId, error);
    };

    worker.onmessageerror = (error: MessageEvent) => {
      this.handleWorkerMessageError(appId, error);
    };
  }

  /**
   * Initialize worker with app manifest
   */
  private async initializeWorker(appId: string, manifest: AppManifest): Promise<void> {
    const instance = this.instances.get(appId);
    if (!instance) {
      throw new Error('App instance not found');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 30000);

      const handleReady = (event: MessageEvent) => {
        if (event.data.type === 'APP_READY' && event.data.payload.appId === appId) {
          clearTimeout(timeout);
          instance.worker.removeEventListener('message', handleReady);
          instance.state = 'paused';
          resolve();
        } else if (event.data.type === 'APP_ERROR' && event.data.payload.appId === appId) {
          clearTimeout(timeout);
          instance.worker.removeEventListener('message', handleReady);
          instance.state = 'error';
          reject(new Error(event.data.payload.error));
        }
      };

      instance.worker.addEventListener('message', handleReady);

      // Send initialization message
      instance.worker.postMessage({
        type: 'INIT_APP',
        payload: {
          appId,
          manifest
        }
      });
    });
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(appId: string, message: any): void {
    const instance = this.instances.get(appId);
    if (!instance) {
      return;
    }

    instance.lastActivity = new Date();

    switch (message.type) {
      case 'API_CALL':
        this.handleAPICall(appId, message);
        break;

      case 'UI_UPDATE':
        this.handleUIUpdate(appId, message.payload);
        break;

      case 'LOG':
        this.handleAppLog(appId, message.payload);
        break;

      case 'APP_READY':
        // Handled in initializeWorker
        break;

      case 'APP_ERROR':
        this.handleAppError(appId, message.payload);
        break;

      default:
        // Handle custom app messages
        this.handleCustomMessage(appId, message);
    }
  }

  /**
   * Handle API calls from worker
   */
  private async handleAPICall(appId: string, message: any): Promise<void> {
    const { requestId, payload } = message;
    const instance = this.instances.get(appId);
    
    if (!instance) {
      return;
    }

    try {
      const response = await this.apiProxy.proxyRequest(appId, payload);
      
      instance.worker.postMessage({
        type: 'API_RESPONSE',
        requestId,
        payload: response
      });

    } catch (error) {
      instance.worker.postMessage({
        type: 'API_RESPONSE',
        requestId,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'API call failed'
        }
      });
    }
  }

  /**
   * Handle UI updates from worker
   */
  private handleUIUpdate(appId: string, payload: any): void {
    // Emit UI update event for host application to handle
    this.emit('ui-update', { appId, ...payload });
  }

  /**
   * Handle app logs from worker
   */
  private handleAppLog(appId: string, payload: any): void {
    // Emit log event for host application to handle
    this.emit('app-log', { appId, ...payload });
  }

  /**
   * Handle app errors from worker
   */
  private handleAppError(appId: string, payload: any): void {
    const instance = this.instances.get(appId);
    if (instance) {
      instance.state = 'error';
    }
    
    this.emit('app-error', { appId, ...payload });
  }

  /**
   * Handle custom messages from worker
   */
  private handleCustomMessage(appId: string, message: any): void {
    const { requestId } = message;
    
    if (requestId) {
      const handlers = this.messageHandlers.get(appId);
      const handler = handlers?.get(requestId);
      
      if (handler) {
        handler(message.payload);
        handlers.delete(requestId);
      }
    }

    this.emit('app-message', { appId, message });
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(appId: string, error: ErrorEvent): void {
    const instance = this.instances.get(appId);
    if (instance) {
      instance.state = 'error';
    }
    
    this.emit('worker-error', { appId, error: error.message });
  }

  /**
   * Handle worker message errors
   */
  private handleWorkerMessageError(appId: string, error: MessageEvent): void {
    this.emit('worker-message-error', { appId, error });
  }

  /**
   * Calculate total resource usage across all apps
   */
  private calculateTotalResourceUsage(apps: AppInstance[]): ResourceUsage {
    return apps.reduce(
      (total, app) => ({
        memory: total.memory + app.resourceUsage.memory,
        cpu: total.cpu + app.resourceUsage.cpu,
        storage: total.storage + app.resourceUsage.storage,
        networkRequests: total.networkRequests + app.resourceUsage.networkRequests,
        apiCalls: total.apiCalls + app.resourceUsage.apiCalls,
        timestamp: new Date()
      }),
      { memory: 0, cpu: 0, storage: 0, networkRequests: 0, apiCalls: 0, timestamp: new Date() }
    );
  }

  /**
   * Set up global event handlers
   */
  private setupGlobalHandlers(): void {
    // Monitor resource usage periodically
    setInterval(() => {
      this.updateResourceUsage();
    }, 5000);

    // Cleanup inactive apps
    setInterval(() => {
      this.cleanupInactiveApps();
    }, 60000);
  }

  /**
   * Update resource usage for all apps
   */
  private updateResourceUsage(): void {
    this.instances.forEach((instance, appId) => {
      // In a real implementation, we would measure actual resource usage
      // For now, we'll simulate it
      const usage: ResourceUsage = {
        memory: Math.random() * 100, // MB
        cpu: Math.random() * 50, // %
        storage: Math.random() * 10, // MB
        networkRequests: 0,
        apiCalls: 0,
        timestamp: new Date()
      };

      instance.resourceUsage = usage;
      this.resourceMonitor.trackUsage(appId, usage);
    });
  }

  /**
   * Cleanup apps that have been inactive for too long
   */
  private cleanupInactiveApps(): void {
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
    const now = new Date();

    this.instances.forEach((instance, appId) => {
      const inactiveTime = now.getTime() - instance.lastActivity.getTime();
      
      if (inactiveTime > inactivityThreshold && instance.state === 'paused') {
        this.unloadApp(appId).catch(error => {
          this.emit('cleanup-error', { appId, error: error.message });
        });
      }
    });
  }

  /**
   * Simple event emitter functionality
   */
  private eventListeners: Map<string, Function[]> = new Map();

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Shutdown runtime manager
   */
  async shutdown(): Promise<void> {
    // Unload all apps
    const appIds = Array.from(this.instances.keys());
    await Promise.all(appIds.map(appId => this.unloadApp(appId)));

    // Stop monitoring
    this.resourceMonitor.stopMonitoring();
  }
}