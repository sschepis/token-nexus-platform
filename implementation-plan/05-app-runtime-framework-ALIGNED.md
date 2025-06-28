# App Runtime Framework - Alignment & Enhancement Plan

## Current State Assessment

The Token Nexus Platform has a **sophisticated and complete app runtime framework** already implemented that provides secure, sandboxed execution of third-party applications using web workers.

### Existing Implementation

#### 1. Core Runtime Architecture (`src/app-framework/`)
- **AppRuntimeManager** (`AppRuntimeManager.ts`): Central orchestration for app lifecycle
  - App loading, unloading, starting, stopping, pausing, resuming
  - Worker management and message routing
  - Event-driven architecture with listeners
  - Automatic cleanup of inactive apps
  - Resource usage monitoring

- **AppWorkerRuntime** (`AppWorker.ts`): Worker-side runtime environment
  - Message handling between worker and host
  - Dependency loading (CDN and internal)
  - App instance creation and lifecycle management
  - Error handling and logging

- **PermissionManager** (`PermissionManager.ts`): Security enforcement
  - Permission validation and enforcement
  - API access control
  - Data access control
  - Network domain restrictions
  - Comprehensive audit logging
  - Permission condition evaluation

- **ResourceMonitor** (`ResourceMonitor.ts`): Resource tracking and limits
  - Real-time usage tracking (memory, CPU, storage, network, API calls)
  - Limit enforcement with violations tracking
  - Usage reports and statistics
  - Automatic throttling and suspension

- **APIProxy** (`APIProxy.ts`): Controlled API access
  - Request proxying with permission checks
  - Rate limiting per app
  - Request/response transformation
  - Retry logic with exponential backoff
  - Comprehensive metrics tracking

#### 2. App Registry System (`src/services/`)
- **AppRegistryService** (`appRegistry.ts`): Runtime app management
  - App registration and discovery
  - Component management
  - Route registration
  - Manifest validation

- **StandardAppRegistry** (`standardAppRegistry.ts`): Standard app management
  - Registration of built-in apps
  - Installation/uninstallation logic
  - Core apps auto-installation

- **EnhancedStandardAppRegistry** (`standardAppRegistryWithComponents.ts`)
  - Extended registry with component support
  - Dynamic component registration
  - App lifecycle hooks

#### 3. Type System (`src/app-framework/types/`)
- **AppManifest** (`AppManifest.ts`): Comprehensive manifest structure
  - Permissions with conditions
  - Resource limits
  - Dependencies (npm, CDN, internal)
  - UI configuration
  - Security settings

#### 4. React Integration
- **useAppRuntime** hook (`useAppRuntime.ts`): React integration
  - Runtime manager lifecycle
  - App loading/unloading
  - State management
  - Event handling

- **useApp** hook: Single app management
  - App-specific state
  - Lifecycle methods
  - Message passing

#### 5. Standard App Manifests (`src/app-manifests/`)
- Pre-defined manifests for all standard apps
- Consistent structure and permissions
- Dependency declarations

## What's Already Working

### 1. Secure Sandboxing
- ✅ Web Worker isolation
- ✅ Permission-based access control
- ✅ Resource limit enforcement
- ✅ API request proxying

### 2. App Lifecycle Management
- ✅ Load/unload apps dynamically
- ✅ Start/stop/pause/resume controls
- ✅ Automatic cleanup of inactive apps
- ✅ State tracking

### 3. Communication Layer
- ✅ Bidirectional messaging
- ✅ Request/response patterns
- ✅ Event propagation
- ✅ UI update mechanisms

### 4. Resource Management
- ✅ Usage tracking
- ✅ Limit enforcement
- ✅ Violation detection
- ✅ Throttling and suspension

### 5. Security Features
- ✅ Permission validation
- ✅ Domain whitelisting
- ✅ API blacklisting
- ✅ Audit logging

## Enhancement Opportunities

### 1. App Bundle Management
```typescript
// src/app-framework/BundleManager.ts
export class BundleManager {
  private bundles: Map<string, AppBundle> = new Map();
  private bundleCache: Map<string, CachedBundle> = new Map();
  
  async loadBundle(appId: string, manifest: AppManifest): Promise<AppBundle> {
    // Check cache first
    const cached = this.bundleCache.get(appId);
    if (cached && cached.version === manifest.version) {
      return cached.bundle;
    }
    
    // Load from storage or build
    const bundle = await this.buildOrFetchBundle(appId, manifest);
    
    // Cache for future use
    this.bundleCache.set(appId, {
      bundle,
      version: manifest.version,
      timestamp: new Date()
    });
    
    return bundle;
  }
  
  private async buildOrFetchBundle(appId: string, manifest: AppManifest): Promise<AppBundle> {
    // For development: load source directly
    if (manifest.development) {
      return this.loadDevelopmentBundle(manifest);
    }
    
    // For production: load pre-built bundle
    return this.loadProductionBundle(appId, manifest);
  }
}
```

### 2. App Store Integration
```typescript
// src/app-framework/AppStore.ts
export class AppStore {
  constructor(
    private appRegistry: AppRegistryService,
    private runtimeManager: AppRuntimeManager
  ) {}
  
  async installApp(appId: string, userId: string, orgId: string): Promise<void> {
    // Get app manifest from store
    const manifest = await this.fetchManifestFromStore(appId);
    
    // Validate permissions with user
    const approved = await this.requestPermissionApproval(manifest.permissions);
    if (!approved) {
      throw new Error('User denied permissions');
    }
    
    // Download and install
    const bundle = await this.downloadAppBundle(appId);
    await this.appRegistry.registerApp(manifest, installation, components);
    
    // Initialize in runtime if needed
    if (manifest.autoStart) {
      await this.runtimeManager.loadApp(appId, manifest);
    }
  }
}
```

### 3. Development Tools
```typescript
// src/app-framework/DevTools.ts
export class AppDevTools {
  constructor(private runtimeManager: AppRuntimeManager) {}
  
  enableHotReload(appId: string): void {
    // Watch for file changes
    this.watchAppFiles(appId, async (changes) => {
      // Reload app without losing state
      const instance = this.runtimeManager.getAppInstance(appId);
      const state = await this.extractAppState(instance);
      
      await this.runtimeManager.unloadApp(appId);
      await this.runtimeManager.loadApp(appId, updatedManifest);
      await this.restoreAppState(appId, state);
    });
  }
  
  attachDebugger(appId: string): RemoteDebugger {
    const instance = this.runtimeManager.getAppInstance(appId);
    return new RemoteDebugger(instance.worker);
  }
}
```

### 4. Performance Monitoring
```typescript
// src/app-framework/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  trackAppPerformance(appId: string): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.processPerformanceEntries(appId, entries);
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
  
  getPerformanceReport(appId: string): PerformanceReport {
    const metrics = this.metrics.get(appId);
    return {
      loadTime: metrics.loadTime,
      memoryUsage: metrics.memoryUsage,
      apiLatency: metrics.apiLatency,
      renderTime: metrics.renderTime
    };
  }
}
```

### 5. App Communication Bridge
```typescript
// src/app-framework/AppBridge.ts
export class AppCommunicationBridge {
  constructor(private runtimeManager: AppRuntimeManager) {}
  
  async sendMessage(fromAppId: string, toAppId: string, message: any): Promise<any> {
    // Check if apps can communicate
    const canCommunicate = await this.checkCommunicationPermission(fromAppId, toAppId);
    if (!canCommunicate) {
      throw new Error('Apps cannot communicate');
    }
    
    // Route message through runtime manager
    return this.runtimeManager.sendMessage(toAppId, {
      type: 'APP_MESSAGE',
      payload: {
        from: fromAppId,
        message
      }
    });
  }
  
  createSharedChannel(appIds: string[]): SharedChannel {
    // Create a shared communication channel for multiple apps
    return new SharedChannel(appIds, this.runtimeManager);
  }
}
```

## Integration Points

### 1. With Controller System
- Controllers can expose actions to apps via permissions
- Apps can trigger controller actions through API proxy
- App UI components can be embedded in controller views

### 2. With Dashboard System
- Apps can provide dashboard widgets
- Dashboard can host app containers
- Real-time data updates via app messaging

### 3. With Authentication
- Apps inherit user context and permissions
- Organization-based app installations
- Role-based app access control

### 4. With Cloud Functions
- Apps can invoke cloud functions (with permissions)
- Cloud functions can interact with apps
- Shared execution context

## Security Enhancements

### 1. Content Security Policy
```typescript
// Enhance SecurityConfiguration
export interface EnhancedSecurityConfiguration extends SecurityConfiguration {
  csp: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
  };
  subresourceIntegrity: boolean;
  certificatePinning?: string[];
}
```

### 2. App Signing and Verification
```typescript
export class AppVerification {
  async verifyAppSignature(manifest: AppManifest, bundle: AppBundle): Promise<boolean> {
    const signature = manifest.signature;
    const publicKey = await this.getPublicKey(manifest.publisher);
    
    return this.cryptoVerify(bundle, signature, publicKey);
  }
}
```

## Performance Optimizations

### 1. Lazy Loading
- Load app dependencies on-demand
- Progressive bundle loading
- Code splitting support

### 2. Shared Dependencies
- Deduplicate common libraries
- Shared worker for common functionality
- Memory-efficient resource sharing

### 3. Caching Strategy
- Bundle caching with versioning
- API response caching
- State persistence

## Developer Experience

### 1. App Development Kit
```typescript
// @nomyx/app-sdk
export class NomyxApp {
  constructor(private context: AppContext) {}
  
  // Lifecycle hooks
  async onLoad(): Promise<void> {}
  async onStart(): Promise<void> {}
  async onStop(): Promise<void> {}
  async onUnload(): Promise<void> {}
  
  // API helpers
  async apiCall(endpoint: string, options?: RequestOptions): Promise<any> {
    return this.context.api.call(endpoint, options);
  }
  
  // UI helpers
  render(component: ReactComponent): void {
    this.context.ui.render(component);
  }
}
```

### 2. CLI Tools
```bash
# App scaffolding
nomyx create-app my-app --template react

# Development server
nomyx dev --app my-app --hot-reload

# Build and package
nomyx build --app my-app --production

# Deploy to platform
nomyx deploy --app my-app --org my-org
```

## Testing Framework

### 1. App Testing Utilities
```typescript
export class AppTestHarness {
  async loadApp(manifest: AppManifest): Promise<TestableApp> {
    const runtime = new TestRuntimeManager();
    const app = await runtime.loadApp('test-app', manifest);
    
    return new TestableApp(app, runtime);
  }
  
  mockAPI(endpoint: string, response: any): void {
    this.apiMocks.set(endpoint, response);
  }
  
  async simulateUserAction(action: UserAction): Promise<void> {
    await this.testableApp.handleUIEvent(action);
  }
}
```

## Migration Path

### Phase 1: Enhance Existing Framework
1. Add bundle management system
2. Implement app store integration
3. Add development tools

### Phase 2: Developer Experience
1. Create SDK and CLI tools
2. Add hot reload support
3. Implement testing framework

### Phase 3: Advanced Features
1. Inter-app communication
2. Performance monitoring
3. Advanced security features

## Success Metrics

1. **App Load Time**: < 500ms for standard apps
2. **Memory Efficiency**: < 50MB per app instance
3. **API Latency**: < 100ms for proxied requests
4. **Security**: Zero permission violations
5. **Developer Satisfaction**: 90%+ positive feedback

## Conclusion

The Token Nexus Platform already has a **production-ready app runtime framework** that provides secure, sandboxed execution of third-party applications. The framework includes all essential components: runtime management, worker isolation, permission enforcement, resource monitoring, and API proxying.

The proposed enhancements focus on improving the developer experience, adding app store capabilities, and providing better tooling rather than rebuilding core functionality. This approach leverages the existing robust foundation while adding value through incremental improvements.