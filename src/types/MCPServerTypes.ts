export interface MCPServer {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'sse';
  status: 'active' | 'inactive' | 'error' | 'connecting';
  organizationId: string;
  config: MCPServerConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastConnectedAt?: string;
  errorMessage?: string;
  capabilities?: MCPServerCapabilities;
}

export interface MCPServerConfig {
  // For stdio servers
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  
  // For SSE servers
  url?: string;
  headers?: Record<string, string>;
  
  // Common config
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MCPServerCapabilities {
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface CreateMCPServerRequest {
  name: string;
  description: string;
  type: 'stdio' | 'sse';
  config: MCPServerConfig;
}

export interface UpdateMCPServerRequest {
  name?: string;
  description?: string;
  config?: MCPServerConfig;
  status?: 'active' | 'inactive';
}

export interface MCPServerConnectionTest {
  success: boolean;
  capabilities?: MCPServerCapabilities;
  error?: string;
  latency?: number;
}