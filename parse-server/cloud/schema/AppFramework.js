// App Framework Schema Definitions

const appFrameworkSchema = {
  // App Bundle - Main app definition for developers
  AppBundle: {
    className: 'AppBundle',
    fields: {
      name: { type: 'String', required: true },
      description: { type: 'String', required: true },
      category: { type: 'String', required: true },
      status: { 
        type: 'String', 
        required: true, 
        defaultValue: 'draft' // draft, in_review, approved, rejected, published
      },
      currentVersion: { type: 'String', required: true },
      publishedVersion: { type: 'String' },
      publishedVersionId: { type: 'String' },
      latestVersionId: { type: 'String' },
      lastApprovedVersion: { type: 'String' },
      lastApprovedAt: { type: 'Date' },
      
      // Developer info
      developer: { type: 'String', required: true }, // User ID
      
      // App content and assets
      bundleUrl: { type: 'String' },
      icon: { type: 'String' },
      screenshots: { type: 'Array' },
      
      // App configuration
      permissions: { type: 'Array', defaultValue: [] }, // List of required permissions
      configuration: { type: 'Object', defaultValue: {} }, // Default configuration schema
      
      // Support and documentation
      supportEmail: { type: 'String' },
      website: { type: 'String' },
      documentation: { type: 'String' },
      
      // Publishing info
      publishedAt: { type: 'Date' },
    },
    indexes: {
      developer_status: { developer: 1, status: 1 },
      category_status: { category: 1, status: 1 },
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

  // App Version - Version history for app bundles
  AppVersion: {
    className: 'AppVersion',
    fields: {
      appBundle: { type: 'Pointer', targetClass: 'AppBundle', required: true },
      version: { type: 'String', required: true },
      status: { 
        type: 'String', 
        required: true, 
        defaultValue: 'pending_review' // pending_review, in_review, approved, rejected, published
      },
      bundleUrl: { type: 'String' },
      releaseNotes: { type: 'String' },
      
      // Submission info
      submittedBy: { type: 'Pointer', targetClass: '_User' },
      submittedAt: { type: 'Date' },
      submissionNotes: { type: 'String' },
      
      // Review info
      approvedAt: { type: 'Date' },
      approvedBy: { type: 'String' }, // User ID
      rejectedAt: { type: 'Date' },
      rejectedBy: { type: 'String' }, // User ID
      rejectionReason: { type: 'String' },
      
      // Publishing info
      publishedAt: { type: 'Date' },
      publishedBy: { type: 'String' }, // User ID
    },
    indexes: {
      bundle_version: { appBundle: 1, version: 1 },
      bundle_status: { appBundle: 1, status: 1 },
      status_submitted: { status: 1, submittedAt: -1 },
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

  // App Review - Review process for app versions
  AppReview: {
    className: 'AppReview',
    fields: {
      appBundle: { type: 'Pointer', targetClass: 'AppBundle', required: true },
      appVersion: { type: 'Pointer', targetClass: 'AppVersion', required: true },
      status: { 
        type: 'String', 
        required: true, 
        defaultValue: 'pending' // pending, approved, rejected
      },
      
      // Submission info
      submittedBy: { type: 'Pointer', targetClass: '_User', required: true },
      submittedAt: { type: 'Date', required: true },
      submissionNotes: { type: 'String' },
      
      // Review info
      reviewedBy: { type: 'Pointer', targetClass: '_User' },
      reviewedAt: { type: 'Date' },
      reviewComments: { type: 'String' },
      rejectionReason: { type: 'String' },
    },
    indexes: {
      bundle_status: { appBundle: 1, status: 1 },
      status_submitted: { status: 1, submittedAt: 1 },
      reviewer_reviewed: { reviewedBy: 1, reviewedAt: -1 },
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

  // App Definition - Published apps available in marketplace
  AppDefinition: {
    className: 'AppDefinition',
    fields: {
      appBundle: { type: 'Pointer', targetClass: 'AppBundle', required: true },
      name: { type: 'String', required: true },
      description: { type: 'String', required: true },
      category: { type: 'String', required: true },
      version: { type: 'String', required: true },
      
      // App content and assets
      bundleUrl: { type: 'String', required: true },
      icon: { type: 'String' },
      screenshots: { type: 'Array' },
      
      // App configuration
      permissions: { type: 'Array', defaultValue: [] }, // List of required permissions
      configuration: { type: 'Object', defaultValue: {} }, // Default configuration schema
      manifest: { type: 'Object', defaultValue: {} }, // App manifest for routing and integration
      
      // Developer and support info
      developer: { type: 'String', required: true }, // User ID
      supportEmail: { type: 'String' },
      website: { type: 'String' },
      documentation: { type: 'String' },
      
      // Marketplace info
      isActive: { type: 'Boolean', defaultValue: true },
      isFeatured: { type: 'Boolean', defaultValue: false },
      rating: { type: 'Number', defaultValue: 0 },
      downloadCount: { type: 'Number', defaultValue: 0 },
      publishedAt: { type: 'Date', required: true },
      lastUpdated: { type: 'Date' },
    },
    indexes: {
      category_active: { category: 1, isActive: 1 },
      featured_rating: { isFeatured: -1, rating: -1 },
      active_published: { isActive: 1, publishedAt: -1 },
    },
    classLevelPermissions: {
      find: { '*': true }, // Public read access for marketplace
      get: { '*': true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: { requiresMaster: true },
    },
  },

  // Organization App Installation - Apps installed in organizations
  OrgAppInstallation: {
    className: 'OrgAppInstallation',
    fields: {
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      appDefinition: { type: 'Pointer', targetClass: 'AppDefinition', required: true },
      
      // Installation info
      installedVersion: { type: 'String', required: true },
      status: { 
        type: 'String', 
        required: true, 
        defaultValue: 'active' // active, suspended, uninstalled
      },
      
      // Configuration
      configuration: { type: 'Object', defaultValue: {} }, // Org-specific app configuration
      settings: { type: 'Object', defaultValue: {} }, // App runtime settings
      
      // Installation metadata
      installedBy: { type: 'Pointer', targetClass: '_User', required: true },
      installedAt: { type: 'Date', required: true },
      lastUsed: { type: 'Date' },
      usageCount: { type: 'Number', defaultValue: 0 },
    },
    indexes: {
      org_app: { organization: 1, appDefinition: 1 }, // Unique constraint
      org_status: { organization: 1, status: 1 },
      app_installed: { appDefinition: 1, installedAt: -1 },
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

  // App Route - Routing definitions for installed apps
  AppRoute: {
    className: 'AppRoute',
    fields: {
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      appInstallation: { type: 'Pointer', targetClass: 'OrgAppInstallation', required: true },
      
      // Route definition
      path: { type: 'String', required: true }, // e.g., '/apps/my-app/admin'
      component: { type: 'String', required: true }, // Component name or path
      title: { type: 'String', required: true },
      description: { type: 'String' },
      
      // Route metadata
      icon: { type: 'String' },
      category: { type: 'String' },
      isPublic: { type: 'Boolean', defaultValue: false },
      requiredPermissions: { type: 'Array' },
      
      // Layout and positioning
      layout: { type: 'String', defaultValue: 'AppLayout' },
      sidebarPosition: { type: 'Number' },
      isActive: { type: 'Boolean', defaultValue: true },
    },
    indexes: {
      org_path: { organization: 1, path: 1 }, // Unique constraint
      org_app: { organization: 1, appInstallation: 1 },
      org_active: { organization: 1, isActive: 1 },
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

module.exports = appFrameworkSchema;