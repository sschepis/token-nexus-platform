// Base schema for CMS classes
const baseSchema = {
  // Common fields for all CMS classes
  createdBy: {
    type: 'Pointer',
    targetClass: '_User',
    required: true,
  },
  updatedBy: {
    type: 'Pointer',
    targetClass: '_User',
    required: true,
  },
  organization: {
    type: 'Pointer',
    targetClass: 'Organization',
    required: true,
  },
  status: {
    type: 'String',
    required: true,
    defaultValue: 'active',
  },
  metadata: {
    type: 'Object',
  },
};

const basePermissions = {
  find: { '*': true },
  count: { '*': true },
  get: { '*': true },
  create: { '*': true },
  update: { requiresAuthentication: true },
  delete: { requiresAuthentication: true },
  addField: { '*': true },
};

// Schema definitions for CMS classes
const schemaDefinitions = [
  {
    className: 'EVMEvent',
    fields: {
      ...baseSchema, // Includes createdBy, updatedBy, organization, status, metadata
      chainId: { type: 'Number', required: true },
      blockNumber: { type: 'Number', required: true },
      blockTimestamp: { type: 'Date', required: true },
      transactionHash: { type: 'String', required: true },
      logIndex: { type: 'Number', required: true },
      contractAddress: { type: 'String', required: true },
      eventName: { type: 'String', required: true },
      eventData: { type: 'Object', required: true },
    },
    indexes: {
      uniqueEventIndex: { chainId: 1, transactionHash: 1, logIndex: 1 }, // Unique compound index
      contractAddressIndex: { contractAddress: 1 },
      eventNameIndex: { eventName: 1 },
      blockTimestampIndex: { blockTimestamp: -1 }
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'User',
    fields: {
      walletAddress: {
        type: 'String',
      },
      walletPreference: {
        type: 'String',
      },
      walletId: {
        type: 'String',
      },
      isSystemAdmin: { // New field for system administrators
        type: 'Boolean',
        defaultValue: false,
      },
    },
  },
  {
    className: 'Organization',
    fields: {
      name: {
        type: 'String',
        required: true,
      },
      subdomain: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
      },
      industry: {
        type: 'String',
      },
      status: {
        type: 'String',
        required: true,
        defaultValue: 'Active',
      },
      createdBy: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      updatedBy: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      settings: {
        type: 'Object',
        defaultValue: {},
      },
      metadata: {
        type: 'Object',
        defaultValue: {},
      },
      isParentOrg: {
        type: 'Boolean',
        defaultValue: false,
      },
      administrator: {
        type: 'String',
      },
      facets: {
        type: 'Array',
        defaultValue: [],
      },
    },
    classLevelPermissions: basePermissions,
  },
  // Analytics and Monitoring Classes
  {
    className: 'VisitorStats',
    fields: {
      organizationId: {
        type: 'String',
        required: true,
      },
      count: {
        type: 'Number',
        required: true,
        defaultValue: 0,
      },
      date: {
        type: 'Date',
        required: true,
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'APIStats',
    fields: {
      organizationId: {
        type: 'String',
        required: true,
      },
      requests: {
        type: 'Number',
        required: true,
        defaultValue: 0,
      },
      avgResponseTime: {
        type: 'Number',
        required: true,
        defaultValue: 0,
      },
      date: {
        type: 'Date',
        required: true,
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'StorageStats',
    fields: {
      organizationId: {
        type: 'String',
        required: true,
      },
      used: {
        type: 'Number',
        required: true,
        defaultValue: 0,
      },
      total: {
        type: 'Number',
        required: true,
        defaultValue: 1024,
      },
      date: {
        type: 'Date',
        required: true,
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'ActivityLog',
    fields: {
      organizationId: {
        type: 'String',
        required: true,
      },
      type: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
        required: true,
      },
      userId: {
        type: 'String',
        required: true,
      },
      userName: {
        type: 'String',
        required: true,
      },
      metadata: {
        type: 'Object',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'Integration',
    fields: {
      organizationId: {
        type: 'String',
        required: true,
      },
      name: {
        type: 'String',
        required: true,
      },
      type: {
        type: 'String',
        required: true,
      },
      isEnabled: {
        type: 'Boolean',
        defaultValue: true,
      },
      lastSyncDate: {
        type: 'Date',
      },
      syncInterval: {
        type: 'Number',
        defaultValue: 86400000, // 24 hours in milliseconds
      },
      errorCount: {
        type: 'Number',
        defaultValue: 0,
      },
      config: {
        type: 'Object',
        defaultValue: {},
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSApplication',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
      },
      slug: {
        type: 'String',
        required: true,
      },
      // Version Management
      version: {
        type: 'String',
        defaultValue: '1.0.0',
      },
      versionHistory: {
        type: 'Array',
        defaultValue: [],
      },
      releaseNotes: {
        type: 'String',
      },
      updateAvailable: {
        type: 'Boolean',
        defaultValue: false,
      },
      latestVersion: {
        type: 'String',
      },
      status: {
        type: 'String',
        enum: ['draft', 'published', 'archived'],
        defaultValue: 'draft',
      },
      owner: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      isPublic: {
        type: 'Boolean',
        defaultValue: false,
      },
      roles: {
        type: 'Array',
      },
      pages: {
        type: 'Array',
      },
      apis: {
        type: 'Array',
      },
      triggers: {
        type: 'Array',
      },
      workflows: {
        type: 'Array',
      },
      reports: {
        type: 'Array',
      },
      // Installation Tracking
      installations: {
        type: 'Array',
        defaultValue: [], // Array of installation statistics
      },
      installationCount: {
        type: 'Number',
        defaultValue: 0,
      },
      activeInstallations: {
        type: 'Number',
        defaultValue: 0,
      },
      installationMetrics: {
        type: 'Object',
        defaultValue: {
          dailyActiveUsers: 0,
          monthlyActiveUsers: 0,
          averageUsageTime: 0,
          errorRate: 0,
        },
      },

      // Configuration Templates
      configTemplates: {
        type: 'Array',
        defaultValue: [], // Array of configuration templates
      },
      defaultConfiguration: {
        type: 'Object',
        defaultValue: {
          environment: 'development',
          settings: {},
          features: {},
          integrations: {},
        },
      },
      validationRules: {
        type: 'Object',
        defaultValue: {}, // Configuration validation rules
      },

      // Dependency Management
      dependencies: {
        type: 'Array',
        defaultValue: [], // Array of required dependencies
      },
      optionalDependencies: {
        type: 'Array',
        defaultValue: [], // Array of optional dependencies
      },
      compatibilityRequirements: {
        type: 'Object',
        defaultValue: {
          minimumVersion: '1.0.0',
          maximumVersion: null,
          requiredFeatures: [],
          requiredCapabilities: [],
        },
      },
      dependencyGraph: {
        type: 'Object',
        defaultValue: {}, // Dependency relationship graph
      },

      config: {
        type: 'Object',
        defaultValue: {},
      },
      theme: {
        type: 'Object',
        defaultValue: {},
      },
      settings: {
        type: 'Object',
        defaultValue: {},
      },
      navigation: {
        type: 'Object',
        defaultValue: {
          main: [],
          admin: [],
          footer: [],
        },
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSAPI',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
      },
      owner: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      config: {
        type: 'Object',
        defaultValue: {},
      },
      endpoints: {
        type: 'Array',
        defaultValue: [],
      },
      code: {
        type: 'String',
        defaultValue: '',
      },
      status: {
        type: 'String',
        enum: ['draft', 'published', 'archived'],
        defaultValue: 'draft',
      },
      publishedAt: {
        type: 'Date',
      },
      archivedAt: {
        type: 'Date',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSWebPage',
    fields: {
      ...baseSchema,
      title: {
        type: 'String',
        required: true,
      },
      slug: {
        type: 'String',
        required: true,
      },
      html: {
        type: 'String',
        required: true,
        defaultValue: '',
      },
      css: {
        type: 'String',
        required: true,
        defaultValue: '',
      },
      components: {
        type: 'Object',
        required: true,
        defaultValue: {},
      },
      style: {
        type: 'Object',
        required: true,
        defaultValue: {},
      },
      seo: {
        type: 'Object',
        defaultValue: {
          title: '',
          description: '',
          keywords: [],
          ogImage: '',
        },
      },
      template: {
        type: 'Pointer',
        targetClass: 'CMSTemplate',
      },
      author: {
        type: 'String',
      },
      publishedAt: {
        type: 'Date',
      },
    },
    classLevelPermissions: basePermissions,
  },
  // App Store Schemas
  {
    className: 'AppDefinition',
    fields: {
      name: { type: 'String', required: true },
      description: { type: 'String' },
      publisherName: { type: 'String', required: true }, // Name of the individual or company
      publisherId: { type: 'Pointer', targetClass: '_User' }, // Optional: Link to a User who published it
      category: { type: 'String', required: true }, // e.g., 'Finance', 'Productivity', 'Communication'
      iconUrl: { type: 'String' }, // URL to the app's icon
      tags: { type: 'Array' }, // Searchable tags
      overallRating: { type: 'Number', defaultValue: 0 },
      reviewCount: { type: 'Number', defaultValue: 0 },
      isFeatured: { type: 'Boolean', defaultValue: false },
      status: { type: 'String', defaultValue: 'active' }, // active, inactive, under_review
      ...baseSchema, // createdBy, updatedBy, organization (likely the parent/platform org)
    },
    classLevelPermissions: basePermissions, // System Admins manage these
    indexes: {
      nameIndex: { name: 1 },
      categoryIndex: { category: 1 },
      publisherNameIndex: { publisherName: 1 },
      tagsIndex: { tags: 1 }
    }
  },
  {
    className: 'AppVersion',
    fields: {
      appDefinition: { type: 'Pointer', targetClass: 'AppDefinition', required: true },
      versionString: { type: 'String', required: true }, // e.g., "1.0.2", "2.0.0-beta1"
      bundleUrl: { type: 'String', required: true }, // URL to the app bundle (e.g., zip, js file)
      changelog: { type: 'String' }, // Markdown or plain text
      releaseNotes: { type: 'String' },
      status: { type: 'String', required: true, defaultValue: 'pending_review' }, // pending_review, approved, published, rejected, deprecated
      submittedBy: { type: 'Pointer', targetClass: '_User' }, // User who submitted this version
      reviewedBy: { type: 'Pointer', targetClass: '_User' }, // System Admin who reviewed
      reviewTimestamp: { type: 'Date' },
      publishedTimestamp: { type: 'Date' },
      minPlatformVersion: { type: 'String' }, // Minimum platform version required
      dependencies: { type: 'Object' }, // e.g., { "otherAppSlug": ">=1.2.0" }
      ...baseSchema, // createdBy, updatedBy, organization (likely the parent/platform org)
    },
    classLevelPermissions: basePermissions, // System Admins manage these
    indexes: {
      appDefinitionVersionIndex: { appDefinition: 1, versionString: 1 }, // Unique compound index
      statusIndex: { status: 1 }
    }
  },
  {
    className: 'AppReview',
    fields: {
      appVersion: { type: 'Pointer', targetClass: 'AppVersion', required: true }, // Review is for a specific version
      appDefinition: { type: 'Pointer', targetClass: 'AppDefinition', required: true }, // For easier querying by app
      reviewer: { type: 'Pointer', targetClass: '_User', required: true }, // User who wrote the review
      rating: { type: 'Number', required: true, defaultValue: 0 }, // e.g., 1-5 stars
      title: { type: 'String' },
      comment: { type: 'String' },
      isApprovedByAdmin: { type: 'Boolean', defaultValue: false }, // If reviews need moderation
      status: { type: 'String', defaultValue: 'pending' }, // pending, approved, rejected (for moderation)
      ...baseSchema, // createdBy, updatedBy, organization (org of the reviewer)
    },
    // More restrictive permissions might be needed here later
    classLevelPermissions: basePermissions,
    indexes: {
      appVersionReviewerIndex: { appVersion: 1, reviewer: 1 }, // Unique compound index
      appDefinitionIndex: { appDefinition: 1 },
      ratingIndex: { rating: 1 }
    }
  },
  {
    className: 'OrgAppInstallation', // For tracking apps installed in an organization
    fields: {
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      appDefinition: { type: 'Pointer', targetClass: 'AppDefinition', required: true },
      installedVersion: { type: 'Pointer', targetClass: 'AppVersion', required: true },
      installationDate: { type: 'Date', required: true },
      status: { type: 'String', defaultValue: 'active' }, // e.g., active, inactive, needs_configuration
      appSpecificConfig: { type: 'Object' }, // Configuration specific to this app instance in this org
      installedBy: { type: 'Pointer', targetClass: '_User', required: true },
      // No baseSchema here as 'createdBy'/'updatedBy' are less relevant than 'installedBy'
      // and 'organization' is already the main context.
    },
    // Permissions should be org-specific. Org members can read. Org admins can manage.
    // For now, using basePermissions but this needs refinement with ACLs during install.
    classLevelPermissions: basePermissions,
    indexes: {
      orgAppIndex: { organization: 1, appDefinition: 1 }, // Unique per org-app pair
    }
  },
  {
    className: 'CMSTemplate',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
      },
      content: {
        type: 'Object',
        required: true,
      },
      category: {
        type: 'String',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSMedia',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      type: {
        type: 'String',
        required: true,
      },
      file: {
        type: 'File',
        required: true,
      },
      size: {
        type: 'Number',
        required: true,
      },
      metadata: {
        type: 'Object',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'UserSettings',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true,
      },
      assistantTier: {
        type: 'String',
        defaultValue: 'basic',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSReport',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      description: {
        type: 'String',
      },
      type: {
        type: 'String',
        required: true,
        enum: ['User Analytics', 'Content Analytics', 'Performance', 'Custom'],
      },
      query: {
        type: 'Object',
        required: true,
      },
      schedule: {
        type: 'String',
        enum: ['none', 'daily', 'weekly', 'monthly'],
        defaultValue: 'none',
      },
      lastRun: {
        type: 'Date',
      },
      nextRun: {
        type: 'Date',
      },
      results: {
        type: 'Array',
      },
      config: {
        type: 'Object',
        defaultValue: {},
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSReportResult',
    fields: {
      ...baseSchema,
      report: {
        type: 'Pointer',
        targetClass: 'CMSReport',
        required: true,
      },
      data: {
        type: 'Array',
        required: true,
      },
      metadata: {
        type: 'Object',
        defaultValue: {},
      },
      runTime: {
        type: 'Number',
        required: true,
      },
      status: {
        type: 'String',
        enum: ['success', 'failed'],
        required: true,
      },
      error: {
        type: 'String',
      },
    },
    classLevelPermissions: basePermissions,
  },
  {
    className: 'CMSMetric',
    fields: {
      ...baseSchema,
      name: {
        type: 'String',
        required: true,
      },
      value: {
        type: 'Number',
        required: true,
      },
      type: {
        type: 'String',
        required: true,
        enum: ['counter', 'gauge', 'histogram'],
      },
      labels: {
        type: 'Object',
        defaultValue: {},
      },
      timestamp: {
        type: 'Date',
        required: true,
      },
    },
    classLevelPermissions: basePermissions,
  },
];

module.exports = schemaDefinitions;
