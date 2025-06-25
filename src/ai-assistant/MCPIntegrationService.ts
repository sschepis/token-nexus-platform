import { mcpServersApi } from '@/services/api/mcpServers';
import { MCPServer, MCPTool, MCPResource } from '@/types/MCPServerTypes';
import { ToolDefinition } from './types';

/**
 * Service for integrating MCP servers with the AI assistant
 */
export class MCPIntegrationService {
  private organizationId: string | null = null;
  private cachedServers: MCPServer[] = [];
  private lastCacheUpdate: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(organizationId?: string) {
    this.organizationId = organizationId || null;
  }

  /**
   * Set the organization context
   */
  setOrganizationId(organizationId: string): void {
    if (this.organizationId !== organizationId) {
      this.organizationId = organizationId;
      this.clearCache();
    }
  }

  /**
   * Clear the server cache
   */
  clearCache(): void {
    this.cachedServers = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Get all active MCP servers for the current organization
   */
  async getActiveServers(): Promise<MCPServer[]> {
    if (!this.organizationId) {
      return [];
    }

    // Check cache
    const now = Date.now();
    if (this.cachedServers.length > 0 && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.cachedServers.filter(server => server.status === 'active');
    }

    try {
      const result = await mcpServersApi.getOrganizationMCPServers(this.organizationId);
      if (result.success && result.data) {
        this.cachedServers = result.data;
        this.lastCacheUpdate = now;
        return this.cachedServers.filter(server => server.status === 'active');
      }
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
    }

    return [];
  }

  /**
   * Generate AI tool definitions from MCP server tools
   */
  async generateMCPToolDefinitions(): Promise<ToolDefinition[]> {
    const activeServers = await this.getActiveServers();
    const toolDefinitions: ToolDefinition[] = [];

    for (const server of activeServers) {
      if (server.capabilities?.tools) {
        for (const tool of server.capabilities.tools) {
          const toolDefinition = this.convertMCPToolToAITool(server, tool);
          toolDefinitions.push(toolDefinition);
        }
      }
    }

    return toolDefinitions;
  }

  /**
   * Convert an MCP tool to an AI tool definition
   */
  private convertMCPToolToAITool(server: MCPServer, tool: MCPTool): ToolDefinition {
    const properties = tool.inputSchema.properties as Record<string, unknown> || {};
    
    return {
      name: `mcp_${server.id}_${tool.name}`,
      description: `${tool.description} (from ${server.name})`,
      parametersSchema: {
        type: 'object',
        properties: {
          ...properties,
          _mcpServerId: {
            type: 'string',
            description: 'Internal MCP server ID',
            default: server.id
          },
          _mcpToolName: {
            type: 'string',
            description: 'Internal MCP tool name',
            default: tool.name
          }
        },
        required: tool.inputSchema.required || []
      },
      execute: async (args: Record<string, unknown>) => {
        const { _mcpServerId, _mcpToolName, ...toolArgs } = args;
        return this.executeMCPTool(
          _mcpServerId as string,
          _mcpToolName as string,
          toolArgs
        );
      }
    };
  }

  /**
   * Execute an MCP tool
   */
  async executeMCPTool(
    serverId: string,
    toolName: string,
    toolArguments: Record<string, unknown>
  ): Promise<any> {
    try {
      const result = await mcpServersApi.executeMCPTool(serverId, toolName, toolArguments);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to execute MCP tool');
      }
    } catch (error) {
      console.error('Error executing MCP tool:', error);
      throw error;
    }
  }

  /**
   * Access an MCP resource
   */
  async accessMCPResource(serverId: string, resourceUri: string): Promise<any> {
    try {
      const result = await mcpServersApi.accessMCPResource(serverId, resourceUri);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to access MCP resource');
      }
    } catch (error) {
      console.error('Error accessing MCP resource:', error);
      throw error;
    }
  }

  /**
   * Get available MCP resources
   */
  async getAvailableResources(): Promise<Array<{ server: MCPServer; resource: MCPResource }>> {
    const activeServers = await this.getActiveServers();
    const resources: Array<{ server: MCPServer; resource: MCPResource }> = [];

    for (const server of activeServers) {
      if (server.capabilities?.resources) {
        for (const resource of server.capabilities.resources) {
          resources.push({ server, resource });
        }
      }
    }

    return resources;
  }

  /**
   * Search for MCP tools by name or description
   */
  async searchMCPTools(query: string): Promise<Array<{ server: MCPServer; tool: MCPTool }>> {
    const activeServers = await this.getActiveServers();
    const matchingTools: Array<{ server: MCPServer; tool: MCPTool }> = [];
    const lowerQuery = query.toLowerCase();

    for (const server of activeServers) {
      if (server.capabilities?.tools) {
        for (const tool of server.capabilities.tools) {
          if (
            tool.name.toLowerCase().includes(lowerQuery) ||
            tool.description.toLowerCase().includes(lowerQuery)
          ) {
            matchingTools.push({ server, tool });
          }
        }
      }
    }

    return matchingTools;
  }

  /**
   * Get MCP server statistics
   */
  async getServerStatistics(): Promise<{
    totalServers: number;
    activeServers: number;
    totalTools: number;
    totalResources: number;
    serversByType: Record<string, number>;
  }> {
    const servers = this.cachedServers.length > 0 ? this.cachedServers : await this.getActiveServers();
    
    const stats = {
      totalServers: servers.length,
      activeServers: servers.filter(s => s.status === 'active').length,
      totalTools: 0,
      totalResources: 0,
      serversByType: {} as Record<string, number>
    };

    for (const server of servers) {
      // Count tools and resources
      if (server.capabilities?.tools) {
        stats.totalTools += server.capabilities.tools.length;
      }
      if (server.capabilities?.resources) {
        stats.totalResources += server.capabilities.resources.length;
      }

      // Count by type
      stats.serversByType[server.type] = (stats.serversByType[server.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Test connectivity to all active servers
   */
  async testAllServerConnections(): Promise<Array<{
    server: MCPServer;
    success: boolean;
    error?: string;
    latency?: number;
  }>> {
    const activeServers = await this.getActiveServers();
    const results = [];

    for (const server of activeServers) {
      try {
        const result = await mcpServersApi.testMCPServerConnection(server.id);
        results.push({
          server,
          success: result.success,
          error: result.success ? undefined : result.error,
          latency: result.data?.latency
        });
      } catch (error) {
        results.push({
          server,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Export a singleton instance
export const mcpIntegrationService = new MCPIntegrationService();