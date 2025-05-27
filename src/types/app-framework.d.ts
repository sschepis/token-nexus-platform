import { OrgAppInstallation } from './app-marketplace';

export interface AppManifest {
  // Basic app information
  id: string;
  name: string;
  version: string;
  description: string;
  publisher: string;
  
  // Framework integration
  framework: {
    version: string; // Framework version this app targets
    compatibility: string[]; // Compatible platform versions
  };
  
  // Admin UI configuration
  adminUI?: {
    enabled: boolean;
    routes: AppRoute[];
    navigation: AppNavigation[];
    permissions: string[];
  };
  
  // User-facing UI configuration
  userUI?: {
    enabled: boolean;
    routes: AppRoute[];
    embedComponents?: AppEmbedComponent[];
  };
  
  // API and backend integration
  backend?: {
    cloudFunctions?: string[]; // List of cloud function names
    schemas?: string[]; // List of Parse schema names
    webhooks?: AppWebhook[];
  };
  
  // Dependencies and requirements
  dependencies?: {
    platform: string; // Minimum platform version
    apps?: string[]; // Required app IDs
    permissions: string[]; // Required platform permissions
  };
  
  // Configuration schema
  configuration?: {
    schema: Record<string, AppConfigField>;
    defaultValues?: Record<string, unknown>;
  };
}

export interface AppRoute {
  path: string;
  component: string; // Component name/identifier
  title: string;
  description?: string;
  permissions?: string[];
  layout?: 'default' | 'fullscreen' | 'minimal';
}

export interface AppNavigation {
  label: string;
  icon?: string;
  path: string;
  order?: number;
  permissions?: string[];
  badge?: string; // Dynamic badge content
}

export interface AppEmbedComponent {
  id: string;
  name: string;
  description: string;
  component: string;
  props?: Record<string, unknown>;
  placement: 'dashboard' | 'sidebar' | 'header' | 'footer';
}

export interface AppWebhook {
  event: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
}

export interface AppConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'object';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: { value: unknown; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string; // Custom validation function name
  };
}

// Basic user type for app context
export interface AppUser {
  objectId: string;
  username: string;
  email: string;
  sessionToken?: string;
}

// Basic organization type for app context
export interface AppOrganization {
  objectId: string;
  name: string;
  domain?: string;
  settings?: Record<string, unknown>;
}

// Runtime app registry
export interface RegisteredApp {
  manifest: AppManifest;
  installation: OrgAppInstallation;
  components: Map<string, React.ComponentType<AppComponentProps>>;
  isActive: boolean;
}

// App framework context
export interface AppFrameworkContext {
  registeredApps: Map<string, RegisteredApp>;
  currentApp?: RegisteredApp;
  registerApp: (app: RegisteredApp) => void;
  unregisterApp: (appId: string) => void;
  getAppRoutes: () => AppRoute[];
  getAppNavigation: () => AppNavigation[];
}

// App component props
export interface AppComponentProps {
  appId: string;
  config: Record<string, unknown>;
  organization: AppOrganization;
  user: AppUser;
  permissions: string[];
}