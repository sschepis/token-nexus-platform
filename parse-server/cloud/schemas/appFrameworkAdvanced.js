// Advanced App Framework Schema Definitions
// These schemas support scheduled jobs, triggers, APIs, and custom code execution

const appFrameworkAdvancedSchemas = {
  // App Scheduled Job - Cron-based job scheduling for apps
  AppScheduledJob: {
    className: 'AppScheduledJob',
    fields: {
      // Core identification
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // Job definition
      jobId: { type: 'String', required: true }, // Unique within app
      name: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Scheduling
      schedule: { type: 'String', required: true }, // Cron expression
      timezone: { type: 'String', defaultValue: 'UTC' },
      enabled: { type: 'Boolean', defaultValue: true },
      
      // Execution details
      functionName: { type: 'String', required: true }, // Cloud function to call
      params: { type: 'Object' }, // Parameters to pass to function
      
      // Status and monitoring
      status: { 
        type: 'String', 
        defaultValue: 'active' // active, paused, error, disabled
      },
      lastRun: { type: 'Date' },
      nextRun: { type: 'Date' },
      lastResult: { type: 'Object' }, // Result of last execution
      errorCount: { type: 'Number', defaultValue: 0 },
      lastError: { type: 'String' },
      
      // Execution limits
      maxRetries: { type: 'Number', defaultValue: 3 },
      timeout: { type: 'Number', defaultValue: 300 }, // seconds
      
      // Metadata
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },
    },
    indexes: {
      app_job: { appInstallation: 1, jobId: 1 }, // Unique constraint
      org_enabled: { organization: 1, enabled: 1 },
      next_run: { nextRun: 1, enabled: 1 },
      status_updated: { status: 1, updatedAt: -1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // App Trigger - Event-based triggers for apps
  AppTrigger: {
    className: 'AppTrigger',
    fields: {
      // Core identification
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // Trigger definition
      triggerId: { type: 'String', required: true }, // Unique within app
      name: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Event configuration
      eventType: { type: 'String', required: true }, // beforeSave, afterSave, beforeDelete, afterDelete, custom
      className: { type: 'String' }, // Parse class name for DB triggers
      customEvent: { type: 'String' }, // For custom event triggers
      
      // Execution details
      functionName: { type: 'String', required: true }, // Cloud function to call
      conditions: { type: 'Object' }, // Conditions for trigger execution
      
      // Status and monitoring
      enabled: { type: 'Boolean', defaultValue: true },
      status: { 
        type: 'String', 
        defaultValue: 'active' // active, paused, error, disabled
      },
      executionCount: { type: 'Number', defaultValue: 0 },
      lastExecuted: { type: 'Date' },
      lastResult: { type: 'Object' },
      errorCount: { type: 'Number', defaultValue: 0 },
      lastError: { type: 'String' },
      
      // Execution limits
      maxRetries: { type: 'Number', defaultValue: 3 },
      timeout: { type: 'Number', defaultValue: 30 }, // seconds
      
      // Metadata
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },
    },
    indexes: {
      app_trigger: { appInstallation: 1, triggerId: 1 }, // Unique constraint
      org_enabled: { organization: 1, enabled: 1 },
      event_class: { eventType: 1, className: 1 },
      custom_event: { customEvent: 1, enabled: 1 },
      status_updated: { status: 1, updatedAt: -1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // App API - Custom API endpoints for apps
  AppAPI: {
    className: 'AppAPI',
    fields: {
      // Core identification
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // API definition
      apiId: { type: 'String', required: true }, // Unique within app
      name: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Endpoint configuration
      path: { type: 'String', required: true }, // e.g., '/api/todos'
      method: { type: 'String', required: true }, // GET, POST, PUT, DELETE
      functionName: { type: 'String', required: true }, // Cloud function to call
      
      // Security and access
      isPublic: { type: 'Boolean', defaultValue: false },
      requiredPermissions: { type: 'Array' }, // Required permissions
      allowedRoles: { type: 'Array' }, // Allowed organization roles
      
      // Request/Response configuration
      requestSchema: { type: 'Object' }, // JSON schema for request validation
      responseSchema: { type: 'Object' }, // JSON schema for response
      
      // Rate limiting
      rateLimit: { type: 'Object' }, // Rate limiting configuration
      
      // Status and monitoring
      enabled: { type: 'Boolean', defaultValue: true },
      status: { 
        type: 'String', 
        defaultValue: 'active' // active, deprecated, disabled
      },
      callCount: { type: 'Number', defaultValue: 0 },
      lastCalled: { type: 'Date' },
      errorCount: { type: 'Number', defaultValue: 0 },
      lastError: { type: 'String' },
      
      // Metadata
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },
    },
    indexes: {
      app_api: { appInstallation: 1, apiId: 1 }, // Unique constraint
      org_path: { organization: 1, path: 1, method: 1 }, // Unique endpoint
      org_enabled: { organization: 1, enabled: 1 },
      public_enabled: { isPublic: 1, enabled: 1 },
      status_updated: { status: 1, updatedAt: -1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // App Custom Code - Custom code execution for apps
  AppCustomCode: {
    className: 'AppCustomCode',
    fields: {
      // Core identification
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // Code definition
      codeId: { type: 'String', required: true }, // Unique within app
      name: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Code content
      language: { type: 'String', required: true }, // javascript, python, etc.
      code: { type: 'String', required: true }, // The actual code
      version: { type: 'String', required: true },
      
      // Execution configuration
      runtime: { type: 'String', required: true }, // node18, python39, etc.
      timeout: { type: 'Number', defaultValue: 30 }, // seconds
      memoryLimit: { type: 'Number', defaultValue: 128 }, // MB
      
      // Dependencies
      dependencies: { type: 'Object' }, // Package dependencies
      environment: { type: 'Object' }, // Environment variables
      
      // Security
      permissions: { type: 'Array' }, // Required permissions
      sandboxed: { type: 'Boolean', defaultValue: true },
      
      // Status and monitoring
      enabled: { type: 'Boolean', defaultValue: true },
      status: { 
        type: 'String', 
        defaultValue: 'active' // active, testing, disabled, error
      },
      executionCount: { type: 'Number', defaultValue: 0 },
      lastExecuted: { type: 'Date' },
      lastResult: { type: 'Object' },
      errorCount: { type: 'Number', defaultValue: 0 },
      lastError: { type: 'String' },
      
      // Metadata
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },
    },
    indexes: {
      app_code: { appInstallation: 1, codeId: 1 }, // Unique constraint
      org_enabled: { organization: 1, enabled: 1 },
      language_status: { language: 1, status: 1 },
      status_updated: { status: 1, updatedAt: -1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // App Communication - Inter-app communication channels
  AppCommunication: {
    className: 'AppCommunication',
    fields: {
      // Core identification
      sourceApp: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      targetApp: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // Communication definition
      channelId: { type: 'String', required: true }, // Unique within org
      name: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Channel configuration
      type: { type: 'String', required: true }, // event, api, data_sync, webhook
      direction: { type: 'String', required: true }, // bidirectional, source_to_target, target_to_source
      
      // Event configuration (for event type)
      eventName: { type: 'String' }, // Event name for communication
      eventSchema: { type: 'Object' }, // Schema for event data
      
      // API configuration (for api type)
      apiEndpoint: { type: 'String' }, // API endpoint path
      apiMethod: { type: 'String' }, // HTTP method
      
      // Data sync configuration (for data_sync type)
      syncConfig: { type: 'Object' }, // Data synchronization configuration
      
      // Security and access
      permissions: { type: 'Array' }, // Required permissions
      encrypted: { type: 'Boolean', defaultValue: false },
      
      // Status and monitoring
      enabled: { type: 'Boolean', defaultValue: true },
      status: { 
        type: 'String', 
        defaultValue: 'active' // active, paused, error, disabled
      },
      messageCount: { type: 'Number', defaultValue: 0 },
      lastMessage: { type: 'Date' },
      errorCount: { type: 'Number', defaultValue: 0 },
      lastError: { type: 'String' },
      
      // Metadata
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },
      updatedBy: { type: 'Pointer', targetClass: '_User' },
    },
    indexes: {
      org_channel: { organization: 1, channelId: 1 }, // Unique constraint
      source_target: { sourceApp: 1, targetApp: 1 },
      org_enabled: { organization: 1, enabled: 1 },
      type_status: { type: 1, status: 1 },
      status_updated: { status: 1, updatedAt: -1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // App Execution Log - Logging for app executions
  AppExecutionLog: {
    className: 'AppExecutionLog',
    fields: {
      // Core identification
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      
      // Execution details
      executionType: { type: 'String', required: true }, // job, trigger, api, custom_code
      executionId: { type: 'String', required: true }, // ID of the executed item
      functionName: { type: 'String', required: true },
      
      // Execution context
      triggeredBy: { type: 'String' }, // user_id, system, schedule, event
      requestId: { type: 'String' }, // For tracking related requests
      
      // Execution data
      input: { type: 'Object' }, // Input parameters
      output: { type: 'Object' }, // Execution result
      
      // Status and timing
      status: { type: 'String', required: true }, // success, error, timeout, cancelled
      startTime: { type: 'Date', required: true },
      endTime: { type: 'Date' },
      duration: { type: 'Number' }, // milliseconds
      
      // Error information
      errorMessage: { type: 'String' },
      errorStack: { type: 'String' },
      errorCode: { type: 'String' },
      
      // Resource usage
      memoryUsed: { type: 'Number' }, // MB
      cpuTime: { type: 'Number' }, // milliseconds
      
      // Metadata
      userAgent: { type: 'String' },
      ipAddress: { type: 'String' },
    },
    indexes: {
      app_execution: { appInstallation: 1, executionType: 1, startTime: -1 },
      org_status: { organization: 1, status: 1, startTime: -1 },
      execution_item: { executionType: 1, executionId: 1, startTime: -1 },
      status_time: { status: 1, startTime: -1 },
      request_tracking: { requestId: 1 },
    },
    classLevelPermissions: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },
};

module.exports = appFrameworkAdvancedSchemas;