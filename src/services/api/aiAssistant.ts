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
  },

  /**
   * Send a query to the AI assistant
   */
  async aiAssistantQuery(params: { query: string; context?: any; organizationId?: string }) {
    return callCloudFunction('aiAssistantQuery', params, {
      errorMessage: 'Failed to process AI assistant query'
    });
  },

  /**
   * Get AI assistant settings
   */
  async getAIAssistantSettings() {
    return callCloudFunction('getAIAssistantSettings', {}, {
      errorMessage: 'Failed to fetch AI assistant settings'
    });
  },

  /**
   * Update AI assistant settings
   */
  async updateAIAssistantSettings(settings: Record<string, any>) {
    return callCloudFunction('updateAIAssistantSettings', { settings }, {
      errorMessage: 'Failed to update AI assistant settings'
    });
  }
};

// Default export
export default aiAssistantApi;