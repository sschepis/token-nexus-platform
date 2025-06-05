import Parse from 'parse/node';
import { ActionContext, ActionResult } from '../types/ActionTypes';

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

export async function fetchFunctions(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const { includeStats = true, status, category } = params;

    // Get functions from Parse database
    const functions = await getFunctionsFromDatabase();
    
    let filteredFunctions = functions;
    if (status) {
      filteredFunctions = functions.filter(f => f.status === status);
    }
    if (category) {
      filteredFunctions = filteredFunctions.filter(f => f.category === category);
    }

    // Add execution stats if requested
    if (includeStats) {
      for (const func of filteredFunctions) {
        func.stats = await getRealFunctionStats(func.name);
      }
    }

    return {
      success: true,
      data: { 
        functions: filteredFunctions,
        totalCount: filteredFunctions.length,
        categories: Array.from(new Set(functions.map(f => f.category))),
        statuses: Array.from(new Set(functions.map(f => f.status)))
      },
      message: `Retrieved ${filteredFunctions.length} cloud functions`,
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

async function getFunctionsFromDatabase(): Promise<CloudFunction[]> {
  try {
    // Query CloudFunction objects from Parse database
    const query = new Parse.Query('CloudFunction');
    query.ascending('name');
    
    const results = await query.find();
    
    return results.map(func => ({
      id: func.id,
      name: func.get('name'),
      description: func.get('description'),
      code: func.get('code'),
      language: func.get('language'),
      runtime: func.get('runtime'),
      status: func.get('status'),
      category: func.get('category'),
      triggers: func.get('triggers') || [],
      tags: func.get('tags') || [],
      createdAt: func.get('createdAt'),
      updatedAt: func.get('updatedAt'),
      createdBy: func.get('createdBy'),
      updatedBy: func.get('updatedBy'),
      executionCount: func.get('executionCount') || 0,
      lastExecuted: func.get('lastExecuted'),
      version: func.get('version') || 1
    }));
  } catch (error) {
    console.error('Error fetching functions from database:', error);
    // Return empty array on error
    return [];
  }
}

async function getRealFunctionStats(functionName: string): Promise<FunctionStats> {
  try {
    // Query FunctionExecutionLog objects for real statistics
    const query = new Parse.Query('FunctionExecutionLog');
    query.equalTo('functionName', functionName);
    query.descending('createdAt');
    query.limit(1000); // Get recent executions for stats
    
    const logs = await query.find();
    
    if (logs.length === 0) {
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
  } catch (error) {
    console.error('Error fetching function stats:', error);
    // Return default stats on error
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
}
