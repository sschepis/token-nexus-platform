// AI Assistant Schema Definitions

Parse.Cloud.beforeSave('AIConversation', async (request) => {
  const conversation = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // New conversation
  if (!conversation.existed()) {
    conversation.set('user', user);
    conversation.set('turnCount', 0);
    conversation.set('lastMessage', '');
    
    // Set ACL
    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    conversation.setACL(acl);
  }
});

Parse.Cloud.beforeSave('AIConversationTurn', async (request) => {
  const turn = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // New turn
  if (!turn.existed()) {
    // Verify user owns the conversation
    const conversation = turn.get('conversation');
    if (conversation) {
      await conversation.fetch({ useMasterKey: true });
      if (conversation.get('user').id !== user.id) {
        throw new Error('Unauthorized access to conversation');
      }
    }

    // Set ACL
    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    turn.setACL(acl);
  }
});

// Define schemas
const schemas = {
  AIConversation: {
    className: 'AIConversation',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      title: {
        type: 'String',
        required: true
      },
      lastMessage: {
        type: 'String'
      },
      turnCount: {
        type: 'Number',
        defaultValue: 0
      },
      metadata: {
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
      user_1_updatedAt_n1: {
        user: 1,
        updatedAt: -1
      }
    }
  },

  AIConversationTurn: {
    className: 'AIConversationTurn',
    fields: {
      conversation: {
        type: 'Pointer',
        targetClass: 'AIConversation',
        required: true
      },
      userQuery: {
        type: 'String',
        required: true
      },
      assistantResponse: {
        type: 'String',
        required: true
      },
      messages: {
        type: 'Array',
        required: false
      },
      structuredData: {
        type: 'Object'
      },
      toolsUsed: {
        type: 'Array'
      },
      metadata: {
        type: 'Object'
      },
      processingTime: {
        type: 'Number'
      },
      tokenUsage: {
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
      conversation_1_createdAt_1: {
        conversation: 1,
        createdAt: 1
      }
    }
  },

  AIToolUsage: {
    className: 'AIToolUsage',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      organization: {
        type: 'Pointer',
        targetClass: 'Organization'
      },
      toolName: {
        type: 'String',
        required: true
      },
      parameters: {
        type: 'Object'
      },
      result: {
        type: 'Object'
      },
      success: {
        type: 'Boolean',
        required: true
      },
      error: {
        type: 'String'
      },
      executionTime: {
        type: 'Number'
      },
      conversationTurn: {
        type: 'Pointer',
        targetClass: 'AIConversationTurn'
      }
    },
    classLevelPermissions: {
      find: {
        '*': false
      },
      count: {
        '*': false
      },
      get: {
        '*': false
      },
      create: {
        requiresAuthentication: true
      },
      update: {
        '*': false
      },
      delete: {
        '*': false
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      user_1_toolName_1_createdAt_n1: {
        user: 1,
        toolName: 1,
        createdAt: -1
      },
      organization_1_toolName_1_createdAt_n1: {
        organization: 1,
        toolName: 1,
        createdAt: -1
      }
    }
  },

  AIAssistantUserSettings: {
    className: 'AIAssistantUserSettings',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      settings: {
        type: 'Object',
        required: true
      },
      updatedAt: {
        type: 'Date'
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
      user_1: {
        user: 1
      }
    }
  },

  AIAssistantOrgSettings: {
    className: 'AIAssistantOrgSettings',
    fields: {
      organization: {
        type: 'Pointer',
        targetClass: 'Organization',
        required: true
      },
      settings: {
        type: 'Object',
        required: true
      },
      policies: {
        type: 'Object'
      },
      usage: {
        type: 'Object'
      },
      updatedAt: {
        type: 'Date'
      },
      updatedBy: {
        type: 'Pointer',
        targetClass: '_User'
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
      organization_1: {
        organization: 1
      }
    }
  },

  AISettingsLog: {
    className: 'AISettingsLog',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User',
        required: true
      },
      action: {
        type: 'String',
        required: true
      },
      settings: {
        type: 'Object'
      },
      timestamp: {
        type: 'Date',
        required: true
      },
      ipAddress: {
        type: 'String'
      }
    },
    classLevelPermissions: {
      find: {
        '*': false
      },
      count: {
        '*': false
      },
      get: {
        '*': false
      },
      create: {
        requiresAuthentication: true
      },
      update: {
        '*': false
      },
      delete: {
        '*': false
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      user_1_timestamp_n1: {
        user: 1,
        timestamp: -1
      },
      action_1_timestamp_n1: {
        action: 1,
        timestamp: -1
      }
    }
  },

  AIUsage: {
    className: 'AIUsage',
    fields: {
      user: {
        type: 'Pointer',
        targetClass: '_User'
      },
      organization: {
        type: 'String'
      },
      provider: {
        type: 'String',
        required: true
      },
      model: {
        type: 'String'
      },
      tokens: {
        type: 'Number',
        required: true
      },
      cost: {
        type: 'Number'
      },
      latency: {
        type: 'Number'
      },
      success: {
        type: 'Boolean',
        required: true
      },
      error: {
        type: 'String'
      },
      date: {
        type: 'Date',
        required: true
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
        '*': false
      },
      delete: {
        '*': false
      },
      addField: {
        '*': false
      }
    },
    indexes: {
      user_1_date_n1: {
        user: 1,
        date: -1
      },
      organization_1_date_n1: {
        organization: 1,
        date: -1
      },
      provider_1_date_n1: {
        provider: 1,
        date: -1
      }
    }
  }
};

module.exports = schemas;