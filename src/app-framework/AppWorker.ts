/**
 * App Worker Template - Runs in isolated web worker context for app execution
 * Part of Phase 3: App Runtime Framework
 */

import {
  AppManifest,
  Permission,
  ResourceUsage,
  APIRequest,
  APIResponse
} from './types/AppManifest';

// Worker-side API proxy for communicating with host
class WorkerAPIProxy {
  private appId: string;
  private permissions: Permission[];

  constructor(appId: string, permissions: Permission[]) {
    this.appId = appId;
    this.permissions = permissions;
  }

  /**
   * Make API call through host proxy
   */
  async apiCall(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      
      const request: APIRequest = {
        appId: this.appId,
        endpoint,
        method,
        data
      };

      // Send request to host
      self.postMessage({
        type: 'API_CALL',
        requestId,
        payload: request
      });

      // Wait for response
      const handleResponse = (event: MessageEvent) => {
        if (event.data.type === 'API_RESPONSE' && event.data.requestId === requestId) {
          self.removeEventListener('message', handleResponse);
          
          const response: APIResponse = event.data.payload;
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'API call failed'));
          }
        }
      };

      self.addEventListener('message', handleResponse);

      // Timeout after 30 seconds
      setTimeout(() => {
        self.removeEventListener('message', handleResponse);
        reject(new Error('API call timeout'));
      }, 30000);
    });
  }

  /**
   * Get data with permission check
   */
  async getData(dataType: string): Promise<any> {
    return this.apiCall(`/api/data/${dataType}`, 'GET');
  }

  /**
   * Set data with permission check
   */
  async setData(dataType: string, data: any): Promise<any> {
    return this.apiCall(`/api/data/${dataType}`, 'POST', data);
  }

  /**
   * Send UI update to host
   */
  updateUI(elementId: string, content: any): void {
    self.postMessage({
      type: 'UI_UPDATE',
      payload: {
        elementId,
        content
      }
    });
  }

  /**
   * Log message to host console
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    self.postMessage({
      type: 'LOG',
      payload: {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Main app worker runtime
export class AppWorkerRuntime {
  private appId: string;
  private manifest: AppManifest;
  private permissions: Permission[];
  private apiProxy: WorkerAPIProxy;
  private appInstance: any = null;
  private isInitialized: boolean = false;

  constructor(appId: string, manifest: AppManifest) {
    this.appId = appId;
    this.manifest = manifest;
    this.permissions = manifest.permissions;
    this.apiProxy = new WorkerAPIProxy(appId, this.permissions);
    
    this.setupMessageHandlers();
    this.initializeApp();
  }

  /**
   * Set up message handlers for communication with host
   */
  private setupMessageHandlers(): void {
    self.onmessage = (event: MessageEvent) => {
      const { type, payload, requestId } = event.data;
      
      try {
        switch (type) {
          case 'API_RESPONSE':
            // Handled by WorkerAPIProxy
            break;
            
          case 'UI_EVENT':
            this.handleUIEvent(payload);
            break;
            
          case 'APP_COMMAND':
            this.handleAppCommand(payload);
            break;
            
          case 'RESOURCE_UPDATE':
            this.handleResourceUpdate(payload);
            break;
            
          case 'SHUTDOWN':
            this.cleanup();
            break;
            
          default:
            this.apiProxy.log('warn', `Unknown message type: ${type}`);
        }
      } catch (error) {
        this.apiProxy.log('error', 'Error handling message', {
          type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Handle uncaught errors
    self.onerror = (event) => {
      this.apiProxy.log('error', 'Uncaught error in app worker', {
        message: typeof event === 'string' ? event : 'Unknown error',
        error: event
      });
    };

    // Handle unhandled promise rejections
    self.addEventListener('unhandledrejection', (event) => {
      this.apiProxy.log('error', 'Unhandled promise rejection', {
        reason: event.reason
      });
    });
  }

  /**
   * Initialize the app
   */
  private async initializeApp(): Promise<void> {
    try {
      this.apiProxy.log('info', `Initializing app: ${this.manifest.name}`);

      // Load app dependencies
      await this.loadDependencies();

      // Load main app script
      await this.loadAppScript();

      // Initialize app instance
      await this.createAppInstance();

      this.isInitialized = true;
      
      // Notify host that app is ready
      self.postMessage({
        type: 'APP_READY',
        payload: {
          appId: this.appId,
          manifest: this.manifest
        }
      });

      this.apiProxy.log('info', 'App initialized successfully');

    } catch (error) {
      this.apiProxy.log('error', 'Failed to initialize app', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      self.postMessage({
        type: 'APP_ERROR',
        payload: {
          appId: this.appId,
          error: error instanceof Error ? error.message : 'Initialization failed'
        }
      });
    }
  }

  /**
   * Load app dependencies
   */
  private async loadDependencies(): Promise<void> {
    for (const dependency of this.manifest.dependencies) {
      try {
        if (dependency.type === 'cdn' && dependency.url) {
          // Import external script
          await import(dependency.url);
        } else if (dependency.type === 'internal') {
          // Load internal dependency
          await this.apiProxy.apiCall(`/api/dependencies/${dependency.name}`);
        }
        
        this.apiProxy.log('info', `Loaded dependency: ${dependency.name}`);
      } catch (error) {
        if (dependency.required) {
          throw new Error(`Failed to load required dependency: ${dependency.name}`);
        } else {
          this.apiProxy.log('warn', `Failed to load optional dependency: ${dependency.name}`);
        }
      }
    }
  }

  /**
   * Load main app script
   */
  private async loadAppScript(): Promise<void> {
    try {
      // Get app bundle from host
      const appBundle = await this.apiProxy.apiCall(`/api/apps/${this.appId}/bundle`);
      
      if (!appBundle || !appBundle.code) {
        throw new Error('App bundle not found or invalid');
      }

      // Execute app code in worker context
      const appCode = `
        ${appBundle.code}
        
        // Export app factory function
        if (typeof createApp === 'function') {
          self.createAppInstance = createApp;
        } else {
          throw new Error('App must export a createApp function');
        }
      `;

      // Use Function constructor to execute code safely
      const executeCode = new Function('self', 'apiProxy', appCode);
      executeCode(self, this.apiProxy);

    } catch (error) {
      throw new Error(`Failed to load app script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create app instance
   */
  private async createAppInstance(): Promise<void> {
    try {
      // Call app factory function
      if (typeof (self as any).createAppInstance === 'function') {
        this.appInstance = await (self as any).createAppInstance({
          appId: this.appId,
          manifest: this.manifest,
          apiProxy: this.apiProxy
        });
      } else {
        throw new Error('App does not export createAppInstance function');
      }

      // Validate app instance
      if (!this.appInstance) {
        throw new Error('App factory returned null or undefined');
      }

    } catch (error) {
      throw new Error(`Failed to create app instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle UI events from host
   */
  private handleUIEvent(payload: any): void {
    if (!this.isInitialized || !this.appInstance) {
      this.apiProxy.log('warn', 'Received UI event before app initialization');
      return;
    }

    try {
      if (typeof this.appInstance.handleUIEvent === 'function') {
        this.appInstance.handleUIEvent(payload);
      }
    } catch (error) {
      this.apiProxy.log('error', 'Error handling UI event', {
        payload,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle app commands from host
   */
  private handleAppCommand(payload: any): void {
    if (!this.isInitialized || !this.appInstance) {
      this.apiProxy.log('warn', 'Received app command before app initialization');
      return;
    }

    try {
      const { command, data } = payload;

      switch (command) {
        case 'start':
          if (typeof this.appInstance.start === 'function') {
            this.appInstance.start(data);
          }
          break;

        case 'stop':
          if (typeof this.appInstance.stop === 'function') {
            this.appInstance.stop(data);
          }
          break;

        case 'pause':
          if (typeof this.appInstance.pause === 'function') {
            this.appInstance.pause(data);
          }
          break;

        case 'resume':
          if (typeof this.appInstance.resume === 'function') {
            this.appInstance.resume(data);
          }
          break;

        case 'configure':
          if (typeof this.appInstance.configure === 'function') {
            this.appInstance.configure(data);
          }
          break;

        default:
          if (typeof this.appInstance.handleCommand === 'function') {
            this.appInstance.handleCommand(command, data);
          } else {
            this.apiProxy.log('warn', `Unknown app command: ${command}`);
          }
      }
    } catch (error) {
      this.apiProxy.log('error', 'Error handling app command', {
        payload,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle resource usage updates
   */
  private handleResourceUpdate(payload: any): void {
    try {
      if (typeof this.appInstance?.handleResourceUpdate === 'function') {
        this.appInstance.handleResourceUpdate(payload);
      }
    } catch (error) {
      this.apiProxy.log('error', 'Error handling resource update', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cleanup when worker is terminated
   */
  private cleanup(): void {
    try {
      this.apiProxy.log('info', 'Cleaning up app worker');

      if (this.appInstance && typeof this.appInstance.cleanup === 'function') {
        this.appInstance.cleanup();
      }

      // Clear any intervals or timeouts
      // Note: In a real implementation, we'd track these
      
      this.isInitialized = false;
      this.appInstance = null;

    } catch (error) {
      this.apiProxy.log('error', 'Error during cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // Terminate worker
      self.close();
    }
  }

  /**
   * Get app status
   */
  getStatus(): { initialized: boolean; appId: string; manifest: AppManifest } {
    return {
      initialized: this.isInitialized,
      appId: this.appId,
      manifest: this.manifest
    };
  }
}

// Initialize worker when script loads
// Note: self is available in worker context

// This will be called by the host when creating the worker
self.addEventListener('message', function initWorker(event) {
  if (event.data.type === 'INIT_APP') {
    const { appId, manifest } = event.data.payload;
    
    // Remove init listener
    self.removeEventListener('message', initWorker);
    
    // Create app runtime
    new AppWorkerRuntime(appId, manifest);
  }
});

// Export for TypeScript
export {};