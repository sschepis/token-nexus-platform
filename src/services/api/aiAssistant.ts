/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService } from './base';

/**
 * @file AI Assistant API services.
 * Handles operations related to AI scheduled tasks via Parse Cloud Functions.
 */
const aiAssistantApi = {
  /**
   * Fetches a list of scheduled AI tasks.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @returns {Promise<{ data: { tasks: any[] } }>} A promise that resolves with an object containing the list of scheduled tasks.
   * @throws {Error} Throws an error if fetching scheduled tasks fails.
   */
  getScheduledTasks: async (params?: { limit?: number; skip?: number; isActive?: boolean }): Promise<{ data: { tasks: any[] } }> => {
    try {
      const result = await Parse.Cloud.run('getScheduledTasks', params || {});
      return {
        data: {
          tasks: result.tasks || []
        }
      };
    } catch (error: any) {
      console.debug('[AI Assistant API] Error calling getScheduledTasks cloud function:', error);
      throw new Error(error.message || 'Failed to fetch scheduled tasks');
    }
  },

  /**
   * Creates a new scheduled AI task.
   * @param {object} taskData - Data for the new scheduled task.
   * @param {string} taskData.name - The name of the scheduled task.
   * @param {string} taskData.description - A description of the task.
   * @param {string} taskData.cronExpression - The cron expression for the task's schedule.
   * @param {Record<string, unknown>} taskData.actionDetails - Details about the AI action to perform.
   * @returns {Promise<{ data: { task: any } }>} A promise that resolves with an object containing the newly created task.
   * @throws {Error} Throws an error if scheduled task creation fails.
   */
  createScheduledTask: async (taskData: {
    name: string;
    description: string;
    cronExpression: string;
    actionDetails: Record<string, unknown>;
  }): Promise<{ data: { task: any } }> => {
    try {
      const result = await Parse.Cloud.run('createScheduledTask', taskData);
      return {
        data: {
          task: result.task
        }
      };
    } catch (error: any) {
      console.debug('[AI Assistant API] Error calling createScheduledTask cloud function:', error);
      throw new Error(error.message || 'Failed to create scheduled task');
    }
  },

  /**
   * Updates an existing scheduled AI task.
   * @param {string} taskId - The ID of the task to update.
   * @param {object} updates - The updates to apply to the task.
   * @returns {Promise<{ data: { task: any } }>} A promise that resolves with an object containing the updated task.
   * @throws {Error} Throws an error if scheduled task update fails.
   */
  updateScheduledTask: async (taskId: string, updates: {
    name?: string;
    description?: string;
    cronExpression?: string;
    actionDetails?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<{ data: { task: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateScheduledTask', { taskId, updates });
      return {
        data: {
          task: result.task
        }
      };
    } catch (error: any) {
      console.debug('[AI Assistant API] Error calling updateScheduledTask cloud function:', error);
      throw new Error(error.message || 'Failed to update scheduled task');
    }
  },

  /**
   * Deletes a scheduled AI task by its ID.
   * @param {string} taskId - The ID of the task to delete.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status.
   * @throws {Error} Throws an error if scheduled task deletion fails.
   */
  deleteScheduledTask: async (taskId: string): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('deleteScheduledTask', { taskId });
      return { data: result };
    } catch (error: any) {
      console.debug('[AI Assistant API] Error calling deleteScheduledTask cloud function:', error);
      throw new Error(error.message || 'Failed to delete scheduled task');
    }
  },
};

// Merge AI Assistant APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? {} : aiAssistantApi);
// TODO: Consider adding mock implementations for aiAssistantApi if mocking is needed for dev environment