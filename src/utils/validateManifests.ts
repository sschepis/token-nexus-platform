/**
 * Validate Standard Applications Manifests
 * Utility functions for validating standard app manifests
 */

import { standardAppManifests, getAppManifestById, getAllAppIds } from '../app-manifests';

/**
 * Simple validation function that can be called from anywhere
 */
export function validateAllManifests(): {
  valid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    apps: Array<{
      id: string;
      name: string;
      version: string;
      valid: boolean;
      errors: string[];
    }>;
  };
} {
  const results = [];
  let validCount = 0;

  for (const manifest of standardAppManifests) {
    const validation = validateSingleManifest(manifest);
    results.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      valid: validation.valid,
      errors: validation.errors
    });
    
    if (validation.valid) {
      validCount++;
    }
  }

  return {
    valid: validCount === results.length,
    summary: {
      total: results.length,
      valid: validCount,
      invalid: results.length - validCount,
      apps: results
    }
  };
}

/**
 * Validate a single manifest
 */
function validateSingleManifest(manifest: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!manifest.id) errors.push('App ID is required');
  if (!manifest.name) errors.push('App name is required');
  if (!manifest.version) errors.push('App version is required');
  if (!manifest.publisher) errors.push('App publisher is required');
  if (!manifest.description) errors.push('App description is required');

  // Framework compatibility
  if (!manifest.framework?.version) {
    errors.push('Framework version is required');
  }

  // At least one UI type should be enabled
  if (!manifest.adminUI?.enabled && !manifest.userUI?.enabled) {
    errors.push('At least one UI type (admin or user) must be enabled');
  }

  // Validate routes if UI is enabled
  if (manifest.adminUI?.enabled && (!manifest.adminUI.routes || manifest.adminUI.routes.length === 0)) {
    errors.push('Admin UI is enabled but no routes are defined');
  }

  if (manifest.userUI?.enabled && (!manifest.userUI.routes || manifest.userUI.routes.length === 0)) {
    errors.push('User UI is enabled but no routes are defined');
  }

  // Standard app specific validations
  if (!manifest.id.startsWith('nomyx-')) {
    errors.push('Standard app ID must start with "nomyx-"');
  }

  if (manifest.publisher !== 'Nomyx Platform') {
    errors.push('Standard app publisher must be "Nomyx Platform"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test that all manifests can be loaded
 */
export function testManifestLoading(): boolean {
  try {
    // Test that we can get all app IDs
    const appIds = getAllAppIds();
    if (appIds.length === 0) {
      return false;
    }

    // Test that we can load each manifest by ID
    for (const appId of appIds) {
      const manifest = getAppManifestById(appId);
      if (!manifest) {
        return false;
      }
    }

    // Test that standardAppManifests array is populated
    if (standardAppManifests.length !== appIds.length) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error testing manifest loading:', error);
    return false;
  }
}

/**
 * Get a summary of all standard applications
 */
export function getStandardAppsSummary(): Array<{
  id: string;
  name: string;
  version: string;
  description: string;
  adminRoutes: number;
  userRoutes: number;
  cloudFunctions: number;
  schemas: number;
  dependencies: number;
}> {
  return standardAppManifests.map(manifest => ({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    adminRoutes: manifest.adminUI?.routes?.length || 0,
    userRoutes: manifest.userUI?.routes?.length || 0,
    cloudFunctions: manifest.backend?.cloudFunctions?.length || 0,
    schemas: manifest.backend?.schemas?.length || 0,
    dependencies: manifest.dependencies?.apps?.length || 0
  }));
}

/**
 * Console logging version for debugging
 */
export function logValidationResults(): void {
  console.log('🔍 Validating Nomyx Standard Applications...');
  
  const loadingTest = testManifestLoading();
  console.log(`📦 Manifest Loading: ${loadingTest ? '✅ Success' : '❌ Failed'}`);
  
  const validation = validateAllManifests();
  console.log(`📋 Validation Results:`);
  console.log(`   Total Apps: ${validation.summary.total}`);
  console.log(`   Valid: ${validation.summary.valid}`);
  console.log(`   Invalid: ${validation.summary.invalid}`);
  
  if (!validation.valid) {
    console.log('\n❌ Validation Errors:');
    validation.summary.apps.forEach(app => {
      if (!app.valid) {
        console.log(`   ${app.name} (${app.id}):`);
        app.errors.forEach(error => console.log(`      • ${error}`));
      }
    });
  }
  
  console.log('\n📊 Applications Summary:');
  const summary = getStandardAppsSummary();
  summary.forEach(app => {
    console.log(`   ${app.name} (${app.id}) - v${app.version}`);
    console.log(`      Routes: ${app.adminRoutes} admin, ${app.userRoutes} user`);
    console.log(`      Backend: ${app.cloudFunctions} functions, ${app.schemas} schemas`);
    console.log(`      Dependencies: ${app.dependencies} apps`);
  });
}