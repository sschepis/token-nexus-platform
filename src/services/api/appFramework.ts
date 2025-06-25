import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { ExecutionEnvironment, CodeExecution, ExecutionStats, ScheduledJob, AppTrigger, AppAPI } from './appFramework/types/AppFrameworkTypes';

/**
 * App Framework API for application framework management
 * This provides secure API calls for all app framework operations
 */
export const appFrameworkApi = {
  /**
   * Get execution environments
   */
  async getExecutionEnvironments(organizationId: string) {
    return callCloudFunctionForArray('getExecutionEnvironments', { organizationId }, {
      errorMessage: 'Failed to fetch execution environments'
    });
  },

  /**
   * Get code executions
   */
  async getCodeExecutions(params: { organizationId: string; limit?: number; skip?: number }) {
    return callCloudFunctionForArray('getCodeExecutions', params, {
      errorMessage: 'Failed to fetch code executions'
    });
  },

  /**
   * Get execution stats
   */
  async getExecutionStats(organizationId: string) {
    return callCloudFunction('getExecutionStats', { organizationId }, {
      errorMessage: 'Failed to fetch execution stats'
    });
  },

  /**
   * Create execution environment
   */
  async createExecutionEnvironment(params: { organizationId: string; name: string; type: string; configuration: Record<string, any> }) {
    return callCloudFunction('createExecutionEnvironment', params, {
      errorMessage: 'Failed to create execution environment'
    });
  },

  /**
   * Execute custom code
   */
  async executeCustomCode(params: { organizationId: string; environmentId: string; code: string }) {
    return callCloudFunction('executeCustomCode', params, {
      errorMessage: 'Failed to execute custom code'
    });
  },

  /**
   * Stop code execution
   */
  async stopCodeExecution(executionId: string) {
    return callCloudFunction('stopCodeExecution', { executionId }, {
      errorMessage: 'Failed to stop code execution'
    });
  },

  /**
   * Get app framework status
   */
  async getAppFrameworkStatus() {
    return callCloudFunction('getAppFrameworkStatus', {}, {
      errorMessage: 'Failed to get app framework status'
    });
  },

  /**
   * Get app scheduled jobs
   */
  async getAppScheduledJobs(organizationId: string) {
    return callCloudFunctionForArray('getAppScheduledJobs', { organizationId }, {
      errorMessage: 'Failed to fetch scheduled jobs'
    });
  },

  /**
   * Get app triggers
   */
  async getAppTriggers(organizationId: string) {
    return callCloudFunctionForArray('getAppTriggers', { organizationId }, {
      errorMessage: 'Failed to fetch app triggers'
    });
  },

  /**
   * Get app APIs
   */
  async getAppAPIs(organizationId: string) {
    return callCloudFunctionForArray('getAppAPIs', { organizationId }, {
      errorMessage: 'Failed to fetch app APIs'
    });
  },

  /**
   * Initialize app framework
   */
  async initializeAppFramework() {
    return callCloudFunction('initializeAppFramework', {}, {
      errorMessage: 'Failed to initialize app framework'
    });
  },

  /**
   * Toggle app scheduled job
   */
  async toggleAppScheduledJob(params: { jobObjectId: string; enabled: boolean }) {
    return callCloudFunction('toggleAppScheduledJob', params, {
      errorMessage: 'Failed to toggle scheduled job'
    });
  },

  /**
   * Toggle app trigger
   */
  async toggleAppTrigger(params: { triggerObjectId: string; enabled: boolean }) {
    return callCloudFunction('toggleAppTrigger', params, {
      errorMessage: 'Failed to toggle app trigger'
    });
  },

  /**
   * Toggle app API
   */
  async toggleAppAPI(params: { apiObjectId: string; enabled: boolean }) {
    return callCloudFunction('toggleAppAPI', params, {
      errorMessage: 'Failed to toggle app API'
    });
  },

  /**
   * Execute app scheduled job
   */
  async executeAppScheduledJob(params: { jobObjectId: string }) {
    return callCloudFunction('executeAppScheduledJob', params, {
      errorMessage: 'Failed to execute scheduled job'
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getExecutionEnvironments,
  getCodeExecutions,
  getExecutionStats,
  createExecutionEnvironment,
  executeCustomCode,
  stopCodeExecution,
  getAppFrameworkStatus,
  getAppScheduledJobs,
  getAppTriggers,
  getAppAPIs,
  initializeAppFramework,
  toggleAppScheduledJob,
  toggleAppTrigger,
  toggleAppAPI,
  executeAppScheduledJob
} = appFrameworkApi;

// Default export
export default appFrameworkApi;