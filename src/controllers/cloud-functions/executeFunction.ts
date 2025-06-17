import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

export interface ExecutionLog {
  functionName: string;
  userId: string;
  parameters: Record<string, unknown>;
  executionTime: number;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Refactored executeFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
export async function executeFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, parameters = {}, timeout = 30 } = params;

    // Verify function exists using utility
    const functionExists = await verifyFunctionExists(functionName as string);
    if (!functionExists) {
      return {
        success: false,
        error: `Function '${functionName}' not found`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'executeFunction',
          userId: context.user.userId
        }
      };
    }

    // Execute the cloud function
    const startTime = Date.now();
    let result: any;
    let executionError: Error | null = null;

    try {
      // Set timeout for function execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Function execution timed out after ${timeout} seconds`)), (timeout as number) * 1000);
      });

      const executionPromise = Parse.Cloud.run(functionName as string, parameters as Record<string, unknown>);
      
      result = await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      executionError = error instanceof Error ? error : new Error('Unknown execution error');
    }

    const executionTime = Date.now() - startTime;

    // Log execution for monitoring
    await logFunctionExecution(functionName as string, {
      functionName: functionName as string,
      userId: context.user.userId,
      parameters: parameters as Record<string, unknown>,
      executionTime,
      success: !executionError,
      result: executionError ? undefined : result,
      error: executionError?.message,
      timestamp: new Date()
    });

    // Update function execution count using utility
    await updateFunctionExecutionCount(functionName as string);

    if (executionError) {
      return {
        success: false,
        error: executionError.message,
        metadata: {
          executionTime,
          timestamp: new Date(),
          actionId: 'executeFunction',
          userId: context.user.userId
        }
      };
    }

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
    await logFunctionExecution(params.functionName as string, {
      functionName: params.functionName as string,
      userId: context.user.userId,
      parameters: params.parameters as Record<string, unknown> || {},
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
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

/**
 * Refactored function verification using ParseQueryBuilder
 */
async function verifyFunctionExists(functionName: string): Promise<boolean> {
  try {
    // Use ParseQueryBuilder for cleaner query construction
    const cloudFunction = await createQuery('CloudFunction')
      .equalTo('name', functionName)
      .withStatus('deployed') // Only allow execution of deployed functions
      .first();
    
    return !!cloudFunction;
  } catch (error) {
    console.error('Error verifying function exists:', error);
    return false;
  }
}

/**
 * Refactored logging function using Parse utilities
 */
async function logFunctionExecution(functionName: string, logData: ExecutionLog): Promise<void> {
  try {
    // Create FunctionExecutionLog object in Parse database
    const ExecutionLog = Parse.Object.extend('FunctionExecutionLog');
    const executionLog = new ExecutionLog();
    
    // Use utility function to set log data
    setExecutionLogData(executionLog, functionName, logData);
    
    // Save to database
    await executionLog.save();
    
    console.log(`Function execution logged: ${functionName}`, {
      success: logData.success,
      executionTime: logData.executionTime,
      userId: logData.userId
    });
  } catch (error) {
    console.error('Error logging function execution:', error);
    // Don't throw error here to avoid breaking the main execution flow
  }
}

/**
 * Refactored execution count update using ParseQueryBuilder
 */
async function updateFunctionExecutionCount(functionName: string): Promise<void> {
  try {
    // Use ParseQueryBuilder to find the function
    const cloudFunction = await createQuery('CloudFunction')
      .equalTo('name', functionName)
      .first();
    
    if (cloudFunction) {
      const currentCount = cloudFunction.get('executionCount') || 0;
      cloudFunction.set('executionCount', currentCount + 1);
      cloudFunction.set('lastExecuted', new Date());
      
      await cloudFunction.save();
    }
  } catch (error) {
    console.error('Error updating function execution count:', error);
    // Don't throw error here to avoid breaking the main execution flow
  }
}

/**
 * Utility function to set execution log data on Parse object
 */
function setExecutionLogData(
  parseObj: Parse.Object,
  functionName: string,
  logData: ExecutionLog
): void {
  parseObj.set('functionName', functionName);
  parseObj.set('userId', logData.userId);
  parseObj.set('parameters', logData.parameters);
  parseObj.set('executionTime', logData.executionTime);
  parseObj.set('success', logData.success);
  parseObj.set('level', logData.success ? 'info' : 'error');
  
  if (logData.result !== undefined) {
    parseObj.set('result', logData.result);
  }
  
  if (logData.error) {
    parseObj.set('error', logData.error);
    parseObj.set('message', `Function execution failed: ${logData.error}`);
  } else {
    parseObj.set('message', `Function executed successfully in ${logData.executionTime}ms`);
  }
}