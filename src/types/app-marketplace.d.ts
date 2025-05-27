/* eslint-disable @typescript-eslint/no-explicit-any */

export interface App {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  icon?: string;
  publisher: string;
  version: string;
  pricing: 'free' | 'paid' | 'freemium';
  status: 'installed' | 'not_installed';
  installDate?: string;
  permissions: string[];
  settings?: Record<string, any>;
}

export type AppCategory = 'finance' | 'productivity' | 'communication' | 'integration' | 'security' | 'analytics' | 'other';

// Corresponds to the AppDefinition schema in Parse Server
export interface AppDefinitionForMarketplace {
  id: string; // Mapped from objectId
  objectId: string; // Original objectId from Parse
  name: string;
  description?: string;
  publisherName: string;
  category: AppCategory; // Use existing AppCategory
  iconUrl?: string;
  tags?: string[];
  overallRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  status?: string;
  // We might not need createdBy/updatedBy here for marketplace display
}

// Corresponds to the AppVersion schema in Parse Server (relevant fields for marketplace)
export interface AppVersionForMarketplace {
  id: string; // Mapped from objectId
  objectId: string; // Original objectId from Parse
  versionString: string;
  bundleUrl?: string;
  changelog?: string;
  status: 'pending_review' | 'approved' | 'published' | 'rejected' | 'deprecated';
  appDefinition?: { objectId: string; __type: 'Pointer'; className: 'AppDefinition' }; // Pointer to parent
  // submittedBy, reviewedBy etc. might not be needed for general marketplace view
  // Add other fields returned by getAppVersionsForDefinition if needed by UI
  submittedBy?: { objectId: string, username?: string, email?: string };
  reviewedBy?: { objectId: string, username?: string, email?: string };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  releaseNotes?: string;
  minPlatformVersion?: string;
  dependencies?: any[]; // Define more strictly if possible
  rejectionReason?: string;
  publishedTimestamp?: string; // ISO string
  reviewTimestamp?: string; // ISO string
}


// Represents an app installed within a specific organization
export interface OrgAppInstallation {
  objectId: string; // ID of the OrgAppInstallation record itself
  organization: { objectId: string; __type: 'Pointer'; className: 'Organization' }; // Pointer
  appDefinition: AppDefinitionForMarketplace; // Embedded AppDefinition details
  installedVersion: AppVersionForMarketplace; // Embedded AppVersion details
  installationDate: string; // ISO Date string
  status: 'active' | 'inactive' | 'needs_configuration'; // Status of this specific installation
  appSpecificConfig?: Record<string, any>;
  installedBy: { objectId: string; __type: 'Pointer'; className: '_User' }; // Pointer
}


export interface AppState {
  apps: App[]; // This is the general catalog of available apps (AppDefinition like)
  categories: AppCategory[];
  selectedCategory: AppCategory | 'all';
  installedApps: string[]; // List of appDefinition IDs that are installed (for quick check) - may deprecate
  installedOrgApps: OrgAppInstallation[];
  isLoading: boolean; // For user-facing app actions
  error: string | null; // For user-facing app actions

  // Admin-specific state for app marketplace management
  allAppDefinitionsAdmin: AppDefinitionForMarketplace[];
  selectedAppVersionsAdmin: AppVersionForMarketplace[];
  isAdminLoadingApps: boolean;
  adminAppsError: string | null;
}

export interface InstallAppParams {
  appId: string;
  permissions: string[];
}

export interface UninstallAppParams {
  appId: string;
}

export interface UpdateAppSettingsParams {
  appId: string;
  settings: Record<string, any>;
}
