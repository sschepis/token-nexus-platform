/**
 * Initialize Standard Applications
 * This script registers all Nomyx standard applications with the platform
 */

import { standardAppRegistry } from '../services/standardAppRegistry';

/**
 * Initialize all standard applications
 */
export async function initializeStandardApps(): Promise<void> {
  console.log('🚀 Initializing Nomyx Standard Applications...');
  
  try {
    // Register all standard applications
    await standardAppRegistry.registerAllStandardApps();
    
    console.log('✅ Standard applications initialization complete!');
    console.log('📋 Available standard applications:');
    
    const registeredApps = standardAppRegistry.getRegisteredStandardApps();
    registeredApps.forEach(app => {
      console.log(`   • ${app.name} (${app.id}) - v${app.version}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize standard applications:', error);
    throw error;
  }
}

/**
 * Initialize core applications for a new organization
 */
export async function initializeCoreAppsForOrg(organizationId: string): Promise<void> {
  console.log(`🏢 Initializing core applications for organization: ${organizationId}`);
  
  try {
    // Install core applications
    await standardAppRegistry.installCoreApps('system', organizationId);
    
    console.log('✅ Core applications installed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize core applications:', error);
    throw error;
  }
}

/**
 * Get installation status of standard applications
 */
export function getStandardAppsStatus(): {
  total: number;
  registered: number;
  apps: Array<{
    id: string;
    name: string;
    version: string;
    registered: boolean;
    category: string;
  }>;
} {
  const allApps = [
    { id: 'nomyx-identity-management', category: 'core' },
    { id: 'nomyx-digital-assets', category: 'core' },
    { id: 'nomyx-trade-finance', category: 'finance' },
    { id: 'nomyx-kyc-compliance', category: 'compliance' },
    { id: 'nomyx-wallet-management', category: 'core' },
    { id: 'nomyx-platform-admin', category: 'admin' }
  ];
  
  const registeredApps = standardAppRegistry.getRegisteredStandardApps();
  const registeredIds = new Set(registeredApps.map(app => app.id));
  
  const apps = allApps.map(({ id, category }) => {
    const app = standardAppRegistry.getStandardApp(id);
    return {
      id,
      name: app?.name || 'Unknown',
      version: app?.version || '0.0.0',
      registered: registeredIds.has(id),
      category
    };
  });
  
  return {
    total: allApps.length,
    registered: registeredIds.size,
    apps
  };
}

// Export for direct execution
if (require.main === module) {
  initializeStandardApps()
    .then(() => {
      console.log('🎉 Standard applications ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}