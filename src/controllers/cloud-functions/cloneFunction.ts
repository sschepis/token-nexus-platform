import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

export async function cloneFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { sourceFunctionName, newFunctionName, newDescription } = params;

    // Verify source function exists
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

    // Check if new function name already exists
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

function isValidFunctionName(name: string): boolean {
  // Function name validation: letters, numbers, underscores only
  const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return nameRegex.test(name) && name.length >= 3 && name.length <= 50;
}

async function createClonedFunctionInDatabase(functionData: any): Promise<any> {
  try {
    // Create new CloudFunction object in Parse database
    const CloudFunction = Parse.Object.extend('CloudFunction');
    const cloudFunction = new CloudFunction();
    
    // Set all the function data
    cloudFunction.set('name', functionData.name);
    cloudFunction.set('description', functionData.description);
    cloudFunction.set('code', functionData.code);
    cloudFunction.set('language', functionData.language || 'javascript');
    cloudFunction.set('runtime', functionData.runtime || 'node18');
    cloudFunction.set('category', functionData.category);
    cloudFunction.set('triggers', functionData.triggers || []);
    cloudFunction.set('tags', functionData.tags || []);
    cloudFunction.set('status', 'draft');
    cloudFunction.set('createdBy', functionData.createdBy);
    cloudFunction.set('version', 1);
    cloudFunction.set('executionCount', 0);
    cloudFunction.set('clonedFrom', functionData.clonedFrom);
    
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
      executionCount: savedFunction.get('executionCount'),
      clonedFrom: savedFunction.get('clonedFrom')
    };
  } catch (error) {
    console.error('Error creating cloned function in database:', error);
    throw error;
  }
}

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
    
    cloningLog.set('sourceFunctionName', sourceFunctionName);
    cloningLog.set('sourceFunctionId', logData.sourceFunction.id);
    cloningLog.set('newFunctionName', newFunctionName);
    cloningLog.set('newFunctionId', logData.clonedFunction.id);
    cloningLog.set('userId', logData.userId);
    cloningLog.set('action', 'clone');
    cloningLog.set('message', `Function '${sourceFunctionName}' cloned as '${newFunctionName}' by user ${logData.userId}`);
    cloningLog.set('sourceMetadata', {
      category: logData.sourceFunction.category,
      version: logData.sourceFunction.version,
      createdBy: logData.sourceFunction.createdBy
    });
    
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