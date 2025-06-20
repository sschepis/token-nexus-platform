import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';
import Parse from 'parse';
import { ParseQueryBuilder, safeParseCloudRun } from '../utils/parseUtils';

export class CloudFunctionsPageController implements PageController {
  pageId = 'cloud-functions';
  pageName = 'Cloud Functions';
  description = 'Manage and execute cloud functions with real-time monitoring';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'cloud-functions',
    pageName: 'Cloud Functions',
    state: {},
    props: {},
    metadata: {
      category: 'development',
      tags: ['functions', 'serverless', 'cloud', 'execution'],
      permissions: ['functions:read', 'functions:write', 'functions:execute']
    }
  };
  metadata = {
    category: 'development',
    tags: ['functions', 'serverless', 'cloud', 'execution'],
    permissions: ['functions:read', 'functions:write', 'functions:execute'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Functions
    this.actions.set('fetchFunctions', {
      id: 'fetchFunctions',
      name: 'Fetch Cloud Functions',
      description: 'Get all cloud functions with metadata, execution stats, and deployment status',
      category: 'data',
      permissions: ['functions:read'],
      parameters: [
        { name: 'includeStats', type: 'boolean', required: false, description: 'Include execution statistics' },
        { name: 'status', type: 'string', required: false, description: 'Filter by deployment status (deployed, draft, error)' },
        { name: 'category', type: 'string', required: false, description: 'Filter by function category' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { includeStats = true, status, category } = params;

          // Get functions from Parse Cloud Code directory or database
          const functions = await this.getFunctionsFromSystem();
          
          let filteredFunctions = functions;
          if (status) {
            filteredFunctions = functions.filter(f => f.status === status);
          }
          if (category) {
            filteredFunctions = filteredFunctions.filter(f => f.category === category);
          }

          // Add execution stats if requested
          if (includeStats) {
            for (const func of filteredFunctions) {
              func.stats = await this.getFunctionStats(func.name);
            }
          }

          return {
            success: true,
            data: { 
              functions: filteredFunctions,
              totalCount: filteredFunctions.length,
              categories: Array.from(new Set(functions.map(f => f.category))),
              statuses: Array.from(new Set(functions.map(f => f.status)))
            },
            message: `Retrieved ${filteredFunctions.length} cloud functions`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchFunctions',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch cloud functions',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'fetchFunctions',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Create Function
    this.actions.set('createFunction', {
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
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { name, code, description, category = 'custom', triggers = [], validateOnly = false } = params;

          // Validate function code
          const validation = await this.validateFunctionCode(code as string);
          if (!validation.isValid) {
            return {
              success: false,
              error: `Function validation failed: ${validation.errors.join(', ')}`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createFunction',
                userId: context.user.userId
              }
            };
          }

          if (validateOnly) {
            return {
              success: true,
              data: { validation },
              message: 'Function code validation passed',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'createFunction',
                userId: context.user.userId
              }
            };
          }

          // Create function in Parse Cloud Code
          const functionData = {
            name: name as string,
            code: code as string,
            description: description as string,
            category: category as string,
            triggers: triggers as string[],
            createdBy: context.user.userId,
            createdAt: new Date(),
            status: 'draft'
          };

          const createdFunction = await this.createFunctionInSystem(functionData);

          return {
            success: true,
            data: { function: createdFunction },
            message: `Cloud function '${name}' created successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create cloud function',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'createFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Execute Function
    this.actions.set('executeFunction', {
      id: 'executeFunction',
      name: 'Execute Cloud Function',
      description: 'Execute a cloud function with parameters and get results',
      category: 'external',
      permissions: ['functions:execute'],
      parameters: [
        { name: 'functionName', type: 'string', required: true, description: 'Name of function to execute' },
        { name: 'parameters', type: 'object', required: false, description: 'Function parameters as JSON object' },
        { name: 'timeout', type: 'number', required: false, description: 'Execution timeout in seconds (default: 30)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { functionName, parameters = {}, timeout = 30 } = params;

          // Execute the cloud function
          const startTime = Date.now();
          const result = await safeParseCloudRun(functionName as string, parameters as Record<string, unknown>);
          const executionTime = Date.now() - startTime;

          // Log execution for monitoring
          await this.logFunctionExecution(functionName as string, {
            userId: context.user.userId,
            parameters,
            executionTime,
            success: true,
            result
          });

          return {
            success: true,
            data: { 
              result,
              executionTime,
              functionName
            },
            message: `Function '${functionName}' executed successfully in ${executionTime}ms`,
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'executeFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          const executionTime = Date.now();
          
          // Log failed execution
          await this.logFunctionExecution(params.functionName as string, {
            userId: context.user.userId,
            parameters: params.parameters,
            executionTime,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Function execution failed',
            metadata: {
              executionTime,
              timestamp: new Date(),
              actionId: 'executeFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Function Logs
    this.actions.set('getFunctionLogs', {
      id: 'getFunctionLogs',
      name: 'Get Function Logs',
      description: 'Get execution logs and metrics for a cloud function',
      category: 'data',
      permissions: ['functions:read'],
      parameters: [
        { name: 'functionName', type: 'string', required: true, description: 'Name of function to get logs for' },
        { name: 'limit', type: 'number', required: false, description: 'Number of log entries to return (default: 50)' },
        { name: 'timeRange', type: 'string', required: false, description: 'Time range for logs (24h, 7d, 30d)' },
        { name: 'level', type: 'string', required: false, description: 'Log level filter (info, warn, error)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { functionName, limit = 50, timeRange = '24h', level } = params;

          const logs = await this.getFunctionExecutionLogs(
            functionName as string,
            limit as number,
            timeRange as string,
            level as string
          );

          const stats = await this.getFunctionStats(functionName as string);

          return {
            success: true,
            data: { 
              logs,
              stats,
              functionName,
              timeRange
            },
            message: `Retrieved ${logs.length} log entries for function '${functionName}'`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getFunctionLogs',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get function logs',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getFunctionLogs',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Update Function
    this.actions.set('updateFunction', {
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
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { functionName, code, description, category, triggers } = params;

          // Validate new code if provided
          if (code) {
            const validation = await this.validateFunctionCode(code as string);
            if (!validation.isValid) {
              return {
                success: false,
                error: `Function validation failed: ${validation.errors.join(', ')}`,
                metadata: {
                  executionTime: 0,
                  timestamp: new Date(),
                  actionId: 'updateFunction',
                  userId: context.user.userId
                }
              };
            }
          }

          const updateData: any = {
            updatedBy: context.user.userId,
            updatedAt: new Date()
          };

          if (code) updateData.code = code;
          if (description) updateData.description = description;
          if (category) updateData.category = category;
          if (triggers) updateData.triggers = triggers;

          const updatedFunction = await this.updateFunctionInSystem(functionName as string, updateData);

          return {
            success: true,
            data: { function: updatedFunction },
            message: `Function '${functionName}' updated successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update function',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Function
    this.actions.set('deleteFunction', {
      id: 'deleteFunction',
      name: 'Delete Cloud Function',
      description: 'Delete a cloud function and all its execution history',
      category: 'data',
      permissions: ['functions:write'],
      parameters: [
        { name: 'functionName', type: 'string', required: true, description: 'Name of function to delete' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag to prevent accidental deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { functionName, confirmDelete } = params;

          if (!confirmDelete) {
            return {
              success: false,
              error: 'Delete confirmation required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteFunction',
                userId: context.user.userId
              }
            };
          }

          await this.deleteFunctionFromSystem(functionName as string);

          return {
            success: true,
            data: { functionName },
            message: `Function '${functionName}' deleted successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete function',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Deploy Function
    this.actions.set('deployFunction', {
      id: 'deployFunction',
      name: 'Deploy Cloud Function',
      description: 'Deploy a cloud function to production environment',
      category: 'external',
      permissions: ['functions:write'],
      parameters: [
        { name: 'functionName', type: 'string', required: true, description: 'Name of function to deploy' },
        { name: 'environment', type: 'string', required: false, description: 'Target environment (staging, production)' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { functionName, environment = 'production' } = params;

          const deploymentResult = await this.deployFunctionToEnvironment(
            functionName as string,
            environment as string
          );

          return {
            success: true,
            data: { 
              functionName,
              environment,
              deploymentId: deploymentResult.deploymentId,
              status: deploymentResult.status
            },
            message: `Function '${functionName}' deployed to ${environment} successfully`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deployFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to deploy function',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deployFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Clone Function
    this.actions.set('cloneFunction', {
      id: 'cloneFunction',
      name: 'Clone Cloud Function',
      description: 'Create a copy of an existing cloud function with a new name',
      category: 'data',
      permissions: ['functions:write'],
      parameters: [
        { name: 'sourceFunctionName', type: 'string', required: true, description: 'Name of function to clone' },
        { name: 'newFunctionName', type: 'string', required: true, description: 'Name for the cloned function' },
        { name: 'newDescription', type: 'string', required: false, description: 'Description for the cloned function' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { sourceFunctionName, newFunctionName, newDescription } = params;

          // Get the source function
          const sourceFunction = await this.getFunctionByName(sourceFunctionName as string);
          if (!sourceFunction) {
            return {
              success: false,
              error: `Source function '${sourceFunctionName}' not found`,
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'cloneFunction',
                userId: context.user.userId
              }
            };
          }

          // Create the cloned function data
          const clonedFunctionData = {
            name: newFunctionName as string,
            description: (newDescription as string) || `Clone of ${sourceFunction.description}`,
            code: sourceFunction.code,
            language: sourceFunction.language,
            runtime: sourceFunction.runtime,
            category: sourceFunction.category,
            triggers: sourceFunction.triggers || [],
            tags: [...(sourceFunction.tags || []), 'cloned'],
            createdBy: context.user.userId,
            createdAt: new Date(),
            status: 'draft'
          };

          const clonedFunction = await this.createFunctionInSystem(clonedFunctionData);

          return {
            success: true,
            data: { function: clonedFunction },
            message: `Function '${sourceFunctionName}' cloned successfully as '${newFunctionName}'`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'cloneFunction',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to clone function',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'cloneFunction',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }

  // Helper methods
  private async getFunctionsFromSystem(): Promise<any[]> {
    try {
      // Query CloudFunction objects from Parse database
      const results = await new ParseQueryBuilder('CloudFunction')
        .ascending('name')
        .find();
      
      return results.map(func => ({
        id: func.id,
        name: func.get('name'),
        description: func.get('description'),
        code: func.get('code'),
        language: func.get('language'),
        runtime: func.get('runtime'),
        status: func.get('status'),
        category: func.get('category'),
        triggers: func.get('triggers') || [],
        tags: func.get('tags') || [],
        createdAt: func.get('createdAt'),
        updatedAt: func.get('updatedAt'),
        createdBy: func.get('createdBy'),
        updatedBy: func.get('updatedBy'),
        executionCount: func.get('executionCount') || 0,
        lastExecuted: func.get('lastExecuted'),
        version: func.get('version') || 1
      }));
    } catch (error) {
      console.error('Error fetching functions from database:', error);
      // Return empty array on error
      return [];
    }
  }

  private async getFunctionStats(functionName: string): Promise<any> {
    // Mock implementation - would integrate with monitoring system
    return {
      totalExecutions: Math.floor(Math.random() * 5000),
      successRate: 98.5,
      averageExecutionTime: Math.floor(Math.random() * 500) + 50,
      lastExecution: new Date(Date.now() - Math.random() * 86400000),
      errorCount: Math.floor(Math.random() * 50),
      peakExecutionsPerHour: Math.floor(Math.random() * 200) + 50
    };
  }

  private async validateFunctionCode(code: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Basic validation
    if (!code.trim()) {
      errors.push('Function code cannot be empty');
    }
    
    if (code.includes('eval(')) {
      errors.push('Use of eval() is not allowed for security reasons');
    }
    
    if (code.includes('require(') && !code.includes('// @allow-require')) {
      errors.push('Use of require() requires explicit permission comment');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async createFunctionInSystem(functionData: any): Promise<any> {
    try {
      // Create new CloudFunction object in Parse database
      const CloudFunction = Parse.Object.extend('CloudFunction');
      const cloudFunction = new CloudFunction();
      
      // Set all the function data
      cloudFunction.set('name', functionData.name);
      cloudFunction.set('description', functionData.description);
      cloudFunction.set('code', functionData.code);
      cloudFunction.set('language', functionData.language);
      cloudFunction.set('runtime', functionData.runtime);
      cloudFunction.set('category', functionData.category);
      cloudFunction.set('triggers', functionData.triggers || []);
      cloudFunction.set('tags', functionData.tags || []);
      cloudFunction.set('status', 'draft');
      cloudFunction.set('createdBy', functionData.createdBy);
      cloudFunction.set('version', 1);
      cloudFunction.set('executionCount', 0);
      
      // Save to database
      const savedFunction = await cloudFunction.save();
      
      return {
        id: savedFunction.id,
        name: savedFunction.get('name'),
        description: savedFunction.get('description'),
        code: savedFunction.get('code'),
        language: savedFunction.get('language'),
        runtime: savedFunction.get('runtime'),
        category: savedFunction.get('category'),
        triggers: savedFunction.get('triggers'),
        tags: savedFunction.get('tags'),
        status: savedFunction.get('status'),
        createdAt: savedFunction.get('createdAt'),
        updatedAt: savedFunction.get('updatedAt'),
        createdBy: savedFunction.get('createdBy'),
        version: savedFunction.get('version'),
        executionCount: savedFunction.get('executionCount')
      };
    } catch (error) {
      console.error('Error creating function in database:', error);
      throw error;
    }
  }

  private async updateFunctionInSystem(functionName: string, updateData: any): Promise<any> {
    try {
      // Find the function by name
      const cloudFunction = await new ParseQueryBuilder('CloudFunction')
        .equalTo('name', functionName)
        .first();
      if (!cloudFunction) {
        throw new Error(`Function ${functionName} not found`);
      }
      
      // Update the function data
      if (updateData.code) cloudFunction.set('code', updateData.code);
      if (updateData.description) cloudFunction.set('description', updateData.description);
      if (updateData.category) cloudFunction.set('category', updateData.category);
      if (updateData.triggers) cloudFunction.set('triggers', updateData.triggers);
      if (updateData.tags) cloudFunction.set('tags', updateData.tags);
      if (updateData.status) cloudFunction.set('status', updateData.status);
      if (updateData.updatedBy) cloudFunction.set('updatedBy', updateData.updatedBy);
      
      // Increment version
      const currentVersion = cloudFunction.get('version') || 1;
      cloudFunction.set('version', currentVersion + 1);
      
      // Save to database
      const savedFunction = await cloudFunction.save();
      
      return {
        id: savedFunction.id,
        name: savedFunction.get('name'),
        description: savedFunction.get('description'),
        code: savedFunction.get('code'),
        language: savedFunction.get('language'),
        runtime: savedFunction.get('runtime'),
        category: savedFunction.get('category'),
        triggers: savedFunction.get('triggers'),
        tags: savedFunction.get('tags'),
        status: savedFunction.get('status'),
        createdAt: savedFunction.get('createdAt'),
        updatedAt: savedFunction.get('updatedAt'),
        updatedBy: savedFunction.get('updatedBy'),
        version: savedFunction.get('version')
      };
    } catch (error) {
      console.error('Error updating function in database:', error);
      throw error;
    }
  }

  private async deleteFunctionFromSystem(functionName: string): Promise<void> {
    try {
      // Find the function by name
      const cloudFunction = await new ParseQueryBuilder('CloudFunction')
        .equalTo('name', functionName)
        .first();
      if (!cloudFunction) {
        throw new Error(`Function ${functionName} not found`);
      }
      
      // Delete from database
      await cloudFunction.destroy();
      
      console.log(`Successfully deleted function: ${functionName}`);
    } catch (error) {
      console.error('Error deleting function from database:', error);
      throw error;
    }
  }

  private async getFunctionByName(functionName: string): Promise<any | null> {
    try {
      const cloudFunction = await new ParseQueryBuilder('CloudFunction')
        .equalTo('name', functionName)
        .first();
      if (!cloudFunction) {
        return null;
      }
      
      return {
        id: cloudFunction.id,
        name: cloudFunction.get('name'),
        description: cloudFunction.get('description'),
        code: cloudFunction.get('code'),
        language: cloudFunction.get('language'),
        runtime: cloudFunction.get('runtime'),
        category: cloudFunction.get('category'),
        triggers: cloudFunction.get('triggers') || [],
        tags: cloudFunction.get('tags') || [],
        status: cloudFunction.get('status'),
        createdAt: cloudFunction.get('createdAt'),
        updatedAt: cloudFunction.get('updatedAt'),
        createdBy: cloudFunction.get('createdBy'),
        version: cloudFunction.get('version') || 1
      };
    } catch (error) {
      console.error('Error fetching function by name:', error);
      return null;
    }
  }

  private async deployFunctionToEnvironment(functionName: string, environment: string): Promise<any> {
    // Mock implementation - would deploy to actual environment
    return {
      deploymentId: `deploy_${Date.now()}`,
      status: 'deployed',
      environment
    };
  }

  private async logFunctionExecution(functionName: string, logData: any): Promise<void> {
    // Mock implementation - would log to monitoring system
    console.log(`Function execution logged: ${functionName}`, logData);
  }

  private async getFunctionExecutionLogs(functionName: string, limit: number, timeRange: string, level?: string): Promise<any[]> {
    // Mock implementation - would get actual logs
    return [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        level: 'info',
        message: `Function ${functionName} executed successfully`,
        executionTime: 120,
        userId: 'user123'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        level: 'warn',
        message: `Function ${functionName} execution took longer than expected`,
        executionTime: 850,
        userId: 'user456'
      }
    ].slice(0, limit);
  }
}

// Export the controller instance
export const cloudFunctionsPageController = new CloudFunctionsPageController();