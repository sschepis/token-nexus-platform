// Contract Deployment Schema Definitions

Parse.Cloud.beforeSave('ContractDeployment', async (request) => {
  const deployment = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can manage deployments');
  }

  // Validate required fields for new deployments
  if (!deployment.existed()) {
    if (!deployment.get('chainId') || !deployment.get('networkId')) {
      throw new Error('Chain ID and network ID are required');
    }
    
    if (!deployment.get('factoryContract') || !deployment.get('appBundle')) {
      throw new Error('Factory contract and app bundle are required');
    }
    
    deployment.set('status', deployment.get('status') || 'pending');
    deployment.set('deployedBy', user);
  }
});

// Define schemas
const schemas = {
  ContractDeployment: {
    className: 'ContractDeployment',
    fields: {
      chainId: {
        type: 'String',
        required: true
      },
      networkId: {
        type: 'String',
        required: true
      },
      factoryContract: {
        type: 'Pointer',
        targetClass: 'FactoryContract',
        required: true
      },
      appBundle: {
        type: 'Pointer',
        targetClass: 'AppDefinition',
        required: true
      },
      deploymentParams: {
        type: 'Object'
      },
      status: {
        type: 'String',
        required: true
      },
      contractAddress: {
        type: 'String'
      },
      transactionHash: {
        type: 'String'
      },
      blockNumber: {
        type: 'Number'
      },
      gasUsed: {
        type: 'String'
      },
      gasCost: {
        type: 'String'
      },
      deployedBy: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      deployedAt: {
        type: 'Date'
      },
      error: {
        type: 'String'
      },
      metadata: {
        type: 'Object'
      }
    },
    classLevelPermissions: {
      find: {
        'role:SystemAdmin': true
      },
      count: {
        'role:SystemAdmin': true
      },
      get: {
        'role:SystemAdmin': true
      },
      create: {
        'role:SystemAdmin': true
      },
      update: {
        'role:SystemAdmin': true
      },
      delete: {
        '*': false
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      chainId_1_networkId_1_status_1: {
        chainId: 1,
        networkId: 1,
        status: 1
      },
      contractAddress_1: {
        contractAddress: 1
      },
      deployedBy_1_createdAt_n1: {
        deployedBy: 1,
        createdAt: -1
      }
    }
  }
};

module.exports = schemas;