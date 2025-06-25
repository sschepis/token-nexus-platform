import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '../../../utils/apiUtils';

/**
 * Workflow configuration and utility actions
 * Secure actions for workflow configuration, statistics, and node types
 */

export const getNodeTypesAction = {
  config: {
    id: 'getNodeTypes',
    name: 'Get Node Types',
    description: 'Get available workflow node types and their configurations',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'category', type: 'string' as const, required: false, description: 'Filter by node category (trigger, action, condition, etc.)' }
    ],
    metadata: {
      tags: ['workflow', 'nodes', 'types'],
      examples: [{
        params: { category: 'trigger' },
        description: 'Get all trigger node types'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { category } = params;

      const result = await callCloudFunction('getNodeTypes', {
        category
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch node types:', error);
      return {
        success: false,
        error: `Failed to fetch node types: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const getWorkflowStatisticsAction = {
  config: {
    id: 'getWorkflowStatistics',
    name: 'Get Workflow Statistics',
    description: 'Get workflow usage and performance statistics',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'timeRange', type: 'string' as const, required: false, description: 'Time range for statistics (7d, 30d, 90d)' },
      { name: 'workflowId', type: 'string' as const, required: false, description: 'Filter by specific workflow ID' }
    ],
    metadata: {
      tags: ['workflow', 'statistics', 'analytics'],
      examples: [{
        params: { timeRange: '30d' },
        description: 'Get workflow statistics for the last 30 days'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { timeRange, workflowId } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('getWorkflowStatistics', {
        timeRange: timeRange || '30d',
        workflowId,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch workflow statistics:', error);
      return {
        success: false,
        error: `Failed to fetch workflow statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const getWorkflowTemplatesAction = {
  config: {
    id: 'getWorkflowTemplates',
    name: 'Get Workflow Templates',
    description: 'Get available workflow templates for creating new workflows',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'category', type: 'string' as const, required: false, description: 'Filter by template category' },
      { name: 'tags', type: 'array' as const, required: false, description: 'Filter by template tags' }
    ],
    metadata: {
      tags: ['workflow', 'templates'],
      examples: [{
        params: { category: 'user-management' },
        description: 'Get user management workflow templates'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { category, tags } = params;

      const result = await callCloudFunction('getWorkflowTemplates', {
        category,
        tags
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to fetch workflow templates:', error);
      return {
        success: false,
        error: `Failed to fetch workflow templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const exportWorkflowAction = {
  config: {
    id: 'exportWorkflow',
    name: 'Export Workflow',
    description: 'Export workflow configuration for backup or sharing',
    category: 'data' as const,
    permissions: ['workflows:read'],
    parameters: [
      { name: 'workflowId', type: 'string' as const, required: true, description: 'Workflow ID to export' },
      { name: 'format', type: 'string' as const, required: false, description: 'Export format (json, yaml)' },
      { name: 'includeExecutions', type: 'boolean' as const, required: false, description: 'Include execution history' }
    ],
    metadata: {
      tags: ['workflow', 'export', 'backup'],
      examples: [{
        params: { workflowId: 'wf_123', format: 'json' },
        description: 'Export workflow as JSON'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowId, format, includeExecutions } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('exportWorkflow', {
        workflowId,
        format: format || 'json',
        includeExecutions: includeExecutions || false,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to export workflow:', error);
      return {
        success: false,
        error: `Failed to export workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

export const importWorkflowAction = {
  config: {
    id: 'importWorkflow',
    name: 'Import Workflow',
    description: 'Import workflow configuration from file or data',
    category: 'data' as const,
    permissions: ['workflows:write'],
    parameters: [
      { name: 'workflowData', type: 'object' as const, required: true, description: 'Workflow configuration data' },
      { name: 'name', type: 'string' as const, required: false, description: 'Override workflow name' },
      { name: 'validateOnly', type: 'boolean' as const, required: false, description: 'Only validate without importing' }
    ],
    metadata: {
      tags: ['workflow', 'import', 'restore'],
      examples: [{
        params: { workflowData: {}, validateOnly: true },
        description: 'Validate workflow import without creating'
      }]
    }
  },
  executor: async (params: Record<string, unknown>, context: ActionContext) => {
    try {
      const { workflowData, name, validateOnly } = params;

      // Validate organization context
      const orgId = context.organization?.id;
      if (!orgId) {
        throw new Error('Organization context required');
      }

      const result = await callCloudFunction('importWorkflow', {
        workflowData,
        name,
        validateOnly: validateOnly || false,
        organizationId: orgId,
        userId: context.user.userId
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to import workflow:', error);
      return {
        success: false,
        error: `Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};