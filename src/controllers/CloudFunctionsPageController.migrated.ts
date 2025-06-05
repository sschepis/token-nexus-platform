import { BasePageController } from './base/BasePageController';
import { fetchFunctions } from './cloud-functions/fetchFunctions';
import { createFunction } from './cloud-functions/createFunction';
import { executeFunction } from './cloud-functions/executeFunction';
import { getFunctionLogs } from './cloud-functions/getFunctionLogs';
import { updateFunction } from './cloud-functions/updateFunction';
import { deleteFunction } from './cloud-functions/deleteFunction';
import { deployFunction } from './cloud-functions/deployFunction';
import { cloneFunction } from './cloud-functions/cloneFunction';

export class CloudFunctionsPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'cloud-functions',
      pageName: 'Cloud Functions',
      description: 'Manage Parse Cloud Code functions with deployment, execution, and monitoring capabilities',
      category: 'development',
      tags: ['cloud-functions', 'parse', 'serverless', 'deployment', 'monitoring'],
      permissions: ['functions:read', 'functions:write', 'functions:execute', 'functions:deploy'],
      version: '2.0.0'
    });
  }

  protected initializeActions(): void {
    // Fetch Functions Action
    this.registerAction(
      {
        id: 'fetchFunctions',
        name: 'Fetch Cloud Functions',
        description: 'Get all cloud functions with metadata, execution stats, and deployment status',
        category: 'data',
        permissions: ['functions:read'],
        parameters: [
          { name: 'includeStats', type: 'boolean', required: false, description: 'Include execution statistics' },
          { name: 'status', type: 'string', required: false, description: 'Filter by deployment status (deployed, draft, error)' },
          { name: 'category', type: 'string', required: false, description: 'Filter by function category' }
        ]
      },
      fetchFunctions
    );

    // Create Function Action
    this.registerAction(
      {
        id: 'createFunction',
        name: 'Create Cloud Function',
        description: 'Create a new cloud function with code and configuration',
        category: 'data',
        permissions: ['functions:write'],
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Function name (must be unique)' },
          { name: 'code', type: 'string', required: true, description: 'Function code in JavaScript' },
          { name: 'description', type: 'string', required: false, description: 'Function description' },
          { name: 'category', type: 'string', required: false, description: 'Function category' },
          { name: 'triggers', type: 'array', required: false, description: 'Function triggers (beforeSave, afterSave, etc.)' },
          { name: 'validateOnly', type: 'boolean', required: false, description: 'Only validate without creating' }
        ]
      },
      createFunction
    );

    // Execute Function Action
    this.registerAction(
      {
        id: 'executeFunction',
        name: 'Execute Cloud Function',
        description: 'Execute a cloud function with parameters and get results',
        category: 'external',
        permissions: ['functions:execute'],
        parameters: [
          { name: 'functionName', type: 'string', required: true, description: 'Name of function to execute' },
          { name: 'parameters', type: 'object', required: false, description: 'Function parameters as JSON object' },
          { name: 'timeout', type: 'number', required: false, description: 'Execution timeout in seconds (default: 30)' }
        ]
      },
      executeFunction
    );

    // Get Function Logs Action
    this.registerAction(
      {
        id: 'getFunctionLogs',
        name: 'Get Function Logs',
        description: 'Get execution logs and metrics for a cloud function',
        category: 'data',
        permissions: ['functions:read'],
        parameters: [
          { name: 'functionName', type: 'string', required: true, description: 'Name of function to get logs for' },
          { name: 'limit', type: 'number', required: false, description: 'Number of log entries to return (default: 50)' },
          { name: 'timeRange', type: 'string', required: false, description: 'Time range for logs (1h, 24h, 7d, 30d)' },
          { name: 'level', type: 'string', required: false, description: 'Log level filter (info, warn, error)' }
        ]
      },
      getFunctionLogs
    );

    // Update Function Action
    this.registerAction(
      {
        id: 'updateFunction',
        name: 'Update Cloud Function',
        description: 'Update cloud function code, configuration, or metadata',
        category: 'data',
        permissions: ['functions:write'],
        parameters: [
          { name: 'functionName', type: 'string', required: true, description: 'Name of function to update' },
          { name: 'code', type: 'string', required: false, description: 'Updated function code' },
          { name: 'description', type: 'string', required: false, description: 'Updated description' },
          { name: 'category', type: 'string', required: false, description: 'Updated category' },
          { name: 'triggers', type: 'array', required: false, description: 'Updated triggers' }
        ]
      },
      updateFunction
    );

    // Delete Function Action
    this.registerAction(
      {
        id: 'deleteFunction',
        name: 'Delete Cloud Function',
        description: 'Delete a cloud function and all its execution history',
        category: 'data',
        permissions: ['functions:write'],
        parameters: [
          { name: 'functionName', type: 'string', required: true, description: 'Name of function to delete' },
          { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag to prevent accidental deletion' }
        ]
      },
      deleteFunction
    );

    // Deploy Function Action
    this.registerAction(
      {
        id: 'deployFunction',
        name: 'Deploy Cloud Function',
        description: 'Deploy a cloud function to production environment',
        category: 'external',
        permissions: ['functions:write'],
        parameters: [
          { name: 'functionName', type: 'string', required: true, description: 'Name of function to deploy' },
          { name: 'environment', type: 'string', required: false, description: 'Target environment (staging, production)' }
        ]
      },
      deployFunction
    );

    // Clone Function Action
    this.registerAction(
      {
        id: 'cloneFunction',
        name: 'Clone Cloud Function',
        description: 'Create a copy of an existing cloud function with a new name',
        category: 'data',
        permissions: ['functions:write'],
        parameters: [
          { name: 'sourceFunctionName', type: 'string', required: true, description: 'Name of function to clone' },
          { name: 'newFunctionName', type: 'string', required: true, description: 'Name for the cloned function' },
          { name: 'newDescription', type: 'string', required: false, description: 'Description for the cloned function' }
        ]
      },
      cloneFunction
    );
  }
}

// Export the controller instance
export const cloudFunctionsPageController = new CloudFunctionsPageController();