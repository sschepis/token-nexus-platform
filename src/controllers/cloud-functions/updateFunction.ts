import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

export async function updateFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, code, description, category, triggers } = params;

    // Verify function exists
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

async function updateFunctionInDatabase(functionName: string, updateData: any): Promise<any> {
  try {
    // Find the function by name
    const query = new Parse.Query('CloudFunction');
    query.equalTo('name', functionName);
    
    const cloudFunction = await query.first();
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

async function logFunctionUpdate(functionName: string, logData: {
  userId: string;
  changes: string[];
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionUpdateLog object in Parse database
    const UpdateLog = Parse.Object.extend('FunctionUpdateLog');
    const updateLog = new UpdateLog();
    
    updateLog.set('functionName', functionName);
    updateLog.set('userId', logData.userId);
    updateLog.set('changes', logData.changes);
    updateLog.set('action', 'update');
    updateLog.set('message', `Function '${functionName}' updated: ${logData.changes.join(', ')}`);
    
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