// Chain Configuration Schema Definitions

Parse.Cloud.beforeSave('ChainConfig', async (request) => {
  const config = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage chain configurations');
  }

  // Validate required fields
  if (!config.get('chainId') || !config.get('chainName')) {
    throw new Error('Chain ID and name are required');
  }

  // Set default values for new configs
  if (!config.existed()) {
    config.set('isActive', true);
    config.set('networks', config.get('networks') || []);
    
    // Set default native currency if not provided
    if (!config.get('nativeCurrency')) {
      config.set('nativeCurrency', {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      });
    }
  }
});

// Define schemas
const schemas = {
  ChainConfig: {
    className: 'ChainConfig',
    fields: {
      chainId: {
        type: 'String',
        required: true
      },
      chainName: {
        type: 'String',
        required: true
      },
      displayName: {
        type: 'String',
        required: true
      },
      nativeCurrency: {
        type: 'Object',
        required: true
      },
      networks: {
        type: 'Array',
        defaultValue: []
      },
      isActive: {
        type: 'Boolean',
        defaultValue: true
      },
      icon: {
        type: 'String'
      },
      explorerUrl: {
        type: 'String'
      },
      documentation: {
        type: 'String'
      },
      gasSettings: {
        type: 'Object'
      },
      features: {
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
        'role:SystemAdmin': true
      },
      update: {
        'role:SystemAdmin': true
      },
      delete: {
        'role:SystemAdmin': true
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      chainId_1: {
        chainId: 1
      },
      isActive_1: {
        isActive: 1
      }
    }
  }
};

module.exports = schemas;