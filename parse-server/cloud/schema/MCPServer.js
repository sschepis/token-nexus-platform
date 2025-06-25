// MCP Server Schema Definitions

Parse.Cloud.beforeSave('MCPServer', async (request) => {
  const server = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // New server
  if (!server.existed()) {
    // Validate required fields
    if (!server.get('name')) {
      throw new Error('Server name is required');
    }
    if (!server.get('description')) {
      throw new Error('Server description is required');
    }
    if (!server.get('type')) {
      throw new Error('Server type is required');
    }
    if (!['stdio', 'sse'].includes(server.get('type'))) {
      throw new Error('Server type must be "stdio" or "sse"');
    }
    if (!server.get('organizationId')) {
      throw new Error('Organization ID is required');
    }
    if (!server.get('config')) {
      throw new Error('Server configuration is required');
    }

    // Set default values
    if (!server.get('status')) {
      server.set('status', 'inactive');
    }
    if (!server.get('createdBy')) {
      server.set('createdBy', user.id);
    }

    // Validate configuration based on type
    const config = server.get('config');
    const type = server.get('type');

    if (type === 'stdio') {
      if (!config.command) {
        throw new Error('STDIO servers require a command in configuration');
      }
    } else if (type === 'sse') {
      if (!config.url) {
        throw new Error('SSE servers require a URL in configuration');
      }
      // Validate URL format
      try {
        new URL(config.url);
      } catch (error) {
        throw new Error('Invalid URL format in SSE server configuration');
      }
    }

    // Set organization-based ACL
    const organizationId = server.get('organizationId');
    const acl = new Parse.ACL();
    
    // Allow read access to organization members
    acl.setRoleReadAccess(`org_${organizationId}`, true);
    
    // Allow write access to organization admins
    acl.setRoleWriteAccess(`org_admin_${organizationId}`, true);
    
    // Allow the creator to read/write
    acl.setReadAccess(user, true);
    acl.setWriteAccess(user, true);
    
    server.setACL(acl);
  } else {
    // Updating existing server
    // Validate status changes
    const status = server.get('status');
    if (status && !['active', 'inactive', 'error', 'connecting'].includes(status)) {
      throw new Error('Invalid server status');
    }

    // Update timestamp when status changes to active
    if (status === 'active' && server.dirty('status')) {
      server.set('lastConnectedAt', new Date());
    }

    // Clear error message when status changes from error
    if (status !== 'error' && server.dirty('status')) {
      server.unset('errorMessage');
    }
  }
});

Parse.Cloud.beforeDelete('MCPServer', async (request) => {
  const server = request.object;
  const user = request.user;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Only allow deletion by organization admins or the creator
  const organizationId = server.get('organizationId');
  const createdBy = server.get('createdBy');
  
  // Check if user is organization admin
  const orgAdminRole = `org_admin_${organizationId}`;
  const userRoles = await user.getRoles();
  const isOrgAdmin = userRoles.some(role => role.getName() === orgAdminRole);
  
  if (!isOrgAdmin && user.id !== createdBy) {
    throw new Error('Only organization admins or the server creator can delete MCP servers');
  }
});

// Trigger to update organization's MCP server count
Parse.Cloud.afterSave('MCPServer', async (request) => {
  const server = request.object;
  const organizationId = server.get('organizationId');

  if (!server.existed()) {
    // New server created, increment count
    try {
      const Organization = Parse.Object.extend('Organization');
      const orgQuery = new Parse.Query(Organization);
      const org = await orgQuery.get(organizationId, { useMasterKey: true });
      
      const currentCount = org.get('mcpServerCount') || 0;
      org.set('mcpServerCount', currentCount + 1);
      await org.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error updating organization MCP server count:', error);
    }
  }
});

Parse.Cloud.afterDelete('MCPServer', async (request) => {
  const server = request.object;
  const organizationId = server.get('organizationId');

  // Server deleted, decrement count
  try {
    const Organization = Parse.Object.extend('Organization');
    const orgQuery = new Parse.Query(Organization);
    const org = await orgQuery.get(organizationId, { useMasterKey: true });
    
    const currentCount = org.get('mcpServerCount') || 0;
    org.set('mcpServerCount', Math.max(0, currentCount - 1));
    await org.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Error updating organization MCP server count:', error);
  }
});

// Define the schema structure for Parse Dashboard
Parse.Cloud.define('getMCPServerSchema', async (request) => {
  return {
    className: 'MCPServer',
    fields: {
      name: { type: 'String', required: true },
      description: { type: 'String', required: true },
      type: { type: 'String', required: true }, // 'stdio' or 'sse'
      status: { type: 'String', required: true }, // 'active', 'inactive', 'error', 'connecting'
      organizationId: { type: 'String', required: true },
      config: { type: 'Object', required: true },
      capabilities: { type: 'Object' },
      createdBy: { type: 'String', required: true },
      lastConnectedAt: { type: 'Date' },
      errorMessage: { type: 'String' }
    },
    indexes: {
      organizationId: { organizationId: 1 },
      status: { status: 1 },
      type: { type: 1 },
      createdBy: { createdBy: 1 },
      compound_org_status: { organizationId: 1, status: 1 },
      compound_org_type: { organizationId: 1, type: 1 }
    }
  };
});