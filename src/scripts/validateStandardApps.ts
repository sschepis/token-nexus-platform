/**
 * Validate Standard Applications
 * This script validates all standard application manifests for correctness
 */

import { standardAppManifests, getAppManifestById, getAllAppIds } from '../app-manifests';
import { appRegistry } from '../services/appRegistry';

/**
 * Validate all standard application manifests
 */
export function validateStandardApps(): {
  valid: boolean;
  results: Array<{
    appId: string;
    appName: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
} {
  console.log('🔍 Validating Nomyx Standard Applications...');
  
  const results = [];
  let allValid = true;
  
  for (const manifest of standardAppManifests) {
    console.log(`\n📋 Validating: ${manifest.name} (${manifest.id})`);
    
    const validation = appRegistry.validateManifest(manifest);
    const warnings = validateStandardAppSpecific(manifest);
    
    const result = {
      appId: manifest.id,
      appName: manifest.name,
      valid: validation.valid,
      errors: validation.errors,
      warnings
    };
    
    results.push(result);
    
    if (validation.valid) {
      console.log(`   ✅ Valid`);
      if (warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${warnings.length}`);
        warnings.forEach(warning => console.log(`      • ${warning}`));
      }
    } else {
      console.log(`   ❌ Invalid - ${validation.errors.length} errors`);
      validation.errors.forEach(error => console.log(`      • ${error}`));
      allValid = false;
    }
  }
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Total Apps: ${results.length}`);
  console.log(`   Valid: ${results.filter(r => r.valid).length}`);
  console.log(`   Invalid: ${results.filter(r => !r.valid).length}`);
  console.log(`   Total Warnings: ${results.reduce((sum, r) => sum + r.warnings.length, 0)}`);
  
  return {
    valid: allValid,
    results
  };
}

/**
 * Validate standard app specific requirements
 */
function validateStandardAppSpecific(manifest: any): string[] {
  const warnings: string[] = [];
  
  // Check if app ID follows standard naming convention
  if (!manifest.id.startsWith('nomyx-')) {
    warnings.push('App ID should start with "nomyx-" for standard applications');
  }
  
  // Check if publisher is set to Nomyx Platform
  if (manifest.publisher !== 'Nomyx Platform') {
    warnings.push('Publisher should be "Nomyx Platform" for standard applications');
  }
  
  // Check if framework version is specified
  if (!manifest.framework?.version) {
    warnings.push('Framework version should be specified');
  }
  
  // Check if configuration has default values
  if (manifest.configuration?.schema && !manifest.configuration?.defaultValues) {
    warnings.push('Configuration schema defined but no default values provided');
  }
  
  // Check if backend services are defined
  if (!manifest.backend?.cloudFunctions || manifest.backend.cloudFunctions.length === 0) {
    warnings.push('No cloud functions defined - app may have limited functionality');
  }
  
  if (!manifest.backend?.schemas || manifest.backend.schemas.length === 0) {
    warnings.push('No schemas defined - app may not persist data properly');
  }
  
  // Check if scheduled jobs are reasonable
  if (manifest.scheduledJobs && manifest.scheduledJobs.length > 10) {
    warnings.push('Large number of scheduled jobs may impact system performance');
  }
  
  // Check if permissions are defined
  if (manifest.adminUI?.enabled && (!manifest.adminUI.permissions || manifest.adminUI.permissions.length === 0)) {
    warnings.push('Admin UI enabled but no permissions defined');
  }
  
  // Check for dependency cycles (basic check)
  if (manifest.dependencies?.apps) {
    for (const dep of manifest.dependencies.apps) {
      const depManifest = getAppManifestById(dep.appId);
      if (depManifest?.dependencies?.apps?.some((d: any) => d.appId === manifest.id)) {
        warnings.push(`Potential circular dependency with ${dep.appId}`);
      }
    }
  }
  
  return warnings;
}

/**
 * Test manifest loading and exports
 */
export function testManifestLoading(): boolean {
  console.log('🧪 Testing manifest loading...');
  
  try {
    // Test individual imports
    const appIds = getAllAppIds();
    console.log(`   📦 Found ${appIds.length} standard applications`);
    
    // Test manifest retrieval by ID
    for (const appId of appIds) {
      const manifest = getAppManifestById(appId);
      if (!manifest) {
        console.error(`   ❌ Failed to load manifest for ${appId}`);
        return false;
      }
      console.log(`   ✅ Loaded: ${manifest.name}`);
    }
    
    // Test standardAppManifests array
    if (standardAppManifests.length !== appIds.length) {
      console.error(`   ❌ Mismatch: standardAppManifests has ${standardAppManifests.length} items, expected ${appIds.length}`);
      return false;
    }
    
    console.log('   ✅ All manifests loaded successfully');
    return true;
    
  } catch (error) {
    console.error('   ❌ Error loading manifests:', error);
    return false;
  }
}

/**
 * Generate manifest summary report
 */
export function generateManifestSummary(): void {
  console.log('\n📋 Standard Applications Summary\n');
  
  for (const manifest of standardAppManifests) {
    console.log(`## ${manifest.name} (${manifest.id})`);
    console.log(`Version: ${manifest.version}`);
    console.log(`Description: ${manifest.description}`);
    
    // UI Configuration
    const adminRoutes = manifest.adminUI?.routes?.length || 0;
    const userRoutes = manifest.userUI?.routes?.length || 0;
    console.log(`UI: ${adminRoutes} admin routes, ${userRoutes} user routes`);
    
    // Backend Services
    const cloudFunctions = manifest.backend?.cloudFunctions?.length || 0;
    const schemas = manifest.backend?.schemas?.length || 0;
    const webhooks = manifest.backend?.webhooks?.length || 0;
    console.log(`Backend: ${cloudFunctions} functions, ${schemas} schemas, ${webhooks} webhooks`);
    
    // Scheduled Jobs
    const scheduledJobs = manifest.scheduledJobs?.length || 0;
    console.log(`Scheduled Jobs: ${scheduledJobs}`);
    
    // Dependencies
    const appDeps = manifest.dependencies?.apps?.length || 0;
    console.log(`Dependencies: ${appDeps} apps`);
    
    // Configuration
    const configOptions = manifest.configuration?.schema ? Object.keys(manifest.configuration.schema).length : 0;
    console.log(`Configuration: ${configOptions} options`);
    
    console.log('');
  }
}

/**
 * Main validation function
 */
export function runValidation(): boolean {
  console.log('🚀 Running Standard Applications Validation\n');
  
  // Test manifest loading
  const loadingSuccess = testManifestLoading();
  if (!loadingSuccess) {
    console.error('❌ Manifest loading failed');
    return false;
  }
  
  // Validate manifests
  const validation = validateStandardApps();
  if (!validation.valid) {
    console.error('❌ Manifest validation failed');
    return false;
  }
  
  // Generate summary
  generateManifestSummary();
  
  console.log('✅ All validations passed!');
  return true;
}

// Export for direct execution
if (require.main === module) {
  const success = runValidation();
  process.exit(success ? 0 : 1);
}