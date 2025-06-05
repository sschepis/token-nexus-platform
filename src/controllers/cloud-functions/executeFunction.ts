import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

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

export async function executeFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, parameters = {}, timeout = 30 } = params;

    // Verify function exists
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

    // Update function execution count
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

async function verifyFunctionExists(functionName: string): Promise<boolean> {
  try {
    const query = new Parse.Query('CloudFunction');
    query.equalTo('name', functionName);
    query.equalTo('status', 'deployed'); // Only allow execution of deployed functions
    
    const cloudFunction = await query.first();
    return !!cloudFunction;
  } catch (error) {
    console.error('Error verifying function exists:', error);
    return false;
  }
}

async function logFunctionExecution(functionName: string, logData: ExecutionLog): Promise<void> {
  try {
    // Create FunctionExecutionLog object in Parse database
    const ExecutionLog = Parse.Object.extend('FunctionExecutionLog');
    const executionLog = new ExecutionLog();
    
    executionLog.set('functionName', functionName);
    executionLog.set('userId', logData.userId);
    executionLog.set('parameters', logData.parameters);
    executionLog.set('executionTime', logData.executionTime);
    executionLog.set('success', logData.success);
    executionLog.set('level', logData.success ? 'info' : 'error');
    
    if (logData.result !== undefined) {
      executionLog.set('result', logData.result);
    }
    
    if (logData.error) {
      executionLog.set('error', logData.error);
      executionLog.set('message', `Function execution failed: ${logData.error}`);
    } else {
      executionLog.set('message', `Function executed successfully in ${logData.executionTime}ms`);
    }
    
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

async function updateFunctionExecutionCount(functionName: string): Promise<void> {
  try {
    const query = new Parse.Query('CloudFunction');
    query.equalTo('name', functionName);
    
    const cloudFunction = await query.first();
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