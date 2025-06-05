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
    apps?: AppDependency[]; // Enhanced app dependencies
    permissions: string[]; // Required platform permissions
  };
  
  // Configuration schema
  configuration?: {
    schema: Record<string, AppConfigField>;
    defaultValues?: Record<string, unknown>;
  };
  
  // NEW: Scheduled Jobs
  scheduledJobs?: AppScheduledJob[];
  
  // NEW: Database Triggers
  triggers?: AppTrigger[];
  
  // NEW: Custom Code
  customCode?: AppCustomCode;
  
  // NEW: Inter-App APIs
  apis?: AppAPI[];
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
export interface AppFrameworkAPI {
  triggerEvent: (eventName: string, data: any) => Promise<any>;
  callAPI: (path: string, method?: string, data?: any) => Promise<any>;
  updateConfig: (newConfig: any) => Promise<any>;
}

export interface AppRuntimeContext {
  manifest: AppManifest;
  installation: any; // Will be properly typed later
  api: AppFrameworkAPI;
}

export interface AppComponentProps {
  appId: string;
  config: Record<string, unknown>;
  organization: AppOrganization;
  user: AppUser;
  permissions: string[];
  appFramework?: AppRuntimeContext;
}
// Enhanced App Bundle System - New Interfaces

export interface AppScheduledJob {
  id: string;
  name: string;
  description?: string;
  schedule: string; // Cron expression
  function: string; // Cloud function name
  params?: Record<string, unknown>;
  enabled: boolean;
  timezone?: string;
}

export interface AppTrigger {
  id: string;
  name: string;
  className: string; // Parse class name
  triggerType: 'beforeSave' | 'afterSave' | 'beforeDelete' | 'afterDelete';
  function: string; // Cloud function name
  conditions?: TriggerCondition[];
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'changed' | 'contains' | 'greaterThan' | 'lessThan';
  value?: unknown;
  previousValue?: unknown;
}

export interface AppCustomCode {
  type: 'javascript' | 'typescript' | 'bundle';
  entryPoint: string;
  dependencies?: Record<string, string>; // package.json style
  buildConfig?: BuildConfiguration;
  runtime?: RuntimeConfiguration;
}

export interface AppAPI {
  id: string;
  name: string;
  version: string;
  endpoints: APIEndpoint[];
  authentication?: APIAuthentication;
}

export interface AppDependency {
  appId: string;
  version: string;
  apis?: string[]; // Required API endpoints
  optional?: boolean;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description?: string;
  parameters?: APIParameter[];
  response?: APIResponse;
}

export interface APIParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface APIResponse {
  type: string;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface APIAuthentication {
  type: 'none' | 'apiKey' | 'oauth' | 'jwt';
  config?: Record<string, unknown>;
}

export interface BuildConfiguration {
  target: 'node' | 'browser' | 'universal';
  minify: boolean;
  sourceMaps: boolean;
  externals?: string[];
  plugins?: BuildPlugin[];
}

export interface BuildPlugin {
  name: string;
  config?: Record<string, unknown>;
}

export interface RuntimeConfiguration {
  memory: number; // MB
  timeout: number; // seconds
  environment: Record<string, string>;
  permissions: RuntimePermission[];
}

export interface RuntimePermission {
  type: string;
  resource?: string;
  actions?: string[];
}