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
import { 
  WorkflowFilters, 
  WorkflowExecutionFilters, 
  NodeTypeFilters, 
  WorkflowValidationParams, 
  WorkflowStatisticsParams 
} from './workflows/types/WorkflowApiTypes';

/**
 * Workflows API
 * Provides secure API calls for all workflow management operations.
 */
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

// Default export
export default workflowsApi;