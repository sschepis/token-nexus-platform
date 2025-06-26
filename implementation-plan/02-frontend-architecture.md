# Frontend Architecture - Implementation Plan

## 1. Gap Summary

### Overview
The frontend architecture has a solid foundation with Next.js 14, React 18, and TypeScript, but critical integration gaps prevent proper functionality. While the UI components and dashboard system exist, they lack proper backend integration, form validation, error handling, and performance optimizations required for beta release.

### Priority Assessment
- **Critical Gaps**: 4 items requiring 13 days
- **High Priority Gaps**: 3 items requiring 7 days  
- **Medium Priority Gaps**: 3 items requiring 9 days
- **Total Estimated Effort**: 29 days

### Impact Analysis
- **User Experience**: High - Missing loading states and error handling create poor UX
- **Data Persistence**: Critical - Widget layouts and form data don't persist properly
- **Performance**: Medium - Bundle optimization and caching missing
- **Accessibility**: Medium - Limited accessibility features affect compliance

## 2. Standards Alignment

### Relevant Standards
- **[System-Level Pages](../standards-and-conventions/01-system-level-pages.md)** - Component structure and security patterns
- **[Organization-Centric Pages](../standards-and-conventions/02-organization-centric-pages.md)** - Multi-tenant UI patterns
- **[Dashboard Widgets](../standards-and-conventions/04-dashboard-widgets.md)** - Widget component architecture
- **[Visual Pages](../standards-and-conventions/06-visual-pages.md)** - Page layout and design patterns

### Architecture Requirements
- **Component-Based**: Modular, reusable UI components
- **Type-Safe**: Full TypeScript integration with strict typing
- **Responsive**: Mobile-first design with grid layouts
- **Performance**: Code splitting, lazy loading, and optimization
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Permission-based component rendering

### Design System Principles
- Consistent component library with Radix UI foundation
- Tailwind CSS for styling with custom design tokens
- Framer Motion for smooth animations and transitions
- React Grid Layout for dashboard widget management
- Zod schemas for comprehensive form validation

## 3. Detailed Task List

### Phase 1: Core Integration Infrastructure (Critical - 13 days)

#### Task 1.1: Fix Widget Persistence Integration (3 days)
**Priority**: Critical  
**Effort**: 3 days  
**Dependencies**: Parse Server cloud functions, authentication system

**Subtasks**:
- [ ] **1.1.1**: Create comprehensive dashboard API service layer
  ```typescript
  // src/services/api/dashboardApi.ts
  export interface DashboardLayoutData {
    id: string;
    userId: string;
    organizationId: string;
    layouts: {
      lg: Layout[];
      md: Layout[];
      sm: Layout[];
      xs: Layout[];
    };
    widgets: WidgetInstance[];
    metadata: {
      name: string;
      description?: string;
      isDefault: boolean;
      lastModified: Date;
      version: number;
    };
  }
  
  export class DashboardApiService {
    async saveDashboardLayout(data: DashboardLayoutData): Promise<void> {
      try {
        const response = await Parse.Cloud.run('saveDashboardLayout', {
          layoutData: data,
          organizationId: data.organizationId
        });
        
        // Update local cache
        await this.updateLocalCache(data);
        
        return response;
      } catch (error) {
        console.error('Failed to save dashboard layout:', error);
        throw new ApiError('Failed to save dashboard layout', error);
      }
    }
    
    async getDashboardLayout(userId: string, orgId: string): Promise<DashboardLayoutData> {
      try {
        // Try cache first
        const cached = await this.getFromCache(userId, orgId);
        if (cached && this.isCacheValid(cached)) {
          return cached;
        }
        
        // Fetch from server
        const response = await Parse.Cloud.run('getDashboardLayout', { 
          userId, 
          organizationId: orgId 
        });
        
        // Update cache
        await this.updateLocalCache(response);
        
        return response;
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        // Return default layout on error
        return this.getDefaultLayout(userId, orgId);
      }
    }
    
    async createWidget(widgetData: CreateWidgetRequest): Promise<WidgetInstance> {
      const response = await Parse.Cloud.run('createWidget', widgetData);
      return response;
    }
    
    async updateWidget(widgetId: string, updates: Partial<WidgetInstance>): Promise<void> {
      await Parse.Cloud.run('updateWidget', { widgetId, updates });
    }
    
    async deleteWidget(widgetId: string): Promise<void> {
      await Parse.Cloud.run('deleteWidget', { widgetId });
    }
    
    private async updateLocalCache(data: DashboardLayoutData): Promise<void> {
      const cacheKey = `dashboard_${data.userId}_${data.organizationId}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: data.metadata.version
      }));
    }
    
    private async getFromCache(userId: string, orgId: string): Promise<DashboardLayoutData | null> {
      const cacheKey = `dashboard_${userId}_${orgId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      try {
        const parsed = JSON.parse(cached);
        return parsed.data;
      } catch {
        return null;
      }
    }
    
    private isCacheValid(cached: any): boolean {
      const maxAge = 5 * 60 * 1000; // 5 minutes
      return Date.now() - cached.timestamp < maxAge;
    }
    
    private getDefaultLayout(userId: string, orgId: string): DashboardLayoutData {
      return {
        id: `default_${userId}_${orgId}`,
        userId,
        organizationId: orgId,
        layouts: {
          lg: [],
          md: [],
          sm: [],
          xs: []
        },
        widgets: [],
        metadata: {
          name: 'Default Dashboard',
          isDefault: true,
          lastModified: new Date(),
          version: 1
        }
      };
    }
  }
  ```
  - Estimated: 1.5 days

- [ ] **1.1.2**: Update dashboard store to use API service
  ```typescript
  // src/store/dashboardStore.ts
  import { DashboardApiService } from '@/services/api/dashboardApi';
  
  interface DashboardState {
    layouts: ResponsiveLayouts;
    widgets: WidgetInstance[];
    isLoading: boolean;
    error: string | null;
    isDirty: boolean;
    lastSaved: Date | null;
    autoSaveEnabled: boolean;
  }
  
  export const useDashboardStore = create<DashboardState & DashboardActions>((set, get) => ({
    // State
    layouts: { lg: [], md: [], sm: [], xs: [] },
    widgets: [],
    isLoading: false,
    error: null,
    isDirty: false,
    lastSaved: null,
    autoSaveEnabled: true,
    
    // Actions
    async loadDashboard(userId: string, organizationId: string) {
      set({ isLoading: true, error: null });
      
      try {
        const apiService = new DashboardApiService();
        const data = await apiService.getDashboardLayout(userId, organizationId);
        
        set({
          layouts: data.layouts,
          widgets: data.widgets,
          isLoading: false,
          isDirty: false,
          lastSaved: data.metadata.lastModified
        });
      } catch (error) {
        set({
          isLoading: false,
          error: error.message || 'Failed to load dashboard'
        });
      }
    },
    
    async saveDashboard(userId: string, organizationId: string) {
      const { layouts, widgets } = get();
      
      try {
        const apiService = new DashboardApiService();
        const data: DashboardLayoutData = {
          id: `${userId}_${organizationId}`,
          userId,
          organizationId,
          layouts,
          widgets,
          metadata: {
            name: 'User Dashboard',
            isDefault: false,
            lastModified: new Date(),
            version: 1
          }
        };
        
        await apiService.saveDashboardLayout(data);
        
        set({
          isDirty: false,
          lastSaved: new Date(),
          error: null
        });
      } catch (error) {
        set({
          error: error.message || 'Failed to save dashboard'
        });
        throw error;
      }
    },
    
    updateLayout(breakpoint: string, layout: Layout[]) {
      set(state => ({
        layouts: {
          ...state.layouts,
          [breakpoint]: layout
        },
        isDirty: true
      }));
      
      // Auto-save if enabled
      if (get().autoSaveEnabled) {
        this.debouncedSave();
      }
    },
    
    addWidget(widget: WidgetInstance) {
      set(state => ({
        widgets: [...state.widgets, widget],
        isDirty: true
      }));
    },
    
    updateWidget(widgetId: string, updates: Partial<WidgetInstance>) {
      set(state => ({
        widgets: state.widgets.map(w => 
          w.id === widgetId ? { ...w, ...updates } : w
        ),
        isDirty: true
      }));
    },
    
    removeWidget(widgetId: string) {
      set(state => ({
        widgets: state.widgets.filter(w => w.id !== widgetId),
        layouts: Object.fromEntries(
          Object.entries(state.layouts).map(([bp, layout]) => [
            bp,
            layout.filter(l => l.i !== widgetId)
          ])
        ),
        isDirty: true
      }));
    },
    
    // Debounced save function
    debouncedSave: debounce(async () => {
      const { saveDashboard } = get();
      const { user, currentOrganization } = useAuthStore.getState();
      
      if (user && currentOrganization) {
        await saveDashboard(user.id, currentOrganization.id);
      }
    }, 2000)
  }));
  ```
  - Estimated: 1 day

- [ ] **1.1.3**: Implement widget persistence hooks and error handling
  ```typescript
  // src/hooks/useDashboardPersistence.ts
  export const useDashboardPersistence = () => {
    const { user, currentOrganization } = useAuthStore();
    const {
      loadDashboard,
      saveDashboard,
      isLoading,
      error,
      isDirty,
      lastSaved
    } = useDashboardStore();
    
    // Load dashboard on mount and organization change
    useEffect(() => {
      if (user && currentOrganization) {
        loadDashboard(user.id, currentOrganization.id);
      }
    }, [user?.id, currentOrganization?.id, loadDashboard]);
    
    // Save before page unload if dirty
    useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isDirty) {
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
    
    // Manual save function
    const handleSave = useCallback(async () => {
      if (user && currentOrganization) {
        try {
          await saveDashboard(user.id, currentOrganization.id);
          toast.success('Dashboard saved successfully');
        } catch (error) {
          toast.error('Failed to save dashboard');
        }
      }
    }, [user, currentOrganization, saveDashboard]);
    
    return {
      isLoading,
      error,
      isDirty,
      lastSaved,
      save: handleSave
    };
  };
  ```
  - Estimated: 0.5 days

**Acceptance Criteria**:
- [ ] Dashboard layouts persist to Parse Server correctly
- [ ] Widget configurations save and restore properly
- [ ] Auto-save functionality works with debouncing
- [ ] Error handling for save/load failures
- [ ] Cache management for offline support

#### Task 1.2: Implement Comprehensive API Service Layer (5 days)
**Priority**: Critical  
**Effort**: 5 days  
**Dependencies**: Parse Server configuration, authentication tokens

**Subtasks**:
- [ ] **1.2.1**: Create base API service with error handling
  ```typescript
  // src/services/api/baseApi.ts
  export interface ApiResponse<T = any> {
    data: T;
    success: boolean;
    message?: string;
    errors?: ApiError[];
  }
  
  export interface ApiError {
    field?: string;
    message: string;
    code?: string;
  }
  
  export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    cache?: boolean;
  }
  
  export class BaseApiService {
    private baseUrl: string;
    private defaultTimeout: number = 10000;
    private defaultRetries: number = 3;
    
    constructor(baseUrl: string = '/api') {
      this.baseUrl = baseUrl;
    }
    
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
      const {
        method = 'GET',
        headers = {},
        body,
        timeout = this.defaultTimeout,
        retries = this.defaultRetries,
        cache = false
      } = options;
      
      // Add authentication headers
      const authHeaders = await this.getAuthHeaders();
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers
      };
      
      // Create request configuration
      const config: RequestInit = {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout)
      };
      
      // Add cache control
      if (cache && method === 'GET') {
        config.cache = 'force-cache';
      }
      
      let lastError: Error;
      
      // Retry logic
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, config);
          
          if (!response.ok) {
            throw new HttpError(response.status, response.statusText, await response.text());
          }
          
          const data = await response.json();
          return {
            data,
            success: true
          };
          
        } catch (error) {
          lastError = error as Error;
          
          // Don't retry on client errors (4xx)
          if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < retries) {
            await this.delay(Math.pow(2, attempt) * 1000);
          }
        }
      }
      
      // All retries failed
      throw new ApiServiceError('Request failed after retries', lastError);
    }
    
    private async getAuthHeaders(): Promise<Record<string, string>> {
      const token = await this.getAuthToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    private async getAuthToken(): Promise<string | null> {
      // Get token from auth store or Parse session
      const currentUser = Parse.User.current();
      return currentUser?.getSessionToken() || null;
    }
    
    private delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  export class HttpError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public body?: string
    ) {
      super(`HTTP ${status}: ${statusText}`);
      this.name = 'HttpError';
    }
  }
  
  export class ApiServiceError extends Error {
    constructor(message: string, public originalError?: Error) {
      super(message);
      this.name = 'ApiServiceError';
    }
  }
  ```
  - Estimated: 2 days

- [ ] **1.2.2**: Create specific API services for each domain
  ```typescript
  // src/services/api/userApi.ts
  export class UserApiService extends BaseApiService {
    async getCurrentUser(): Promise<User> {
      const response = await this.request<User>('/auth/me');
      return response.data;
    }
    
    async updateProfile(updates: Partial<UserProfile>): Promise<User> {
      const response = await this.request<User>('/users/profile', {
        method: 'PUT',
        body: updates
      });
      return response.data;
    }
    
    async changePassword(data: ChangePasswordRequest): Promise<void> {
      await this.request('/users/change-password', {
        method: 'POST',
        body: data
      });
    }
  }
  
  // src/services/api/organizationApi.ts
  export class OrganizationApiService extends BaseApiService {
    async getOrganizations(): Promise<Organization[]> {
      const response = await this.request<Organization[]>('/organizations', {
        cache: true
      });
      return response.data;
    }
    
    async switchOrganization(organizationId: string): Promise<OrganizationContext> {
      const response = await this.request<OrganizationContext>('/organizations/switch', {
        method: 'POST',
        body: { organizationId }
      });
      return response.data;
    }
    
    async getMembers(organizationId: string): Promise<OrganizationMember[]> {
      const response = await this.request<OrganizationMember[]>(
        `/organizations/${organizationId}/members`
      );
      return response.data;
    }
  }
  
  // src/services/api/contentApi.ts
  export class ContentApiService extends BaseApiService {
    async getPages(organizationId: string): Promise<Page[]> {
      const response = await this.request<Page[]>(`/content/pages`, {
        headers: { 'X-Organization-ID': organizationId }
      });
      return response.data;
    }
    
    async createPage(data: CreatePageRequest): Promise<Page> {
      const response = await this.request<Page>('/content/pages', {
        method: 'POST',
        body: data
      });
      return response.data;
    }
    
    async updatePage(pageId: string, updates: Partial<Page>): Promise<Page> {
      const response = await this.request<Page>(`/content/pages/${pageId}`, {
        method: 'PUT',
        body: updates
      });
      return response.data;
    }
  }
  ```
  - Estimated: 2 days

- [ ] **1.2.3**: Create React hooks for API integration
  ```typescript
  // src/hooks/useApi.ts
  export interface UseApiOptions<T> {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
    cacheTime?: number;
    staleTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
  
  export interface UseApiResult<T> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    mutate: (newData: T) => void;
  }
  
  export const useApi = <T>(
    key: string,
    fetcher: () => Promise<T>,
    options: UseApiOptions<T> = {}
  ): UseApiResult<T> => {
    const {
      enabled = true,
      refetchOnWindowFocus = false,
      refetchInterval,
      cacheTime = 5 * 60 * 1000, // 5 minutes
      staleTime = 0,
      onSuccess,
      onError
    } = options;
    
    const [data, setData] = useState<T | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const fetchData = useCallback(async () => {
      if (!enabled) return;
      
      // Check cache first
      const cached = cacheRef.current.get(key);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        setData(cached.data);
        return;
      }
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetcher();
        
        // Update cache
        cacheRef.current.set(key, {
          data: result,
          timestamp: Date.now()
        });
        
        setData(result);
        onSuccess?.(result);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    }, [key, fetcher, enabled, staleTime, onSuccess, onError]);
    
    // Initial fetch
    useEffect(() => {
      fetchData();
    }, [fetchData]);
    
    // Refetch on window focus
    useEffect(() => {
      if (!refetchOnWindowFocus) return;
      
      const handleFocus = () => fetchData();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }, [refetchOnWindowFocus, fetchData]);
    
    // Refetch interval
    useEffect(() => {
      if (!refetchInterval) return;
      
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }, [refetchInterval, fetchData]);
    
    // Cache cleanup
    useEffect(() => {
      const cleanup = () => {
        const now = Date.now();
        for (const [cacheKey, cached] of cacheRef.current.entries()) {
          if (now - cached.timestamp > cacheTime) {
            cacheRef.current.delete(cacheKey);
          }
        }
      };
      
      const interval = setInterval(cleanup, cacheTime);
      return () => clearInterval(interval);
    }, [cacheTime]);
    
    const mutate = useCallback((newData: T) => {
      setData(newData);
      cacheRef.current.set(key, {
        data: newData,
        timestamp: Date.now()
      });
    }, [key]);
    
    return {
      data,
      isLoading,
      error,
      refetch: fetchData,
      mutate
    };
  };
  
  // Specific hooks for common operations
  export const useUser = () => {
    const userApi = new UserApiService();
    return useApi('current-user', () => userApi.getCurrentUser(), {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true
    });
  };
  
  export const useOrganizations = () => {
    const orgApi = new OrganizationApiService();
    return useApi('organizations', () => orgApi.getOrganizations(), {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000 // 30 minutes
    });
  };
  ```
  - Estimated: 1 day

**Acceptance Criteria**:
- [ ] Comprehensive API service layer with error handling
- [ ] React hooks for data fetching with caching
- [ ] Retry logic and timeout handling
- [ ] Authentication integration
- [ ] Loading and error states properly managed

#### Task 1.3: Add Form Validation System (3 days)
**Priority**: Critical  
**Effort**: 3 days  
**Dependencies**: Zod library, form components

**Subtasks**:
- [ ] **1.3.1**: Create comprehensive validation schemas
  ```typescript
  // src/schemas/index.ts
  import { z } from 'zod';
  
  // Base schemas
  export const EmailSchema = z.string().email('Invalid email address');
  export const PasswordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
  
  // User schemas
  export const UserProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: EmailSchema,
    phone: z.string().optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    avatar: z.string().url('Invalid avatar URL').optional()
  });
  
  export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  });
  
  // Organization schemas
  export const OrganizationSchema = z.object({
    name: z.string().min(1, 'Organization name is required'),
    description: z.string().optional(),
    website: z.string().url('Invalid website URL').optional(),
    industry: z.string().optional(),
    size: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional()
  });
  
  // Content schemas
  export const PageSchema = z.object({
    title: z.string().min(1, 'Page title is required'),
    slug: z.string()
      .min(1, 'Page slug is required')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    content: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']),
    publishedAt: z.date().optional(),
    metadata: z.record(z.any()).optional()
  });
  
  // Widget schemas
  export const WidgetConfigSchema = z.object({
    title: z.string().min(1, 'Widget title is required'),
    type: z.enum(['chart', 'table', 'metric', 'list', 'form', 'calendar', 'map', 'media']),
    size: z.object({
      width: z.number().min(1).max(12),
      height: z.number().min(1).max(8)
    }),
    position: z.object({
      x: z.number().min(0),
      y: z.number().min(0)
    }),
    config: z.record(z.any()),
    permissions: z.array(z.string()).optional()
  });
  
  // Form validation utilities
  export const createFormSchema = <T>(schema: z.ZodSchema<T>) => {
    return {
      schema,
      validate: (data: unknown) => schema.safeParse(data),
      getFieldErrors: (error: z.ZodError) => {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        return fieldErrors;
      },
      validateField: (field: string, value: unknown) => {
        try {
          const fieldSchema = getFieldSchema(schema, field);
          fieldSchema.parse(value);
          return null;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return error.errors[0]?.message || 'Invalid value';
          }
          return 'Validation error';
        }
      }
    };
  };
  
  const getFieldSchema = (schema: z.ZodSchema, field: string): z.ZodSchema => {
    // Extract field schema from object schema
    if (schema instanceof z.ZodObject) {
      return schema.shape[field] || z.any();
    }
    return z.any();
  };
  ```
  - Estimated: 1 day

- [ ] **1.3.2**: Create form handling hooks and components
  ```typescript
  // src/hooks/useForm.ts
  export interface UseFormOptions<T> {
    schema: z.ZodSchema<T>;
    defaultValues?: Partial<T>;
    onSubmit?: (data: T) => Promise<void> | void;
    onError?: (errors: Record<string, string>) => void;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
  }
  
  export interface UseFormResult<T> {
    values: Partial<T>;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
    isDirty: boolean;
    setValue: (field: keyof T, value: any) => void;
    setError: (field: keyof T, error: string) => void;
    clearError: (field: keyof T) => void;
    handleChange: (field: keyof T) => (value: any) => void;
    handleBlur: (field: keyof T) => () => void;
    handleSubmit: (e?: React.FormEvent) => Promise<void>;
    reset: (values?: Partial<T>) => void;
    validate: () => boolean;
  }
  
  export const useForm = <T extends Record<string, any>>(
    options: UseFormOptions<T>
  ): UseFormResult<T> => {
    const {
      schema,
      defaultValues = {},
      onSubmit,
      onError,
      validateOnChange = true,
      validateOnBlur = true
    } = options;
    
    const [values, setValues] = useState<Partial<T>>(defaultValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
const formSchema = useMemo(() => createFormSchema(schema), [schema]);
    
    const isValid = useMemo(() => {
      return Object.keys(errors).length === 0 && Object.keys(values).length > 0;
    }, [errors, values]);
    
    const isDirty = useMemo(() => {
      return JSON.stringify(values) !== JSON.stringify(defaultValues);
    }, [values, defaultValues]);
    
    const setValue = useCallback((field: keyof T, value: any) => {
      setValues(prev => ({ ...prev, [field]: value }));
      
      if (validateOnChange) {
        const error = formSchema.validateField(field as string, value);
        if (error) {
          setErrors(prev => ({ ...prev, [field as string]: error }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field as string];
            return newErrors;
          });
        }
      }
    }, [formSchema, validateOnChange]);
    
    const setError = useCallback((field: keyof T, error: string) => {
      setErrors(prev => ({ ...prev, [field as string]: error }));
    }, []);
    
    const clearError = useCallback((field: keyof T) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }, []);
    
    const handleChange = useCallback((field: keyof T) => (value: any) => {
      setValue(field, value);
    }, [setValue]);
    
    const handleBlur = useCallback((field: keyof T) => () => {
      setTouched(prev => ({ ...prev, [field as string]: true }));
      
      if (validateOnBlur) {
        const value = values[field];
        const error = formSchema.validateField(field as string, value);
        if (error) {
          setErrors(prev => ({ ...prev, [field as string]: error }));
        }
      }
    }, [values, formSchema, validateOnBlur]);
    
    const validate = useCallback(() => {
      const result = formSchema.validate(values);
      if (!result.success) {
        const fieldErrors = formSchema.getFieldErrors(result.error);
        setErrors(fieldErrors);
        onError?.(fieldErrors);
        return false;
      }
      setErrors({});
      return true;
    }, [values, formSchema, onError]);
    
    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
      e?.preventDefault();
      
      if (!validate()) return;
      
      setIsSubmitting(true);
      try {
        await onSubmit?.(values as T);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }, [validate, onSubmit, values]);
    
    const reset = useCallback((newValues?: Partial<T>) => {
      const resetValues = newValues || defaultValues;
      setValues(resetValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }, [defaultValues]);
    
    return {
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
      isDirty,
      setValue,
      setError,
      clearError,
      handleChange,
      handleBlur,
      handleSubmit,
      reset,
      validate
    };
  };
  ```
  - Estimated: 1.5 days

- [ ] **1.3.3**: Create form components with validation
  ```typescript
  // src/components/forms/FormField.tsx
  export interface FormFieldProps {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'textarea' | 'select';
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    options?: Array<{ value: string; label: string }>;
    value: any;
    error?: string;
    touched?: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  }
  
  export const FormField: React.FC<FormFieldProps> = ({
    label,
    name,
    type = 'text',
    placeholder,
    required,
    disabled,
    options,
    value,
    error,
    touched,
    onChange,
    onBlur
  }) => {
    const hasError = touched && error;
    
    const renderInput = () => {
      const commonProps = {
        id: name,
        name,
        value: value || '',
        placeholder,
        disabled,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
          onChange(e.target.value),
        onBlur,
        className: cn(
          'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
          hasError ? 'border-red-500' : 'border-gray-300',
          disabled && 'bg-gray-100 cursor-not-allowed'
        )
      };
      
      switch (type) {
        case 'textarea':
          return <textarea {...commonProps} rows={4} />;
        case 'select':
          return (
            <select {...commonProps}>
              <option value="">Select an option</option>
              {options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        default:
          return <input {...commonProps} type={type} />;
      }
    };
    
    return (
      <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderInput()}
        {hasError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  // src/components/forms/Form.tsx
  export interface FormProps<T> extends UseFormOptions<T> {
    children: (formProps: UseFormResult<T>) => React.ReactNode;
    className?: string;
  }
  
  export const Form = <T extends Record<string, any>>({
    children,
    className,
    ...formOptions
  }: FormProps<T>) => {
    const formProps = useForm(formOptions);
    
    return (
      <form onSubmit={formProps.handleSubmit} className={className}>
        {children(formProps)}
      </form>
    );
  };
  ```
  - Estimated: 0.5 days

**Acceptance Criteria**:
- [ ] Comprehensive validation schemas for all form types
- [ ] Reusable form hooks with validation
- [ ] Form components with error display
- [ ] Real-time validation on change and blur
- [ ] Proper TypeScript integration

#### Task 1.4: Implement Error Boundaries (2 days)
**Priority**: Critical  
**Effort**: 2 days  
**Dependencies**: Error reporting service, logging system

**Subtasks**:
- [ ] **1.4.1**: Create error boundary components
  ```typescript
  // src/components/ErrorBoundary.tsx
  export interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<ErrorFallbackProps>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    isolate?: boolean;
  }
  
  export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
  }
  
  export interface ErrorFallbackProps {
    error: Error | null;
    errorInfo: ErrorInfo | null;
    resetError: () => void;
  }
  
  export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
      super(props);
      this.state = {
        hasError: false,
        error: null,
        errorInfo: null
      };
    }
    
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
      return {
        hasError: true,
        error
      };
    }
    
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      this.setState({
        error,
        errorInfo
      });
      
      // Log error to monitoring service
      this.logError(error, errorInfo);
      
      // Call custom error handler
      this.props.onError?.(error, errorInfo);
    }
    
    private logError = (error: Error, errorInfo: ErrorInfo) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error caught by boundary:', error);
        console.error('Error info:', errorInfo);
      }
      
      // Log to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        // Send to error reporting service (e.g., Sentry)
        this.reportError(error, errorInfo);
      }
    };
    
    private reportError = async (error: Error, errorInfo: ErrorInfo) => {
      try {
        // Report to error monitoring service
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        });
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    };
    
    resetError = () => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    };
    
    render() {
      if (this.state.hasError) {
        const FallbackComponent = this.props.fallback || DefaultErrorFallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        );
      }
      
      return this.props.children;
    }
  }
  
  // Default error fallback component
  const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
        </div>
        <p className="text-gray-600 mb-4">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  );
  ```
  - Estimated: 1 day

- [ ] **1.4.2**: Create specialized error boundaries for different contexts
  ```typescript
  // src/components/PageErrorBoundary.tsx
  export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ErrorBoundary
      fallback={PageErrorFallback}
      onError={(error, errorInfo) => {
        // Log page-level errors with additional context
        console.error('Page error:', { error, errorInfo, page: window.location.pathname });
      }}
    >
      {children}
    </ErrorBoundary>
  );
  
  const PageErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Error</h1>
        <p className="text-gray-600 mb-6">This page encountered an error and couldn't load properly.</p>
        <div className="space-x-4">
          <button onClick={resetError} className="btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
  
  // src/components/WidgetErrorBoundary.tsx
  export const WidgetErrorBoundary: React.FC<{ 
    children: React.ReactNode;
    widgetId: string;
    widgetTitle: string;
  }> = ({ children, widgetId, widgetTitle }) => (
    <ErrorBoundary
      fallback={WidgetErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Widget error:', { error, errorInfo, widgetId, widgetTitle });
      }}
      isolate={true}
    >
      {children}
    </ErrorBoundary>
  );
  
  const WidgetErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
    <div className="h-full flex items-center justify-center bg-red-50 border border-red-200 rounded">
      <div className="text-center p-4">
        <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700 mb-2">Widget failed to load</p>
        <button
          onClick={resetError}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
  
  // src/components/FormErrorBoundary.tsx
  export const FormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ErrorBoundary
      fallback={FormErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Form error:', { error, errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
  
  const FormErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
        <p className="text-sm text-red-700">Form encountered an error</p>
      </div>
      <button
        onClick={resetError}
        className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
      >
        Reset Form
      </button>
    </div>
  );
  ```
  - Estimated: 1 day

**Acceptance Criteria**:
- [ ] Error boundaries implemented for pages, widgets, and forms
- [ ] Graceful error fallback components
- [ ] Error reporting to monitoring service
- [ ] Development vs production error handling
- [ ] Error recovery mechanisms

### Phase 2: User Experience Enhancement (High Priority - 7 days)

#### Task 2.1: Standardize Loading States (2 days)
**Priority**: High  
**Effort**: 2 days  
**Dependencies**: UI component library

**Subtasks**:
- [ ] **2.1.1**: Create loading components
  ```typescript
  // src/components/ui/LoadingSpinner.tsx
  export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'secondary' | 'white';
    className?: string;
  }
  
  export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className
  }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };
    
    const variantClasses = {
      primary: 'text-blue-600',
      secondary: 'text-gray-600',
      white: 'text-white'
    };
    
    return (
      <svg
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  };
  
  // src/components/ui/SkeletonLoader.tsx
  export interface SkeletonProps {
    lines?: number;
    width?: string | number;
    height?: string | number;
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular';
  }
  
  export const SkeletonLoader: React.FC<SkeletonProps> = ({
    lines = 1,
    width = '100%',
    height = '1rem',
    className,
    variant = 'text'
  }) => {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';
    
    const variantClasses = {
      text: 'h-4',
      rectangular: '',
      circular: 'rounded-full'
    };
    
    if (lines === 1) {
      return (
        <div
          className={cn(baseClasses, variantClasses[variant], className)}
          style={{ width, height }}
        />
      );
    }
    
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(baseClasses, variantClasses[variant], className)}
            style={{
              width: index === lines - 1 ? '75%' : width,
              height
            }}
          />
        ))}
      </div>
    );
  };
  
  // src/components/ui/LoadingOverlay.tsx
  export interface LoadingOverlayProps {
    isLoading: boolean;
    children: React.ReactNode;
    message?: string;
    className?: string;
  }
  
  export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    children,
    message = 'Loading...',
    className
  }) => {
    return (
      <div className={cn('relative', className)}>
        {children}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  ```
  - Estimated: 1 day

- [ ] **2.1.2**: Create loading state hooks and patterns
  ```typescript
  // src/hooks/useLoadingState.ts
  export interface LoadingState {
    isLoading: boolean;
    error: Error | null;
    startLoading: () => void;
    stopLoading: () => void;
    setError: (error: Error | null) => void;
    withLoading: <T>(promise: Promise<T>) => Promise<T>;
  }
  
  export const useLoadingState = (initialLoading = false): LoadingState => {
    const [isLoading, setIsLoading] = useState(initialLoading);
    const [error, setError] = useState<Error | null>(null);
    
    const startLoading = useCallback(() => {
      setIsLoading(true);
      setError(null);
    }, []);
    
    const stopLoading = useCallback(() => {
      setIsLoading(false);
    }, []);
    
    const setErrorState = useCallback((error: Error | null) => {
      setError(error);
      if (error) {
        setIsLoading(false);
      }
    }, []);
    
    const withLoading = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await promise;
        stopLoading();
        return result;
      } catch (error) {
        setErrorState(error as Error);
        throw error;
      }
    }, [startLoading, stopLoading, setErrorState]);
    
    return {
      isLoading,
      error,
      startLoading,
      stopLoading,
      setError: setErrorState,
      withLoading
    };
  };
  
  // src/components/ui/AsyncButton.tsx
  export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick?: () => Promise<void> | void;
    loading?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }
  
  export const AsyncButton: React.FC<AsyncButtonProps> = ({
    onClick,
    loading: externalLoading,
    loadingText = 'Loading...',
    children,
    disabled,
    variant = 'primary',
    size = 'md',
    className,
    ...props
  }) => {
    const { isLoading, withLoading } = useLoadingState();
    
    const isLoadingState = externalLoading ?? isLoading;
    
    const handleClick = useCallback(async () => {
      if (onClick) {
        if (onClick.constructor.name === 'AsyncFunction') {
          await withLoading(onClick() as Promise<void>);
        } else {
          onClick();
        }
      }
    }, [onClick, withLoading]);
    
    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg'
    };
    
    return (
      <button
        {...props}
        onClick={handleClick}
        disabled={disabled || isLoadingState}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
      >
        {isLoadingState && (
          <LoadingSpinner size="sm" variant="white" className="mr-2" />
        )}
        {isLoadingState ? loadingText : children}
      </button>
    );
  };
  ```
  - Estimated: 1 day

**Acceptance Criteria**:
- [ ] Consistent loading spinners and skeleton screens
- [ ] Loading overlay component for async operations
- [ ] Loading state hooks for common patterns
- [ ] Async button component with loading states
- [ ] Proper accessibility for loading states

#### Task 2.2: Add Basic Accessibility Features (3 days)
**Priority**: High  
**Effort**: 3 days  
**Dependencies**: ARIA patterns, keyboard navigation

**Subtasks**:
- [ ] **2.2.1**: Implement keyboard navigation
- [ ] **2.2.2**: Add ARIA labels and roles
- [ ] **2.2.3**: Create focus management utilities

#### Task 2.3: Implement Error Handling (2 days)
**Priority**: High  
**Effort**: 2 days  
**Dependencies**: Error boundary system, toast notifications

**Subtasks**:
- [ ] **2.3.1**: Create error display components
- [ ] **2.3.2**: Implement toast notification system
- [ ] **2.3.3**: Add error recovery mechanisms

### Phase 3: Enhancement Features (Medium Priority - 9 days)

#### Task 3.1: Add Animation System (3 days)
**Priority**: Medium  
**Effort**: 3 days  
**Dependencies**: Framer Motion library

#### Task 3.2: Implement PWA Features (4 days)
**Priority**: Medium  
**Effort**: 4 days  
**Dependencies**: Service worker, web app manifest

#### Task 3.3: Add Performance Optimizations (2 days)
**Priority**: Medium  
**Effort**: 2 days  
**Dependencies**: Bundle analyzer, code splitting

## 4. Implementation Phases

### Phase 1: Critical Foundation (Days 1-13)
**Goal**: Establish core frontend functionality with proper backend integration
**Deliverables**:
- Widget persistence working with Parse Server
- Comprehensive API service layer
- Form validation system
- Error boundaries

**Critical Path**:
1. Fix Widget Persistence Integration (Days 1-3)
2. Implement API Service Layer (Days 4-8)
3. Add Form Validation System (Days 9-11)
4. Implement Error Boundaries (Days 12-13)

### Phase 2: User Experience (Days 14-20)
**Goal**: Enhance user experience with loading states and accessibility
**Deliverables**:
- Standardized loading components
- Basic accessibility features
- Error handling system

### Phase 3: Advanced Features (Days 21-29)
**Goal**: Add polish and performance optimizations
**Deliverables**:
- Animation system
- PWA features
- Performance optimizations

## 5. Testing Strategy

### Unit Testing (Parallel with development)
- [ ] Component rendering tests with React Testing Library
- [ ] Hook functionality tests
- [ ] API service tests with mocked responses
- [ ] Form validation tests
- [ ] Error boundary tests

### Integration Testing
- [ ] Dashboard widget persistence flows
- [ ] Form submission with API integration
- [ ] Error handling across components
- [ ] Loading state management

### E2E Testing
- [ ] Complete user workflows
- [ ] Dashboard customization
- [ ] Form validation and submission
- [ ] Error recovery scenarios

### Performance Testing
- [ ] Bundle size analysis
- [ ] Loading time measurements
- [ ] Memory usage monitoring
- [ ] Accessibility compliance testing

## 6. Deployment Plan

### Pre-deployment Checklist
- [ ] All critical functionality tested
- [ ] Performance targets met
- [ ] Accessibility compliance verified
- [ ] Error handling tested
- [ ] Bundle optimization completed

### Deployment Steps
1. Build optimization and testing
2. Staging environment deployment
3. User acceptance testing
4. Production deployment
5. Monitoring and error tracking setup

## 7. Success Criteria

### For Beta Release
- [ ] All pages load and function correctly
- [ ] Dashboard widgets persist across sessions
- [ ] Forms validate input and show errors appropriately
- [ ] Loading states provide clear feedback
- [ ] Error boundaries prevent application crashes
- [ ] Basic accessibility features implemented
- [ ] Responsive design works on mobile devices

### Performance Targets
- **Page Load Time**: < 2 seconds
- **Widget Interaction**: < 100ms response time
- **Form Validation**: < 50ms validation time
- **Navigation**: < 200ms transition time
- **Bundle Size**: < 500KB initial load
- **Accessibility**: WCAG 2.1 AA compliance for critical paths

### Quality Metrics
- **Test Coverage**: > 80% for critical components
- **Error Rate**: < 1% of user sessions
- **Performance Score**: > 90 Lighthouse score
- **Accessibility Score**: > 95 Lighthouse accessibility score

---

**Analysis Date**: January 2025  
**Estimated Total Effort**: 29 days  
**Critical Path**: Widget Persistence → API Integration → Form Validation → Error Boundaries  
**Risk Level**: Medium (UI foundation exists but integration gaps are significant)
    
    const formSchema = useMemo(() => createFormSchema(schema), [