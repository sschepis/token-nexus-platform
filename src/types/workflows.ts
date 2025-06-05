export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'integration';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowNode {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    serviceIntegration?: {
      controllerId?: string;
      actionId?: string;
      triggerId?: string;
      integrationId?: string;
      cloudFunctionId?: string;
    };
  };
  metadata?: {
    tags?: string[];
    version?: string;
    documentation?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: {
    condition?: string;
    label?: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags?: string[];
  metadata?: {
    category?: string;
    isTemplate?: boolean;
    templateId?: string;
    executionCount?: number;
    lastExecuted?: string;
    averageExecutionTime?: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'trigger';
  triggerData?: any;
  nodeExecutions: NodeExecution[];
  error?: string;
  result?: any;
  organizationId: string;
  userId?: string;
}

export interface NodeExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount?: number;
}

export interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  isLoading: boolean;
  error: string | null;
  executions: WorkflowExecution[];
  templates: Workflow[];
  nodeTypes: WorkflowNodeType[];
}

export interface WorkflowNodeType {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  configSchema: any;
  serviceIntegration?: {
    service: string;
    method: string;
    requiredPermissions: string[];
  };
}

export interface NodeInput {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  templateId?: string;
  metadata?: {
    category?: string;
    tags?: string[];
    templateId?: string;
  };
}


export interface UpdateWorkflowRequest {
  id: string;
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  status?: WorkflowStatus;
  tags?: string[];
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  triggerData?: any;
  dryRun?: boolean;
}

export interface CloneWorkflowRequest {
  sourceWorkflowId: string;
  name: string;
  description?: string;
}

// Node type definitions for different categories
export interface TriggerNodeData {
  triggerType: 'parse' | 'webhook' | 'schedule' | 'manual';
  config: {
    className?: string;
    triggerEvent?: string;
    webhookUrl?: string;
    schedule?: string;
    conditions?: any[];
  };
}

export interface ActionNodeData {
  actionType: 'cloudFunction' | 'notification' | 'database' | 'api' | 'ai';
  config: {
    functionId?: string;
    notificationType?: string;
    apiEndpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    aiPrompt?: string;
  };
}

export interface LogicNodeData {
  logicType: 'condition' | 'loop' | 'transform' | 'delay' | 'parallel';
  config: {
    condition?: string;
    loopCount?: number;
    transformScript?: string;
    delayMs?: number;
    branches?: number;
  };
}

export interface IntegrationNodeData {
  integrationType: 'app' | 'oauth' | 'apiKey' | 'custom';
  config: {
    integrationId?: string;
    appId?: string;
    oauthAppId?: string;
    apiKeyId?: string;
    customConfig?: Record<string, any>;
  };
}

// Workflow template definitions
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: {
    author?: string;
    version?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedSetupTime?: number; // minutes
    requiredServices?: string[];
    useCases?: string[];
  };
}

// Workflow validation and error types
export interface WorkflowValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
  code: string;
  suggestions?: string[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationError[];
}

// Workflow execution context
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  organizationId: string;
  userId?: string;
  variables: Record<string, any>;
  nodeOutputs: Record<string, any>;
  metadata: {
    startTime: Date;
    currentNodeId?: string;
    retryCount: number;
    maxRetries: number;
  };
}

// Node execution result
export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    logs: string[];
  };
}

// Workflow statistics
export interface WorkflowStatistics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  mostUsedNodeTypes: Array<{
    type: string;
    count: number;
  }>;
  executionsByStatus: Record<ExecutionStatus, number>;
  executionTrends: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}