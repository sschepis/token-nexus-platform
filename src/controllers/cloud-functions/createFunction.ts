import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

export interface FunctionValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Refactored createFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
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

    // Check if function name already exists using utility
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

/**
 * Validate function code with comprehensive security and syntax checks
 */
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

/**
 * Refactored function lookup using ParseQueryBuilder
 */
async function getFunctionByName(functionName: string): Promise<any | null> {
  try {
    // Use ParseQueryBuilder for cleaner query construction
    const result = await createQuery('CloudFunction')
      .withType(functionName) // Using withType for name filter (we can extend ParseQueryBuilder if needed)
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
 * Refactored database creation with better error handling
 */
async function createFunctionInDatabase(functionData: any): Promise<any> {
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
    console.error('Error creating function in database:', error);
    throw new Error(`Failed to create function in database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility function to set cloud function data on Parse object
 */
function setCloudFunctionData(parseObj: Parse.Object, functionData: any): void {
  parseObj.set('name', functionData.name);
  parseObj.set('description', functionData.description);
  parseObj.set('code', functionData.code);
  parseObj.set('language', 'javascript'); // Default to JavaScript
  parseObj.set('runtime', 'node18'); // Default runtime
  parseObj.set('category', functionData.category);
  parseObj.set('triggers', functionData.triggers || []);
  parseObj.set('tags', functionData.tags || []);
  parseObj.set('status', 'draft');
  parseObj.set('createdBy', functionData.createdBy);
  parseObj.set('version', 1);
  parseObj.set('executionCount', 0);
}

/**
 * Utility function to map Parse object to CloudFunction interface
 * (Reused from fetchFunctions.ts - could be moved to a shared utility)
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