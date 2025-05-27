/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import Parse from 'parse'; // Import Parse SDK
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { toast } from '@/hooks/use-toast';
import { AuditEvent } from '@/store/slices/auditSlice';
import { Notification, NotificationPriority } from '@/store/slices/notificationSlice';
import { App } from '@/types/app-marketplace';

// Mock API base URL - would be replaced with real API endpoint
const API_BASE_URL = 'https://api.platform.com';

const axiosConfig: AxiosRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

const api: AxiosInstance = axios.create(axiosConfig);

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const { token, orgId } = state.auth;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add orgId to all requests for multi-tenancy
    if (orgId && config.method !== 'get') {
      const data = config.data || {};
      config.data = { ...data, orgId };
    } else if (orgId && config.method === 'get') {
      config.params = { ...config.params, orgId };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      
      // Handle 401 Unauthorized - could implement token refresh here
      if (status === 401) {
        store.dispatch(logout());
        toast({
          title: "Session expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      }
      
      // Handle 403 Forbidden
      if (status === 403) {
        toast({
          title: "Access denied",
          description: "You don't have permission to perform this action.",
          variant: "destructive",
        });
      }
      
      // Handle other error statuses
      if (status === 500) {
        toast({
          title: "Server error",
          description: "Something went wrong. Please try again later.",
          variant: "destructive",
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast({
        title: "Network error",
        description: "Unable to connect to the server. Please check your internet connection.",
        variant: "destructive",
      });
    }
    
    return Promise.reject(error);
  }
);
// Actual API methods using Parse SDK or Axios
export const apiService = {
  login: async (credentials: { email: string; password: string }): Promise<{ user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean }> => {
    try {
      // Call the custom Parse Cloud function
      const result = await Parse.Cloud.run('customUserLogin', {
        username: credentials.email, // Parse uses 'username' for email by default
        password: credentials.password
      });
      // The cloud function should return data in the format expected by loginSuccess action
      // including the isAdmin flag.
      // Example expected structure from cloud function:
      // { user: { id, email, firstName, lastName, avatarUrl }, token, orgId, permissions, isAdmin }
      return result as { user: any; token: string; orgId: string; permissions: string[]; isAdmin?: boolean };
    } catch (error: any) {
      console.error("Error calling customUserLogin cloud function:", error);
      throw new Error(error.message || 'Login failed via cloud function');
    }
  },
  // ... other actual api methods can go here
};

// For mocking API responses in development
const mockResponse = (data: any, delay = 500): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, delay);
  });
};

// Example mock API methods
export const mockApis = {
  // Auth APIs
  // login: (credentials: { email: string; password: string }) => {
  //   // Mock login response
  //   return mockResponse({
  //     user: {
  //       id: 'user-123',
  //       email: credentials.email,
  //       firstName: 'John',
  //       lastName: 'Doe',
  //       avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  //     },
  //     token: 'mock-jwt-token',
  //     orgId: 'org-123',
  //     permissions: [
  //       'dashboard:read',
  //       'tokens:read',
  //       'tokens:write',
  //       'users:read',
  //       'audit:read',
  //       'notifications:read',
  //       'settings:read',
  //       'integrations:read',
  //       'integrations:write',
  //       'reports:read',
  //       'system:admin' // Added system:admin permission for mock user
  //     ],
  //   });
  // },
  
  getUserOrgs: () => {
    return mockResponse({
      orgs: [
        {
          id: 'org-123',
          name: 'Acme Corp',
          logo: 'https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600',
          primaryColor: '#4f46e5',
          secondaryColor: '#1f2937',
          plan: 'enterprise',
        },
        {
          id: 'org-456',
          name: 'Globex Inc',
          logo: 'https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600',
          primaryColor: '#0891b2',
          secondaryColor: '#1f2937',
          plan: 'standard',
        }
      ]
    });
  },
  
  getTokens: () => {
    return mockResponse({
      tokens: [
        {
          id: 'token-123',
          name: 'Acme Security Token',
          symbol: 'AST',
          type: 'ERC3643',
          blockchain: 'Ethereum',
          supply: 1000000,
          status: 'confirmed',
          createdAt: '2023-04-15T10:30:00Z',
          createdBy: 'user-123',
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        {
          id: 'token-456',
          name: 'Real Estate Fund',
          symbol: 'REF',
          type: 'ERC3643',
          blockchain: 'Polygon',
          supply: 500000,
          status: 'pending',
          createdAt: '2023-05-20T14:15:00Z',
          createdBy: 'user-123',
        },
        {
          id: 'token-789',
          name: 'Carbon Credit',
          symbol: 'CC',
          type: 'Stellar',
          blockchain: 'Stellar',
          supply: 10000,
          status: 'confirmed',
          createdAt: '2023-06-05T09:45:00Z',
          createdBy: 'user-456',
          contractAddress: 'GCXABC...',
        }
      ]
    });
  },
  
  createToken: (tokenData: any) => {
    return mockResponse({
      token: {
        id: `token-${Math.floor(Math.random() * 1000)}`,
        name: tokenData.name,
        symbol: tokenData.symbol || tokenData.name.split(' ').map(word => word[0]).join('').toUpperCase(),
        type: tokenData.type,
        blockchain: tokenData.blockchain,
        supply: tokenData.supply,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: 'user-123',
      }
    });
  },
  
  getUsers: () => {
    return mockResponse({
      users: [
        {
          id: 'user-123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['org_admin'],
          kycStatus: 'verified',
          createdAt: '2023-03-10T08:30:00Z',
          lastLoginAt: '2023-06-15T14:20:00Z',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          isActive: true,
        },
        {
          id: 'user-456',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          roles: ['token_manager'],
          kycStatus: 'verified',
          createdAt: '2023-04-05T10:15:00Z',
          lastLoginAt: '2023-06-14T11:45:00Z',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          isActive: true,
        },
        {
          id: 'user-789',
          email: 'mike.johnson@example.com',
          firstName: 'Mike',
          lastName: 'Johnson',
          roles: ['developer'],
          kycStatus: 'pending',
          createdAt: '2023-05-12T09:20:00Z',
          lastLoginAt: '2023-06-10T16:30:00Z',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          isActive: true,
        }
      ]
    });
  },
  
  inviteUser: (userData: any) => {
    return mockResponse({
      user: {
        id: `user-${Math.floor(Math.random() * 1000)}`,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        roles: userData.roles || ['viewer'],
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        isActive: true,
      }
    });
  },
  
  // Audit Log APIs
  getAuditLogs: (filters?: any) => {
    return mockResponse({
      auditEvents: [
        {
          id: "audit-1",
          eventType: "user_activity",
          description: "User login successful",
          userId: "user-123",
          userEmail: "john.doe@example.com",
          timestamp: new Date().toISOString(),
          severity: "low",
          ipAddress: "192.168.1.1",
        },
        {
          id: "audit-2",
          eventType: "security",
          description: "Failed login attempt",
          userId: "unknown",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: "medium",
          ipAddress: "203.0.113.1",
        },
      ] as AuditEvent[]
    });
  },
  
  // Notification APIs
  getNotifications: () => {
    return mockResponse({
      notifications: [
        {
          id: "notif-1",
          type: "system",
          title: "System Maintenance",
          message: "Scheduled maintenance will occur tomorrow at 2:00 AM UTC.",
          timestamp: new Date(Date.now() + 86400000).toISOString(),
          isRead: false,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-2",
          type: "security",
          title: "New Login Detected",
          message: "A new login was detected from Chicago, USA.",
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: "high" as NotificationPriority,
          userId: "user-123",
          actionUrl: "/settings/security",
          actionLabel: "Review Activity",
        },
      ] as Notification[]
    });
  },
  
  markNotificationAsRead: (id: string) => {
    return mockResponse({ success: true });
  },
  
  markAllNotificationsAsRead: () => {
    return mockResponse({ success: true });
  },
  
  // App Marketplace APIs
  getApps: () => {
    return mockResponse({
      apps: [
        {
          id: 'app-1',
          name: 'Expense Tracker',
          description: 'Track and manage company expenses with customizable categories and approval workflows',
          category: 'finance',
          icon: 'https://cdn-icons-png.flaticon.com/512/2285/2285551.png',
          publisher: 'Finance Solutions Inc.',
          version: '1.2.0',
          pricing: 'freemium',
          status: 'not_installed',
          permissions: ['finance:read', 'finance:write', 'notification:send'],
          settings: {
            auto_categorize: true,
            approval_threshold: 500,
            notification_preference: 'email'
          }
        },
        {
          id: 'app-2',
          name: 'Document Vault',
          description: 'Securely store and share sensitive documents with role-based access control',
          category: 'security',
          icon: 'https://cdn-icons-png.flaticon.com/512/1643/1643264.png',
          publisher: 'SecureVault Ltd',
          version: '2.3.1',
          pricing: 'paid',
          status: 'not_installed',
          permissions: ['documents:read', 'documents:write', 'encryption:manage'],
          settings: {}
        },
        {
          id: 'app-3',
          name: 'Team Chat',
          description: 'Real-time messaging and collaboration platform for teams',
          category: 'communication',
          icon: 'https://cdn-icons-png.flaticon.com/512/134/134914.png',
          publisher: 'Comms Tech',
          version: '3.0.2',
          pricing: 'free',
          status: 'installed',
          installDate: '2023-04-15T10:30:00Z',
          permissions: ['users:read', 'notification:send'],
          settings: {
            show_presence: true,
            desktop_notifications: true,
            sound_effects: false
          }
        },
        {
          id: 'app-4',
          name: 'Project Timeline',
          description: 'Visual project management with Gantt charts and resource allocation',
          category: 'productivity',
          icon: 'https://cdn-icons-png.flaticon.com/512/2620/2620316.png',
          publisher: 'ProjectPro Software',
          version: '1.5.3',
          pricing: 'paid',
          status: 'not_installed',
          permissions: ['projects:read', 'projects:write', 'users:read'],
          settings: {}
        },
        {
          id: 'app-5',
          name: 'Data Insights',
          description: 'Advanced analytics and visualization tools for business intelligence',
          category: 'analytics',
          icon: 'https://cdn-icons-png.flaticon.com/512/2756/2756778.png',
          publisher: 'Data Science Co',
          version: '2.1.0',
          pricing: 'freemium',
          status: 'not_installed',
          permissions: ['data:read', 'reports:generate'],
          settings: {}
        },
        {
          id: 'app-6',
          name: 'Salesforce Connector',
          description: 'Synchronize contacts and deals with your Salesforce account',
          category: 'integration',
          icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968914.png',
          publisher: 'Cloud Connectors Inc',
          version: '1.0.4',
          pricing: 'free',
          status: 'installed',
          installDate: '2023-05-20T14:15:00Z',
          permissions: ['integrations:manage', 'data:read', 'data:write'],
          settings: {
            sync_interval: 30,
            auto_sync: true,
            conflict_resolution: 'newer_wins'
          }
        }
      ] as App[]
    });
  },
  
  installApp: ({ appId, permissions }) => {
    const app = store.getState().app.apps.find(a => a.id === appId);
    if (!app) {
      return Promise.reject(new Error('App not found'));
    }
    
    return mockResponse({
      app: {
        ...app,
        status: 'installed',
        installDate: new Date().toISOString(),
        permissions: permissions
      }
    });
  },
  
  uninstallApp: ({ appId }) => {
    return mockResponse({ success: true });
  },
  
  updateAppSettings: ({ appId, settings }) => {
    return mockResponse({ 
      appId,
      settings 
    });
  },
  
  // Integration APIs
  getIntegrations: () => {
    return mockResponse({
      services: [
        {
          id: "service-1",
          name: "Salesforce",
          status: "connected",
          lastSynced: "2023-06-10T14:30:00Z",
          icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png"
        },
        {
          id: "service-2",
          name: "Stripe",
          status: "connected",
          lastSynced: "2023-06-09T11:45:00Z",
          icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png"
        },
        {
          id: "service-3",
          name: "Slack",
          status: "disconnected",
          lastSynced: null,
          icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/2048px-Slack_icon_2019.svg.png"
        }
      ],
      webhooks: [
        {
          id: "webhook-1",
          name: "Notification Webhook",
          endpoint: "https://example.com/webhook/notifications",
          events: ["user.created", "user.updated"],
          active: true
        },
        {
          id: "webhook-2",
          name: "Transaction Webhook",
          endpoint: "https://example.com/webhook/transactions",
          events: ["transaction.created", "transaction.completed"],
          active: true
        }
      ],
      oauthApps: [
        {
          id: "oauth-1",
          name: "Mobile App",
          clientId: "client-id-xxxxx-1",
          clientSecret: "••••••••••••••••",
          redirectUris: ["https://example.com/callback"],
          created: "2023-05-01T10:00:00Z"
        }
      ]
    });
  },

  createWebhook: (webhookData: any) => {
    return mockResponse({
      webhook: {
        id: `webhook-${Math.floor(Math.random() * 1000)}`,
        name: webhookData.name || "New Webhook",
        endpoint: webhookData.endpoint,
        events: webhookData.events || ["user.created"],
        active: true,
        createdAt: new Date().toISOString()
      }
    });
  },

  // Reports APIs
  getReportData: (reportType: string, timeRange: string) => {
    // Different mock data based on report type and time range
    switch(reportType) {
      case 'token-activity':
        return mockResponse({
          data: [
            { date: "May 1", transactions: 65, volume: 15000, users: 24 },
            { date: "May 5", transactions: 78, volume: 18500, users: 27 },
            { date: "May 10", transactions: 90, volume: 20000, users: 32 },
            { date: "May 15", transactions: 81, volume: 17500, users: 29 },
            { date: "May 20", transactions: 95, volume: 22000, users: 35 },
            { date: "May 25", transactions: 110, volume: 25000, users: 40 },
            { date: "May 30", transactions: 102, volume: 23000, users: 38 },
          ]
        });
      case 'user-activity':
        return mockResponse({
          data: [
            { date: "May 1", active: 42, new: 5 },
            { date: "May 5", active: 45, new: 3 },
            { date: "May 10", active: 48, new: 4 },
            { date: "May 15", active: 51, new: 2 },
            { date: "May 20", active: 54, new: 6 },
            { date: "May 25", active: 58, new: 4 },
            { date: "May 30", active: 62, new: 5 },
          ]
        });
      default:
        return mockResponse({ data: [] });
    }
  },

  exportReportData: (reportType: string, format: string) => {
    return mockResponse({
      success: true,
      downloadUrl: `https://api.example.com/reports/export/${reportType}.${format}`
    });
  }
};

// Export both the real API instance and mock methods
export default api;
