import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext, ActionResult } from './types/ActionTypes';
import { mcpServersApi } from '../services/api/mcpServers';
import { 
  MCPServer, 
  CreateMCPServerRequest, 
  UpdateMCPServerRequest 
} from '../types/MCPServerTypes';

export class MCPServersPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'mcp-servers',
      pageName: 'MCP Servers',
      description: 'Manage Model Context Protocol (MCP) servers for AI assistant integration',
      category: 'ai-integration',
      tags: ['mcp', 'ai', 'servers', 'integration', 'tools'],
      permissions: ['org_admin', 'ai_manager', 'mcp:read', 'mcp:write', 'system:admin'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    this.registerViewMCPServersAction();
    this.registerSearchMCPServersAction();
    this.registerCreateMCPServerAction();
    this.registerUpdateMCPServerAction();
    this.registerDeleteMCPServerAction();
    this.registerTestMCPServerConnectionAction();
    this.registerGetMCPServerCapabilitiesAction();
    this.registerExecuteMCPToolAction();
    this.registerAccessMCPResourceAction();
  }

  private registerViewMCPServersAction(): void {
    this.registerAction(
      {
        id: 'viewMCPServers',
        name: 'View MCP Servers',
        description: 'Retrieve and display all MCP servers in the current organization',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:read'],
        parameters: [
          { name: 'orgId', type: 'string', description: 'Organization ID to fetch MCP servers for', required: false }
        ]
      },
      async (params, context) => {
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const result = await mcpServersApi.getOrganizationMCPServers(orgId);
        if (result.success) {
          return { servers: result.data, count: result.data?.length || 0 };
        } else {
          throw new Error(result.error || 'Failed to fetch MCP servers');
        }
      }
    );
  }

  private registerSearchMCPServersAction(): void {
    this.registerAction(
      {
        id: 'searchMCPServers',
        name: 'Search MCP Servers',
        description: 'Search for MCP servers by name, description, or type',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:read'],
        parameters: [
          { name: 'query', type: 'string', description: 'Search query (name, description, type)', required: true },
          { name: 'filters', type: 'object', description: 'Additional filters (status, type)', required: false }
        ]
      },
      async (params, context) => {
        const query = params.query as string;
        const filters = params.filters as Record<string, unknown> || {};
        const orgId = this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const result = await mcpServersApi.getOrganizationMCPServers(orgId);
        if (result.success && result.data) {
          const filteredServers = result.data.filter((server: MCPServer) => {
            const matchesQuery = query.toLowerCase() === '' ||
              server.name.toLowerCase().includes(query.toLowerCase()) ||
              server.description.toLowerCase().includes(query.toLowerCase()) ||
              server.type.toLowerCase().includes(query.toLowerCase());

            let matchesFilters = true;
            if (filters.status) {
              matchesFilters = matchesFilters && server.status === filters.status;
            }
            if (filters.type) {
              matchesFilters = matchesFilters && server.type === filters.type;
            }
            return matchesQuery && matchesFilters;
          });
          return { servers: filteredServers, count: filteredServers.length, query, filters };
        } else {
          throw new Error(result.error || 'Failed to search MCP servers');
        }
      }
    );
  }

  private registerCreateMCPServerAction(): void {
    this.registerAction(
      {
        id: 'createMCPServer',
        name: 'Create MCP Server',
        description: 'Create a new MCP server configuration',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:write'],
        parameters: [
          { name: 'name', type: 'string', description: 'Name of the MCP server', required: true },
          { name: 'description', type: 'string', description: 'Description of the MCP server', required: true },
          { name: 'type', type: 'string', description: 'Type of MCP server (stdio or sse)', required: true },
          { name: 'config', type: 'object', description: 'Server configuration object', required: true },
          { name: 'orgId', type: 'string', description: 'Organization ID (optional)', required: false }
        ]
      },
      async (params, context) => {
        const orgId = params.orgId as string || this.getOrganizationId(context);
        if (!orgId) {
          throw new Error('No organization context available');
        }

        const serverData: CreateMCPServerRequest = {
          name: params.name as string,
          description: params.description as string,
          type: params.type as 'stdio' | 'sse',
          config: params.config as any
        };

        const result = await mcpServersApi.createMCPServer(orgId, serverData);
        if (result.success) {
          return { server: result.data, message: `MCP server "${serverData.name}" created successfully` };
        } else {
          throw new Error(result.error || 'Failed to create MCP server');
        }
      }
    );
  }

  private registerUpdateMCPServerAction(): void {
    this.registerAction(
      {
        id: 'updateMCPServer',
        name: 'Update MCP Server',
        description: 'Update an existing MCP server configuration',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:write'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server to update', required: true },
          { name: 'name', type: 'string', description: 'New name for the server', required: false },
          { name: 'description', type: 'string', description: 'New description for the server', required: false },
          { name: 'config', type: 'object', description: 'Updated configuration object', required: false },
          { name: 'status', type: 'string', description: 'New status (active or inactive)', required: false }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;
        const updates: UpdateMCPServerRequest = {};

        if (params.name) updates.name = params.name as string;
        if (params.description) updates.description = params.description as string;
        if (params.config) updates.config = params.config as any;
        if (params.status) updates.status = params.status as 'active' | 'inactive';

        const result = await mcpServersApi.updateMCPServer(serverId, updates);
        if (result.success) {
          return { server: result.data, message: `MCP server updated successfully` };
        } else {
          throw new Error(result.error || 'Failed to update MCP server');
        }
      }
    );
  }

  private registerDeleteMCPServerAction(): void {
    this.registerAction(
      {
        id: 'deleteMCPServer',
        name: 'Delete MCP Server',
        description: 'Delete an MCP server configuration',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:write'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server to delete', required: true },
          { name: 'reason', type: 'string', description: 'Reason for deletion (for audit log)', required: false }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;
        const reason = params.reason as string;

        const result = await mcpServersApi.deleteMCPServer(serverId);
        if (result.success) {
          return { 
            message: `MCP server has been deleted`,
            serverId,
            reason: reason || 'No reason provided'
          };
        } else {
          throw new Error(result.error || 'Failed to delete MCP server');
        }
      }
    );
  }

  private registerTestMCPServerConnectionAction(): void {
    this.registerAction(
      {
        id: 'testMCPServerConnection',
        name: 'Test MCP Server Connection',
        description: 'Test the connection to an MCP server and retrieve its capabilities',
        category: 'external',
        permissions: ['org_admin', 'ai_manager', 'mcp:read'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server to test', required: true }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;

        const result = await mcpServersApi.testMCPServerConnection(serverId);
        if (result.success) {
          return { 
            connectionTest: result.data,
            message: result.data?.success ? 'Connection successful' : 'Connection failed'
          };
        } else {
          throw new Error(result.error || 'Failed to test MCP server connection');
        }
      }
    );
  }

  private registerGetMCPServerCapabilitiesAction(): void {
    this.registerAction(
      {
        id: 'getMCPServerCapabilities',
        name: 'Get MCP Server Capabilities',
        description: 'Retrieve the capabilities (tools, resources, prompts) of an MCP server',
        category: 'data',
        permissions: ['org_admin', 'ai_manager', 'mcp:read'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server', required: true }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;

        const result = await mcpServersApi.getMCPServerCapabilities(serverId);
        if (result.success) {
          return { capabilities: result.data };
        } else {
          throw new Error(result.error || 'Failed to get MCP server capabilities');
        }
      }
    );
  }

  private registerExecuteMCPToolAction(): void {
    this.registerAction(
      {
        id: 'executeMCPTool',
        name: 'Execute MCP Tool',
        description: 'Execute a tool provided by an MCP server',
        category: 'external',
        permissions: ['org_admin', 'ai_manager', 'mcp:execute'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server', required: true },
          { name: 'toolName', type: 'string', description: 'Name of the tool to execute', required: true },
          { name: 'toolArguments', type: 'object', description: 'Arguments for the tool', required: false }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;
        const toolName = params.toolName as string;
        const toolArguments = params.toolArguments as Record<string, unknown> || {};

        const result = await mcpServersApi.executeMCPTool(serverId, toolName, toolArguments);
        if (result.success) {
          return { 
            toolResult: result.data,
            message: `Tool "${toolName}" executed successfully`
          };
        } else {
          throw new Error(result.error || 'Failed to execute MCP tool');
        }
      }
    );
  }

  private registerAccessMCPResourceAction(): void {
    this.registerAction(
      {
        id: 'accessMCPResource',
        name: 'Access MCP Resource',
        description: 'Access a resource provided by an MCP server',
        category: 'external',
        permissions: ['org_admin', 'ai_manager', 'mcp:read'],
        parameters: [
          { name: 'serverId', type: 'string', description: 'ID of the MCP server', required: true },
          { name: 'resourceUri', type: 'string', description: 'URI of the resource to access', required: true }
        ]
      },
      async (params, context) => {
        const serverId = params.serverId as string;
        const resourceUri = params.resourceUri as string;

        const result = await mcpServersApi.accessMCPResource(serverId, resourceUri);
        if (result.success) {
          return { 
            resourceData: result.data,
            message: `Resource "${resourceUri}" accessed successfully`
          };
        } else {
          throw new Error(result.error || 'Failed to access MCP resource');
        }
      }
    );
  }
}

export const mcpServersPageController = new MCPServersPageController();