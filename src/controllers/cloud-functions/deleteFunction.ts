import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

/**
 * Refactored deleteFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
export async function deleteFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
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

    // Verify function exists using utility
    const existingFunction = await getFunctionByName(functionName as string);
    if (!existingFunction) {
      return {
        success: false,
        error: `Function '${functionName}' not found`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteFunction',
          userId: context.user.userId
        }
      };
    }

    // Check if function is currently deployed
    if (existingFunction.status === 'deployed') {
      return {
        success: false,
        error: `Cannot delete deployed function '${functionName}'. Please undeploy first.`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deleteFunction',
          userId: context.user.userId
        }
      };
    }

    // Log the deletion before actually deleting
    await logFunctionDeletion(functionName as string, {
      userId: context.user.userId,
      functionData: existingFunction,
      timestamp: new Date()
    });

    // Delete function from database using utility
    await deleteFunctionFromDatabase(functionName as string);

    // Clean up related data (logs, etc.) using utilities
    await cleanupFunctionData(functionName as string);

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

/**
 * Refactored function lookup using ParseQueryBuilder
 */
async function getFunctionByName(functionName: string): Promise<any | null> {
  try {
    // Use ParseQueryBuilder for cleaner query construction
    const result = await createQuery('CloudFunction')
      .equalTo('name', functionName)
      .first();
    
    if (!result) {
      return null;
    }
    
    // Use utility function to map Parse object
    return mapParseObjectToCloudFunction(result);
  } catch (error) {
    console.error('Error fetching function by name:', error);
    return null;
  }
}

/**
 * Refactored database deletion using ParseQueryBuilder
 */
async function deleteFunctionFromDatabase(functionName: string): Promise<void> {
  try {
    // Use ParseQueryBuilder to find the function
    const cloudFunction = await createQuery('CloudFunction')
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
    throw new Error(`Failed to delete function from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refactored logging function using Parse utilities
 */
async function logFunctionDeletion(functionName: string, logData: {
  userId: string;
  functionData: any;
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionDeletionLog object in Parse database
    const DeletionLog = Parse.Object.extend('FunctionDeletionLog');
    const deletionLog = new DeletionLog();
    
    // Use utility function to set log data
    setDeletionLogData(deletionLog, functionName, logData);
    
    // Save to database
    await deletionLog.save();
    
    console.log(`Function deletion logged: ${functionName}`, {
      userId: logData.userId,
      functionId: logData.functionData.id
    });
  } catch (error) {
    console.error('Error logging function deletion:', error);
    // Don't throw error here to avoid breaking the main deletion flow
  }
}

/**
 * Refactored cleanup function using ParseQueryBuilder utilities
 */
async function cleanupFunctionData(functionName: string): Promise<void> {
  try {
    // Clean up execution logs using ParseQueryBuilder
    const executionLogs = await createQuery('FunctionExecutionLog')
      .equalTo('functionName', functionName)
      .find();
    
    // Mark logs as orphaned instead of deleting them
    const updatePromises = executionLogs.map(log => {
      log.set('functionDeleted', true);
      log.set('deletedAt', new Date());
      return log.save();
    });
    
    await Promise.all(updatePromises);
    
    // Clean up update logs using ParseQueryBuilder
    const updateLogs = await createQuery('FunctionUpdateLog')
      .equalTo('functionName', functionName)
      .find();
    
    const updateLogPromises = updateLogs.map(log => {
      log.set('functionDeleted', true);
      log.set('deletedAt', new Date());
      return log.save();
    });
    
    await Promise.all(updateLogPromises);
    
    console.log(`Cleaned up data for deleted function: ${functionName}`);
  } catch (error) {
    console.error('Error cleaning up function data:', error);
    // Don't throw error here to avoid breaking the main deletion flow
  }
}

/**
 * Utility function to set deletion log data on Parse object
 */
function setDeletionLogData(
  parseObj: Parse.Object, 
  functionName: string, 
  logData: any
): void {
  parseObj.set('functionName', functionName);
  parseObj.set('userId', logData.userId);
  parseObj.set('functionData', {
    id: logData.functionData.id,
    description: logData.functionData.description,
    category: logData.functionData.category,
    version: logData.functionData.version,
    createdBy: logData.functionData.createdBy,
    createdAt: logData.functionData.createdAt
  });
  parseObj.set('action', 'delete');
  parseObj.set('message', `Function '${functionName}' deleted by user ${logData.userId}`);
}

/**
 * Utility function to map Parse object to CloudFunction interface
 * (Shared utility - could be moved to parseUtils.ts)
 */
function mapParseObjectToCloudFunction(parseObj: Parse.Object): any {
  return {
    id: parseObj.id,
    name: parseObj.get('name'),
    description: parseObj.get('description'),
    code: parseObj.get('code'),
    language: parseObj.get('language'),
    runtime: parseObj.get('runtime'),
    category: parseObj.get('category'),
    triggers: parseObj.get('triggers') || [],
    tags: parseObj.get('tags') || [],
    status: parseObj.get('status'),
    createdAt: parseObj.get('createdAt'),
    updatedAt: parseObj.get('updatedAt'),
    createdBy: parseObj.get('createdBy'),
    updatedBy: parseObj.get('updatedBy'),
    executionCount: parseObj.get('executionCount') || 0,
    lastExecuted: parseObj.get('lastExecuted'),
    version: parseObj.get('version') || 1
  };
}