/**
 * Workflow Configuration Cloud Functions
 * Functions for workflow templates, node types, and statistics
 */

const { requireAuth, requireOrganization, validatePermissions } = require('../../middleware/auth');
const { logActivity } = require('../../utils/logging');

/**
 * Get available workflow node types
 */
Parse.Cloud.define('getNodeTypes', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    
    const { category } = params;

    // Define available node types
    const nodeTypes = [
      {
        id: 'trigger_webhook',
        name: 'Webhook Trigger',
        category: 'trigger',
        description: 'Triggers workflow when webhook is called',
        icon: 'webhook',
        inputs: [],
        outputs: ['data'],
        config: {
          url: { type: 'string', required: true },
          method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' }
        }
      },
      {
        id: 'trigger_schedule',
        name: 'Schedule Trigger',
        category: 'trigger',
        description: 'Triggers workflow on a schedule',
        icon: 'clock',
        inputs: [],
        outputs: ['timestamp'],
        config: {
          cron: { type: 'string', required: true, placeholder: '0 9 * * *' },
          timezone: { type: 'string', default: 'UTC' }
        }
      },
      {
        id: 'action_email',
        name: 'Send Email',
        category: 'action',
        description: 'Sends an email notification',
        icon: 'mail',
        inputs: ['trigger'],
        outputs: ['result'],
        config: {
          to: { type: 'string', required: true },
          subject: { type: 'string', required: true },
          body: { type: 'textarea', required: true },
          template: { type: 'select', options: ['plain', 'html'], default: 'plain' }
        }
      },
      {
        id: 'action_http_request',
        name: 'HTTP Request',
        category: 'action',
        description: 'Makes an HTTP request to external API',
        icon: 'globe',
        inputs: ['trigger'],
        outputs: ['response', 'error'],
        config: {
          url: { type: 'string', required: true },
          method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          headers: { type: 'object' },
          body: { type: 'textarea' }
        }
      },
      {
        id: 'condition_if',
        name: 'If Condition',
        category: 'condition',
        description: 'Conditional branching based on data',
        icon: 'git-branch',
        inputs: ['input'],
        outputs: ['true', 'false'],
        config: {
          field: { type: 'string', required: true },
          operator: { type: 'select', options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'], default: 'equals' },
          value: { type: 'string', required: true }
        }
      },
      {
        id: 'transform_data',
        name: 'Transform Data',
        category: 'transform',
        description: 'Transforms input data using JavaScript',
        icon: 'code',
        inputs: ['input'],
        outputs: ['output'],
        config: {
          script: { type: 'code', language: 'javascript', required: true, placeholder: 'return { ...input, processed: true };' }
        }
      },
      {
        id: 'action_parse_query',
        name: 'Parse Query',
        category: 'action',
        description: 'Queries Parse database',
        icon: 'database',
        inputs: ['trigger'],
        outputs: ['results', 'error'],
        config: {
          className: { type: 'string', required: true },
          query: { type: 'object', required: true },
          limit: { type: 'number', default: 100 }
        }
      },
      {
        id: 'action_parse_save',
        name: 'Save to Parse',
        category: 'action',
        description: 'Saves data to Parse database',
        icon: 'save',
        inputs: ['data'],
        outputs: ['object', 'error'],
        config: {
          className: { type: 'string', required: true },
          data: { type: 'object', required: true }
        }
      }
    ];

    // Filter by category if specified
    let filteredNodeTypes = nodeTypes;
    if (category) {
      filteredNodeTypes = nodeTypes.filter(node => node.category === category);
    }

    await logActivity(user, 'workflow:get_node_types', {
      category,
      count: filteredNodeTypes.length
    });

    return filteredNodeTypes;
  } catch (error) {
    console.error('Error getting node types:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get node types: ${error.message}`);
  }
});

/**
 * Get workflow statistics
 */
Parse.Cloud.define('getWorkflowStatistics', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:read'], organization);

    const { timeRange = '30d', workflowId } = params;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get workflow statistics
    const workflowQuery = new Parse.Query('Workflow');
    workflowQuery.equalTo('organization', organization);
    
    if (workflowId) {
      workflowQuery.equalTo('objectId', workflowId);
    }

    const workflows = await workflowQuery.find({ useMasterKey: true });

    // Get execution statistics
    const executionQuery = new Parse.Query('WorkflowExecution');
    executionQuery.equalTo('organization', organization);
    executionQuery.greaterThanOrEqualTo('createdAt', startDate);
    
    if (workflowId) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        executionQuery.equalTo('workflow', workflow);
      }
    }

    const executions = await executionQuery.find({ useMasterKey: true });

    // Calculate statistics
    const stats = {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.get('status') === 'active').length,
      draftWorkflows: workflows.filter(w => w.get('status') === 'draft').length,
      pausedWorkflows: workflows.filter(w => w.get('status') === 'paused').length,
      archivedWorkflows: workflows.filter(w => w.get('status') === 'archived').length,
      errorWorkflows: workflows.filter(w => w.get('status') === 'error').length,
      
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.get('status') === 'completed').length,
      failedExecutions: executions.filter(e => e.get('status') === 'failed').length,
      runningExecutions: executions.filter(e => e.get('status') === 'running').length,
      
      timeRange,
      startDate,
      endDate: now
    };

    // Calculate execution trends (daily)
    const dailyExecutions = {};
    executions.forEach(execution => {
      const date = execution.get('createdAt').toISOString().split('T')[0];
      if (!dailyExecutions[date]) {
        dailyExecutions[date] = { total: 0, successful: 0, failed: 0 };
      }
      dailyExecutions[date].total++;
      if (execution.get('status') === 'completed') {
        dailyExecutions[date].successful++;
      } else if (execution.get('status') === 'failed') {
        dailyExecutions[date].failed++;
      }
    });

    stats.dailyExecutions = dailyExecutions;

    // Calculate average execution time
    const completedExecutions = executions.filter(e => 
      e.get('status') === 'completed' && 
      e.get('startedAt') && 
      e.get('completedAt')
    );
    
    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((sum, execution) => {
        const duration = execution.get('completedAt').getTime() - execution.get('startedAt').getTime();
        return sum + duration;
      }, 0);
      stats.averageExecutionTime = Math.round(totalTime / completedExecutions.length);
    } else {
      stats.averageExecutionTime = 0;
    }

    // Top performing workflows
    const workflowStats = workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.get('name'),
      status: workflow.get('status'),
      executionCount: executions.filter(e => e.get('workflow')?.id === workflow.id).length,
      successRate: (() => {
        const workflowExecutions = executions.filter(e => e.get('workflow')?.id === workflow.id);
        if (workflowExecutions.length === 0) return 0;
        const successful = workflowExecutions.filter(e => e.get('status') === 'completed').length;
        return Math.round((successful / workflowExecutions.length) * 100);
      })()
    })).sort((a, b) => b.executionCount - a.executionCount);

    stats.topWorkflows = workflowStats.slice(0, 10);

    await logActivity(user, 'workflow:get_statistics', {
      organizationId: organization.id,
      timeRange,
      workflowId,
      totalExecutions: stats.totalExecutions
    });

    return stats;
  } catch (error) {
    console.error('Error getting workflow statistics:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get workflow statistics: ${error.message}`);
  }
});

/**
 * Get workflow templates
 */
Parse.Cloud.define('getWorkflowTemplates', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    
    const { category, tags } = params;

    // Define workflow templates
    const templates = [
      {
        id: 'user_onboarding',
        name: 'User Onboarding',
        description: 'Automated user onboarding workflow with email notifications',
        category: 'user-management',
        tags: ['onboarding', 'email', 'users'],
        icon: 'user-plus',
        definition: {
          nodes: [
            {
              id: 'trigger',
              type: 'trigger_webhook',
              position: { x: 100, y: 100 },
              data: { label: 'New User Signup' }
            },
            {
              id: 'welcome_email',
              type: 'action_email',
              position: { x: 300, y: 100 },
              data: { label: 'Send Welcome Email' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'welcome_email' }
          ]
        }
      },
      {
        id: 'data_backup',
        name: 'Daily Data Backup',
        description: 'Scheduled daily backup of important data',
        category: 'data-processing',
        tags: ['backup', 'schedule', 'data'],
        icon: 'database',
        definition: {
          nodes: [
            {
              id: 'schedule',
              type: 'trigger_schedule',
              position: { x: 100, y: 100 },
              data: { label: 'Daily at 2 AM' }
            },
            {
              id: 'backup',
              type: 'action_parse_query',
              position: { x: 300, y: 100 },
              data: { label: 'Backup Data' }
            }
          ],
          edges: [
            { id: 'e1', source: 'schedule', target: 'backup' }
          ]
        }
      },
      {
        id: 'api_integration',
        name: 'API Data Sync',
        description: 'Sync data with external API on schedule',
        category: 'integration',
        tags: ['api', 'sync', 'integration'],
        icon: 'refresh-cw',
        definition: {
          nodes: [
            {
              id: 'schedule',
              type: 'trigger_schedule',
              position: { x: 100, y: 100 },
              data: { label: 'Hourly Sync' }
            },
            {
              id: 'fetch_data',
              type: 'action_http_request',
              position: { x: 300, y: 100 },
              data: { label: 'Fetch External Data' }
            },
            {
              id: 'save_data',
              type: 'action_parse_save',
              position: { x: 500, y: 100 },
              data: { label: 'Save to Database' }
            }
          ],
          edges: [
            { id: 'e1', source: 'schedule', target: 'fetch_data' },
            { id: 'e2', source: 'fetch_data', target: 'save_data' }
          ]
        }
      },
      {
        id: 'notification_system',
        name: 'Smart Notifications',
        description: 'Conditional notification system based on user preferences',
        category: 'notification',
        tags: ['notifications', 'conditions', 'email'],
        icon: 'bell',
        definition: {
          nodes: [
            {
              id: 'trigger',
              type: 'trigger_webhook',
              position: { x: 100, y: 100 },
              data: { label: 'Event Trigger' }
            },
            {
              id: 'check_preferences',
              type: 'condition_if',
              position: { x: 300, y: 100 },
              data: { label: 'Check User Preferences' }
            },
            {
              id: 'send_notification',
              type: 'action_email',
              position: { x: 500, y: 50 },
              data: { label: 'Send Notification' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'check_preferences' },
            { id: 'e2', source: 'check_preferences', sourceHandle: 'true', target: 'send_notification' }
          ]
        }
      }
    ];

    // Filter templates
    let filteredTemplates = templates;
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(template => template.category === category);
    }
    
    if (tags && Array.isArray(tags)) {
      filteredTemplates = filteredTemplates.filter(template => 
        tags.some(tag => template.tags.includes(tag))
      );
    }

    await logActivity(user, 'workflow:get_templates', {
      category,
      tags,
      count: filteredTemplates.length
    });

    return filteredTemplates;
  } catch (error) {
    console.error('Error getting workflow templates:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get workflow templates: ${error.message}`);
  }
});

/**
 * Export workflow
 */
Parse.Cloud.define('exportWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:read'], organization);

    const { workflowId, format = 'json', includeExecutions = false } = params;

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

    // Prepare export data
    const exportData = {
      workflow: workflow.toJSON(),
      exportedAt: new Date().toISOString(),
      exportedBy: user.get('username') || user.get('email'),
      format,
      version: '1.0'
    };

    // Include executions if requested
    if (includeExecutions) {
      const executionQuery = new Parse.Query('WorkflowExecution');
      executionQuery.equalTo('workflow', workflow);
      executionQuery.limit(100); // Limit to recent 100 executions
      executionQuery.descending('createdAt');
      
      const executions = await executionQuery.find({ useMasterKey: true });
      exportData.executions = executions.map(e => e.toJSON());
    }

    await logActivity(user, 'workflow:export', {
      workflowId,
      workflowName: workflow.get('name'),
      organizationId: organization.id,
      format,
      includeExecutions
    });

    return exportData;
  } catch (error) {
    console.error('Error exporting workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to export workflow: ${error.message}`);
  }
});

/**
 * Import workflow
 */
Parse.Cloud.define('importWorkflow', async (request) => {
  const { user, params } = request;
  
  try {
    await requireAuth(request);
    const organization = await requireOrganization(request);
    await validatePermissions(user, ['workflows:write'], organization);

    const { workflowData, name, validateOnly = false } = params;

    if (!workflowData) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Workflow data is required');
    }

    // Validate workflow data structure
    const validation = validateImportData(workflowData);
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    if (validateOnly) {
      return {
        isValid: true,
        errors: [],
        warnings: validation.warnings
      };
    }

    // Check for duplicate names
    const workflowName = name || workflowData.workflow?.name || 'Imported Workflow';
    const existingQuery = new Parse.Query('Workflow');
    existingQuery.equalTo('organization', organization);
    existingQuery.equalTo('name', workflowName);
    const existing = await existingQuery.first({ useMasterKey: true });
    
    if (existing) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A workflow with this name already exists');
    }

    // Create imported workflow
    const Workflow = Parse.Object.extend('Workflow');
    const workflow = new Workflow();
    
    const originalWorkflow = workflowData.workflow;
    
    workflow.set('name', workflowName);
    workflow.set('description', originalWorkflow.description || 'Imported workflow');
    workflow.set('organization', organization);
    workflow.set('createdBy', user);
    workflow.set('updatedBy', user);
    workflow.set('status', 'draft'); // Always import as draft
    workflow.set('version', 1);
    workflow.set('tags', originalWorkflow.tags || []);
    workflow.set('metadata', {
      ...originalWorkflow.metadata,
      imported: true,
      importedAt: new Date(),
      importedBy: user.id,
      originalId: originalWorkflow.objectId
    });
    workflow.set('definition', originalWorkflow.definition || { nodes: [], edges: [] });

    const savedWorkflow = await workflow.save(null, { useMasterKey: true });

    await logActivity(user, 'workflow:import', {
      workflowId: savedWorkflow.id,
      workflowName,
      organizationId: organization.id,
      originalId: originalWorkflow.objectId
    });

    return {
      success: true,
      workflow: savedWorkflow.toJSON(),
      warnings: validation.warnings
    };
  } catch (error) {
    console.error('Error importing workflow:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to import workflow: ${error.message}`);
  }
});

/**
 * Helper function to validate import data
 */
function validateImportData(data) {
  const errors = [];
  const warnings = [];

  if (!data.workflow) {
    errors.push('Import data must contain workflow object');
    return { isValid: false, errors, warnings };
  }

  const workflow = data.workflow;

  if (!workflow.name) {
    errors.push('Workflow must have a name');
  }

  if (!workflow.definition) {
    errors.push('Workflow must have a definition');
  } else {
    if (!workflow.definition.nodes || !Array.isArray(workflow.definition.nodes)) {
      errors.push('Workflow definition must contain nodes array');
    }
    
    if (!workflow.definition.edges || !Array.isArray(workflow.definition.edges)) {
      errors.push('Workflow definition must contain edges array');
    }
  }

  if (workflow.status && workflow.status !== 'draft') {
    warnings.push('Workflow status will be set to draft upon import');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}