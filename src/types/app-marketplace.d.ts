
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

export interface AppState {
  apps: App[];
  categories: AppCategory[];
  selectedCategory: AppCategory | 'all';
  installedApps: string[];
  isLoading: boolean;
  error: string | null;
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
