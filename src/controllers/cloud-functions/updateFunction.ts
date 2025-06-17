import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

/**
 * Refactored updateFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
export async function updateFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, code, description, category, triggers } = params;

    // Verify function exists using utility
    const existingFunction = await getFunctionByName(functionName as string);
    if (!existingFunction) {
      return {
        success: false,
        error: `Function '${functionName}' not found`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'updateFunction',
          userId: context.user.userId
        }
      };
    }

    // Validate new code if provided
    if (code) {
      const validation = await validateFunctionCode(code as string);
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

    const updatedFunction = await updateFunctionInDatabase(functionName as string, updateData);

    // Log the update action
    await logFunctionUpdate(functionName as string, {
      userId: context.user.userId,
      changes: Object.keys(updateData).filter(key => !['updatedBy', 'updatedAt'].includes(key)),
      timestamp: new Date()
    });

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
 * Function code validation utility
 */
async function validateFunctionCode(code: string): Promise<{ isValid: boolean; errors: string[] }> {
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

  // Advanced validation checks
  if (code.includes('process.exit')) {
    errors.push('Use of process.exit() is not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Refactored database update using ParseQueryBuilder
 */
async function updateFunctionInDatabase(functionName: string, updateData: any): Promise<any> {
  try {
    // Use ParseQueryBuilder to find the function
    const cloudFunction = await createQuery('CloudFunction')
      .equalTo('name', functionName)
      .first();
    
    if (!cloudFunction) {
      throw new Error(`Function ${functionName} not found`);
    }
    
    // Use utility function to update function data
    updateCloudFunctionData(cloudFunction, updateData);
    
    // Increment version
    const currentVersion = cloudFunction.get('version') || 1;
    cloudFunction.set('version', currentVersion + 1);
    
    // Save to database
    const savedFunction = await cloudFunction.save();
    
    // Use utility function to map result
    return mapParseObjectToCloudFunction(savedFunction);
  } catch (error) {
    console.error('Error updating function in database:', error);
    throw new Error(`Failed to update function in database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refactored logging function using Parse utilities
 */
async function logFunctionUpdate(functionName: string, logData: {
  userId: string;
  changes: string[];
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionUpdateLog object in Parse database
    const UpdateLog = Parse.Object.extend('FunctionUpdateLog');
    const updateLog = new UpdateLog();
    
    // Use utility function to set log data
    setUpdateLogData(updateLog, functionName, logData);
    
    // Save to database
    await updateLog.save();
    
    console.log(`Function update logged: ${functionName}`, {
      changes: logData.changes,
      userId: logData.userId
    });
  } catch (error) {
    console.error('Error logging function update:', error);
    // Don't throw error here to avoid breaking the main update flow
  }
}

/**
 * Utility function to update cloud function data on Parse object
 */
function updateCloudFunctionData(parseObj: Parse.Object, updateData: any): void {
  if (updateData.code) parseObj.set('code', updateData.code);
  if (updateData.description) parseObj.set('description', updateData.description);
  if (updateData.category) parseObj.set('category', updateData.category);
  if (updateData.triggers) parseObj.set('triggers', updateData.triggers);
  if (updateData.tags) parseObj.set('tags', updateData.tags);
  if (updateData.status) parseObj.set('status', updateData.status);
  if (updateData.updatedBy) parseObj.set('updatedBy', updateData.updatedBy);
}

/**
 * Utility function to set update log data on Parse object
 */
function setUpdateLogData(
  parseObj: Parse.Object,
  functionName: string,
  logData: any
): void {
  parseObj.set('functionName', functionName);
  parseObj.set('userId', logData.userId);
  parseObj.set('changes', logData.changes);
  parseObj.set('action', 'update');
  parseObj.set('message', `Function '${functionName}' updated: ${logData.changes.join(', ')}`);
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