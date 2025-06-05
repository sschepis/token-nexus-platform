// Dashboard Schema Definitions

Parse.Cloud.beforeSave('DashboardConfig', async (request) => {
  const config = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // New config
  if (!config.existed()) {
    config.set('user', user);
    
    // Ensure organization is set
    if (!config.get('organization')) {
      throw new Error('Organization is required');
    }
  } else {
    // Verify user owns the config
    if (config.get('user').id !== user.id) {
      throw new Error('Cannot modify another user\'s dashboard configuration');
    }
  }
});

// Define schemas
const schemas = {
  DashboardConfig: {
    className: 'DashboardConfig',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      organization: {
        type: 'Pointer',
        targetClass: 'Organization',
        required: true
      },
      layouts: {
        type: 'Object',
        required: true
      },
      widgets: {
        type: 'Array',
        required: true
      },
      isDefault: {
        type: 'Boolean',
        defaultValue: false
      },
      theme: {
        type: 'Object'
      },
      preferences: {
        type: 'Object'
      }
    },
    classLevelPermissions: {
      find: {
        requiresAuthentication: true
      },
      count: {
        requiresAuthentication: true
      },
      get: {
        requiresAuthentication: true
      },
      create: {
        requiresAuthentication: true
      },
      update: {
        requiresAuthentication: true
      },
      delete: {
        requiresAuthentication: true
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      user_1_organization_1: {
        user: 1,
        organization: 1
      }
    }
  },

  DashboardTemplate: {
    className: 'DashboardTemplate',
    fields: {
      name: {
        type: 'String',
        required: true
      },
      description: {
        type: 'String'
      },
      category: {
        type: 'String',
        required: true
      },
      layouts: {
        type: 'Object',
        required: true
      },
      widgets: {
        type: 'Array',
        required: true
      },
      thumbnail: {
        type: 'String'
      },
      isActive: {
        type: 'Boolean',
        defaultValue: true
      },
      createdBy: {
        type: 'Pointer',
        targetClass: '_User'
      }
    },
    classLevelPermissions: {
      find: {
        '*': true
      },
      count: {
        '*': true
      },
      get: {
        '*': true
      },
      create: {
        requiresAuthentication: true
      },
      update: {
        requiresAuthentication: true
      },
      delete: {
        requiresAuthentication: true
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      category_1_isActive_1: {
        category: 1,
        isActive: 1
      }
    }
  }
};

module.exports = schemas;