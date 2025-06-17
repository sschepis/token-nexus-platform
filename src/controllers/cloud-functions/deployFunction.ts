import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery } from '../../utils/parseUtils';

export interface DeploymentResult {
  deploymentId: string;
  status: 'deployed' | 'failed' | 'pending';
  environment: string;
  deployedAt?: Date;
  error?: string;
}

/**
 * Refactored deployFunction using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query and object creation patterns
 */
export async function deployFunction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, environment = 'production' } = params;

    // Verify function exists and is ready for deployment using utility
    const functionData = await getFunctionByName(functionName as string);
    if (!functionData) {
      return {
        success: false,
        error: `Function '${functionName}' not found`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deployFunction',
          userId: context.user.userId
        }
      };
    }

    // Validate function is ready for deployment
    if (functionData.status === 'deployed') {
      return {
        success: false,
        error: `Function '${functionName}' is already deployed`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deployFunction',
          userId: context.user.userId
        }
      };
    }

    // Validate environment
    const validEnvironments = ['staging', 'production'];
    if (!validEnvironments.includes(environment as string)) {
      return {
        success: false,
        error: `Invalid environment '${environment}'. Must be one of: ${validEnvironments.join(', ')}`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'deployFunction',
          userId: context.user.userId
        }
      };
    }

    // Perform deployment
    const deploymentResult = await deployFunctionToEnvironment(
      functionName as string,
      environment as string,
      functionData
    );

    // Update function status in database using utility
    await updateFunctionDeploymentStatus(functionName as string, deploymentResult);

    // Log deployment
    await logFunctionDeployment(functionName as string, {
      userId: context.user.userId,
      environment: environment as string,
      deploymentResult,
      timestamp: new Date()
    });

    return {
      success: true,
      data: { 
        functionName,
        environment,
        deploymentId: deploymentResult.deploymentId,
        status: deploymentResult.status
      },
      message: `Function '${functionName}' deployed to ${environment} successfully`,
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'deployFunction',
        userId: context.user.userId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deploy function',
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'deployFunction',
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
 * Refactored deployment function with better error handling
 */
async function deployFunctionToEnvironment(
  functionName: string,
  environment: string,
  functionData: any
): Promise<DeploymentResult> {
  try {
    // Real deployment implementation would integrate with Parse Cloud Code deployment
    // For now, we'll simulate the deployment process with actual database operations
    
    const deploymentId = `deploy_${functionName}_${Date.now()}`;
    
    // Create deployment record using utility
    const Deployment = Parse.Object.extend('FunctionDeployment');
    const deployment = new Deployment();
    
    // Use utility function to set deployment data
    setDeploymentData(deployment, deploymentId, functionName, functionData, environment);
    
    await deployment.save();
    
    // Simulate deployment process
    // In a real implementation, this would:
    // 1. Validate the function code
    // 2. Package the function
    // 3. Deploy to Parse Cloud Code
    // 4. Run health checks
    // 5. Update status
    
    try {
      // Simulate deployment validation
      await validateDeployment(functionData);
      
      // Update deployment status to success
      deployment.set('status', 'deployed');
      deployment.set('deployedAt', new Date());
      deployment.set('completedAt', new Date());
      
      await deployment.save();
      
      return {
        deploymentId,
        status: 'deployed',
        environment,
        deployedAt: new Date()
      };
    } catch (deployError) {
      // Update deployment status to failed
      deployment.set('status', 'failed');
      deployment.set('error', deployError instanceof Error ? deployError.message : 'Deployment failed');
      deployment.set('completedAt', new Date());
      
      await deployment.save();
      
      throw deployError;
    }
  } catch (error) {
    console.error('Error deploying function:', error);
    throw new Error(`Failed to deploy function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deployment validation utility
 */
async function validateDeployment(functionData: any): Promise<void> {
  // Basic deployment validation
  if (!functionData.code || !functionData.code.trim()) {
    throw new Error('Function code is empty');
  }
  
  // Check for required Parse Cloud Code structure
  if (!functionData.code.includes('Parse.Cloud.define') && 
      !functionData.code.includes('Parse.Cloud.beforeSave') && 
      !functionData.code.includes('Parse.Cloud.afterSave')) {
    throw new Error('Function does not contain valid Parse Cloud Code definitions');
  }
  
  // Additional validation could include:
  // - Syntax checking
  // - Dependency validation
  // - Security scanning
  // - Performance testing
}

/**
 * Refactored status update using ParseQueryBuilder
 */
async function updateFunctionDeploymentStatus(functionName: string, deploymentResult: DeploymentResult): Promise<void> {
  try {
    // Use ParseQueryBuilder to find the function
    const cloudFunction = await createQuery('CloudFunction')
      .equalTo('name', functionName)
      .first();
    
    if (cloudFunction) {
      cloudFunction.set('status', deploymentResult.status);
      cloudFunction.set('lastDeployment', deploymentResult.deploymentId);
      cloudFunction.set('deployedAt', deploymentResult.deployedAt || new Date());
      
      await cloudFunction.save();
    }
  } catch (error) {
    console.error('Error updating function deployment status:', error);
    // Don't throw error here to avoid breaking the main deployment flow
  }
}

/**
 * Refactored logging function using Parse utilities
 */
async function logFunctionDeployment(functionName: string, logData: {
  userId: string;
  environment: string;
  deploymentResult: DeploymentResult;
  timestamp: Date;
}): Promise<void> {
  try {
    // Create FunctionDeploymentLog object in Parse database
    const DeploymentLog = Parse.Object.extend('FunctionDeploymentLog');
    const deploymentLog = new DeploymentLog();
    
    // Use utility function to set log data
    setDeploymentLogData(deploymentLog, functionName, logData);
    
    // Save to database
    await deploymentLog.save();
    
    console.log(`Function deployment logged: ${functionName}`, {
      environment: logData.environment,
      status: logData.deploymentResult.status,
      userId: logData.userId
    });
  } catch (error) {
    console.error('Error logging function deployment:', error);
    // Don't throw error here to avoid breaking the main deployment flow
  }
}

/**
 * Utility function to set deployment data on Parse object
 */
function setDeploymentData(
  parseObj: Parse.Object,
  deploymentId: string,
  functionName: string,
  functionData: any,
  environment: string
): void {
  parseObj.set('deploymentId', deploymentId);
  parseObj.set('functionName', functionName);
  parseObj.set('functionId', functionData.id);
  parseObj.set('environment', environment);
  parseObj.set('status', 'pending');
  parseObj.set('code', functionData.code);
  parseObj.set('version', functionData.version);
  parseObj.set('startedAt', new Date());
}

/**
 * Utility function to set deployment log data on Parse object
 */
function setDeploymentLogData(
  parseObj: Parse.Object,
  functionName: string,
  logData: any
): void {
  parseObj.set('functionName', functionName);
  parseObj.set('userId', logData.userId);
  parseObj.set('environment', logData.environment);
  parseObj.set('deploymentId', logData.deploymentResult.deploymentId);
  parseObj.set('status', logData.deploymentResult.status);
  parseObj.set('action', 'deploy');
  parseObj.set('message', `Function '${functionName}' deployed to ${logData.environment} with status: ${logData.deploymentResult.status}`);
  
  if (logData.deploymentResult.error) {
    parseObj.set('error', logData.deploymentResult.error);
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
    version: parseObj.get('version') || 1
  };
}