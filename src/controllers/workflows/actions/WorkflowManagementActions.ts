import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '../../../utils/apiUtils';
import { store } from '@/store/store';
import { fetchWorkflows } from '@/store/slices/workflowSlice';

/**
 * Core workflow CRUD operations
 * Secure actions that use callCloudFunction instead of direct Parse SDK
 */

export const fetchWorkflowsAction = {
  config: {
    id: 'getWorkflows',
    name: 'Get Workflows',
    description: 'Retrieve workflows for the organization with optional filtering',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'status', type: 'string' as const, required: false, description: 'Filter by workflow status' },
      { name: 'tags', type: 'array' as const, required: false, description: 'Filter by workflow tags' },
      { name: 'limit', type: 'number' as const, required: false, description: 'Maximum number of workflows to return' },
      { name: 'skip', type: 'number' as const, required: false, description: 'Number of workflows to skip for pagination' },
      { name: 'includeStats', type: 'boolean' as const, required: false, description: 'Include workflow statistics' }
    ],
    metadata: {
      tags: ['workflow', 'fetch', 'list'],
      examples: [{
        params: { status: 'active', limit: 20 },
        description: 'Fetch active workflows with limit'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { status, tags, limit, skip, includeStats } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      // Follow PAGES.md pattern: dispatch Redux action instead of calling cloud function directly
      const result = await store.dispatch(fetchWorkflows({
        status: status as string,
        tags: tags as string[],
        limit: limit as number || 50,
        skip: skip as number || 0,
        includeStats: includeStats as boolean || false
      }));

      if (fetchWorkflows.fulfilled.match(result)) {
        return {
          success: true,
          data: result.payload
        };
      } else {
        throw new Error(result.payload as string || 'Failed to fetch workflows');
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      return {
        success: false,
        error: `Failed to fetch workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const createWorkflowAction = {
  config: {
    id: 'createWorkflow',
    name: 'Create Workflow',
    description: 'Create a new visual workflow from scratch or template',
    category: 'data' as const,
    permissions: ['workflows:write'],
    parameters: [
      { name: 'name', type: 'string' as const, required: true, description: 'Workflow name' },
      { name: 'description', type: 'string' as const, required: false, description: 'Workflow description' },
      { name: 'templateId', type: 'string' as const, required: false, description: 'Template ID to base workflow on' },
      { name: 'tags', type: 'array' as const, required: false, description: 'Workflow tags for categorization' },
      { name: 'category', type: 'string' as const, required: false, description: 'Workflow category' },
      { name: 'nodes', type: 'array' as const, required: false, description: 'Initial workflow nodes' },
      { name: 'edges', type: 'array' as const, required: false, description: 'Initial workflow edges' }
    ],
    metadata: {
      tags: ['workflow', 'create'],
      examples: [{
        params: {
          name: 'User Onboarding',
          description: 'Automated user onboarding process',
          category: 'user-management'
        },
        description: 'Create a basic user onboarding workflow'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { name, description, templateId, tags, category, nodes, edges } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('createWorkflow', {
        name,
        description,
        templateId,
        tags,
        category,
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
      console.error('Failed to create workflow:', error);
      return {
        success: false,
        error: `Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const updateWorkflowAction = {
  config: {
    id: 'updateWorkflow',
    name: 'Update Workflow',
    description: 'Update an existing workflow configuration',
    category: 'data' as const,
    permissions: ['workflows:write'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: true, description: 'Workflow ID to update' },
      { name: 'name', type: 'string' as const, required: false, description: 'Updated workflow name' },
      { name: 'description', type: 'string' as const, required: false, description: 'Updated workflow description' },
      { name: 'tags', type: 'array' as const, required: false, description: 'Updated workflow tags' },
      { name: 'nodes', type: 'array' as const, required: false, description: 'Updated workflow nodes' },
      { name: 'edges', type: 'array' as const, required: false, description: 'Updated workflow edges' },
      { name: 'status', type: 'string' as const, required: false, description: 'Updated workflow status' }
    ],
    metadata: {
      tags: ['workflow', 'update', 'modify'],
      examples: [{
        params: { workflowId: 'wf_123', name: 'Updated Workflow Name' },
        description: 'Update workflow name'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, ...updateData } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('updateWorkflow', {
        workflowId,
        updateData,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to update workflow:', error);
      return {
        success: false,
        error: `Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const deleteWorkflowAction = {
  config: {
    id: 'deleteWorkflow',
    name: 'Delete Workflow',
    description: 'Delete a workflow and its execution history',
    category: 'data' as const,
    permissions: ['workflows:manage'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: true, description: 'Workflow ID to delete' },
      { name: 'workflowName', type: 'string' as const, required: false, description: 'Workflow name for confirmation' }
    ],
    metadata: {
      tags: ['workflow', 'delete', 'remove'],
      examples: [{
        params: { workflowId: 'wf_123' },
        description: 'Delete a workflow by ID'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, workflowName } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('deleteWorkflow', {
        workflowId,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      return {
        success: false,
        error: `Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const cloneWorkflowAction = {
  config: {
    id: 'cloneWorkflow',
    name: 'Clone Workflow',
    description: 'Create a copy of an existing workflow',
    category: 'data' as const,
    permissions: ['workflows:write'],
    parameters: [
      { name: 'sourceWorkflowId', type: 'string' as const, required: true, description: 'Source workflow ID to clone' },
      { name: 'name', type: 'string' as const, required: true, description: 'Name for the cloned workflow' },
      { name: 'description', type: 'string' as const, required: false, description: 'Description for the cloned workflow' }
    ],
    metadata: {
      tags: ['workflow', 'clone', 'copy'],
      examples: [{
        params: {
          sourceWorkflowId: 'wf_123',
          name: 'Cloned Workflow',
          description: 'Copy of original workflow'
        },
        description: 'Clone an existing workflow'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { sourceWorkflowId, name, description } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('cloneWorkflow', {
        sourceWorkflowId,
        name,
        description,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to clone workflow:', error);
      return {
        success: false,
        error: `Failed to clone workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};