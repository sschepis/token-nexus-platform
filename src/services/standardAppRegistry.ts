import { AppManifest, AppComponentProps } from '../types/app-framework';
import { OrgAppInstallation } from '../types/app-marketplace';
import { appRegistry } from './appRegistry';
import { standardAppManifests, getAppManifestById } from '../app-manifests';
import React from 'react';

/**
 * Standard App Registry Service
 * Manages registration and installation of Nomyx standard applications
 */
export class StandardAppRegistry {
  private static instance: StandardAppRegistry;
  private registeredApps: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): StandardAppRegistry {
    if (!StandardAppRegistry.instance) {
      StandardAppRegistry.instance = new StandardAppRegistry();
    }
    return StandardAppRegistry.instance;
  }

  /**
   * Register all standard applications with the platform
   */
  public async registerAllStandardApps(): Promise<void> {
    console.log('Registering Nomyx standard applications...');
    
    for (const manifest of standardAppManifests) {
      try {
        await this.registerStandardApp(manifest);
        console.log(`✅ Registered: ${manifest.name} (${manifest.id})`);
      } catch (error) {
        console.error(`❌ Failed to register ${manifest.name}:`, error);
      }
    }
    
    console.log(`📦 Standard app registration complete. ${this.registeredApps.size} apps registered.`);
  }

  /**
   * Register a single standard application
   */
  public async registerStandardApp(manifest: AppManifest): Promise<void> {
    // Validate manifest
    this.validateManifest(manifest);

    // Create mock installation for the standard app
    const installation = this.createMockInstallation(manifest);
    
    // Create component map (will be populated when components are created)
    const components = new Map<string, React.ComponentType<AppComponentProps>>();

    // Register with the main app registry
    appRegistry.registerApp(manifest, installation, components);
    
    // Track registration
    this.registeredApps.add(manifest.id);

    // Set up any app-specific initialization
    await this.initializeStandardApp(manifest);
  }

  /**
   * Install a standard application for a user/organization
   */
  public async installStandardApp(
    appId: string,
    userId: string,
    organizationId?: string,
    configuration?: Record<string, any>
  ): Promise<void> {
    const manifest = getAppManifestById(appId);
    if (!manifest) {
      throw new Error(`Standard app not found: ${appId}`);
    }

    if (!this.registeredApps.has(appId)) {
      throw new Error(`Standard app not registered: ${appId}`);
    }

    // For now, just activate the app in the registry
    // In a full implementation, this would create installation records in Parse
    appRegistry.updateAppStatus(appId, true);
    console.log(`✅ Installed standard app: ${manifest.name} for user ${userId}`);
  }

  /**
   * Uninstall a standard application
   */
  public async uninstallStandardApp(
    appId: string,
    userId: string,
    organizationId?: string
  ): Promise<void> {
    // For now, just deactivate the app in the registry
    // In a full implementation, this would remove installation records from Parse
    appRegistry.updateAppStatus(appId, false);
    console.log(`❌ Uninstalled standard app: ${appId} for user ${userId}`);
  }

  /**
   * Get all registered standard applications
   */
  public getRegisteredStandardApps(): AppManifest[] {
    return standardAppManifests.filter(manifest => 
      this.registeredApps.has(manifest.id)
    );
  }

  /**
   * Check if a standard app is registered
   */
  public isStandardAppRegistered(appId: string): boolean {
    return this.registeredApps.has(appId);
  }

  /**
   * Get standard app by ID
   */
  public getStandardApp(appId: string): AppManifest | undefined {
    return getAppManifestById(appId);
  }

  /**
   * Get standard apps by category
   */
  public getStandardAppsByCategory(category: 'core' | 'finance' | 'compliance' | 'admin'): AppManifest[] {
    const categoryApps: Record<string, string[]> = {
      core: ['nomyx-identity-management', 'nomyx-digital-assets', 'nomyx-wallet-management'],
      finance: ['nomyx-trade-finance', 'nomyx-digital-assets'],
      compliance: ['nomyx-kyc-compliance'],
      admin: ['nomyx-platform-admin']
    };

    return (categoryApps[category] || [])
      .map(appId => getAppManifestById(appId))
      .filter((manifest): manifest is AppManifest => manifest !== undefined);
  }

  /**
   * Install core applications for a new user/organization
   */
  public async installCoreApps(
    userId: string, 
    organizationId?: string
  ): Promise<void> {
    const coreApps = this.getStandardAppsByCategory('core');
    
    for (const app of coreApps) {
      try {
        await this.installStandardApp(app.id, userId, organizationId);
        console.log(`✅ Installed core app: ${app.name}`);
      } catch (error) {
        console.error(`❌ Failed to install core app ${app.name}:`, error);
      }
    }
  }

  /**
   * Create a mock installation for a standard app
   */
  private createMockInstallation(manifest: AppManifest): OrgAppInstallation {
    return {
      objectId: `${manifest.id}-installation`,
      organization: { objectId: 'default-org', __type: 'Pointer', className: 'Organization' },
      appDefinition: {
        id: manifest.id,
        objectId: manifest.id,
        name: manifest.name,
        description: manifest.description,
        publisherName: manifest.publisher,
        category: 'finance',
        status: 'published'
      },
      installedVersion: {
        id: `${manifest.id}-${manifest.version}`,
        objectId: `${manifest.id}-${manifest.version}`,
        versionString: manifest.version,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      installationDate: new Date().toISOString(),
      status: 'active',
      appSpecificConfig: manifest.configuration?.defaultValues || {},
      installedBy: { objectId: 'system', __type: 'Pointer', className: '_User' }
    };
  }

  /**
   * Validate app manifest
   */
  private validateManifest(manifest: AppManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid manifest: missing required fields');
    }

    if (!manifest.id.startsWith('nomyx-')) {
      throw new Error('Standard apps must have IDs starting with "nomyx-"');
    }

    if (!manifest.framework || !manifest.framework.version) {
      throw new Error('Invalid manifest: missing framework version');
    }
  }

  /**
   * Initialize app-specific setup
   */
  private async initializeStandardApp(manifest: AppManifest): Promise<void> {
    // App-specific initialization logic
    switch (manifest.id) {
      case 'nomyx-identity-management':
        await this.initializeIdentityManagement();
        break;
      case 'nomyx-digital-assets':
        await this.initializeDigitalAssets();
        break;
      case 'nomyx-trade-finance':
        await this.initializeTradeFinance();
        break;
      case 'nomyx-kyc-compliance':
        await this.initializeKYCCompliance();
        break;
      case 'nomyx-wallet-management':
        await this.initializeWalletManagement();
        break;
      case 'nomyx-platform-admin':
        await this.initializePlatformAdmin();
        break;
    }
  }

  /**
   * App-specific initialization methods
   */
  private async initializeIdentityManagement(): Promise<void> {
    // Initialize identity management schemas, cloud functions, etc.
    console.log('🆔 Initializing Identity Management app...');
    
    try {
      // Initialize schemas if Parse is available
      if (typeof Parse !== 'undefined') {
        const { OnChainIdentitySchema, IdentitySchema, AuditLogSchema } = require('../schemas/standardAppSchemas');
        
        // Create schemas
        const schemas = [OnChainIdentitySchema, IdentitySchema, AuditLogSchema];
        for (const schema of schemas) {
          try {
            const parseSchema = new Parse.Schema(schema.className);
            await parseSchema.save();
            console.log(`✅ Schema initialized: ${schema.className}`);
          } catch (error: any) {
            if (error.code === 103) {
              console.log(`⚠️  Schema already exists: ${schema.className}`);
            } else {
              console.error(`❌ Error initializing schema ${schema.className}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error initializing Identity Management schemas:', error);
    }
  }

  private async initializeDigitalAssets(): Promise<void> {
    // Initialize digital asset schemas, smart contracts, etc.
    console.log('💎 Initializing Digital Assets app...');
    
    try {
      // Initialize schemas if Parse is available
      if (typeof Parse !== 'undefined') {
        const { DigitalAssetSchema, MarketplaceListingSchema, AuditLogSchema } = require('../schemas/standardAppSchemas');
        
        // Create schemas
        const schemas = [DigitalAssetSchema, MarketplaceListingSchema, AuditLogSchema];
        for (const schema of schemas) {
          try {
            const parseSchema = new Parse.Schema(schema.className);
            await parseSchema.save();
            console.log(`✅ Schema initialized: ${schema.className}`);
          } catch (error: any) {
            if (error.code === 103) {
              console.log(`⚠️  Schema already exists: ${schema.className}`);
            } else {
              console.error(`❌ Error initializing schema ${schema.className}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error initializing Digital Assets schemas:', error);
    }
  }

  private async initializeTradeFinance(): Promise<void> {
    // Initialize trade finance schemas, compliance checks, etc.
    console.log('🤝 Initializing Trade Finance app...');
  }

  private async initializeKYCCompliance(): Promise<void> {
    // Initialize KYC schemas, compliance rules, etc.
    console.log('🛡️ Initializing KYC Compliance app...');
  }

  private async initializeWalletManagement(): Promise<void> {
    // Initialize wallet schemas, security policies, etc.
    console.log('👛 Initializing Wallet Management app...');
  }

  private async initializePlatformAdmin(): Promise<void> {
    // Initialize admin schemas, monitoring, etc.
    console.log('🏠 Initializing Platform Admin app...');
  }
}

// Export singleton instance
export const standardAppRegistry = StandardAppRegistry.getInstance();

// Helper functions for easy access
export const registerAllStandardApps = () => standardAppRegistry.registerAllStandardApps();
export const installStandardApp = (appId: string, userId: string, organizationId?: string, config?: Record<string, any>) => 
  standardAppRegistry.installStandardApp(appId, userId, organizationId, config);
export const installCoreApps = (userId: string, organizationId?: string) => 
  standardAppRegistry.installCoreApps(userId, organizationId);