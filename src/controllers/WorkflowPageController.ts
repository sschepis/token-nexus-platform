import { BasePageController, ActionConfig } from './base/BasePageController';
import { ActionContext, ActionResult } from './types/ActionTypes';
import { createAction } from './base/ActionBuilder';
import Parse from 'parse';
import { safeParseCloudRun } from '../utils/parseUtils';

export class WorkflowPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'workflows',
      pageName: 'Workflow Management',
      description: 'Visual workflow automation and orchestration system',
      category: 'automation',
      tags: ['workflow', 'automation', 'visual', 'integration', 'orchestration'],
      permissions: ['workflow:read', 'workflow:write', 'workflow:execute', 'workflow:manage'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    // Create Workflow Action
    this.registerAction({
      id: 'createWorkflow',
      name: 'Create Workflow',
      description: 'Create a new visual workflow',
      category: 'data',
      permissions: ['workflow:write'],
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Workflow name' },
        { name: 'description', type: 'string', required: false, description: 'Workflow description' },
        { name: 'templateId', type: 'string', required: false, description: 'Template to base workflow on' },
        { name: 'tags', type: 'array', required: false, description: 'Workflow tags' }
      ],
      metadata: {
        tags: ['workflow', 'create'],
        examples: [{
          params: { name: 'User Onboarding', description: 'Automated user onboarding process' },
          description: 'Create a basic user onboarding workflow'
        }]
      }
    }, this.handleCreateWorkflow.bind(this));

    // Update Workflow Action
    this.registerAction({
      id: 'updateWorkflow',
      name: 'Update Workflow',
      description: 'Update an existing workflow',
      category: 'data',
      permissions: ['workflow:write'],
      parameters: [
        { name: 'workflowId', type: 'string', required: true, description: 'Workflow ID' },
        { name: 'name', type: 'string', required: false, description: 'Updated name' },
        { name: 'description', type: 'string', required: false, description: 'Updated description' },
        { name: 'nodes', type: 'array', required: false, description: 'Workflow nodes' },
        { name: 'edges', type: 'array', required: false, description: 'Workflow edges' },
        { name: 'status', type: 'string', required: false, description: 'Workflow status' }
      ]
    }, this.handleUpdateWorkflow.bind(this));

    // Execute Workflow Action
    this.registerAction({
      id: 'executeWorkflow',
      name: 'Execute Workflow',
      description: 'Execute a workflow manually or programmatically',
      category: 'external',
      permissions: ['workflow:execute'],
      parameters: [
        { name: 'workflowId', type: 'string', required: true, description: 'Workflow ID to execute' },
        { name: 'triggerData', type: 'object', required: false, description: 'Data to pass to workflow' },
        { name: 'dryRun', type: 'boolean', required: false, description: 'Validate without executing' }
      ]
    }, this.handleExecuteWorkflow.bind(this));

    // Get Workflows Action
    this.registerAction({
      id: 'getWorkflows',
      name: 'Get Workflows',
      description: 'Retrieve workflows for the organization',
      category: 'data',
      permissions: ['workflow:read'],
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status' },
        { name: 'tags', type: 'array', required: false, description: 'Filter by tags' },
        { name: 'limit', type: 'number', required: false, description: 'Limit results' },
        { name: 'skip', type: 'number', required: false, description: 'Skip results for pagination' }
      ]
    }, this.handleGetWorkflows.bind(this));

    // Get Workflow Executions Action
    this.registerAction({
      id: 'getWorkflowExecutions',
      name: 'Get Workflow Executions',
      description: 'Retrieve execution history for workflows',
      category: 'data',
      permissions: ['workflow:read'],
      parameters: [
        { name: 'workflowId', type: 'string', required: false, description: 'Filter by workflow ID' },
        { name: 'status', type: 'string', required: false, description: 'Filter by execution status' },
        { name: 'limit', type: 'number', required: false, description: 'Limit results' }
      ]
    }, this.handleGetWorkflowExecutions.bind(this));

    // Get Node Types Action
    this.registerAction({
      id: 'getNodeTypes',
      name: 'Get Node Types',
      description: 'Get available workflow node types and their configurations',
      category: 'data',
      permissions: ['workflow:read'],
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by node category' }
      ]
    }, this.handleGetNodeTypes.bind(this));

    // Clone Workflow Action
    this.registerAction({
      id: 'cloneWorkflow',
      name: 'Clone Workflow',
      description: 'Create a copy of an existing workflow',
      category: 'data',
      permissions: ['workflow:write'],
      parameters: [
        { name: 'sourceWorkflowId', type: 'string', required: true, description: 'Source workflow ID' },
        { name: 'name', type: 'string', required: true, description: 'Name for the cloned workflow' },
        { name: 'description', type: 'string', required: false, description: 'Description for the cloned workflow' }
      ]
    }, this.handleCloneWorkflow.bind(this));

    // Delete Workflow Action
    this.registerAction({
      id: 'deleteWorkflow',
      name: 'Delete Workflow',
      description: 'Delete a workflow and its execution history',
      category: 'data',
      permissions: ['workflow:manage'],
      parameters: [
        { name: 'workflowId', type: 'string', required: true, description: 'Workflow ID to delete' }
      ]
    }, this.handleDeleteWorkflow.bind(this));

    // Validate Workflow Action
    this.registerAction({
      id: 'validateWorkflow',
      name: 'Validate Workflow',
      description: 'Validate workflow configuration and connections',
      category: 'data',
      permissions: ['workflow:read'],
      parameters: [
        { name: 'workflowId', type: 'string', required: false, description: 'Workflow ID to validate' },
        { name: 'nodes', type: 'array', required: false, description: 'Workflow nodes to validate' },
        { name: 'edges', type: 'array', required: false, description: 'Workflow edges to validate' }
      ]
    }, this.handleValidateWorkflow.bind(this));

    // Get Workflow Statistics Action
    this.registerAction({
      id: 'getWorkflowStatistics',
      name: 'Get Workflow Statistics',
      description: 'Get workflow usage and performance statistics',
      category: 'data',
      permissions: ['workflow:read'],
      parameters: [
        { name: 'timeRange', type: 'string', required: false, description: 'Time range for statistics (7d, 30d, 90d)' },
        { name: 'workflowId', type: 'string', required: false, description: 'Filter by specific workflow' }
      ]
    }, this.handleGetWorkflowStatistics.bind(this));
  }

  private async handleCreateWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { name, description, templateId, tags } = params;
    const orgId = this.getOrganizationId(context);

    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    try {
      const result = await safeParseCloudRun('createWorkflow', {
        name,
        description,
        templateId,
        tags,
        createdBy: context.user.userId
        // organizationId removed - will be injected by server middleware
      });

      return {
        workflow: result.workflow,
        message: `Workflow "${name}" created successfully`
      };
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleUpdateWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { workflowId, ...updateData } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('updateWorkflow', {
        workflowId,
        updateData,
        updatedBy: context.user.userId
        // organizationId removed - will be injected by server middleware
      });

      return {
        workflow: result.workflow,
        message: 'Workflow updated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleExecuteWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { workflowId, triggerData, dryRun } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('executeWorkflow', {
        workflowId,
        triggerData,
        dryRun,
        userId: context.user.userId
        // organizationId removed - will be injected by server middleware
      });

      return {
        execution: result.execution,
        message: dryRun ? 'Workflow validation completed' : 'Workflow execution started'
      };
    } catch (error) {
      throw new Error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetWorkflows(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { status, tags, limit, skip } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('getWorkflows', {
        status,
        tags,
        limit: limit || 50,
        skip: skip || 0
        // organizationId removed - will be injected by server middleware
      });

      return {
        workflows: result.workflows,
        pagination: result.pagination,
        templates: result.templates,
        nodeTypes: result.nodeTypes
      };
    } catch (error) {
      throw new Error(`Failed to fetch workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetWorkflowExecutions(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { workflowId, status, limit } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('getWorkflowExecutions', {
        workflowId,
        status,
        limit: limit || 100
        // organizationId removed - will be injected by server middleware
      });

      return {
        executions: result.executions,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to fetch workflow executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetNodeTypes(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { category } = params;

    try {
      const result = await safeParseCloudRun('getNodeTypes', {
        category
      });

      return {
        nodeTypes: result.nodeTypes
      };
    } catch (error) {
      throw new Error(`Failed to fetch node types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleCloneWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { sourceWorkflowId, name, description } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('cloneWorkflow', {
        sourceWorkflowId,
        name,
        description,
        createdBy: context.user.userId
        // organizationId removed - will be injected by server middleware
      });

      return {
        workflow: result.workflow,
        message: `Workflow cloned successfully as "${name}"`
      };
    } catch (error) {
      throw new Error(`Failed to clone workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleDeleteWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { workflowId } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('deleteWorkflow', {
        workflowId,
        deletedBy: context.user.userId
        // organizationId removed - will be injected by server middleware
      });

      return {
        success: result.success,
        message: 'Workflow deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleValidateWorkflow(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { workflowId, nodes, edges } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('validateWorkflow', {
        workflowId,
        nodes,
        edges
        // organizationId removed - will be injected by server middleware
      });

      return {
        validation: result.validation,
        isValid: result.validation.isValid,
        errors: result.validation.errors,
        warnings: result.validation.warnings
      };
    } catch (error) {
      throw new Error(`Failed to validate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetWorkflowStatistics(params: Record<string, unknown>, context: ActionContext): Promise<any> {
    const { timeRange, workflowId } = params;
    const orgId = this.getOrganizationId(context);

    try {
      const result = await safeParseCloudRun('getWorkflowStatistics', {
        timeRange: timeRange || '30d',
        workflowId
        // organizationId removed - will be injected by server middleware
      });

      return {
        statistics: result.statistics
      };
    } catch (error) {
      throw new Error(`Failed to fetch workflow statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance following platform pattern
export const workflowPageController = new WorkflowPageController();