
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { toast } from '@/hooks/use-toast';
import { AuditEvent } from '@/store/slices/auditSlice';
import { Notification } from '@/store/slices/notificationSlice';

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
  login: (credentials: { email: string; password: string }) => {
    // Mock login response
    return mockResponse({
      user: {
        id: 'user-123',
        email: credentials.email,
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      },
      token: 'mock-jwt-token',
      orgId: 'org-123',
      permissions: ['dashboard:read', 'tokens:read', 'tokens:write', 'users:read', 'audit:read', 'notifications:read', 'settings:read'],
    });
  },
  
  // Orgs APIs
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
  
  // Tokens APIs
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
  
  // Users APIs
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
        // Add more mock audit events as needed
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
          priority: "normal",
          userId: "user-123",
        },
        {
          id: "notif-2",
          type: "security",
          title: "New Login Detected",
          message: "A new login was detected from Chicago, USA.",
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: "high",
          userId: "user-123",
          actionUrl: "/settings/security",
          actionLabel: "Review Activity",
        },
        // Add more mock notifications as needed
      ] as Notification[]
    });
  },
  
  markNotificationAsRead: (id: string) => {
    return mockResponse({ success: true });
  },
  
  markAllNotificationsAsRead: () => {
    return mockResponse({ success: true });
  }
};

// Export both the real API instance and mock methods
export default api;
