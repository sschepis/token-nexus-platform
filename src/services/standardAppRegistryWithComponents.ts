/**
 * Enhanced Standard App Registry with Component Integration
 * Extends the basic registry to include React component registration
 */

import { AppManifest, AppComponentProps } from '../types/app-framework';
import { OrgAppInstallation } from '../types/app-marketplace';
import { appRegistry } from './appRegistry';
import { standardAppManifests, getAppManifestById } from '../app-manifests';
import { identityManagementComponents } from '../components/standard-apps/identity-management';
import React from 'react';
import { appMarketplaceApi } from './api/appMarketplace'; // Import the marketplace API

/**
 * Enhanced Standard App Registry with Component Support
 */
export class EnhancedStandardAppRegistry {
  private static instance: EnhancedStandardAppRegistry;
  private registeredApps: Set<string> = new Set();
  private componentMaps: Map<string, Map<string, React.ComponentType<AppComponentProps>>> = new Map();

  private constructor() {
    this.initializeComponentMaps();
  }

  public static getInstance(): EnhancedStandardAppRegistry {
    if (!EnhancedStandardAppRegistry.instance) {
      EnhancedStandardAppRegistry.instance = new EnhancedStandardAppRegistry();
    }
    return EnhancedStandardAppRegistry.instance;
  }

  /**
   * Initialize component maps for all standard applications
   */
  private initializeComponentMaps(): void {
    // Identity Management components
    this.componentMaps.set('nomyx-identity-management', identityManagementComponents);

    // Digital Assets components (placeholder for now)
    const digitalAssetComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    // Import and add when components are created
    // digitalAssetComponents.set('AssetDashboard', AssetDashboard);
    this.componentMaps.set('nomyx-digital-assets', digitalAssetComponents);

    // Trade Finance components (placeholder)
    const tradeFinanceComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    this.componentMaps.set('nomyx-trade-finance', tradeFinanceComponents);

    // KYC Compliance components (placeholder)
    const kycComplianceComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    this.componentMaps.set('nomyx-kyc-compliance', kycComplianceComponents);

    // Wallet Management components (placeholder)
    const walletManagementComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    this.componentMaps.set('nomyx-wallet-management', walletManagementComponents);

    // Platform Admin components (placeholder)
    const platformAdminComponents = new Map<string, React.ComponentType<AppComponentProps>>();
    this.componentMaps.set('nomyx-platform-admin', platformAdminComponents);
  }

  /**
   * Register all standard applications with their components
   */
  public async registerAllStandardApps(): Promise<void> {
    console.log('🚀 Registering Nomyx standard applications with components...');
    
    for (const manifest of standardAppManifests) {
      try {
        await this.registerStandardAppWithComponents(manifest);
        console.log(`✅ Registered: ${manifest.name} (${manifest.id})`);
      } catch (error) {
        console.error(`❌ Failed to register ${manifest.name}:`, error);
      }
    }
    
    console.log(`📦 Standard app registration complete. ${this.registeredApps.size} apps registered.`);
  }

  /**
   * Register a single standard application with its components
   */
  public async registerStandardAppWithComponents(manifest: AppManifest): Promise<void> {
    // Validate manifest
    this.validateManifest(manifest);

    // Fetch or create the actual installation for the standard app
    const installation = await this.fetchOrCreateInstallation(manifest);
    
    // Get component map for this app
    const components = this.componentMaps.get(manifest.id) || new Map();

    // Register with the main app registry
    appRegistry.registerApp(manifest, installation, components);
    
    // Track registration
    this.registeredApps.add(manifest.id);

    // Set up any app-specific initialization
    await this.initializeStandardApp(manifest);
  }

  /**
   * Add a component to an app's component map
   */
  public addComponentToApp(appId: string, componentName: string, component: React.ComponentType<AppComponentProps>): void {
    let componentMap = this.componentMaps.get(appId);
    if (!componentMap) {
      componentMap = new Map();
      this.componentMaps.set(appId, componentMap);
    }
    componentMap.set(componentName, component);

    // If the app is already registered, update the registry
    if (this.registeredApps.has(appId)) {
      const registeredApp = appRegistry.getApp(appId);
      if (registeredApp) {
        registeredApp.components.set(componentName, component);
      }
    }
  }

  /**
   * Get component map for an app
   */
  public getAppComponents(appId: string): Map<string, React.ComponentType<AppComponentProps>> | undefined {
    return this.componentMaps.get(appId);
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

    // Install the app via the marketplace API
    const installedApp = await appMarketplaceApi.installApp({
      appDefinitionId: appId,
      versionId: manifest.version, // Assuming version ID is the manifest version string
      appSpecificConfig: configuration || {}
    });

    // Register with the main app registry using the actual installation data
    const components = this.componentMaps.get(appId) || new Map();
    appRegistry.registerApp(manifest, installedApp.data, components); // installedApp.data contains the OrgAppInstallation

    // Track registration
    this.registeredApps.add(appId);

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
    // Uninstall the app via the marketplace API
    await appMarketplaceApi.uninstallApp({
      appDefinitionId: appId,
      orgAppInstallationId: 'PLACEHOLDER_INSTALLATION_ID' // TODO: Get actual installation ID
    });
    
    // Unregister with the main app registry
    appRegistry.unregisterApp(appId);
    
    // Untrack registration
    this.registeredApps.delete(appId);

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
    await Promise.all(coreApps.map(async (app) => {
      try {
        await this.installStandardApp(app.id, userId, organizationId);
        console.log(`✅ Installed core app: ${app.name}`);
      } catch (error) {
        console.error(`❌ Failed to install core app ${app.name}:`, error);
      }
    }));
  }

  /**
   * Helper to fetch or create an installation record for a manifest.
   * In a real system, this would manage actual installations based on app marketplace data.
   */
  private async fetchOrCreateInstallation(manifest: AppManifest): Promise<OrgAppInstallation> {
    // Try to fetch existing installation
    try {
      const installations = await appMarketplaceApi.fetchOrgAppInstallations({
        // organizationId: 'current_org_id' // TODO: Pass actual organization ID
      });
      const existingInstallation = installations.data.find(inst => inst.appDefinition.id === manifest.id);

      if (existingInstallation) {
        console.log(`Found existing installation for ${manifest.id}`);
        return existingInstallation;
      }
    } catch (error) {
      console.warn(`Failed to fetch existing installations for ${manifest.id}, might create a new one:`, error);
    }

    // If no existing, simulate installation via marketplace API
    console.log(`Creating new installation for ${manifest.id} via appMarketplaceApi.installApp`);
    const newInstallationResponse = await appMarketplaceApi.installApp({
      appDefinitionId: manifest.id,
      versionId: manifest.version, // Assuming manifest.version is equivalent to versionId
      appSpecificConfig: manifest.configuration?.defaultValues || {}
    });

    if (newInstallationResponse.success && newInstallationResponse.data) {
      return newInstallationResponse.data;
    } else {
      throw new Error(`Failed to create installation for ${manifest.id}: ${newInstallationResponse.error}`);
    }
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
    console.log('🆔 Initializing Identity Management app...');
  }

  private async initializeDigitalAssets(): Promise<void> {
    console.log('💎 Initializing Digital Assets app...');
  }

  private async initializeTradeFinance(): Promise<void> {
    console.log('🤝 Initializing Trade Finance app...');
  }

  private async initializeKYCCompliance(): Promise<void> {
    console.log('🛡️ Initializing KYC Compliance app...');
  }

  private async initializeWalletManagement(): Promise<void> {
    console.log('👛 Initializing Wallet Management app...');
  }

  private async initializePlatformAdmin(): Promise<void> {
    console.log('🏠 Initializing Platform Admin app...');
  }
}

// Export enhanced singleton instance
export const enhancedStandardAppRegistry = EnhancedStandardAppRegistry.getInstance();

// Helper functions for easy access
export const registerAllStandardAppsWithComponents = () => enhancedStandardAppRegistry.registerAllStandardApps();
export const installStandardAppWithComponents = (appId: string, userId: string, organizationId?: string, config?: Record<string, any>) => 
  enhancedStandardAppRegistry.installStandardApp(appId, userId, organizationId, config);
export const installCoreAppsWithComponents = (userId: string, organizationId?: string) => 
  enhancedStandardAppRegistry.installCoreApps(userId, organizationId);