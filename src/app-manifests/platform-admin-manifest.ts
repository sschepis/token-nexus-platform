import { AppManifest } from '../types/app-framework';

export const platformAdminManifest: AppManifest = {
  id: 'nomyx-platform-admin',
  name: 'Platform Admin Suite',
  version: '1.0.0',
  description: 'Comprehensive platform administration suite with user management, system monitoring, configuration management, and operational tools',
  publisher: 'Nomyx Platform',
  
  framework: {
    version: '1.0.0',
    compatibility: ['1.0.0', '1.1.0']
  },
  
  adminUI: {
    enabled: true,
    routes: [
      {
        path: '/',
        component: 'AdminDashboard',
        title: 'Admin Dashboard',
        description: 'Platform overview and key metrics',
        layout: 'default'
      },
      {
        path: '/users',
        component: 'UserManagement',
        title: 'User Management',
        description: 'Manage platform users and permissions',
        permissions: ['users:read', 'users:write'],
        layout: 'default'
      },
      {
        path: '/apps',
        component: 'AppManagement',
        title: 'App Management',
        description: 'Manage installed applications and marketplace',
        permissions: ['apps:manage'],
        layout: 'default'
      },
      {
        path: '/system',
        component: 'SystemMonitoring',
        title: 'System Monitoring',
        description: 'Monitor system health and performance',
        permissions: ['system:monitor'],
        layout: 'default'
      },
      {
        path: '/configuration',
        component: 'PlatformConfiguration',
        title: 'Platform Configuration',
        description: 'Configure platform settings and features',
        permissions: ['platform:configure'],
        layout: 'default'
      },
      {
        path: '/security',
        component: 'SecurityManagement',
        title: 'Security Management',
        description: 'Manage platform security and access controls',
        permissions: ['security:manage'],
        layout: 'default'
      },
      {
        path: '/analytics',
        component: 'PlatformAnalytics',
        title: 'Platform Analytics',
        description: 'Platform usage and performance analytics',
        permissions: ['analytics:read'],
        layout: 'default'
      },
      {
        path: '/logs',
        component: 'LogManagement',
        title: 'Log Management',
        description: 'View and manage system logs',
        permissions: ['logs:read'],
        layout: 'default'
      },
      {
        path: '/backup',
        component: 'BackupManagement',
        title: 'Backup Management',
        description: 'Manage platform backups and recovery',
        permissions: ['backup:manage'],
        layout: 'default'
      },
      {
        path: '/notifications',
        component: 'NotificationManagement',
        title: 'Notification Management',
        description: 'Manage platform notifications and alerts',
        permissions: ['notifications:manage'],
        layout: 'default'
      },
      {
        path: '/integrations',
        component: 'IntegrationManagement',
        title: 'Integration Management',
        description: 'Manage third-party integrations and APIs',
        permissions: ['integrations:manage'],
        layout: 'default'
      },
      {
        path: '/maintenance',
        component: 'MaintenanceMode',
        title: 'Maintenance Mode',
        description: 'Platform maintenance and deployment tools',
        permissions: ['platform:maintain'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Admin Dashboard',
        icon: '🏠',
        path: '/',
        order: 1
      },
      {
        label: 'User Management',
        icon: '👥',
        path: '/users',
        order: 2,
        permissions: ['users:read']
      },
      {
        label: 'App Management',
        icon: '📱',
        path: '/apps',
        order: 3,
        permissions: ['apps:manage']
      },
      {
        label: 'System Monitoring',
        icon: '📊',
        path: '/system',
        order: 4,
        permissions: ['system:monitor']
      },
      {
        label: 'Configuration',
        icon: '⚙️',
        path: '/configuration',
        order: 5,
        permissions: ['platform:configure']
      },
      {
        label: 'Security',
        icon: '🔒',
        path: '/security',
        order: 6,
        permissions: ['security:manage']
      },
      {
        label: 'Analytics',
        icon: '📈',
        path: '/analytics',
        order: 7,
        permissions: ['analytics:read']
      },
      {
        label: 'Logs',
        icon: '📋',
        path: '/logs',
        order: 8,
        permissions: ['logs:read']
      },
      {
        label: 'Backup',
        icon: '💾',
        path: '/backup',
        order: 9,
        permissions: ['backup:manage']
      },
      {
        label: 'Notifications',
        icon: '🔔',
        path: '/notifications',
        order: 10,
        permissions: ['notifications:manage']
      },
      {
        label: 'Integrations',
        icon: '🔗',
        path: '/integrations',
        order: 11,
        permissions: ['integrations:manage']
      },
      {
        label: 'Maintenance',
        icon: '🔧',
        path: '/maintenance',
        order: 12,
        permissions: ['platform:maintain']
      }
    ],
    permissions: [
      'users:read',
      'users:write',
      'users:manage',
      'apps:read',
      'apps:write',
      'apps:manage',
      'system:read',
      'system:monitor',
      'system:manage',
      'platform:read',
      'platform:configure',
      'platform:maintain',
      'security:read',
      'security:manage',
      'analytics:read',
      'logs:read',
      'logs:manage',
      'backup:read',
      'backup:manage',
      'notifications:read',
      'notifications:manage',
      'integrations:read',
      'integrations:manage'
    ]
  },
  
  userUI: {
    enabled: false,
    routes: []
  },
  
  backend: {
    cloudFunctions: [
      'getUserStats',
      'createUser',
      'updateUser',
      'deleteUser',
      'manageUserPermissions',
      'installApp',
      'uninstallApp',
      'updateApp',
      'getSystemHealth',
      'getSystemMetrics',
      'updatePlatformConfig',
      'manageSecurity',
      'generateAnalytics',
      'exportLogs',
      'createBackup',
      'restoreBackup',
      'sendNotification',
      'manageIntegration',
      'enableMaintenanceMode',
      'disableMaintenanceMode',
      'deployUpdate',
      'rollbackDeployment',
      'auditActivity',
      'generateReport',
      'monitorPerformance',
      'optimizeDatabase',
      'cleanupStorage',
      'validateConfiguration'
    ],
    schemas: [
      'PlatformUser',
      'UserPermission',
      'SystemMetric',
      'PlatformConfiguration',
      'SecurityPolicy',
      'AuditLog',
      'SystemBackup',
      'PlatformNotification',
      'Integration',
      'MaintenanceWindow',
      'DeploymentRecord',
      'PerformanceMetric'
    ],
    webhooks: [
      {
        event: 'user.created',
        url: '/webhook/user-created',
        method: 'POST'
      },
      {
        event: 'user.updated',
        url: '/webhook/user-updated',
        method: 'POST'
      },
      {
        event: 'app.installed',
        url: '/webhook/app-installed',
        method: 'POST'
      },
      {
        event: 'system.alert',
        url: '/webhook/system-alert',
        method: 'POST'
      },
      {
        event: 'security.breach',
        url: '/webhook/security-breach',
        method: 'POST'
      },
      {
        event: 'backup.completed',
        url: '/webhook/backup-completed',
        method: 'POST'
      },
      {
        event: 'maintenance.started',
        url: '/webhook/maintenance-started',
        method: 'POST'
      },
      {
        event: 'deployment.completed',
        url: '/webhook/deployment-completed',
        method: 'POST'
      }
    ]
  },
  
  scheduledJobs: [
    {
      id: 'system-health-check',
      name: 'System Health Check',
      description: 'Monitor system health and generate alerts',
      schedule: '*/5 * * * *', // Every 5 minutes
      function: 'performSystemHealthCheck',
      enabled: true,
      timezone: 'UTC',
      params: {
        checkDatabase: true,
        checkStorage: true,
        checkNetworking: true,
        alertThreshold: 80
      }
    },
    {
      id: 'daily-analytics',
      name: 'Daily Analytics Generation',
      description: 'Generate daily platform analytics and reports',
      schedule: '0 1 * * *', // Daily at 1 AM
      function: 'generateDailyAnalytics',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeUserMetrics: true,
        includeAppMetrics: true,
        includePerformanceMetrics: true
      }
    },
    {
      id: 'log-rotation',
      name: 'Log Rotation and Cleanup',
      description: 'Rotate and cleanup old log files',
      schedule: '0 2 * * *', // Daily at 2 AM
      function: 'rotateAndCleanupLogs',
      enabled: true,
      timezone: 'UTC',
      params: {
        retentionDays: 90,
        compressOldLogs: true
      }
    },
    {
      id: 'automated-backup',
      name: 'Automated Platform Backup',
      description: 'Create automated backups of platform data',
      schedule: '0 3 * * *', // Daily at 3 AM
      function: 'createAutomatedBackup',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeDatabase: true,
        includeFiles: true,
        includeConfiguration: true,
        retentionDays: 30
      }
    },
    {
      id: 'security-scan',
      name: 'Security Vulnerability Scan',
      description: 'Scan for security vulnerabilities and threats',
      schedule: '0 4 * * *', // Daily at 4 AM
      function: 'performSecurityScan',
      enabled: true,
      timezone: 'UTC',
      params: {
        scanDependencies: true,
        scanConfigurations: true,
        scanUserAccess: true
      }
    },
    {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Optimize database and system performance',
      schedule: '0 5 * * 0', // Weekly on Sunday at 5 AM
      function: 'optimizePerformance',
      enabled: true,
      timezone: 'UTC',
      params: {
        optimizeDatabase: true,
        cleanupCache: true,
        defragmentStorage: true
      }
    },
    {
      id: 'user-activity-analysis',
      name: 'User Activity Analysis',
      description: 'Analyze user activity patterns and generate insights',
      schedule: '0 6 * * *', // Daily at 6 AM
      function: 'analyzeUserActivity',
      enabled: true,
      timezone: 'UTC',
      params: {
        lookbackDays: 7,
        generateRecommendations: true
      }
    },
    {
      id: 'integration-health-check',
      name: 'Integration Health Check',
      description: 'Check health of third-party integrations',
      schedule: '0 */6 * * *', // Every 6 hours
      function: 'checkIntegrationHealth',
      enabled: true,
      timezone: 'UTC',
      params: {
        testConnectivity: true,
        validateCredentials: true,
        alertOnFailure: true
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    apps: [],
    permissions: [
      'parse:read',
      'parse:write',
      'parse:admin',
      'blockchain:read',
      'blockchain:write',
      'notifications:send',
      'storage:read',
      'storage:write',
      'system:admin'
    ]
  },
  
  configuration: {
    schema: {
      maxUsersPerOrganization: {
        type: 'number',
        label: 'Maximum Users Per Organization',
        description: 'Maximum number of users allowed per organization',
        defaultValue: 1000,
        required: true,
        validation: {
          min: 1
        }
      },
      sessionTimeoutMinutes: {
        type: 'number',
        label: 'Session Timeout (Minutes)',
        description: 'User session timeout in minutes',
        defaultValue: 60,
        required: true,
        validation: {
          min: 5,
          max: 480
        }
      },
      enableTwoFactorAuth: {
        type: 'boolean',
        label: 'Enable Two-Factor Authentication',
        description: 'Require two-factor authentication for admin users',
        defaultValue: true,
        required: false
      },
      backupRetentionDays: {
        type: 'number',
        label: 'Backup Retention (Days)',
        description: 'Number of days to retain automated backups',
        defaultValue: 30,
        required: true,
        validation: {
          min: 7,
          max: 365
        }
      },
      logRetentionDays: {
        type: 'number',
        label: 'Log Retention (Days)',
        description: 'Number of days to retain system logs',
        defaultValue: 90,
        required: true,
        validation: {
          min: 30,
          max: 365
        }
      },
      enableMaintenanceNotifications: {
        type: 'boolean',
        label: 'Enable Maintenance Notifications',
        description: 'Send notifications before scheduled maintenance',
        defaultValue: true,
        required: false
      },
      maintenanceNotificationHours: {
        type: 'number',
        label: 'Maintenance Notification Hours',
        description: 'Hours before maintenance to send notifications',
        defaultValue: 24,
        required: true,
        validation: {
          min: 1,
          max: 168
        }
      },
      enableSystemAlerts: {
        type: 'boolean',
        label: 'Enable System Alerts',
        description: 'Send alerts for system issues and anomalies',
        defaultValue: true,
        required: false
      },
      alertThresholds: {
        type: 'object',
        label: 'Alert Thresholds',
        description: 'Thresholds for system alerts',
        defaultValue: {
          cpuUsage: 80,
          memoryUsage: 85,
          diskUsage: 90,
          errorRate: 5
        },
        required: true
      },
      enablePerformanceMonitoring: {
        type: 'boolean',
        label: 'Enable Performance Monitoring',
        description: 'Monitor and track platform performance metrics',
        defaultValue: true,
        required: false
      },
      enableSecurityScanning: {
        type: 'boolean',
        label: 'Enable Security Scanning',
        description: 'Perform automated security vulnerability scans',
        defaultValue: true,
        required: false
      },
      maxConcurrentUsers: {
        type: 'number',
        label: 'Maximum Concurrent Users',
        description: 'Maximum number of concurrent users allowed',
        defaultValue: 10000,
        required: true,
        validation: {
          min: 100
        }
      },
      enableRateLimiting: {
        type: 'boolean',
        label: 'Enable Rate Limiting',
        description: 'Enable API rate limiting for users',
        defaultValue: true,
        required: false
      },
      rateLimitRequestsPerMinute: {
        type: 'number',
        label: 'Rate Limit (Requests/Minute)',
        description: 'Maximum requests per minute per user',
        defaultValue: 100,
        required: true,
        validation: {
          min: 10,
          max: 1000
        }
      },
      enableAuditLogging: {
        type: 'boolean',
        label: 'Enable Audit Logging',
        description: 'Log all administrative actions for audit purposes',
        defaultValue: true,
        required: false
      },
      enableDataEncryption: {
        type: 'boolean',
        label: 'Enable Data Encryption',
        description: 'Encrypt sensitive data at rest and in transit',
        defaultValue: true,
        required: false
      }
    },
    defaultValues: {
      maxUsersPerOrganization: 1000,
      sessionTimeoutMinutes: 60,
      enableTwoFactorAuth: true,
      backupRetentionDays: 30,
      logRetentionDays: 90,
      enableMaintenanceNotifications: true,
      maintenanceNotificationHours: 24,
      enableSystemAlerts: true,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        errorRate: 5
      },
      enablePerformanceMonitoring: true,
      enableSecurityScanning: true,
      maxConcurrentUsers: 10000,
      enableRateLimiting: true,
      rateLimitRequestsPerMinute: 100,
      enableAuditLogging: true,
      enableDataEncryption: true
    }
  }
};