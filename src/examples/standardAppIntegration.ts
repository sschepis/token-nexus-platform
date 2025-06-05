/**
 * Standard App Integration Example
 * Demonstrates how to integrate standard applications with the existing app runtime
 */

import { AppRuntimeManager } from '../app-framework/AppRuntimeManager';
import { enhancedStandardAppRegistry } from '../services/standardAppRegistryWithComponents';
import { identityManagementManifest, digitalAssetManifest } from '../app-manifests';
import { IdentityDashboard, IdentityCreation } from '../components/standard-apps/identity-management';

/**
 * Example: Initialize and register standard applications
 */
export async function initializeStandardAppsExample(): Promise<void> {
  console.log('🚀 Standard Apps Integration Example');
  
  try {
    // Step 1: Register all standard applications
    console.log('\n📦 Step 1: Registering standard applications...');
    await enhancedStandardAppRegistry.registerAllStandardApps();
    
    // Step 2: Add additional components dynamically
    console.log('\n🔧 Step 2: Adding additional components...');
    enhancedStandardAppRegistry.addComponentToApp(
      'nomyx-identity-management',
      'IdentityDashboard',
      IdentityDashboard
    );
    enhancedStandardAppRegistry.addComponentToApp(
      'nomyx-identity-management',
      'IdentityCreation',
      IdentityCreation
    );
    
    // Step 3: Install core applications for a new organization
    console.log('\n🏢 Step 3: Installing core applications...');
    await enhancedStandardAppRegistry.installCoreApps('user-123', 'org-456');
    
    // Step 4: Demonstrate app runtime integration
    console.log('\n⚡ Step 4: App runtime integration...');
    await demonstrateAppRuntimeIntegration();
    
    console.log('\n✅ Standard apps integration example completed successfully!');
    
  } catch (error) {
    console.error('❌ Standard apps integration failed:', error);
    throw error;
  }
}

/**
 * Demonstrate integration with AppRuntimeManager
 */
async function demonstrateAppRuntimeIntegration(): Promise<void> {
  // Note: AppRuntimeManager integration would be implemented here
  // const appRuntime = new AppRuntimeManager();
  
  // Example: Load an app context for Identity Management
  const identityAppContext = {
    appId: 'nomyx-identity-management',
    config: {
      enableBiometricVerification: true,
      documentVerificationProvider: 'jumio',
      kycTier: 'tier2'
    },
    organization: {
      id: 'org-456',
      name: 'Example Organization',
      settings: {}
    },
    user: {
      id: 'user-123',
      email: 'user@example.com',
      permissions: ['identity:read', 'identity:write', 'documents:read']
    },
    permissions: ['identity:read', 'identity:write', 'documents:read']
  };
  
  console.log('   📱 Identity Management app context created');
  console.log('   🔑 User permissions:', identityAppContext.permissions);
  console.log('   ⚙️  App configuration:', identityAppContext.config);
  
  // Example: Simulate component rendering
  console.log('   🎨 Components available for Identity Management:');
  const identityComponents = enhancedStandardAppRegistry.getAppComponents('nomyx-identity-management');
  if (identityComponents) {
    identityComponents.forEach((component, name) => {
      console.log(`      • ${name}: ${component.name}`);
    });
  }
}

/**
 * Example: Custom app configuration
 */
export function createCustomAppConfiguration(appId: string, customConfig: Record<string, any>): Record<string, any> {
  const manifest = enhancedStandardAppRegistry.getStandardApp(appId);
  if (!manifest?.configuration?.defaultValues) {
    return customConfig;
  }
  
  // Merge custom configuration with defaults
  return {
    ...manifest.configuration.defaultValues,
    ...customConfig
  };
}

/**
 * Example: App permission checking
 */
export function checkAppPermissions(appId: string, userPermissions: string[]): {
  hasAccess: boolean;
  missingPermissions: string[];
  availableFeatures: string[];
} {
  const manifest = enhancedStandardAppRegistry.getStandardApp(appId);
  if (!manifest) {
    return {
      hasAccess: false,
      missingPermissions: [],
      availableFeatures: []
    };
  }
  
  const requiredPermissions = manifest.adminUI?.permissions || [];
  const missingPermissions = requiredPermissions.filter(
    permission => !userPermissions.includes(permission)
  );
  
  const availableFeatures: string[] = [];
  
  // Check which routes/features are available based on permissions
  if (manifest.adminUI?.routes) {
    manifest.adminUI.routes.forEach(route => {
      const routePermissions = route.permissions || [];
      const hasRouteAccess = routePermissions.every(
        permission => userPermissions.includes(permission)
      );
      
      if (hasRouteAccess) {
        availableFeatures.push(route.title);
      }
    });
  }
  
  return {
    hasAccess: missingPermissions.length === 0,
    missingPermissions,
    availableFeatures
  };
}

/**
 * Example: App lifecycle management
 */
export class StandardAppLifecycleManager {
  private installedApps: Map<string, { userId: string; organizationId?: string; installedAt: Date }> = new Map();
  
  async installApp(appId: string, userId: string, organizationId?: string, config?: Record<string, any>): Promise<void> {
    console.log(`📦 Installing ${appId} for user ${userId}...`);
    
    // Validate app exists
    const manifest = enhancedStandardAppRegistry.getStandardApp(appId);
    if (!manifest) {
      throw new Error(`App not found: ${appId}`);
    }
    
    // Check dependencies
    if (manifest.dependencies?.apps) {
      for (const dep of manifest.dependencies.apps) {
        if (!this.installedApps.has(dep.appId)) {
          console.log(`📋 Installing dependency: ${dep.appId}`);
          await this.installApp(dep.appId, userId, organizationId);
        }
      }
    }
    
    // Install the app
    await enhancedStandardAppRegistry.installStandardApp(appId, userId, organizationId, config);
    
    // Track installation
    this.installedApps.set(appId, {
      userId,
      organizationId,
      installedAt: new Date()
    });
    
    console.log(`✅ Successfully installed ${manifest.name}`);
  }
  
  async uninstallApp(appId: string, userId: string, organizationId?: string): Promise<void> {
    console.log(`🗑️  Uninstalling ${appId} for user ${userId}...`);
    
    // Check if other apps depend on this one
    const dependentApps = this.findDependentApps(appId);
    if (dependentApps.length > 0) {
      console.warn(`⚠️  Warning: The following apps depend on ${appId}:`, dependentApps);
      // In a real implementation, you might prevent uninstallation or uninstall dependents
    }
    
    // Uninstall the app
    await enhancedStandardAppRegistry.uninstallStandardApp(appId, userId, organizationId);
    
    // Remove from tracking
    this.installedApps.delete(appId);
    
    console.log(`✅ Successfully uninstalled ${appId}`);
  }
  
  private findDependentApps(appId: string): string[] {
    const dependentApps: string[] = [];
    
    this.installedApps.forEach((installation, installedAppId) => {
      const manifest = enhancedStandardAppRegistry.getStandardApp(installedAppId);
      if (manifest?.dependencies?.apps?.some(dep => dep.appId === appId)) {
        dependentApps.push(installedAppId);
      }
    });
    
    return dependentApps;
  }
  
  getInstalledApps(): Array<{ appId: string; manifest: any; installation: any }> {
    const result: Array<{ appId: string; manifest: any; installation: any }> = [];
    
    this.installedApps.forEach((installation, appId) => {
      const manifest = enhancedStandardAppRegistry.getStandardApp(appId);
      if (manifest) {
        result.push({ appId, manifest, installation });
      }
    });
    
    return result;
  }
}

/**
 * Example usage and testing
 */
export async function runStandardAppExamples(): Promise<void> {
  console.log('🧪 Running Standard App Integration Examples\n');
  
  // Initialize standard apps
  await initializeStandardAppsExample();
  
  // Test custom configuration
  console.log('\n🔧 Testing custom configuration...');
  const customConfig = createCustomAppConfiguration('nomyx-identity-management', {
    kycTier: 'tier3',
    enableBiometricVerification: false
  });
  console.log('Custom config:', customConfig);
  
  // Test permission checking
  console.log('\n🔐 Testing permission checking...');
  const userPermissions = ['identity:read', 'identity:write', 'documents:read'];
  const permissionCheck = checkAppPermissions('nomyx-identity-management', userPermissions);
  console.log('Permission check result:', permissionCheck);
  
  // Test lifecycle management
  console.log('\n🔄 Testing lifecycle management...');
  const lifecycleManager = new StandardAppLifecycleManager();
  await lifecycleManager.installApp('nomyx-identity-management', 'user-123', 'org-456');
  await lifecycleManager.installApp('nomyx-digital-assets', 'user-123', 'org-456');
  
  console.log('Installed apps:', lifecycleManager.getInstalledApps().map(app => app.manifest.name));
  
  console.log('\n🎉 All examples completed successfully!');
}

// Export for direct execution
if (require.main === module) {
  runStandardAppExamples()
    .then(() => {
      console.log('✅ Standard app examples completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Standard app examples failed:', error);
      process.exit(1);
    });
}