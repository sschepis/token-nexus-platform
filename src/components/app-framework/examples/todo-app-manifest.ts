import { AppManifest } from '../../../types/app-framework';

export const todoAppManifest: AppManifest = {
  id: 'todo-app',
  name: 'Todo Manager',
  version: '1.0.0',
  description: 'A simple todo management application for organizations',
  publisher: 'Token Nexus Platform',
  
  framework: {
    version: '1.0.0',
    compatibility: ['1.0.0', '1.1.0']
  },
  
  adminUI: {
    enabled: true,
    routes: [
      {
        path: '/',
        component: 'TodoAppDashboard',
        title: 'Dashboard',
        description: 'Main todo dashboard',
        layout: 'default'
      },
      {
        path: '/settings',
        component: 'TodoAppSettings',
        title: 'Settings',
        description: 'Configure todo app settings',
        permissions: ['app:configure'],
        layout: 'default'
      }
    ],
    navigation: [
      {
        label: 'Todo Dashboard',
        icon: '📋',
        path: '/',
        order: 1
      },
      {
        label: 'Settings',
        icon: '⚙️',
        path: '/settings',
        order: 2,
        permissions: ['app:configure']
      }
    ],
    permissions: ['app:read', 'app:write', 'app:configure']
  },
  
  userUI: {
    enabled: false,
    routes: []
  },
  
  backend: {
    cloudFunctions: [
      'createTodo',
      'updateTodo',
      'deleteTodo',
      'getTodos',
      'dailyTodoCleanup',
      'generateWeeklyReport'
    ],
    schemas: ['Todo'],
    webhooks: [
      {
        event: 'todo.created',
        url: '/webhook/todo-created',
        method: 'POST'
      }
    ]
  },
  
  // NEW: Scheduled Jobs
  scheduledJobs: [
    {
      id: 'daily-cleanup',
      name: 'Daily Todo Cleanup',
      description: 'Archive completed todos and send reminder emails',
      schedule: '0 2 * * *', // Daily at 2 AM
      function: 'dailyTodoCleanup',
      enabled: true,
      timezone: 'UTC',
      params: {
        archiveAfterDays: 7,
        sendReminders: true
      }
    },
    {
      id: 'weekly-report',
      name: 'Weekly Todo Report',
      description: 'Generate and send weekly productivity reports',
      schedule: '0 9 * * 1', // Monday at 9 AM
      function: 'generateWeeklyReport',
      enabled: true,
      timezone: 'UTC',
      params: {
        includeStats: true,
        emailReport: true
      }
    }
  ],
  
  dependencies: {
    platform: '1.0.0',
    permissions: ['dashboard:read', 'dashboard:write']
  },
  
  configuration: {
    schema: {
      autoArchive: {
        type: 'boolean',
        label: 'Auto Archive Completed Todos',
        description: 'Automatically archive todos after completion',
        defaultValue: false,
        required: false
      },
      maxTodos: {
        type: 'number',
        label: 'Maximum Todos per User',
        description: 'Set the maximum number of todos a user can create (0 for unlimited)',
        defaultValue: 100,
        required: false,
        validation: {
          min: 0,
          max: 1000
        }
      },
      reminderEnabled: {
        type: 'boolean',
        label: 'Enable Reminders',
        description: 'Send email reminders for overdue todos',
        defaultValue: false,
        required: false
      },
      categories: {
        type: 'multiselect',
        label: 'Available Categories',
        description: 'Categories that users can assign to todos',
        defaultValue: ['Work', 'Personal', 'Shopping'],
        required: false,
        options: [
          { value: 'Work', label: 'Work' },
          { value: 'Personal', label: 'Personal' },
          { value: 'Shopping', label: 'Shopping' },
          { value: 'Health', label: 'Health' },
          { value: 'Learning', label: 'Learning' }
        ]
      }
    },
    defaultValues: {
      autoArchive: false,
      maxTodos: 100,
      reminderEnabled: false,
      categories: ['Work', 'Personal', 'Shopping']
    }
  }
};