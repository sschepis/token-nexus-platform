import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

/**
 * Refactored cloneFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
export async function cloneFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { sourceFunctionName, newFunctionName, newDescription } = params;

    // Verify source function exists using utility
    const sourceFunction = await getFunctionByName(sourceFunctionName as string);
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

    // Check if new function name already exists using utility
    const existingFunction = await getFunctionByName(newFunctionName as string);
    if (existingFunction) {
      return {
        success: false,
        error: `Function with name '${newFunctionName}' already exists`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'cloneFunction',
          userId: context.user.userId
        }
      };
    }

    // Validate new function name
    if (!isValidFunctionName(newFunctionName as string)) {
      return {
        success: false,
        error: 'Invalid function name. Must contain only letters, numbers, and underscores.',
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
      status: 'draft',
      clonedFrom: sourceFunction.id
    };

    const clonedFunction = await createClonedFunctionInDatabase(clonedFunctionData);

    // Log the cloning action
    await logFunctionCloning(sourceFunctionName as string, newFunctionName as string, {
      userId: context.user.userId,
      sourceFunction: sourceFunction,
      clonedFunction: clonedFunction,
      timestamp: new Date()
    });

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
 * Function name validation utility
 */
function isValidFunctionName(name: string): boolean {
  // Function name validation: letters, numbers, underscores only
  const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return nameRegex.test(name) && name.length >= 3 && name.length <= 50;
}

/**
 * Refactored database creation with better error handling
 */
async function createClonedFunctionInDatabase(functionData: any): Promise<any> {
  try {
    // Create new CloudFunction object in Parse database
    const CloudFunction = Parse.Object.extend('CloudFunction');
    const cloudFunction = new CloudFunction();
    
    // Use utility function to set function data
    setCloudFunctionData(cloudFunction, functionData);
    
    // Save to database
    const savedFunction = await cloudFunction.save();
    
    // Use utility function to map result
    return mapParseObjectToCloudFunction(savedFunction);
  } catch (error) {
    console.error('Error creating cloned function in database:', error);
    throw new Error(`Failed to create cloned function in database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility function to set cloud function data on Parse object
 */
function setCloudFunctionData(parseObj: Parse.Object, functionData: any): void {
  parseObj.set('name', functionData.name);
  parseObj.set('description', functionData.description);
  parseObj.set('code', functionData.code);
  parseObj.set('language', functionData.language || 'javascript');
  parseObj.set('runtime', functionData.runtime || 'node18');
  parseObj.set('category', functionData.category);
  parseObj.set('triggers', functionData.triggers || []);
  parseObj.set('tags', functionData.tags || []);
  parseObj.set('status', 'draft');
  parseObj.set('createdBy', functionData.createdBy);
  parseObj.set('version', 1);
  parseObj.set('executionCount', 0);
  
  // Clone-specific field
  if (functionData.clonedFrom) {
    parseObj.set('clonedFrom', functionData.clonedFrom);
  }
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
    version: parseObj.get('version') || 1,
    clonedFrom: parseObj.get('clonedFrom')
  };
}

/**
 * Refactored logging function using Parse utilities
 */
async function logFunctionCloning(sourceFunctionName: string, newFunctionName: string, logData: {
  userId: string;
  sourceFunction: any;
  clonedFunction: any;
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionCloningLog object in Parse database
    const CloningLog = Parse.Object.extend('FunctionCloningLog');
    const cloningLog = new CloningLog();
    
    // Use utility function to set log data
    setCloningLogData(cloningLog, sourceFunctionName, newFunctionName, logData);
    
    // Save to database
    await cloningLog.save();
    
    console.log(`Function cloning logged: ${sourceFunctionName} -> ${newFunctionName}`, {
      userId: logData.userId,
      sourceId: logData.sourceFunction.id,
      clonedId: logData.clonedFunction.id
    });
  } catch (error) {
    console.error('Error logging function cloning:', error);
    // Don't throw error here to avoid breaking the main cloning flow
  }
}

/**
 * Utility function to set cloning log data on Parse object
 */
function setCloningLogData(
  parseObj: Parse.Object, 
  sourceFunctionName: string, 
  newFunctionName: string, 
  logData: any
): void {
  parseObj.set('sourceFunctionName', sourceFunctionName);
  parseObj.set('sourceFunctionId', logData.sourceFunction.id);
  parseObj.set('newFunctionName', newFunctionName);
  parseObj.set('newFunctionId', logData.clonedFunction.id);
  parseObj.set('userId', logData.userId);
  parseObj.set('action', 'clone');
  parseObj.set('message', `Function '${sourceFunctionName}' cloned as '${newFunctionName}' by user ${logData.userId}`);
  parseObj.set('sourceMetadata', {
    category: logData.sourceFunction.category,
    version: logData.sourceFunction.version,
    createdBy: logData.sourceFunction.createdBy
  });
}