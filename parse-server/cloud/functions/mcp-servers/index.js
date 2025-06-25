const { requireAuth, requireOrgAdmin } = require('../auth/authUtils');
const { validateOrganizationAccess } = require('../organization/organizationUtils');

/**
 * Get all MCP servers for an organization
 */
Parse.Cloud.define('getMCPServers', async (request) => {
  const { user, params } = request;
  const { organizationId } = params;

  // Require authentication
  requireAuth(user);

  // Validate organization access
  await validateOrganizationAccess(user, organizationId);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    query.equalTo('organizationId', organizationId);
    query.ascending('name');

    const servers = await query.find({ useMasterKey: true });
    
    return servers.map(server => ({
      id: server.id,
      name: server.get('name'),
      description: server.get('description'),
      type: server.get('type'),
      status: server.get('status'),
      organizationId: server.get('organizationId'),
      config: server.get('config'),
      capabilities: server.get('capabilities'),
      createdAt: server.get('createdAt'),
      updatedAt: server.get('updatedAt'),
      createdBy: server.get('createdBy'),
      lastConnectedAt: server.get('lastConnectedAt'),
      errorMessage: server.get('errorMessage')
    }));
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch MCP servers');
  }
});

/**
 * Create a new MCP server
 */
Parse.Cloud.define('createMCPServer', async (request) => {
  const { user, params } = request;
  const { organizationId, name, description, type, config } = params;

  // Require authentication and org admin permissions
  requireAuth(user);
  await requireOrgAdmin(user, organizationId);

  // Validate required fields
  if (!name || !description || !type || !config) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields');
  }

  if (!['stdio', 'sse'].includes(type)) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid server type. Must be "stdio" or "sse"');
  }

  try {
    // Check if server name already exists in organization
    const MCPServer = Parse.Object.extend('MCPServer');
    const existingQuery = new Parse.Query(MCPServer);
    existingQuery.equalTo('organizationId', organizationId);
    existingQuery.equalTo('name', name);
    
    const existing = await existingQuery.first({ useMasterKey: true });
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A server with this name already exists');
    }

    // Create new MCP server
    const mcpServer = new MCPServer();
    mcpServer.set('name', name);
    mcpServer.set('description', description);
    mcpServer.set('type', type);
    mcpServer.set('status', 'inactive');
    mcpServer.set('organizationId', organizationId);
    mcpServer.set('config', config);
    mcpServer.set('createdBy', user.id);
    mcpServer.set('capabilities', null);
    mcpServer.set('lastConnectedAt', null);
    mcpServer.set('errorMessage', null);

    // Set ACL for organization access
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${organizationId}`, true);
    acl.setRoleWriteAccess(`org_admin_${organizationId}`, true);
    mcpServer.setACL(acl);

    const savedServer = await mcpServer.save(null, { useMasterKey: true });

    return {
      id: savedServer.id,
      name: savedServer.get('name'),
      description: savedServer.get('description'),
      type: savedServer.get('type'),
      status: savedServer.get('status'),
      organizationId: savedServer.get('organizationId'),
      config: savedServer.get('config'),
      capabilities: savedServer.get('capabilities'),
      createdAt: savedServer.get('createdAt'),
      updatedAt: savedServer.get('updatedAt'),
      createdBy: savedServer.get('createdBy'),
      lastConnectedAt: savedServer.get('lastConnectedAt'),
      errorMessage: savedServer.get('errorMessage')
    };
  } catch (error) {
    console.error('Error creating MCP server:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create MCP server');
  }
});

/**
 * Update an existing MCP server
 */
Parse.Cloud.define('updateMCPServer', async (request) => {
  const { user, params } = request;
  const { serverId, name, description, config, status } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await requireOrgAdmin(user, organizationId);

    // Update fields if provided
    if (name !== undefined) server.set('name', name);
    if (description !== undefined) server.set('description', description);
    if (config !== undefined) server.set('config', config);
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid status. Must be "active" or "inactive"');
      }
      server.set('status', status);
    }

    const savedServer = await server.save(null, { useMasterKey: true });

    return {
      id: savedServer.id,
      name: savedServer.get('name'),
      description: savedServer.get('description'),
      type: savedServer.get('type'),
      status: savedServer.get('status'),
      organizationId: savedServer.get('organizationId'),
      config: savedServer.get('config'),
      capabilities: savedServer.get('capabilities'),
      createdAt: savedServer.get('createdAt'),
      updatedAt: savedServer.get('updatedAt'),
      createdBy: savedServer.get('createdBy'),
      lastConnectedAt: savedServer.get('lastConnectedAt'),
      errorMessage: savedServer.get('errorMessage')
    };
  } catch (error) {
    console.error('Error updating MCP server:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update MCP server');
  }
});

/**
 * Delete an MCP server
 */
Parse.Cloud.define('deleteMCPServer', async (request) => {
  const { user, params } = request;
  const { serverId } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await requireOrgAdmin(user, organizationId);

    await server.destroy({ useMasterKey: true });

    return { success: true };
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete MCP server');
  }
});

/**
 * Test connection to an MCP server
 */
Parse.Cloud.define('testMCPServerConnection', async (request) => {
  const { user, params } = request;
  const { serverId } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await validateOrganizationAccess(user, organizationId);

    // TODO: Implement actual MCP connection testing
    // For now, return a mock response
    const mockCapabilities = {
      tools: [
        {
          name: 'example_tool',
          description: 'An example tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      ],
      resources: [
        {
          uri: 'example://resource',
          name: 'Example Resource',
          description: 'An example resource'
        }
      ],
      prompts: []
    };

    // Update server with connection test results
    server.set('lastConnectedAt', new Date());
    server.set('capabilities', mockCapabilities);
    server.set('errorMessage', null);
    await server.save(null, { useMasterKey: true });

    return {
      success: true,
      capabilities: mockCapabilities,
      latency: Math.floor(Math.random() * 100) + 50 // Mock latency
    };
  } catch (error) {
    console.error('Error testing MCP server connection:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to test MCP server connection');
  }
});

/**
 * Get MCP server capabilities
 */
Parse.Cloud.define('getMCPServerCapabilities', async (request) => {
  const { user, params } = request;
  const { serverId } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await validateOrganizationAccess(user, organizationId);

    return server.get('capabilities') || { tools: [], resources: [], prompts: [] };
  } catch (error) {
    console.error('Error getting MCP server capabilities:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get MCP server capabilities');
  }
});

/**
 * Execute an MCP tool
 */
Parse.Cloud.define('executeMCPTool', async (request) => {
  const { user, params } = request;
  const { serverId, toolName, arguments: toolArguments } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await validateOrganizationAccess(user, organizationId);

    if (server.get('status') !== 'active') {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'MCP server is not active');
    }

    // TODO: Implement actual MCP tool execution
    // For now, return a mock response
    return {
      toolName,
      arguments: toolArguments,
      result: `Mock result for tool ${toolName}`,
      executedAt: new Date()
    };
  } catch (error) {
    console.error('Error executing MCP tool:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to execute MCP tool');
  }
});

/**
 * Access an MCP resource
 */
Parse.Cloud.define('accessMCPResource', async (request) => {
  const { user, params } = request;
  const { serverId, resourceUri } = params;

  // Require authentication
  requireAuth(user);

  try {
    const MCPServer = Parse.Object.extend('MCPServer');
    const query = new Parse.Query(MCPServer);
    const server = await query.get(serverId, { useMasterKey: true });

    if (!server) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'MCP server not found');
    }

    // Validate organization access
    const organizationId = server.get('organizationId');
    await validateOrganizationAccess(user, organizationId);

    if (server.get('status') !== 'active') {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'MCP server is not active');
    }

    // TODO: Implement actual MCP resource access
    // For now, return a mock response
    return {
      uri: resourceUri,
      content: `Mock content for resource ${resourceUri}`,
      mimeType: 'text/plain',
      accessedAt: new Date()
    };
  } catch (error) {
    console.error('Error accessing MCP resource:', error);
    if (error instanceof Parse.Error) {
      throw error;
    }
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to access MCP resource');
  }
});