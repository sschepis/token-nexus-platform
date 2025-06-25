/**
 * Workflow Cloud Functions
 * Secure backend functions for workflow management
 */

const { requireAuth, requireOrganization, validatePermissions } = require('../../middleware/auth');
const { validateInput } = require('../../utils/validation');
const { logActivity } = require('../../utils/logging');

/**
 * Fetch workflows for an organization
 */
Parse.Cloud.define('fetchWorkflows', async (request) => {
  const { user, params } = request;
  
  try {
    // Validate authentication and organization
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:read'], organization);

    const { status, tags, limit = 50, skip = 0, includeStats = false } = params;

    // Build query
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    
    if (status) {
      query.equalTo('status', status);
    }
    
    if (tags && Array.isArray(tags)) {
      query.containsAll('tags', tags);
    }
    
    query.limit(limit);
    query.skip(skip);
    query.descending('updatedAt');
    query.include(['createdBy', 'updatedBy']);

    const workflows = await query.find({ useMasterKey: true });

    // Add statistics if requested
    let result = workflows.map(workflow => {
      const data = workflow.toJSON();
      if (includeStats && workflow.get('metadata')) {
        // Add execution statistics
        data.metadata = {
          ...data.metadata,
          executionCount: workflow.get('executionCount') || 0,
          lastExecuted: workflow.get('lastExecuted'),
          averageExecutionTime: workflow.get('averageExecutionTime')
        };
      }
      return data;
    });

    await logActivity(user, 'workflow:fetch', {
      organizationId: organization.id,
      count: result.length,
      filters: { status, tags, includeStats }
    });

    return result;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch workflows: ${error.message}`);
  }
});

/**
 * Create a new workflow
 */
Parse.Cloud.define('createWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:write'], organization);

    const { name, description, templateId, tags, category, nodes, edges } = params;

    // Validate required fields
    if (!name) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow name is required');
    }

    // Check for duplicate names within organization
    const existingQuery = new Parse.Query('Workflow');
    existingQuery.equalTo('organization', organization);
    existingQuery.equalTo('name', name);
    const existing = await existingQuery.first({ useMasterKey: true });
    
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A workflow with this name already exists');
    }

    // Create workflow
    const Workflow = Parse.Object.extend('Workflow');
    const workflow = new Workflow();
    
    workflow.set('name', name);
    workflow.set('description', description || '');
    workflow.set('organization', organization);
    workflow.set('createdBy', user);
    workflow.set('updatedBy', user);
    workflow.set('status', 'draft');
    workflow.set('version', 1);
    workflow.set('tags', tags || []);
    workflow.set('metadata', {
      category: category || 'general',
      templateId,
      executionCount: 0
    });
    workflow.set('definition', {
      nodes: nodes || [],
      edges: edges || []
    });

    const savedWorkflow = await workflow.save(null, { useMasterKey: true });

    await logActivity(user, 'workflow:create', {
      workflowId: savedWorkflow.id,
      workflowName: name,
      organizationId: organization.id
    });

    return savedWorkflow.toJSON();
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create workflow: ${error.message}`);
  }
});

/**
 * Update an existing workflow
 */
Parse.Cloud.define('updateWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:write'], organization);

    const { workflowId, updateData } = params;

    if (!workflowId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow ID is required');
    }

    // Find workflow
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    const workflow = await query.get(workflowId, { useMasterKey: true });

    if (!workflow) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Workflow not found');
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'tags', 'nodes', 'edges', 'status'];
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'nodes' || field === 'edges') {
          const definition = workflow.get('definition') || {};
          definition[field] = updateData[field];
          workflow.set('definition', definition);
        } else {
          workflow.set(field, updateData[field]);
        }
      }
    }

    workflow.set('updatedBy', user);
    workflow.increment('version');

    const savedWorkflow = await workflow.save(null, { useMasterKey: true });

    await logActivity(user, 'workflow:update', {
      workflowId: savedWorkflow.id,
      workflowName: savedWorkflow.get('name'),
      organizationId: organization.id,
      updatedFields: Object.keys(updateData)
    });

    return savedWorkflow.toJSON();
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to update workflow: ${error.message}`);
  }
});

/**
 * Delete a workflow
 */
Parse.Cloud.define('deleteWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:manage'], organization);

    const { workflowId } = params;

    if (!workflowId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow ID is required');
    }

    // Find workflow
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    const workflow = await query.get(workflowId, { useMasterKey: true });

    if (!workflow) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Workflow not found');
    }

    const workflowName = workflow.get('name');

    // Delete related executions first
    const executionQuery = new Parse.Query('WorkflowExecution');
    executionQuery.equalTo('workflow', workflow);
    const executions = await executionQuery.find({ useMasterKey: true });
    
    if (executions.length > 0) {
      await Parse.Object.destroyAll(executions, { useMasterKey: true });
    }

    // Delete the workflow
    await workflow.destroy({ useMasterKey: true });

    await logActivity(user, 'workflow:delete', {
      workflowId,
      workflowName,
      organizationId: organization.id,
      executionsDeleted: executions.length
    });

    return { success: true, message: 'Workflow deleted successfully' };
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to delete workflow: ${error.message}`);
  }
});

/**
 * Clone a workflow
 */
Parse.Cloud.define('cloneWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:write'], organization);

    const { sourceWorkflowId, name, description } = params;

    if (!sourceWorkflowId || !name) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Source workflow ID and name are required');
    }

    // Find source workflow
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    const sourceWorkflow = await query.get(sourceWorkflowId, { useMasterKey: true });

    if (!sourceWorkflow) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Source workflow not found');
    }

    // Check for duplicate names
    const existingQuery = new Parse.Query('Workflow');
    existingQuery.equalTo('organization', organization);
    existingQuery.equalTo('name', name);
    const existing = await existingQuery.first({ useMasterKey: true });
    
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A workflow with this name already exists');
    }

    // Create cloned workflow
    const Workflow = Parse.Object.extend('Workflow');
    const clonedWorkflow = new Workflow();
    
    clonedWorkflow.set('name', name);
    clonedWorkflow.set('description', description || `Clone of ${sourceWorkflow.get('description') || sourceWorkflow.get('name')}`);
    clonedWorkflow.set('organization', organization);
    clonedWorkflow.set('createdBy', user);
    clonedWorkflow.set('updatedBy', user);
    clonedWorkflow.set('status', 'draft');
    clonedWorkflow.set('version', 1);
    clonedWorkflow.set('tags', sourceWorkflow.get('tags') || []);
    clonedWorkflow.set('metadata', {
      ...sourceWorkflow.get('metadata'),
      clonedFrom: sourceWorkflowId,
      executionCount: 0
    });
    clonedWorkflow.set('definition', sourceWorkflow.get('definition') || { nodes: [], edges: [] });

    const savedWorkflow = await clonedWorkflow.save(null, { useMasterKey: true });

    await logActivity(user, 'workflow:clone', {
      sourceWorkflowId,
      clonedWorkflowId: savedWorkflow.id,
      workflowName: name,
      organizationId: organization.id
    });

    return savedWorkflow.toJSON();
  } catch (error) {
    console.error('Error cloning workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to clone workflow: ${error.message}`);
  }
});

/**
 * Execute a workflow
 */
Parse.Cloud.define('executeWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:execute'], organization);

    const { workflowId, triggerData, dryRun = false } = params;

    if (!workflowId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow ID is required');
    }

    // Find workflow
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    const workflow = await query.get(workflowId, { useMasterKey: true });

    if (!workflow) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Workflow not found');
    }

    if (workflow.get('status') !== 'active' && !dryRun) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Only active workflows can be executed');
    }

    if (dryRun) {
      // Validate workflow without executing
      const definition = workflow.get('definition') || {};
      const validation = await validateWorkflowDefinition(definition);
      
      await logActivity(user, 'workflow:validate', {
        workflowId,
        workflowName: workflow.get('name'),
        organizationId: organization.id,
        isValid: validation.isValid
      });

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Create execution record
    const WorkflowExecution = Parse.Object.extend('WorkflowExecution');
    const execution = new WorkflowExecution();
    
    execution.set('workflow', workflow);
    execution.set('organization', organization);
    execution.set('triggeredBy', user);
    execution.set('status', 'running');
    execution.set('triggerData', triggerData || {});
    execution.set('startedAt', new Date());

    const savedExecution = await execution.save(null, { useMasterKey: true });

    // Update workflow statistics
    workflow.increment('executionCount');
    workflow.set('lastExecuted', new Date());
    await workflow.save(null, { useMasterKey: true });

    // TODO: Implement actual workflow execution engine
    // For now, we'll simulate execution completion
    setTimeout(async () => {
      try {
        execution.set('status', 'completed');
        execution.set('completedAt', new Date());
        execution.set('result', { message: 'Workflow executed successfully' });
        await execution.save(null, { useMasterKey: true });
      } catch (error) {
        console.error('Error updating execution status:', error);
      }
    }, 1000);

    await logActivity(user, 'workflow:execute', {
      workflowId,
      executionId: savedExecution.id,
      workflowName: workflow.get('name'),
      organizationId: organization.id
    });

    return {
      executionId: savedExecution.id,
      status: 'running',
      message: 'Workflow execution started'
    };
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to execute workflow: ${error.message}`);
  }
});

/**
 * Update workflow status
 */
Parse.Cloud.define('updateWorkflowStatus', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:write'], organization);

    const { workflowId, status } = params;

    if (!workflowId || !status) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow ID and status are required');
    }

    const validStatuses = ['draft', 'active', 'paused', 'archived', 'error'];
    if (!validStatuses.includes(status)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Find workflow
    const query = new Parse.Query('Workflow');
    query.equalTo('organization', organization);
    const workflow = await query.get(workflowId, { useMasterKey: true });

    if (!workflow) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Workflow not found');
    }

    const oldStatus = workflow.get('status');
    workflow.set('status', status);
    workflow.set('updatedBy', user);

    const savedWorkflow = await workflow.save(null, { useMasterKey: true });

    await logActivity(user, 'workflow:status_update', {
      workflowId,
      workflowName: workflow.get('name'),
      organizationId: organization.id,
      oldStatus,
      newStatus: status
    });

    return savedWorkflow.toJSON();
  } catch (error) {
    console.error('Error updating workflow status:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to update workflow status: ${error.message}`);
  }
});

/**
 * Helper function to validate workflow definition
 */
async function validateWorkflowDefinition(definition) {
  const errors = [];
  const warnings = [];

  if (!definition.nodes || !Array.isArray(definition.nodes)) {
    errors.push('Workflow must have nodes array');
  }

  if (!definition.edges || !Array.isArray(definition.edges)) {
    errors.push('Workflow must have edges array');
  }

  if (definition.nodes && definition.nodes.length === 0) {
    warnings.push('Workflow has no nodes');
  }

  // Additional validation logic can be added here

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}