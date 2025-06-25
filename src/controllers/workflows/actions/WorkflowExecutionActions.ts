import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '../../../utils/apiUtils';

/**
 * Workflow execution and monitoring actions
 * Secure actions for executing workflows and managing their status
 */

export const executeWorkflowAction = {
  config: {
    id: 'executeWorkflow',
    name: 'Execute Workflow',
    description: 'Execute a workflow manually or programmatically',
    category: 'external' as const,
    permissions: ['workflows:execute'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: true, description: 'Workflow ID to execute' },
      { name: 'workflowName', type: 'string' as const, required: false, description: 'Workflow name for logging' },
      { name: 'triggerData', type: 'object' as const, required: false, description: 'Data to pass to workflow execution' },
      { name: 'dryRun', type: 'boolean' as const, required: false, description: 'Validate workflow without executing' }
    ],
    metadata: {
      tags: ['workflow', 'execute', 'run'],
      examples: [{
        params: { workflowId: 'wf_123', dryRun: true },
        description: 'Validate workflow without executing'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, workflowName, triggerData, dryRun } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('executeWorkflow', {
        workflowId,
        triggerData,
        dryRun: dryRun || false,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      return {
        success: false,
        error: `Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const updateWorkflowStatusAction = {
  config: {
    id: 'updateWorkflowStatus',
    name: 'Update Workflow Status',
    description: 'Update the status of a workflow (active, paused, archived, etc.)',
    category: 'data' as const,
    permissions: ['workflows:write'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: true, description: 'Workflow ID to update' },
      { name: 'status', type: 'string' as const, required: true, description: 'New workflow status (active, paused, archived, draft)' }
    ],
    metadata: {
      tags: ['workflow', 'status', 'update'],
      examples: [{
        params: { workflowId: 'wf_123', status: 'paused' },
        description: 'Pause a workflow'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, status } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('updateWorkflowStatus', {
        workflowId,
        status,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to update workflow status:', error);
      return {
        success: false,
        error: `Failed to update workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const getWorkflowExecutionsAction = {
  config: {
    id: 'getWorkflowExecutions',
    name: 'Get Workflow Executions',
    description: 'Retrieve execution history for workflows',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: false, description: 'Filter by specific workflow ID' },
      { name: 'status', type: 'string' as const, required: false, description: 'Filter by execution status' },
      { name: 'limit', type: 'number' as const, required: false, description: 'Maximum number of executions to return' },
      { name: 'skip', type: 'number' as const, required: false, description: 'Number of executions to skip for pagination' }
    ],
    metadata: {
      tags: ['workflow', 'executions', 'history'],
      examples: [{
        params: { workflowId: 'wf_123', status: 'completed', limit: 10 },
        description: 'Get recent completed executions for a workflow'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, status, limit, skip } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('getWorkflowExecutions', {
        workflowId,
        status,
        limit: limit || 100,
        skip: skip || 0,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch workflow executions:', error);
      return {
        success: false,
        error: `Failed to fetch workflow executions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const validateWorkflowAction = {
  config: {
    id: 'validateWorkflow',
    name: 'Validate Workflow',
    description: 'Validate workflow configuration and connections',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: false, description: 'Workflow ID to validate' },
      { name: 'nodes', type: 'array' as const, required: false, description: 'Workflow nodes to validate' },
      { name: 'edges', type: 'array' as const, required: false, description: 'Workflow edges to validate' }
    ],
    metadata: {
      tags: ['workflow', 'validate', 'check'],
      examples: [{
        params: { workflowId: 'wf_123' },
        description: 'Validate an existing workflow'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, nodes, edges } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('validateWorkflow', {
        workflowId,
        nodes,
        edges,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to validate workflow:', error);
      return {
        success: false,
        error: `Failed to validate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};