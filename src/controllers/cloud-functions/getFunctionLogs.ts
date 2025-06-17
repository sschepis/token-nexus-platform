import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';
import { FunctionStats } from './fetchFunctions';
import { createQuery } from '../../utils/parseUtils';

export interface FunctionLog {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  executionTime: number;
  userId: string;
  parameters?: Record<string, unknown>;
  result?: any;
  error?: string;
  success: boolean;
}

/**
 * Refactored getFunctionLogs using ParseQueryBuilder utilities
 * This eliminates repetitive Parse query patterns
 */
export async function getFunctionLogs(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { functionName, limit = 50, timeRange = '24h', level } = params;

    // Verify function exists using utility
    const functionExists = await verifyFunctionExists(functionName as string);
    if (!functionExists) {
      return {
        success: false,
        error: `Function '${functionName}' not found`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getFunctionLogs',
          userId: context.user.userId
        }
      };
    }

    const logs = await getFunctionExecutionLogs(
      functionName as string,
      limit as number,
      timeRange as string,
      level as string
    );

    const stats = await getFunctionStatsFromLogs(functionName as string);

    return {
      success: true,
      data: { 
        logs,
        stats,
        functionName,
        timeRange,
        totalLogs: logs.length
      },
      message: `Retrieved ${logs.length} log entries for function '${functionName}'`,
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'getFunctionLogs',
        userId: context.user.userId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get function logs',
      metadata: {
        executionTime: 0,
        timestamp: new Date(),
        actionId: 'getFunctionLogs',
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
      .first();
    
    return !!cloudFunction;
  } catch (error) {
    console.error('Error verifying function exists:', error);
    return false;
  }
}

/**
 * Refactored log retrieval using ParseQueryBuilder
 */
async function getFunctionExecutionLogs(
  functionName: string,
  limit: number,
  timeRange: string,
  level?: string
): Promise<FunctionLog[]> {
  try {
    // Calculate time range
    const startTime = calculateTimeRangeStart(timeRange);
    
    // Build query using ParseQueryBuilder
    let query = createQuery('FunctionExecutionLog')
      .equalTo('functionName', functionName)
      .descending('createdAt')
      .limit(Math.min(limit, 1000)); // Cap at 1000 for performance

    // Apply time range filter using the underlying query
    const parseQuery = query.getQuery();
    parseQuery.greaterThan('createdAt', startTime);

    // Apply level filter if specified
    if (level && ['info', 'warn', 'error'].includes(level)) {
      parseQuery.equalTo('level', level);
    }

    const results = await parseQuery.find();
    
    return results.map(log => mapParseObjectToFunctionLog(log));
  } catch (error) {
    console.error('Error fetching function execution logs:', error);
    return [];
  }
}

/**
 * Refactored stats calculation using ParseQueryBuilder
 */
async function getFunctionStatsFromLogs(functionName: string): Promise<FunctionStats> {
  try {
    // Query recent logs for statistics using ParseQueryBuilder
    const logs = await createQuery('FunctionExecutionLog')
      .equalTo('functionName', functionName)
      .descending('createdAt')
      .limit(1000) // Get recent executions for stats
      .find();
    
    if (logs.length === 0) {
      return getDefaultStats();
    }

    return calculateStatsFromLogs(logs);
  } catch (error) {
    console.error('Error fetching function stats from logs:', error);
    return getDefaultStats();
  }
}

/**
 * Utility function to calculate time range start
 */
function calculateTimeRangeStart(timeRange: string): Date {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
  }
}

/**
 * Utility function to map Parse object to FunctionLog interface
 */
function mapParseObjectToFunctionLog(parseObj: Parse.Object): FunctionLog {
  return {
    id: parseObj.id,
    timestamp: parseObj.get('createdAt'),
    level: parseObj.get('level') || 'info',
    message: parseObj.get('message') || 'Function execution',
    executionTime: parseObj.get('executionTime') || 0,
    userId: parseObj.get('userId'),
    parameters: parseObj.get('parameters'),
    result: parseObj.get('result'),
    error: parseObj.get('error'),
    success: parseObj.get('success') || false
  };
}

/**
 * Utility function to get default stats
 */
function getDefaultStats(): FunctionStats {
  return {
    totalExecutions: 0,
    successRate: 0,
    averageExecutionTime: 0,
    lastExecution: new Date(0),
    errorCount: 0,
    peakExecutionsPerHour: 0,
    last24Hours: { executions: 0, errors: 0, avgTime: 0 },
    last7Days: { executions: 0, errors: 0, avgTime: 0 }
  };
}

/**
 * Utility function to calculate stats from logs
 */
function calculateStatsFromLogs(logs: Parse.Object[]): FunctionStats {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const successfulLogs = logs.filter(log => log.get('success') === true);
  const errorLogs = logs.filter(log => log.get('success') === false);
  
  const last24HourLogs = logs.filter(log => log.get('createdAt') >= last24Hours);
  const last7DayLogs = logs.filter(log => log.get('createdAt') >= last7Days);
  
  const executionTimes = successfulLogs.map(log => log.get('executionTime') || 0);
  const avgExecutionTime = executionTimes.length > 0 
    ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
    : 0;

  // Calculate peak executions per hour
  const hourlyExecutions = new Map<string, number>();
  logs.forEach(log => {
    const hour = new Date(log.get('createdAt')).toISOString().slice(0, 13);
    hourlyExecutions.set(hour, (hourlyExecutions.get(hour) || 0) + 1);
  });
  const peakExecutionsPerHour = Math.max(...Array.from(hourlyExecutions.values()), 0);

  return {
    totalExecutions: logs.length,
    successRate: logs.length > 0 ? (successfulLogs.length / logs.length) * 100 : 0,
    averageExecutionTime: Math.round(avgExecutionTime),
    lastExecution: logs[0]?.get('createdAt') || new Date(0),
    errorCount: errorLogs.length,
    peakExecutionsPerHour,
    last24Hours: {
      executions: last24HourLogs.length,
      errors: last24HourLogs.filter(log => log.get('success') === false).length,
      avgTime: Math.round(
        last24HourLogs
          .filter(log => log.get('success') === true)
          .reduce((sum, log) => sum + (log.get('executionTime') || 0), 0) / 
        Math.max(last24HourLogs.filter(log => log.get('success') === true).length, 1)
      )
    },
    last7Days: {
      executions: last7DayLogs.length,
      errors: last7DayLogs.filter(log => log.get('success') === false).length,
      avgTime: Math.round(
        last7DayLogs
          .filter(log => log.get('success') === true)
          .reduce((sum, log) => sum + (log.get('executionTime') || 0), 0) / 
        Math.max(last7DayLogs.filter(log => log.get('success') === true).length, 1)
      )
    }
  };
}