# App Runtime Framework API Documentation

This document provides comprehensive technical documentation for the Token Nexus Platform App Runtime Framework API.

## 📋 Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [React Integration](#react-integration)
- [App Manifest Schema](#app-manifest-schema)
- [Permission System](#permission-system)
- [Resource Management](#resource-management)
- [API Reference](#api-reference)
- [Examples](#examples)

## 🎯 Overview

The App Runtime Framework provides a secure, isolated environment for running third-party applications within the Token Nexus Platform. It uses a hybrid web worker architecture to ensure complete security isolation while maintaining high performance.

### Key Features
- **Hybrid Web Worker Architecture**: Complete isolation with secure communication
- **Fine-grained Permission System**: Granular access control for platform resources
- **Real-time Resource Monitoring**: CPU, memory, and network usage tracking
- **API Proxy Layer**: Controlled access to platform APIs with rate limiting
- **React Integration**: Production-ready hooks and components

## 🏗️ Core Components

### AppRuntimeManager

The central orchestrator for all app runtime operations.

```typescript
import { AppRuntimeManager } from '@/app-framework';

class AppRuntimeManager {
  // Core lifecycle methods
  async loadApp(appId: string, config: AppConfig): Promise<AppInstance>
  async unloadApp(appId: string): Promise<void>
  async restartApp(appId: string): Promise<void>
  
  // App communication
  async sendMessage(appId: string, message: AppMessage): Promise<any>
  onMessage(appId: string, handler: MessageHandler): void
  
  // Resource management
  getResourceUsage(appId: string): ResourceUsage
  setResourceLimits(appId: string, limits: ResourceLimits): void
  
  // Event handling
  on(event: AppEvent, handler: EventHandler): void
  off(event: AppEvent, handler: EventHandler): void
  emit(event: AppEvent, data: any): void
}
```

#### Usage Example
```typescript
const runtimeManager = new AppRuntimeManager();

// Load an app
const appInstance = await runtimeManager.loadApp('my-app', {
  permissions: ['api:read', 'data:write'],
  resourceLimits: {
    memory: 50 * 1024 * 1024, // 50MB
    cpu: 0.1 // 10% CPU
  }
});

// Send message to app
const response = await runtimeManager.sendMessage('my-app', {
  type: 'FETCH_DATA',
  payload: { userId: '123' }
});
```

### PermissionManager

Handles all permission validation and enforcement.

```typescript
class PermissionManager {
  // Permission validation
  validatePermission(appId: string, permission: string): boolean
  validateAPIAccess(appId: string, endpoint: string): boolean
  validateDataAccess(appId: string, resource: string, action: string): boolean
  
  // Permission management
  grantPermission(appId: string, permission: string): void
  revokePermission(appId: string, permission: string): void
  listPermissions(appId: string): string[]
  
  // Security levels
  setSecurityLevel(appId: string, level: SecurityLevel): void
  getSecurityLevel(appId: string): SecurityLevel
}
```

#### Permission Types
```typescript
type Permission = 
  | 'api:read'           // Read access to platform APIs
  | 'api:write'          // Write access to platform APIs
  | 'data:read'          // Read user/org data
  | 'data:write'         // Write user/org data
  | 'ui:control'         // Control UI elements
  | 'network:external'   // Access external networks
  | 'storage:local'      // Local storage access
  | 'notifications:send' // Send notifications
  | 'files:read'         // Read file system
  | 'files:write';       // Write file system
```

### ResourceMonitor

Tracks and enforces resource usage limits.

```typescript
class ResourceMonitor {
  // Resource tracking
  getUsage(appId: string): ResourceUsage
  getUsageHistory(appId: string, timeRange: TimeRange): ResourceUsage[]
  
  // Limit enforcement
  setLimits(appId: string, limits: ResourceLimits): void
  getLimits(appId: string): ResourceLimits
  
  // Monitoring events
  onLimitExceeded(appId: string, handler: LimitHandler): void
  onUsageUpdate(appId: string, handler: UsageHandler): void
}
```

#### Resource Types
```typescript
interface ResourceUsage {
  memory: {
    used: number;      // Bytes used
    limit: number;     // Byte limit
    percentage: number; // Usage percentage
  };
  cpu: {
    usage: number;     // CPU percentage (0-1)
    limit: number;     // CPU limit (0-1)
  };
  network: {
    requests: number;  // Request count
    bandwidth: number; // Bytes transferred
    rateLimit: number; // Requests per minute
  };
  storage: {
    used: number;      // Storage bytes used
    limit: number;     // Storage limit
  };
}
```

### APIProxy

Provides controlled access to platform APIs with rate limiting.

```typescript
class APIProxy {
  // API calls
  async call(appId: string, endpoint: string, options: RequestOptions): Promise<any>
  
  // Rate limiting
  setRateLimit(appId: string, limit: RateLimit): void
  getRateLimit(appId: string): RateLimit
  
  // Usage tracking
  getAPIUsage(appId: string): APIUsage
  onRateLimitExceeded(appId: string, handler: RateLimitHandler): void
}
```

## ⚛️ React Integration

### useAppRuntime Hook

The primary React hook for app runtime integration.

```typescript
import { useAppRuntime } from '@/app-framework';

function MyComponent() {
  const {
    // App management
    loadApp,
    unloadApp,
    restartApp,
    
    // App state
    apps,
    loadingApps,
    
    // Communication
    sendMessage,
    onMessage,
    
    // Resource monitoring
    resourceUsage,
    resourceLimits,
    
    // Error handling
    errors,
    clearError
  } = useAppRuntime();
  
  // Load an app
  const handleLoadApp = async () => {
    try {
      await loadApp('my-app', {
        permissions: ['api:read'],
        resourceLimits: { memory: 50 * 1024 * 1024 }
      });
    } catch (error) {
      console.error('Failed to load app:', error);
    }
  };
  
  return (
    <div>
      <button onClick={handleLoadApp}>Load App</button>
      {apps.map(app => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}
```

### useAppPermissions Hook

Hook for managing app permissions.

```typescript
import { useAppPermissions } from '@/app-framework';

function PermissionManager({ appId }: { appId: string }) {
  const {
    permissions,
    grantPermission,
    revokePermission,
    hasPermission
  } = useAppPermissions(appId);
  
  return (
    <div>
      {permissions.map(permission => (
        <div key={permission}>
          {permission}
          <button onClick={() => revokePermission(permission)}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}
```

### useAppResources Hook

Hook for monitoring app resource usage.

```typescript
import { useAppResources } from '@/app-framework';

function ResourceMonitor({ appId }: { appId: string }) {
  const {
    usage,
    limits,
    history,
    setLimits,
    isOverLimit
  } = useAppResources(appId);
  
  return (
    <div>
      <div>Memory: {usage.memory.percentage}%</div>
      <div>CPU: {usage.cpu.usage * 100}%</div>
      {isOverLimit && <div className="alert">Resource limit exceeded!</div>}
    </div>
  );
}
```

## 📋 App Manifest Schema

The app manifest defines the app's configuration, permissions, and metadata.

```typescript
interface AppManifest {
  // Basic information
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  
  // App configuration
  entry: string;              // Entry point file
  type: 'widget' | 'page' | 'service';
  category: AppCategory;
  
  // Permissions
  permissions: Permission[];
  securityLevel: SecurityLevel;
  
  // Resource limits
  resourceLimits: {
    memory?: number;          // Memory limit in bytes
    cpu?: number;            // CPU limit (0-1)
    storage?: number;        // Storage limit in bytes
    networkRequests?: number; // Requests per minute
  };
  
  // UI configuration
  ui?: {
    width?: number;
    height?: number;
    resizable?: boolean;
    theme?: 'light' | 'dark' | 'auto';
  };
  
  // Dependencies
  dependencies?: string[];
  
  // Lifecycle hooks
  lifecycle?: {
    onInstall?: string;      // Function to call on install
    onUninstall?: string;    // Function to call on uninstall
    onUpdate?: string;       // Function to call on update
  };
  
  // Configuration schema
  configSchema?: JSONSchema;
}
```

### Example Manifest
```json
{
  "id": "analytics-dashboard",
  "name": "Analytics Dashboard",
  "version": "1.2.0",
  "description": "Real-time analytics and reporting dashboard",
  "author": "Analytics Team",
  "entry": "src/index.js",
  "type": "widget",
  "category": "analytics",
  "permissions": [
    "api:read",
    "data:read",
    "ui:control"
  ],
  "securityLevel": "moderate",
  "resourceLimits": {
    "memory": 104857600,
    "cpu": 0.15,
    "networkRequests": 100
  },
  "ui": {
    "width": 800,
    "height": 600,
    "resizable": true,
    "theme": "auto"
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "refreshInterval": {
        "type": "number",
        "default": 30000,
        "minimum": 5000
      }
    }
  }
}
```

## 🔒 Permission System

### Security Levels

```typescript
enum SecurityLevel {
  STRICT = 'strict',       // Maximum security, minimal permissions
  MODERATE = 'moderate',   // Balanced security and functionality
  PERMISSIVE = 'permissive' // Relaxed restrictions for trusted apps
}
```

### Permission Validation

```typescript
// Check if app has permission
const hasPermission = permissionManager.validatePermission(
  'my-app', 
  'api:read'
);

// Validate API access
const canAccessAPI = permissionManager.validateAPIAccess(
  'my-app',
  '/api/users'
);

// Validate data access
const canReadData = permissionManager.validateDataAccess(
  'my-app',
  'user-data',
  'read'
);
```

### Dynamic Permission Management

```typescript
// Grant permission at runtime
permissionManager.grantPermission('my-app', 'notifications:send');

// Revoke permission
permissionManager.revokePermission('my-app', 'network:external');

// List all permissions
const permissions = permissionManager.listPermissions('my-app');
```

## 📊 Resource Management

### Setting Resource Limits

```typescript
const resourceMonitor = new ResourceMonitor();

// Set memory limit to 100MB
resourceMonitor.setLimits('my-app', {
  memory: 100 * 1024 * 1024,
  cpu: 0.2, // 20% CPU
  networkRequests: 200 // 200 requests per minute
});
```

### Monitoring Usage

```typescript
// Get current usage
const usage = resourceMonitor.getUsage('my-app');
console.log(`Memory usage: ${usage.memory.percentage}%`);

// Monitor usage changes
resourceMonitor.onUsageUpdate('my-app', (usage) => {
  if (usage.memory.percentage > 90) {
    console.warn('High memory usage detected');
  }
});

// Handle limit exceeded
resourceMonitor.onLimitExceeded('my-app', (resource, usage) => {
  console.error(`Resource limit exceeded: ${resource}`, usage);
  // Take action (throttle, warn user, etc.)
});
```

## 🔌 API Reference

### AppRuntimeManager Methods

#### `loadApp(appId: string, config: AppConfig): Promise<AppInstance>`
Loads and initializes an app in an isolated web worker.

**Parameters:**
- `appId`: Unique identifier for the app
- `config`: App configuration including permissions and limits

**Returns:** Promise resolving to the app instance

**Example:**
```typescript
const app = await runtimeManager.loadApp('analytics-app', {
  permissions: ['api:read', 'data:read'],
  resourceLimits: { memory: 50 * 1024 * 1024 }
});
```

#### `sendMessage(appId: string, message: AppMessage): Promise<any>`
Sends a message to an app and waits for response.

**Parameters:**
- `appId`: Target app identifier
- `message`: Message object with type and payload

**Returns:** Promise resolving to the app's response

**Example:**
```typescript
const response = await runtimeManager.sendMessage('my-app', {
  type: 'GET_USER_DATA',
  payload: { userId: '123' }
});
```

#### `unloadApp(appId: string): Promise<void>`
Unloads an app and cleans up resources.

**Parameters:**
- `appId`: App identifier to unload

**Example:**
```typescript
await runtimeManager.unloadApp('my-app');
```

### PermissionManager Methods

#### `validatePermission(appId: string, permission: string): boolean`
Validates if an app has a specific permission.

**Parameters:**
- `appId`: App identifier
- `permission`: Permission string to validate

**Returns:** Boolean indicating if permission is granted

#### `grantPermission(appId: string, permission: string): void`
Grants a permission to an app.

**Parameters:**
- `appId`: App identifier
- `permission`: Permission string to grant

#### `revokePermission(appId: string, permission: string): void`
Revokes a permission from an app.

**Parameters:**
- `appId`: App identifier
- `permission`: Permission string to revoke

### ResourceMonitor Methods

#### `getUsage(appId: string): ResourceUsage`
Gets current resource usage for an app.

**Parameters:**
- `appId`: App identifier

**Returns:** Current resource usage statistics

#### `setLimits(appId: string, limits: ResourceLimits): void`
Sets resource limits for an app.

**Parameters:**
- `appId`: App identifier
- `limits`: Resource limits configuration

## 💡 Examples

### Basic App Loading

```typescript
import { AppRuntimeManager } from '@/app-framework';

const runtimeManager = new AppRuntimeManager();

async function loadAnalyticsApp() {
  try {
    const app = await runtimeManager.loadApp('analytics-dashboard', {
      permissions: ['api:read', 'data:read'],
      resourceLimits: {
        memory: 100 * 1024 * 1024, // 100MB
        cpu: 0.1, // 10% CPU
        networkRequests: 60 // 1 request per second
      }
    });
    
    console.log('App loaded successfully:', app.id);
  } catch (error) {
    console.error('Failed to load app:', error);
  }
}
```

### App Communication

```typescript
// Send data to app
const userData = await runtimeManager.sendMessage('user-manager', {
  type: 'FETCH_USERS',
  payload: { 
    organizationId: 'org-123',
    limit: 50 
  }
});

// Listen for app messages
runtimeManager.onMessage('user-manager', (message) => {
  if (message.type === 'USER_UPDATED') {
    console.log('User updated:', message.payload);
    // Update UI or trigger other actions
  }
});
```

### Resource Monitoring

```typescript
import { useAppResources } from '@/app-framework';

function AppResourceMonitor({ appId }) {
  const { usage, limits, isOverLimit } = useAppResources(appId);
  
  return (
    <div className="resource-monitor">
      <div className="metric">
        <label>Memory Usage</label>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${usage.memory.percentage}%` }}
          />
        </div>
        <span>{usage.memory.percentage}%</span>
      </div>
      
      <div className="metric">
        <label>CPU Usage</label>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${usage.cpu.usage * 100}%` }}
          />
        </div>
        <span>{(usage.cpu.usage * 100).toFixed(1)}%</span>
      </div>
      
      {isOverLimit && (
        <div className="alert alert-warning">
          Resource limits exceeded!
        </div>
      )}
    </div>
  );
}
```

### Permission Management

```typescript
import { useAppPermissions } from '@/app-framework';

function AppPermissionManager({ appId }) {
  const { 
    permissions, 
    grantPermission, 
    revokePermission,
    hasPermission 
  } = useAppPermissions(appId);
  
  const availablePermissions = [
    'api:read', 'api:write', 'data:read', 'data:write',
    'ui:control', 'network:external', 'notifications:send'
  ];
  
  return (
    <div className="permission-manager">
      <h3>App Permissions</h3>
      {availablePermissions.map(permission => (
        <div key={permission} className="permission-item">
          <label>
            <input
              type="checkbox"
              checked={hasPermission(permission)}
              onChange={(e) => {
                if (e.target.checked) {
                  grantPermission(permission);
                } else {
                  revokePermission(permission);
                }
              }}
            />
            {permission}
          </label>
        </div>
      ))}
    </div>
  );
}
```

### Complete App Integration

```typescript
import React, { useEffect } from 'react';
import { useAppRuntime } from '@/app-framework';

function AppContainer({ appId, config }) {
  const {
    loadApp,
    unloadApp,
    sendMessage,
    apps,
    resourceUsage,
    errors
  } = useAppRuntime();
  
  useEffect(() => {
    // Load app on mount
    loadApp(appId, config);
    
    // Cleanup on unmount
    return () => {
      unloadApp(appId);
    };
  }, [appId]);
  
  const app = apps.find(a => a.id === appId);
  const usage = resourceUsage[appId];
  const error = errors[appId];
  
  if (error) {
    return <div className="error">Error loading app: {error.message}</div>;
  }
  
  if (!app) {
    return <div className="loading">Loading app...</div>;
  }
  
  return (
    <div className="app-container">
      <div className="app-header">
        <h3>{app.name}</h3>
        <div className="resource-indicator">
          Memory: {usage?.memory.percentage || 0}%
        </div>
      </div>
      <div className="app-content">
        {/* App content will be rendered here */}
        <iframe
          src={app.url}
          title={app.name}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
```

---

## 🔗 Related Documentation

- [App Runtime Framework Overview](../features/app-runtime-framework.md)
- [App Marketplace System](../features/app-marketplace.md)
- [Implementation Status](../implementation/README.md)
- [Project Summary](../PROJECT_SUMMARY.md)

## 📞 Support

For technical support or questions about the App Runtime Framework API:

- **Documentation**: [Token Nexus Platform Docs](../index.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/token-nexus/platform/issues)
- **Developer Forum**: [Community discussions and support](https://forum.token-nexus.com)