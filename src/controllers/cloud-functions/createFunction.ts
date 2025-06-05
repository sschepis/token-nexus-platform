import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

export interface FunctionValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export async function createFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { name, code, description, category = 'custom', triggers = [], validateOnly = false } = params;

    // Validate function code
    const validation = await validateFunctionCode(code as string);
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

    // Check if function name already exists
    const existingFunction = await getFunctionByName(name as string);
    if (existingFunction) {
      return {
        success: false,
        error: `Function with name '${name}' already exists`,
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

    const createdFunction = await createFunctionInDatabase(functionData);

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

async function validateFunctionCode(code: string): Promise<FunctionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
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

  if (code.includes('fs.') && !code.includes('// @allow-filesystem')) {
    warnings.push('Filesystem operations detected - ensure proper permissions');
  }

  // Check for Parse.Cloud function structure
  if (!code.includes('Parse.Cloud.define') && !code.includes('Parse.Cloud.beforeSave') && !code.includes('Parse.Cloud.afterSave')) {
    warnings.push('Function does not appear to define any Parse Cloud Code handlers');
  }

  // Check for async/await patterns
  if (code.includes('async') && !code.includes('await')) {
    warnings.push('Async function detected but no await statements found');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
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

async function createFunctionInDatabase(functionData: any): Promise<any> {
  try {
    // Create new CloudFunction object in Parse database
    const CloudFunction = Parse.Object.extend('CloudFunction');
    const cloudFunction = new CloudFunction();
    
    // Set all the function data
    cloudFunction.set('name', functionData.name);
    cloudFunction.set('description', functionData.description);
    cloudFunction.set('code', functionData.code);
    cloudFunction.set('language', 'javascript'); // Default to JavaScript
    cloudFunction.set('runtime', 'node18'); // Default runtime
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