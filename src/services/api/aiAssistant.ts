import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored AI Assistant API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface ScheduledTaskFilters {
  limit?: number;
  skip?: number;
  isActive?: boolean;
}

export interface CreateScheduledTaskData {
  name: string;
  description: string;
  cronExpression: string;
  actionDetails: Record<string, unknown>;
}

export interface UpdateScheduledTaskData {
  name?: string;
  description?: string;
  cronExpression?: string;
  actionDetails?: Record<string, unknown>;
  isActive?: boolean;
}

export const aiAssistantApi = {
  /**
   * Fetches a list of scheduled AI tasks
   */
  async getScheduledTasks(params: ScheduledTaskFilters = {}) {
    return callCloudFunctionForArray('getScheduledTasks', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch scheduled tasks'
    });
  },

  /**
   * Creates a new scheduled AI task
   */
  async createScheduledTask(taskData: CreateScheduledTaskData) {
    return callCloudFunction('createScheduledTask', taskData as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create scheduled task'
    });
  },

  /**
   * Updates an existing scheduled AI task
   */
  async updateScheduledTask(taskId: string, updates: UpdateScheduledTaskData) {
    return callCloudFunction('updateScheduledTask', { taskId, updates }, {
      errorMessage: 'Failed to update scheduled task'
    });
  },

  /**
   * Deletes a scheduled AI task by its ID
   */
  async deleteScheduledTask(taskId: string) {
    return callCloudFunction('deleteScheduledTask', { taskId }, {
      errorMessage: 'Failed to delete scheduled task'
    });
  },

  /**
   * Batch delete multiple scheduled tasks
   */
  async batchDeleteScheduledTasks(taskIds: string[]) {
    const operations = taskIds.map(taskId => 
      () => this.deleteScheduledTask(taskId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple scheduled tasks
   */
  async batchUpdateScheduledTasks(updates: Array<{ taskId: string; updates: UpdateScheduledTaskData }>) {
    const operations = updates.map(({ taskId, updates }) => 
      () => this.updateScheduledTask(taskId, updates)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Toggle active status for multiple scheduled tasks
   */
  async batchToggleScheduledTasks(taskIds: string[], isActive: boolean) {
    const operations = taskIds.map(taskId => 
      () => this.updateScheduledTask(taskId, { isActive })
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementations for development
const mockAiAssistantApi = {
  getScheduledTasks: (params: ScheduledTaskFilters = {}) => {
    const mockTasks = [
      {
        id: 'task-1',
        name: 'Daily Report Generation',
        description: 'Generate daily analytics report and send to stakeholders',
        cronExpression: '0 9 * * *',
        actionDetails: {
          type: 'report_generation',
          reportType: 'analytics',
          recipients: ['admin@example.com'],
          format: 'pdf'
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        nextRun: new Date(Date.now() + 86400000).toISOString()
      },
      {
        id: 'task-2',
        name: 'Weekly Data Cleanup',
        description: 'Clean up old temporary data and optimize database',
        cronExpression: '0 2 * * 0',
        actionDetails: {
          type: 'data_cleanup',
          tables: ['temp_data', 'logs'],
          retentionDays: 30
        },
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lastRun: new Date(Date.now() - 7 * 86400000).toISOString(),
        nextRun: new Date(Date.now() + 7 * 86400000).toISOString()
      },
      {
        id: 'task-3',
        name: 'Monthly Backup',
        description: 'Create monthly backup of critical data',
        cronExpression: '0 1 1 * *',
        actionDetails: {
          type: 'backup',
          scope: 'critical_data',
          destination: 's3://backups/monthly'
        },
        isActive: false,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lastRun: new Date(Date.now() - 30 * 86400000).toISOString(),
        nextRun: null
      }
    ];

    let filteredTasks = mockTasks;
    
    if (params.isActive !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.isActive === params.isActive);
    }

    return Promise.resolve({
      success: true,
      data: filteredTasks
    });
  },

  createScheduledTask: (taskData: CreateScheduledTaskData) => {
    const newTask = {
      id: `task-${Date.now()}`,
      ...taskData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: null,
      nextRun: new Date(Date.now() + 3600000).toISOString() // Next hour as example
    };

    return Promise.resolve({
      success: true,
      data: { task: newTask }
    });
  },

  updateScheduledTask: (taskId: string, updates: UpdateScheduledTaskData) => {
    const updatedTask = {
      id: taskId,
      name: updates.name || 'Updated Task',
      description: updates.description || 'Updated description',
      cronExpression: updates.cronExpression || '0 * * * *',
      actionDetails: updates.actionDetails || {},
      isActive: updates.isActive !== undefined ? updates.isActive : true,
      updatedAt: new Date().toISOString()
    };

    return Promise.resolve({
      success: true,
      data: { task: updatedTask }
    });
  },

  deleteScheduledTask: (taskId: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `Scheduled task ${taskId} deleted successfully` }
    });
  },

  batchDeleteScheduledTasks: (taskIds: string[]) => {
    return Promise.resolve({
      results: taskIds.map(() => ({ success: true })),
      successCount: taskIds.length,
      errorCount: 0
    });
  },

  batchUpdateScheduledTasks: (updates: Array<{ taskId: string; updates: UpdateScheduledTaskData }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchToggleScheduledTasks: (taskIds: string[], isActive: boolean) => {
    return Promise.resolve({
      results: taskIds.map(() => ({ success: true })),
      successCount: taskIds.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  batchDeleteScheduledTasks,
  batchUpdateScheduledTasks,
  batchToggleScheduledTasks
} = aiAssistantApi;

// Use mock or real API based on environment
const finalAiAssistantApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockAiAssistantApi : aiAssistantApi;

// Default export
export default finalAiAssistantApi;