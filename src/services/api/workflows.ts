import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { 
  Workflow, 
  CreateWorkflowRequest, 
  UpdateWorkflowRequest, 
  ExecuteWorkflowRequest,
  WorkflowExecution,
  WorkflowNodeType,
  CloneWorkflowRequest,
  WorkflowStatistics,
  WorkflowValidationResult
} from '@/types/workflows';

/**
 * Refactored workflows API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface WorkflowFilters {
  status?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
}

export interface WorkflowExecutionFilters {
  workflowId?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export interface NodeTypeFilters {
  category?: string;
}

export interface WorkflowValidationParams {
  workflowId?: string;
  nodes?: any[];
  edges?: any[];
}

export interface WorkflowStatisticsParams {
  timeRange?: string;
  workflowId?: string;
}

export const workflowsApi = {
  /**
   * Fetches workflows for the organization
   */
  async getWorkflows(params: WorkflowFilters = {}) {
    return callCloudFunction('getWorkflows', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch workflows'
    });
  },

  /**
   * Creates a new workflow
   */
  async createWorkflow(params: CreateWorkflowRequest) {
    return callCloudFunction('createWorkflow', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create workflow'
    });
  },

  /**
   * Updates an existing workflow
   */
  async updateWorkflow(params: UpdateWorkflowRequest) {
    return callCloudFunction('updateWorkflow', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to update workflow'
    });
  },

  /**
   * Deletes a workflow
   */
  async deleteWorkflow(workflowId: string) {
    return callCloudFunction('deleteWorkflow', { workflowId }, {
      errorMessage: 'Failed to delete workflow'
    });
  },

  /**
   * Executes a workflow
   */
  async executeWorkflow(params: ExecuteWorkflowRequest) {
    return callCloudFunction('executeWorkflow', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to execute workflow'
    });
  },

  /**
   * Gets workflow execution history
   */
  async getWorkflowExecutions(params: WorkflowExecutionFilters = {}) {
    return callCloudFunction('getWorkflowExecutions', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch workflow executions'
    });
  },

  /**
   * Gets available node types
   */
  async getNodeTypes(params: NodeTypeFilters = {}) {
    return callCloudFunctionForArray('getNodeTypes', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch node types'
    });
  },

  /**
   * Clones an existing workflow
   */
  async cloneWorkflow(params: CloneWorkflowRequest) {
    return callCloudFunction('cloneWorkflow', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to clone workflow'
    });
  },

  /**
   * Validates a workflow configuration
   */
  async validateWorkflow(params: WorkflowValidationParams) {
    return callCloudFunction('validateWorkflow', params as Record<string, unknown>, {
      errorMessage: 'Failed to validate workflow'
    });
  },

  /**
   * Gets workflow statistics
   */
  async getWorkflowStatistics(params: WorkflowStatisticsParams = {}) {
    return callCloudFunction('getWorkflowStatistics', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch workflow statistics'
    });
  },

  /**
   * Batch delete multiple workflows
   */
  async batchDeleteWorkflows(workflowIds: string[]) {
    const operations = workflowIds.map(workflowId => 
      () => this.deleteWorkflow(workflowId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch execute multiple workflows
   */
  async batchExecuteWorkflows(executions: ExecuteWorkflowRequest[]) {
    const operations = executions.map(params => 
      () => this.executeWorkflow(params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple workflows
   */
  async batchUpdateWorkflows(updates: UpdateWorkflowRequest[]) {
    const operations = updates.map(params => 
      () => this.updateWorkflow(params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementations for development
const mockWorkflowsApis = {
  getWorkflows: (params?: WorkflowFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        workflows: [
          {
            id: 'wf-1',
            name: 'User Onboarding',
            description: 'Automated user onboarding process',
            status: 'active',
            nodes: [
              {
                id: 'node-1',
                type: 'parse-trigger',
                category: 'trigger',
                name: 'User Created',
                position: { x: 100, y: 100 },
                data: {
                  label: 'User Created',
                  config: {
                    className: 'User',
                    triggerEvent: 'afterSave'
                  }
                }
              },
              {
                id: 'node-2',
                type: 'notification',
                category: 'action',
                name: 'Welcome Email',
                position: { x: 300, y: 100 },
                data: {
                  label: 'Welcome Email',
                  config: {
                    notificationType: 'email',
                    template: 'welcome'
                  }
                }
              }
            ],
            edges: [
              {
                id: 'edge-1',
                source: 'node-1',
                target: 'node-2'
              }
            ],
            organizationId: 'org-1',
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            tags: ['onboarding', 'automation'],
            metadata: {
              category: 'user-management',
              executionCount: 25,
              lastExecuted: new Date().toISOString(),
              averageExecutionTime: 1500
            }
          },
          {
            id: 'wf-2',
            name: 'Data Processing Pipeline',
            description: 'Process and transform incoming data',
            status: 'active',
            nodes: [],
            edges: [],
            organizationId: 'org-1',
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 2,
            tags: ['data', 'processing'],
            metadata: {
              category: 'data-processing',
              executionCount: 150,
              lastExecuted: new Date().toISOString(),
              averageExecutionTime: 3200
            }
          }
        ],
        templates: [
          {
            id: 'template-1',
            name: 'Basic User Workflow',
            description: 'Template for user-related workflows',
            status: 'active',
            nodes: [],
            edges: [],
            organizationId: 'system',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            tags: ['template', 'user'],
            metadata: {
              isTemplate: true,
              category: 'user-management'
            }
          }
        ],
        nodeTypes: [
          {
            type: 'parse-trigger',
            category: 'trigger',
            name: 'Parse Trigger',
            description: 'Trigger workflow on Parse object events',
            icon: 'database',
            color: '#3b82f6',
            inputs: [],
            outputs: [
              {
                id: 'object',
                name: 'Object',
                type: 'object',
                description: 'The Parse object that triggered the workflow'
              }
            ],
            configSchema: {
              className: { type: 'string', required: true },
              triggerEvent: { type: 'string', required: true, enum: ['beforeSave', 'afterSave', 'beforeDelete', 'afterDelete'] }
            },
            serviceIntegration: {
              service: 'parse',
              method: 'trigger',
              requiredPermissions: ['parse:read']
            }
          },
          {
            type: 'notification',
            category: 'action',
            name: 'Send Notification',
            description: 'Send notifications via email, SMS, or push',
            icon: 'bell',
            color: '#10b981',
            inputs: [
              {
                id: 'recipient',
                name: 'Recipient',
                type: 'string',
                required: true,
                description: 'Notification recipient'
              },
              {
                id: 'message',
                name: 'Message',
                type: 'string',
                required: true,
                description: 'Notification message'
              }
            ],
            outputs: [
              {
                id: 'result',
                name: 'Result',
                type: 'object',
                description: 'Notification delivery result'
              }
            ],
            configSchema: {
              notificationType: { type: 'string', required: true, enum: ['email', 'sms', 'push'] },
              template: { type: 'string', required: false }
            },
            serviceIntegration: {
              service: 'notifications',
              method: 'send',
              requiredPermissions: ['notifications:send']
            }
          }
        ],
        pagination: {
          total: 2,
          limit: 50,
          skip: 0
        }
      }
    });
  },

  createWorkflow: (params: CreateWorkflowRequest) => {
    const newWorkflow = {
      id: `wf-${Math.floor(Math.random() * 1000)}`,
      ...params,
      status: 'draft' as const,
      nodes: [],
      edges: [],
      organizationId: 'org-1',
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      metadata: {
        category: 'custom',
        executionCount: 0
      }
    };
    return Promise.resolve({
      success: true,
      data: { workflow: newWorkflow }
    });
  },

  updateWorkflow: (params: UpdateWorkflowRequest) => {
    return Promise.resolve({
      success: true,
      data: { 
        workflow: { 
          id: params.id, 
          ...params,
          updatedAt: new Date().toISOString(),
          version: 2
        } 
      }
    });
  },

  deleteWorkflow: (workflowId: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true }
    });
  },

  executeWorkflow: (params: ExecuteWorkflowRequest) => {
    return Promise.resolve({
      success: true,
      data: {
        execution: {
          id: `exec-${Date.now()}`,
          workflowId: params.workflowId,
          status: 'running',
          startTime: new Date(),
          triggeredBy: 'manual',
          nodeExecutions: [],
          organizationId: 'org-1'
        }
      }
    });
  },

  getWorkflowExecutions: (params?: WorkflowExecutionFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        executions: [
          {
            id: 'exec-1',
            workflowId: 'wf-1',
            status: 'completed',
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() - 3500000),
            duration: 100000,
            triggeredBy: 'trigger',
            nodeExecutions: [],
            organizationId: 'org-1'
          }
        ],
        pagination: { total: 1, limit: 100, skip: 0 }
      }
    });
  },

  getNodeTypes: (params?: NodeTypeFilters) => {
    return Promise.resolve({
      success: true,
      data: [
        {
          type: 'parse-trigger',
          category: 'trigger',
          name: 'Parse Trigger',
          description: 'Trigger workflow on Parse object events',
          icon: 'database',
          color: '#3b82f6',
          inputs: [],
          outputs: [],
          configSchema: {}
        }
      ]
    });
  },

  cloneWorkflow: (params: CloneWorkflowRequest) => {
    return Promise.resolve({
      success: true,
      data: {
        workflow: {
          id: `wf-${Date.now()}`,
          name: params.name,
          description: params.description,
          status: 'draft',
          nodes: [],
          edges: [],
          organizationId: 'org-1',
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          tags: ['cloned']
        }
      }
    });
  },

  validateWorkflow: (params?: WorkflowValidationParams) => {
    return Promise.resolve({
      success: true,
      data: {
        validation: {
          isValid: true,
          errors: [],
          warnings: []
        }
      }
    });
  },

  getWorkflowStatistics: (params?: WorkflowStatisticsParams) => {
    return Promise.resolve({
      success: true,
      data: {
        statistics: {
          totalWorkflows: 5,
          activeWorkflows: 3,
          totalExecutions: 250,
          successRate: 0.95,
          averageExecutionTime: 2500,
          mostUsedNodeTypes: [
            { type: 'parse-trigger', count: 8 },
            { type: 'notification', count: 6 }
          ],
          executionsByStatus: {
            completed: 200,
            failed: 15,
            running: 5,
            pending: 0,
            cancelled: 30
          },
          executionTrends: []
        }
      }
    });
  },

  batchDeleteWorkflows: (workflowIds: string[]) => {
    return Promise.resolve({
      results: workflowIds.map(() => ({ success: true })),
      successCount: workflowIds.length,
      errorCount: 0
    });
  },

  batchExecuteWorkflows: (executions: ExecuteWorkflowRequest[]) => {
    return Promise.resolve({
      results: executions.map(() => ({ success: true })),
      successCount: executions.length,
      errorCount: 0
    });
  },

  batchUpdateWorkflows: (updates: UpdateWorkflowRequest[]) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
  getNodeTypes,
  cloneWorkflow,
  validateWorkflow,
  getWorkflowStatistics,
  batchDeleteWorkflows,
  batchExecuteWorkflows,
  batchUpdateWorkflows
} = workflowsApi;

// Use mock or real API based on environment
const finalWorkflowsApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockWorkflowsApis : workflowsApi;

// Default export
export default finalWorkflowsApi;