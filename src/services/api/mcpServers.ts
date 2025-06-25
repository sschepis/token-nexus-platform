import Parse from 'parse';
import { 
  MCPServer, 
  CreateMCPServerRequest, 
  UpdateMCPServerRequest, 
  MCPServerConnectionTest 
} from '@/types/MCPServerTypes';

export interface MCPServersApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class MCPServersApi {
  /**
   * Get all MCP servers for an organization
   */
  async getOrganizationMCPServers(organizationId: string): Promise<MCPServersApiResponse<MCPServer[]>> {
    try {
      const result = await Parse.Cloud.run('getMCPServers', { organizationId });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch MCP servers'
      };
    }
  }

  /**
   * Create a new MCP server
   */
  async createMCPServer(
    organizationId: string, 
    serverData: CreateMCPServerRequest
  ): Promise<MCPServersApiResponse<MCPServer>> {
    try {
      const result = await Parse.Cloud.run('createMCPServer', {
        organizationId,
        ...serverData
      });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error creating MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create MCP server'
      };
    }
  }

  /**
   * Update an existing MCP server
   */
  async updateMCPServer(
    serverId: string, 
    updates: UpdateMCPServerRequest
  ): Promise<MCPServersApiResponse<MCPServer>> {
    try {
      const result = await Parse.Cloud.run('updateMCPServer', {
        serverId,
        ...updates
      });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error updating MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update MCP server'
      };
    }
  }

  /**
   * Delete an MCP server
   */
  async deleteMCPServer(serverId: string): Promise<MCPServersApiResponse<void>> {
    try {
      await Parse.Cloud.run('deleteMCPServer', { serverId });
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete MCP server'
      };
    }
  }

  /**
   * Test connection to an MCP server
   */
  async testMCPServerConnection(serverId: string): Promise<MCPServersApiResponse<MCPServerConnectionTest>> {
    try {
      const result = await Parse.Cloud.run('testMCPServerConnection', { serverId });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error testing MCP server connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test MCP server connection'
      };
    }
  }

  /**
   * Get MCP server capabilities
   */
  async getMCPServerCapabilities(serverId: string): Promise<MCPServersApiResponse<any>> {
    try {
      const result = await Parse.Cloud.run('getMCPServerCapabilities', { serverId });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error fetching MCP server capabilities:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch MCP server capabilities'
      };
    }
  }

  /**
   * Execute an MCP tool
   */
  async executeMCPTool(
    serverId: string,
    toolName: string,
    toolArguments: Record<string, unknown>
  ): Promise<MCPServersApiResponse<any>> {
    try {
      const result = await Parse.Cloud.run('executeMCPTool', {
        serverId,
        toolName,
        arguments: toolArguments
      });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error executing MCP tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute MCP tool'
      };
    }
  }

  /**
   * Access an MCP resource
   */
  async accessMCPResource(
    serverId: string, 
    resourceUri: string
  ): Promise<MCPServersApiResponse<any>> {
    try {
      const result = await Parse.Cloud.run('accessMCPResource', {
        serverId,
        resourceUri
      });
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error accessing MCP resource:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to access MCP resource'
      };
    }
  }
}

export const mcpServersApi = new MCPServersApi();