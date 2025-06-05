import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

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

    // Verify function exists
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

    // Delete function from database
    await deleteFunctionFromDatabase(functionName as string);

    // Clean up related data (logs, etc.)
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

async function getFunctionByName(functionName: string): Promise<any | null> {
  try {
    const query = new Parse.Query('CloudFunction');
    query.equalTo('name', functionName);
    
    const cloudFunction = await query.first();
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

async function deleteFunctionFromDatabase(functionName: string): Promise<void> {
  try {
    // Find the function by name
    const query = new Parse.Query('CloudFunction');
    query.equalTo('name', functionName);
    
    const cloudFunction = await query.first();
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

async function logFunctionDeletion(functionName: string, logData: {
  userId: string;
  functionData: any;
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionDeletionLog object in Parse database
    const DeletionLog = Parse.Object.extend('FunctionDeletionLog');
    const deletionLog = new DeletionLog();
    
    deletionLog.set('functionName', functionName);
    deletionLog.set('userId', logData.userId);
    deletionLog.set('functionData', {
      id: logData.functionData.id,
      description: logData.functionData.description,
      category: logData.functionData.category,
      version: logData.functionData.version,
      createdBy: logData.functionData.createdBy,
      createdAt: logData.functionData.createdAt
    });
    deletionLog.set('action', 'delete');
    deletionLog.set('message', `Function '${functionName}' deleted by user ${logData.userId}`);
    
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

async function cleanupFunctionData(functionName: string): Promise<void> {
  try {
    // Clean up execution logs (optional - you might want to keep them for audit)
    // For now, we'll keep the logs but mark them as orphaned
    const executionLogQuery = new Parse.Query('FunctionExecutionLog');
    executionLogQuery.equalTo('functionName', functionName);
    
    const executionLogs = await executionLogQuery.find();
    
    // Mark logs as orphaned instead of deleting them
    const updatePromises = executionLogs.map(log => {
      log.set('functionDeleted', true);
      log.set('deletedAt', new Date());
      return log.save();
    });
    
    await Promise.all(updatePromises);
    
    // Clean up update logs
    const updateLogQuery = new Parse.Query('FunctionUpdateLog');
    updateLogQuery.equalTo('functionName', functionName);
    
    const updateLogs = await updateLogQuery.find();
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