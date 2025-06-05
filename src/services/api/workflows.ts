/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base';
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
 * @file Workflow API services.
 * Handles core operations related to visual workflow management,
 * execution, and monitoring.
 */
const workflowsApi = {
  /**
   * Fetches workflows for the organization.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {string} [params.status] - Filter workflows by status.
   * @param {string[]} [params.tags] - Filter workflows by tags.
   * @param {number} [params.limit] - Maximum number of workflows to return.
   * @param {number} [params.skip] - Number of workflows to skip for pagination.
   * @returns {Promise<{ data: { workflows: Workflow[]; templates: Workflow[]; nodeTypes: WorkflowNodeType[]; pagination: any } }>} A promise that resolves with workflows data.
   * @throws {Error} Throws an error if fetching workflows fails.
   */
  getWorkflows: async (params?: {
    status?: string;
    tags?: string[];
    limit?: number;
    skip?: number;
  }): Promise<{ data: { workflows: Workflow[]; templates: Workflow[]; nodeTypes: WorkflowNodeType[]; pagination: any } }> => {
    try {
      const result = await Parse.Cloud.run('getWorkflows', params || {});
      
      return {
        data: {
          workflows: result.workflows || [],
          templates: result.templates || [],
          nodeTypes: result.nodeTypes || [],
          pagination: result.pagination || {}
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling getWorkflows cloud function:', error);
      throw new Error(error.message || 'Failed to fetch workflows');
    }
  },

  /**
   * Creates a new workflow.
   * @param {CreateWorkflowRequest} params - Parameters for the new workflow.
   * @returns {Promise<{ data: { workflow: Workflow } }>} A promise that resolves with the created workflow.
   * @throws {Error} Throws an error if workflow creation fails.
   */
  createWorkflow: async (params: CreateWorkflowRequest): Promise<{ data: { workflow: Workflow } }> => {
    try {
      const result = await Parse.Cloud.run('createWorkflow', params);
      
      return {
        data: {
          workflow: result.workflow
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling createWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to create workflow');
    }
  },

  /**
   * Updates an existing workflow.
   * @param {UpdateWorkflowRequest} params - Parameters to update for the workflow.
   * @returns {Promise<{ data: { workflow: Workflow } }>} A promise that resolves with the updated workflow.
   * @throws {Error} Throws an error if updating the workflow fails.
   */
  updateWorkflow: async (params: UpdateWorkflowRequest): Promise<{ data: { workflow: Workflow } }> => {
    try {
      const result = await Parse.Cloud.run('updateWorkflow', params);
      
      return {
        data: {
          workflow: result.workflow
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling updateWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to update workflow');
    }
  },

  /**
   * Deletes a workflow.
   * @param {string} workflowId - The ID of the workflow to delete.
   * @returns {Promise<{ data: { success: boolean } }>} A promise that resolves with success status.
   * @throws {Error} Throws an error if deleting the workflow fails.
   */
  deleteWorkflow: async (workflowId: string): Promise<{ data: { success: boolean } }> => {
    try {
      const result = await Parse.Cloud.run('deleteWorkflow', { workflowId });
      
      return {
        data: {
          success: result.success
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling deleteWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to delete workflow');
    }
  },

  /**
   * Executes a workflow.
   * @param {ExecuteWorkflowRequest} params - Parameters for workflow execution.
   * @returns {Promise<{ data: { execution: WorkflowExecution } }>} A promise that resolves with execution details.
   * @throws {Error} Throws an error if workflow execution fails.
   */
  executeWorkflow: async (params: ExecuteWorkflowRequest): Promise<{ data: { execution: WorkflowExecution } }> => {
    try {
      const result = await Parse.Cloud.run('executeWorkflow', params);
      
      return {
        data: {
          execution: result.execution
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling executeWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to execute workflow');
    }
  },

  /**
   * Gets workflow execution history.
   * @param {object} [params] - Optional parameters for filtering executions.
   * @param {string} [params.workflowId] - Filter by workflow ID.
   * @param {string} [params.status] - Filter by execution status.
   * @param {number} [params.limit] - Maximum number of executions to return.
   * @param {number} [params.skip] - Number of executions to skip for pagination.
   * @returns {Promise<{ data: { executions: WorkflowExecution[]; pagination: any } }>} A promise that resolves with execution history.
   * @throws {Error} Throws an error if fetching executions fails.
   */
  getWorkflowExecutions: async (params?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: { executions: WorkflowExecution[]; pagination: any } }> => {
    try {
      const result = await Parse.Cloud.run('getWorkflowExecutions', params || {});
      
      return {
        data: {
          executions: result.executions || [],
          pagination: result.pagination || {}
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling getWorkflowExecutions cloud function:', error);
      throw new Error(error.message || 'Failed to fetch workflow executions');
    }
  },

  /**
   * Gets available node types.
   * @param {object} [params] - Optional parameters for filtering node types.
   * @param {string} [params.category] - Filter by node category.
   * @returns {Promise<{ data: { nodeTypes: WorkflowNodeType[] } }>} A promise that resolves with available node types.
   * @throws {Error} Throws an error if fetching node types fails.
   */
  getNodeTypes: async (params?: {
    category?: string;
  }): Promise<{ data: { nodeTypes: WorkflowNodeType[] } }> => {
    try {
      const result = await Parse.Cloud.run('getNodeTypes', params || {});
      
      return {
        data: {
          nodeTypes: result.nodeTypes || []
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling getNodeTypes cloud function:', error);
      throw new Error(error.message || 'Failed to fetch node types');
    }
  },

  /**
   * Clones an existing workflow.
   * @param {CloneWorkflowRequest} params - Parameters for cloning the workflow.
   * @returns {Promise<{ data: { workflow: Workflow } }>} A promise that resolves with the cloned workflow.
   * @throws {Error} Throws an error if cloning the workflow fails.
   */
  cloneWorkflow: async (params: CloneWorkflowRequest): Promise<{ data: { workflow: Workflow } }> => {
    try {
      const result = await Parse.Cloud.run('cloneWorkflow', params);
      
      return {
        data: {
          workflow: result.workflow
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling cloneWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to clone workflow');
    }
  },

  /**
   * Validates a workflow configuration.
   * @param {object} params - Parameters for workflow validation.
   * @param {string} [params.workflowId] - Workflow ID to validate.
   * @param {any[]} [params.nodes] - Workflow nodes to validate.
   * @param {any[]} [params.edges] - Workflow edges to validate.
   * @returns {Promise<{ data: { validation: WorkflowValidationResult } }>} A promise that resolves with validation results.
   * @throws {Error} Throws an error if validation fails.
   */
  validateWorkflow: async (params: {
    workflowId?: string;
    nodes?: any[];
    edges?: any[];
  }): Promise<{ data: { validation: WorkflowValidationResult } }> => {
    try {
      const result = await Parse.Cloud.run('validateWorkflow', params);
      
      return {
        data: {
          validation: result.validation
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling validateWorkflow cloud function:', error);
      throw new Error(error.message || 'Failed to validate workflow');
    }
  },

  /**
   * Gets workflow statistics.
   * @param {object} [params] - Optional parameters for statistics.
   * @param {string} [params.timeRange] - Time range for statistics.
   * @param {string} [params.workflowId] - Filter by specific workflow.
   * @returns {Promise<{ data: { statistics: WorkflowStatistics } }>} A promise that resolves with workflow statistics.
   * @throws {Error} Throws an error if fetching statistics fails.
   */
  getWorkflowStatistics: async (params?: {
    timeRange?: string;
    workflowId?: string;
  }): Promise<{ data: { statistics: WorkflowStatistics } }> => {
    try {
      const result = await Parse.Cloud.run('getWorkflowStatistics', params || {});
      
      return {
        data: {
          statistics: result.statistics
        }
      };
    } catch (error: any) {
      console.debug('[Workflows API] Error calling getWorkflowStatistics cloud function:', error);
      throw new Error(error.message || 'Failed to fetch workflow statistics');
    }
  }
};

// Mock implementations for development
const mockWorkflowsApis = {
  getWorkflows: () => {
    return mockResponse({
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
    return mockResponse({ workflow: newWorkflow });
  },

  updateWorkflow: (params: UpdateWorkflowRequest) => {
    return mockResponse({ 
      workflow: { 
        id: params.id, 
        ...params,
        updatedAt: new Date().toISOString(),
        version: 2
      } 
    });
  },

  deleteWorkflow: (workflowId: string) => {
    return mockResponse({ success: true });
  },

  executeWorkflow: (params: ExecuteWorkflowRequest) => {
    return mockResponse({
      execution: {
        id: `exec-${Date.now()}`,
        workflowId: params.workflowId,
        status: 'running',
        startTime: new Date(),
        triggeredBy: 'manual',
        nodeExecutions: [],
        organizationId: 'org-1'
      }
    });
  },

  getWorkflowExecutions: () => {
    return mockResponse({
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
    });
  },

  getNodeTypes: () => {
    return mockResponse({
      nodeTypes: [
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
    return mockResponse({
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
    });
  },

  validateWorkflow: () => {
    return mockResponse({
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    });
  },

  getWorkflowStatistics: () => {
    return mockResponse({
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
    });
  }
};

// Merge all Workflow-related APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ?
  mockWorkflowsApis :
  workflowsApi
);

export { workflowsApi, mockWorkflowsApis };