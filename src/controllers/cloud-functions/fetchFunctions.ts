import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { createQuery, ParseQueryBuilder } from '../../utils/parseUtils';

export interface CloudFunction {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  runtime: string;
  status: string;
  category: string;
  triggers: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  executionCount: number;
  lastExecuted?: Date;
  version: number;
  stats?: FunctionStats;
}

export interface FunctionStats {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution: Date;
  errorCount: number;
  peakExecutionsPerHour: number;
  last24Hours: {
    executions: number;
    errors: number;
    avgTime: number;
  };
  last7Days: {
    executions: number;
    errors: number;
    avgTime: number;
  };
}

/**
 * Refactored fetchFunctions using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query patterns
 */
export async function fetchFunctions(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { includeStats = true, status, category } = params;

    // Get functions from Parse database using utility
    const functions = await getFunctionsFromDatabase(status as string, category as string);
    
    // Add execution stats if requested
    if (includeStats) {
      for (const func of functions) {
        func.stats = await getRealFunctionStats(func.name);
      }
    }

    return {
      success: true,
      data: { 
        functions,
        totalCount: functions.length,
        categories: Array.from(new Set(functions.map(f => f.category))),
        statuses: Array.from(new Set(functions.map(f => f.status)))
      },
      message: `Retrieved ${functions.length} cloud functions`,
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'fetchFunctions',
        userId: context.user.userId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cloud functions',
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'fetchFunctions',
        userId: context.user.userId
      }
    };
  }
}

/**
 * Refactored database query using ParseQueryBuilder
 */
async function getFunctionsFromDatabase(status?: string, category?: string): Promise<CloudFunction[]> {
  try {
    // Use ParseQueryBuilder for cleaner query construction
    let queryBuilder = createQuery('CloudFunction').ascending('name');
    
    // Apply filters using builder pattern
    if (status) {
      queryBuilder = queryBuilder.withStatus(status);
    }
    
    if (category) {
      queryBuilder = queryBuilder.withType(category); // Using withType for category filter
    }
    
    const results = await queryBuilder.find();
    
    // Use utility function to map Parse objects to TypeScript interfaces
    return results.map(func => mapParseObjectToCloudFunction(func));
  } catch (error) {
    console.error('Error fetching functions from database:', error);
    return [];
  }
}

/**
 * Refactored stats query using ParseQueryBuilder
 */
async function getRealFunctionStats(functionName: string): Promise<FunctionStats> {
  try {
    // Use ParseQueryBuilder for execution log queries
    const logs = await createQuery('FunctionExecutionLog')
      .withType(functionName) // Using withType for functionName filter
      .descending('createdAt')
      .limit(1000)
      .find();
    
    if (logs.length === 0) {
      return getDefaultStats();
    }

    // Calculate stats from logs
    return calculateStatsFromLogs(logs);
  } catch (error) {
    console.error('Error fetching function stats:', error);
    return getDefaultStats();
  }
}

/**
 * Utility function to map Parse object to CloudFunction interface
 */
function mapParseObjectToCloudFunction(parseObj: Parse.Object): CloudFunction {
  return {
    id: parseObj.id,
    name: parseObj.get('name'),
    description: parseObj.get('description'),
    code: parseObj.get('code'),
    language: parseObj.get('language'),
    runtime: parseObj.get('runtime'),
    status: parseObj.get('status'),
    category: parseObj.get('category'),
    triggers: parseObj.get('triggers') || [],
    tags: parseObj.get('tags') || [],
    createdAt: parseObj.get('createdAt'),
    updatedAt: parseObj.get('updatedAt'),
    createdBy: parseObj.get('createdBy'),
    updatedBy: parseObj.get('updatedBy'),
    executionCount: parseObj.get('executionCount') || 0,
    lastExecuted: parseObj.get('lastExecuted'),
    version: parseObj.get('version') || 1
  };
}

/**
 * Calculate statistics from execution logs
 */
function calculateStatsFromLogs(logs: Parse.Object[]): FunctionStats {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const totalExecutions = logs.length;
  const successfulExecutions = logs.filter(log => log.get('success')).length;
  const errorCount = totalExecutions - successfulExecutions;
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
  
  // Calculate execution times
  const executionTimes = logs
    .map(log => log.get('executionTime'))
    .filter(time => typeof time === 'number');
  const averageExecutionTime = executionTimes.length > 0 
    ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
    : 0;
  
  // Calculate 24-hour stats
  const last24HourLogs = logs.filter(log => log.get('createdAt') >= last24Hours);
  const last24HourErrors = last24HourLogs.filter(log => !log.get('success')).length;
  const last24HourTimes = last24HourLogs
    .map(log => log.get('executionTime'))
    .filter(time => typeof time === 'number');
  const last24HourAvgTime = last24HourTimes.length > 0
    ? last24HourTimes.reduce((sum, time) => sum + time, 0) / last24HourTimes.length
    : 0;
  
  // Calculate 7-day stats
  const last7DayLogs = logs.filter(log => log.get('createdAt') >= last7Days);
  const last7DayErrors = last7DayLogs.filter(log => !log.get('success')).length;
  const last7DayTimes = last7DayLogs
    .map(log => log.get('executionTime'))
    .filter(time => typeof time === 'number');
  const last7DayAvgTime = last7DayTimes.length > 0
    ? last7DayTimes.reduce((sum, time) => sum + time, 0) / last7DayTimes.length
    : 0;
  
  return {
    totalExecutions,
    successRate,
    averageExecutionTime,
    lastExecution: logs.length > 0 ? logs[0].get('createdAt') : new Date(0),
    errorCount,
    peakExecutionsPerHour: calculatePeakExecutionsPerHour(logs),
    last24Hours: {
      executions: last24HourLogs.length,
      errors: last24HourErrors,
      avgTime: last24HourAvgTime
    },
    last7Days: {
      executions: last7DayLogs.length,
      errors: last7DayErrors,
      avgTime: last7DayAvgTime
    }
  };
}

/**
 * Calculate peak executions per hour from logs
 */
function calculatePeakExecutionsPerHour(logs: Parse.Object[]): number {
  const hourlyExecutions = new Map<string, number>();
  
  logs.forEach(log => {
    const hour = new Date(log.get('createdAt')).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    hourlyExecutions.set(hour, (hourlyExecutions.get(hour) || 0) + 1);
  });
  
  return Math.max(...Array.from(hourlyExecutions.values()), 0);
}

/**
 * Get default stats when no logs are available
 */
function getDefaultStats(): FunctionStats {
  return {
    totalExecutions: 0,
    successRate: 0,
    averageExecutionTime: 0,
    lastExecution: new Date(0),
    errorCount: 0,
    peakExecutionsPerHour: 0,
    last24Hours: {
      executions: 0,
      errors: 0,
      avgTime: 0
    },
    last7Days: {
      executions: 0,
      errors: 0,
      avgTime: 0
    }
  };
}
