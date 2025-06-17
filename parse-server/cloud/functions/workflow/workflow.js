module.exports = Parse => {
  const Workflow = Parse.Object.extend('Workflow');
  const WorkflowExecution = Parse.Object.extend('WorkflowExecution');
  const NodeExecution = Parse.Object.extend('NodeExecution');

  // Helper function to format workflow for client
  const formatWorkflow = (workflow) => {
    return {
      id: workflow.id,
      name: workflow.get('name'),
      description: workflow.get('description'),
      status: workflow.get('status'),
      nodes: workflow.get('nodes') || [],
      edges: workflow.get('edges') || [],
      organizationId: workflow.get('organizationId'),
      createdBy: workflow.get('createdBy')?.id || workflow.get('createdBy'),
      updatedBy: workflow.get('updatedBy')?.id || workflow.get('updatedBy'),
      createdAt: workflow.get('createdAt')?.toISOString(),
      updatedAt: workflow.get('updatedAt')?.toISOString(),
      version: workflow.get('version') || 1,
      tags: workflow.get('tags') || [],
      metadata: workflow.get('metadata') || {}
    };
  };

  // Helper function to format execution for client
  const formatExecution = (execution) => {
    return {
      id: execution.id,
      workflowId: execution.get('workflowId'),
      status: execution.get('status'),
      startTime: execution.get('startTime'),
      endTime: execution.get('endTime'),
      duration: execution.get('duration'),
      triggeredBy: execution.get('triggeredBy'),
      triggerData: execution.get('triggerData'),
      nodeExecutions: execution.get('nodeExecutions') || [],
      error: execution.get('error'),
      result: execution.get('result'),
      organizationId: execution.get('organizationId'),
      userId: execution.get('userId')
    };
  };

  // Create Workflow
  Parse.Cloud.define('createWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { name, description, templateId, tags, createdBy } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const workflow = new Workflow();
    workflow.set({
      name,
      description,
      status: 'draft',
      nodes: [],
      edges: [],
      organizationId,
      createdBy: request.user,
      updatedBy: request.user,
      version: 1,
      tags: tags || [],
      metadata: {
        templateId,
        isTemplate: false,
        executionCount: 0
      }
    });

    // Set ACL for organization-level access
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${organizationId}`, true);
    acl.setRoleWriteAccess(`org_${organizationId}`, true);
    workflow.setACL(acl);

    await workflow.save(null, { useMasterKey: true });
    
    return {
      workflow: formatWorkflow(workflow)
    };
  });

  // Update Workflow
  Parse.Cloud.define('updateWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { workflowId, updateData, updatedBy } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;
    
    const workflow = await new Parse.Query(Workflow)
      .equalTo('objectId', workflowId)
      .equalTo('organizationId', organizationId)
      .first({ useMasterKey: true });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update workflow fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'createdBy') {
        workflow.set(key, updateData[key]);
      }
    });
    workflow.set('updatedBy', request.user);
    workflow.set('version', (workflow.get('version') || 1) + 1);

    await workflow.save(null, { useMasterKey: true });
    
    return {
      workflow: formatWorkflow(workflow)
    };
  });

  // Delete Workflow
  Parse.Cloud.define('deleteWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { workflowId, deletedBy } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;
    
    const workflow = await new Parse.Query(Workflow)
      .equalTo('objectId', workflowId)
      .equalTo('organizationId', organizationId)
      .first({ useMasterKey: true });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Also delete related executions
    const executions = await new Parse.Query(WorkflowExecution)
      .equalTo('workflowId', workflowId)
      .find({ useMasterKey: true });

    await Parse.Object.destroyAll(executions, { useMasterKey: true });
    await workflow.destroy({ useMasterKey: true });
    
    return { success: true, workflowId };
  });

  // Execute Workflow
  Parse.Cloud.define('executeWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { workflowId, triggerData, dryRun, userId } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;
    
    const workflow = await new Parse.Query(Workflow)
      .equalTo('objectId', workflowId)
      .equalTo('organizationId', organizationId)
      .first({ useMasterKey: true });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const nodes = workflow.get('nodes') || [];
    const edges = workflow.get('edges') || [];

    if (nodes.length === 0) {
      throw new Error('Workflow has no nodes to execute');
    }

    if (dryRun) {
      // Validate workflow structure
      const validation = validateWorkflowStructure(nodes, edges);
      return {
        execution: null,
        validation
      };
    }

    // Create workflow execution
    const execution = new WorkflowExecution();
    execution.set({
      workflowId,
      status: 'running',
      startTime: new Date(),
      triggeredBy: 'manual',
      triggerData: triggerData || {},
      nodeExecutions: [],
      organizationId,
      userId: request.user.id
    });

    // Set ACL for organization-level access
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${organizationId}`, true);
    acl.setRoleWriteAccess(`org_${organizationId}`, true);
    execution.setACL(acl);

    await execution.save(null, { useMasterKey: true });

    // Update workflow execution count
    const metadata = workflow.get('metadata') || {};
    metadata.executionCount = (metadata.executionCount || 0) + 1;
    metadata.lastExecuted = new Date().toISOString();
    workflow.set('metadata', metadata);
    await workflow.save(null, { useMasterKey: true });

    return {
      execution: formatExecution(execution)
    };
  });

  // Get Workflows
  Parse.Cloud.define('getWorkflows', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { status, tags, limit, skip } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;

    const query = new Parse.Query(Workflow)
      .equalTo('organizationId', organizationId)
      .include('createdBy')
      .include('updatedBy')
      .descending('updatedAt');

    if (status) {
      query.equalTo('status', status);
    }

    if (tags && tags.length > 0) {
      query.containedIn('tags', tags);
    }

    if (limit) {
      query.limit(parseInt(limit));
    }

    if (skip) {
      query.skip(parseInt(skip));
    }

    const workflows = await query.find({ useMasterKey: true });
    const total = await new Parse.Query(Workflow)
      .equalTo('organizationId', organizationId)
      .count({ useMasterKey: true });

    // Get templates
    const templates = await new Parse.Query(Workflow)
      .equalTo('organizationId', organizationId)
      .equalTo('metadata.isTemplate', true)
      .find({ useMasterKey: true });

    return {
      workflows: workflows.map(formatWorkflow),
      pagination: {
        total,
        limit: parseInt(limit) || 50,
        skip: parseInt(skip) || 0
      },
      templates: templates.map(formatWorkflow),
      nodeTypes: getNodeTypes()
    };
  });

  // Get Workflow Executions
  Parse.Cloud.define('getWorkflowExecutions', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { workflowId, status, limit } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;

    const query = new Parse.Query(WorkflowExecution)
      .equalTo('organizationId', organizationId)
      .descending('startTime');

    if (workflowId) {
      query.equalTo('workflowId', workflowId);
    }

    if (status) {
      query.equalTo('status', status);
    }

    if (limit) {
      query.limit(parseInt(limit));
    }

    const executions = await query.find({ useMasterKey: true });
    const total = await new Parse.Query(WorkflowExecution)
      .equalTo('organizationId', organizationId)
      .count({ useMasterKey: true });

    return {
      executions: executions.map(formatExecution),
      pagination: {
        total,
        limit: parseInt(limit) || 100
      }
    };
  });

  // Clone Workflow
  Parse.Cloud.define('cloneWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { sourceWorkflowId, name, description, createdBy } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;

    const sourceWorkflow = await new Parse.Query(Workflow)
      .equalTo('objectId', sourceWorkflowId)
      .equalTo('organizationId', organizationId)
      .first({ useMasterKey: true });

    if (!sourceWorkflow) {
      throw new Error('Source workflow not found');
    }

    const clonedWorkflow = new Workflow();
    clonedWorkflow.set({
      name,
      description: description || `Copy of ${sourceWorkflow.get('name')}`,
      status: 'draft',
      nodes: sourceWorkflow.get('nodes') || [],
      edges: sourceWorkflow.get('edges') || [],
      organizationId,
      createdBy: request.user,
      updatedBy: request.user,
      version: 1,
      tags: sourceWorkflow.get('tags') || [],
      metadata: {
        ...sourceWorkflow.get('metadata'),
        isTemplate: false,
        executionCount: 0,
        clonedFrom: sourceWorkflowId
      }
    });

    // Set ACL for organization-level access
    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${organizationId}`, true);
    acl.setRoleWriteAccess(`org_${organizationId}`, true);
    clonedWorkflow.setACL(acl);

    await clonedWorkflow.save(null, { useMasterKey: true });

    return {
      workflow: formatWorkflow(clonedWorkflow)
    };
  });

  // Validate Workflow
  Parse.Cloud.define('validateWorkflow', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { workflowId, nodes, edges } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;

    let workflowNodes = nodes;
    let workflowEdges = edges;

    if (workflowId) {
      const workflow = await new Parse.Query(Workflow)
        .equalTo('objectId', workflowId)
        .equalTo('organizationId', organizationId)
        .first({ useMasterKey: true });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      workflowNodes = workflow.get('nodes') || [];
      workflowEdges = workflow.get('edges') || [];
    }

    const validation = validateWorkflowStructure(workflowNodes, workflowEdges);

    return {
      validation
    };
  });

  // Get Node Types
  Parse.Cloud.define('getNodeTypes', async request => {
    const { category } = request.params;
    
    let nodeTypes = getNodeTypes();
    
    if (category) {
      nodeTypes = nodeTypes.filter(type => type.category === category);
    }

    return {
      nodeTypes
    };
  });

  // Get Workflow Statistics
  Parse.Cloud.define('getWorkflowStatistics', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { timeRange, workflowId } = request.params;
    const organizationId = request.user.get('organizationId') || request.params.organizationId;

    // Calculate date range
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    // Get workflow statistics
    const workflowQuery = new Parse.Query(Workflow)
      .equalTo('organizationId', organizationId);

    if (workflowId) {
      workflowQuery.equalTo('objectId', workflowId);
    }

    const totalWorkflows = await workflowQuery.count({ useMasterKey: true });
    const activeWorkflows = await workflowQuery
      .equalTo('status', 'active')
      .count({ useMasterKey: true });

    // Get execution statistics
    const executionQuery = new Parse.Query(WorkflowExecution)
      .equalTo('organizationId', organizationId)
      .greaterThanOrEqualTo('startTime', startDate);

    if (workflowId) {
      executionQuery.equalTo('workflowId', workflowId);
    }

    const executions = await executionQuery.find({ useMasterKey: true });
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.get('status') === 'completed').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Calculate average execution time
    const completedExecutions = executions.filter(e => e.get('endTime'));
    const averageExecutionTime = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum, e) => sum + (e.get('duration') || 0), 0) / completedExecutions.length
      : 0;

    // Group executions by status
    const executionsByStatus = executions.reduce((acc, execution) => {
      const status = execution.get('status');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      statistics: {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successRate,
        averageExecutionTime,
        mostUsedNodeTypes: [], // TODO: Implement node type analysis
        executionsByStatus,
        executionTrends: [] // TODO: Implement trend analysis
      }
    };
  });

  // Helper function to validate workflow structure
  function validateWorkflowStructure(nodes, edges) {
    const errors = [];
    const warnings = [];

    if (!nodes || nodes.length === 0) {
      errors.push({
        type: 'error',
        message: 'Workflow must have at least one node',
        code: 'NO_NODES'
      });
    }

    // Check for disconnected nodes
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        warnings.push({
          type: 'warning',
          nodeId: node.id,
          message: `Node "${node.data.label}" is not connected to any other nodes`,
          code: 'DISCONNECTED_NODE'
        });
      }
    });

    // Check for circular dependencies
    const visited = new Set();
    const recursionStack = new Set();

    function hasCycle(nodeId) {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    }

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        errors.push({
          type: 'error',
          message: 'Workflow contains circular dependencies',
          code: 'CIRCULAR_DEPENDENCY'
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper function to get available node types
  function getNodeTypes() {
    return [
      {
        type: 'trigger-manual',
        category: 'trigger',
        name: 'Manual Trigger',
        description: 'Manually triggered workflow start',
        icon: 'play',
        color: '#10B981',
        inputs: [],
        outputs: [{ id: 'output', name: 'Trigger Data', type: 'object' }],
        configSchema: {}
      },
      {
        type: 'trigger-webhook',
        category: 'trigger',
        name: 'Webhook Trigger',
        description: 'HTTP webhook trigger',
        icon: 'webhook',
        color: '#3B82F6',
        inputs: [],
        outputs: [{ id: 'output', name: 'Webhook Data', type: 'object' }],
        configSchema: {
          url: { type: 'string', required: true }
        }
      },
      {
        type: 'action-cloud-function',
        category: 'action',
        name: 'Cloud Function',
        description: 'Execute a Parse Cloud Function',
        icon: 'function',
        color: '#8B5CF6',
        inputs: [{ id: 'input', name: 'Parameters', type: 'object' }],
        outputs: [{ id: 'output', name: 'Result', type: 'object' }],
        configSchema: {
          functionName: { type: 'string', required: true },
          parameters: { type: 'object', required: false }
        }
      },
      {
        type: 'action-notification',
        category: 'action',
        name: 'Send Notification',
        description: 'Send a notification to users',
        icon: 'bell',
        color: '#F59E0B',
        inputs: [{ id: 'input', name: 'Message Data', type: 'object' }],
        outputs: [{ id: 'output', name: 'Notification Result', type: 'object' }],
        configSchema: {
          type: { type: 'string', required: true },
          message: { type: 'string', required: true },
          recipients: { type: 'array', required: true }
        }
      },
      {
        type: 'logic-condition',
        category: 'logic',
        name: 'Condition',
        description: 'Conditional branching logic',
        icon: 'branch',
        color: '#EF4444',
        inputs: [{ id: 'input', name: 'Input Data', type: 'object' }],
        outputs: [
          { id: 'true', name: 'True Branch', type: 'object' },
          { id: 'false', name: 'False Branch', type: 'object' }
        ],
        configSchema: {
          condition: { type: 'string', required: true }
        }
      },
      {
        type: 'logic-transform',
        category: 'logic',
        name: 'Transform Data',
        description: 'Transform and manipulate data',
        icon: 'transform',
        color: '#06B6D4',
        inputs: [{ id: 'input', name: 'Input Data', type: 'object' }],
        outputs: [{ id: 'output', name: 'Transformed Data', type: 'object' }],
        configSchema: {
          script: { type: 'string', required: true }
        }
      }
    ];
  }
};
