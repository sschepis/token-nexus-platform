import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { ScheduledJob, ScheduledJobState, CreateJobRequest, UpdateJobRequest } from '@/types/scheduled-jobs';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored Scheduled Job slice using AsyncThunkFactory utilities
 * This eliminates repetitive async patterns and provides consistent error handling
 */

// Parameter interfaces for async thunks
export interface FetchJobsParams {
  status?: ScheduledJob['status'];
  [key: string]: unknown;
}

export interface ExecuteJobParams {
  jobId: string;
  [key: string]: unknown;
}

export interface ToggleJobStatusParams {
  jobId: string;
  status: ScheduledJob['status'];
  [key: string]: unknown;
}

interface EnhancedScheduledJobState extends ExtendedAsyncState {
  jobs: ScheduledJob[];
  selectedJobId: string | null;
  
  // Specific loading states for different operations
  isCreating: boolean;
  createError: string | null;
  isUpdating: boolean;
  updateError: string | null;
  isDeleting: boolean;
  deleteError: string | null;
  isExecuting: boolean;
  executeError: string | null;
  isToggling: boolean;
  toggleError: string | null;
}

// Create async thunks using the factory
const scheduledJobThunks = {
  fetchJobs: AsyncThunkFactory.create<FetchJobsParams | undefined, ScheduledJob[]>({
    name: 'scheduledJob/fetchJobs',
    cloudFunction: 'getScheduledJobs',
    transformParams: (params) => (params || {}) as Record<string, unknown>,
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch scheduled jobs'
  }),

  createJob: AsyncThunkFactory.create<CreateJobRequest, ScheduledJob>({
    name: 'scheduledJob/createJob',
    cloudFunction: 'createScheduledJob',
    transformParams: (params) => ({
      name: params.name,
      description: params.description,
      code: params.code,
      frequency: params.frequency,
      cronExpression: params.cronExpression,
      timeout: params.timeout || 300,
      maxRetries: params.maxRetries || 3,
      tags: params.tags || []
    }),
    transformResponse: (response: any) => ({
      id: response.id || response.objectId,
      ...response,
      status: 'disabled',
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString(),
      version: 1,
      executionCount: 0,
      successCount: 0,
      failureCount: 0
    }),
    errorMessage: 'Failed to create scheduled job'
  }),

  updateJob: AsyncThunkFactory.create<UpdateJobRequest, ScheduledJob>({
    name: 'scheduledJob/updateJob',
    cloudFunction: 'updateScheduledJob',
    transformParams: (params) => ({
      jobId: params.id,
      name: params.name,
      description: params.description,
      code: params.code,
      frequency: params.frequency,
      cronExpression: params.cronExpression,
      timeout: params.timeout,
      maxRetries: params.maxRetries,
      tags: params.tags
    }),
    transformResponse: (response: any) => ({
      ...response,
      id: response.id || response.objectId,
      updatedAt: new Date().toISOString(),
      version: (response.version || 1) + 1
    }),
    errorMessage: 'Failed to update scheduled job'
  }),

  deleteJob: AsyncThunkFactory.create<string, { jobId: string }>({
    name: 'scheduledJob/deleteJob',
    cloudFunction: 'deleteScheduledJob',
    transformParams: (jobId: string) => ({ jobId }),
    transformResponse: (response: any) => ({ jobId: response.jobId || response.id }),
    errorMessage: 'Failed to delete scheduled job'
  }),

  executeJob: AsyncThunkFactory.create<ExecuteJobParams, { jobId: string; executionId: string; status: string }>({
    name: 'scheduledJob/executeJob',
    cloudFunction: 'executeScheduledJob',
    transformParams: (params) => ({ jobId: params.jobId }),
    transformResponse: (response: any) => ({
      jobId: response.jobId || response.id,
      executionId: response.executionId,
      status: response.status || 'running'
    }),
    errorMessage: 'Failed to execute scheduled job'
  }),

  toggleJobStatus: AsyncThunkFactory.create<ToggleJobStatusParams, { jobId: string; status: ScheduledJob['status'] }>({
    name: 'scheduledJob/toggleJobStatus',
    cloudFunction: 'toggleScheduledJobStatus',
    transformParams: (params) => ({
      jobId: params.jobId,
      status: params.status
    }),
    transformResponse: (response: any) => ({
      jobId: response.jobId || response.id,
      status: response.status
    }),
    errorMessage: 'Failed to toggle job status'
  }),

  fetchJobLogs: AsyncThunkFactory.create<string, any[]>({
    name: 'scheduledJob/fetchJobLogs',
    cloudFunction: 'getScheduledJobLogs',
    transformParams: (jobId: string) => ({ jobId }),
    transformResponse: (response: any) => response.logs || response.data || [],
    errorMessage: 'Failed to fetch job logs'
  })
};

// Export thunks for backward compatibility
export const {
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  executeJob,
  toggleJobStatus,
  fetchJobLogs
} = scheduledJobThunks;

const initialState: EnhancedScheduledJobState = createAsyncInitialState({
  jobs: [
    {
      id: uuidv4(),
      name: 'dailyReportGeneration',
      description: 'Generates daily analytics reports and sends them to administrators',
      code: `Parse.Cloud.job("dailyReportGeneration", async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log("Starting daily report generation...");
    
    // Get analytics data
    const userQuery = new Parse.Query("User");
    const totalUsers = await userQuery.count();
    
    const postQuery = new Parse.Query("Post");
    postQuery.greaterThan("createdAt", new Date(Date.now() - 24 * 60 * 60 * 1000));
    const newPosts = await postQuery.count();
    
    // Generate report
    const report = {
      date: new Date().toISOString().split('T')[0],
      totalUsers,
      newPostsToday: newPosts,
      generatedAt: new Date().toISOString()
    };
    
    log(\`Report generated: \${JSON.stringify(report)}\`);
    
    // Could send email, save to database, etc.
    message("Daily report generated successfully");
    
  } catch (error) {
    log(\`Error generating report: \${error.message}\`);
    throw error;
  }
});`,
      status: 'active',
      frequency: 'daily',
      cronExpression: '0 0 * * *',
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 30,
      successCount: 28,
      failureCount: 2,
      averageExecutionTime: 1250,
      timeout: 300,
      maxRetries: 3,
      tags: ['analytics', 'reporting']
    },
    {
      id: uuidv4(),
      name: 'cleanupTempFiles',
      description: 'Removes temporary files older than 7 days',
      code: `Parse.Cloud.job("cleanupTempFiles", async (request) => {
  const { params, headers, log, message } = request;
  
  try {
    log("Starting temp file cleanup...");
    
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const query = new Parse.Query("TempFile");
    query.lessThan("createdAt", cutoffDate);
    
    const tempFiles = await query.find();
    log(\`Found \${tempFiles.length} temp files to delete\`);
    
    let deletedCount = 0;
    for (const file of tempFiles) {
      try {
        await file.destroy();
        deletedCount++;
      } catch (error) {
        log(\`Failed to delete file \${file.id}: \${error.message}\`);
      }
    }
    
    log(\`Cleanup completed. Deleted \${deletedCount} files\`);
    message(\`Cleanup completed. Deleted \${deletedCount} temp files\`);
    
  } catch (error) {
    log(\`Error during cleanup: \${error.message}\`);
    throw error;
  }
});`,
      status: 'active',
      frequency: 'weekly',
      cronExpression: '0 2 * * 0',
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 12,
      successCount: 12,
      failureCount: 0,
      averageExecutionTime: 850,
      timeout: 600,
      maxRetries: 2,
      tags: ['cleanup', 'maintenance']
    }
  ],
  selectedJobId: null,
  
  // Specific loading states
  isCreating: false,
  createError: null,
  isUpdating: false,
  updateError: null,
  isDeleting: false,
  deleteError: null,
  isExecuting: false,
  executeError: null,
  isToggling: false,
  toggleError: null
}, { includeExtended: true });

export const scheduledJobSlice = createSlice({
  name: 'scheduledJob',
  initialState,
  reducers: {
    setSelectedJob: (state, action: PayloadAction<string | null>) => {
      state.selectedJobId = action.payload;
    },
    
    recordJobExecution: (state, action: PayloadAction<{ 
      id: string; 
      success: boolean; 
      executionTime: number;
      error?: string;
    }>) => {
      const { id, success, executionTime, error } = action.payload;
      const jobIndex = state.jobs.findIndex(job => job.id === id);
      
      if (jobIndex >= 0) {
        const job = state.jobs[jobIndex];
        job.executionCount = (job.executionCount || 0) + 1;
        job.lastRun = new Date().toISOString();
        
        if (success) {
          job.successCount = (job.successCount || 0) + 1;
          job.status = 'completed';
        } else {
          job.failureCount = (job.failureCount || 0) + 1;
          job.lastError = error;
          job.status = 'failed';
        }
        
        // Update average execution time
        const totalExecutions = job.executionCount;
        const currentAverage = job.averageExecutionTime || 0;
        job.averageExecutionTime = Math.round(
          (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions
        );
        
        // Calculate next run time based on frequency
        if (job.frequency !== 'once' && success) {
          job.nextRun = calculateNextRun(job.frequency, job.cronExpression);
        }
      }
    },
    
    updateNextRun: (state, action: PayloadAction<{ id: string; nextRun: string }>) => {
      const { id, nextRun } = action.payload;
      const jobIndex = state.jobs.findIndex(job => job.id === id);
      
      if (jobIndex >= 0) {
        state.jobs[jobIndex].nextRun = nextRun;
      }
    },

    clearCreateError: (state) => {
      state.createError = null;
    },

    clearUpdateError: (state) => {
      state.updateError = null;
    },

    clearDeleteError: (state) => {
      state.deleteError = null;
    },

    clearExecuteError: (state) => {
      state.executeError = null;
    },

    clearToggleError: (state) => {
      state.toggleError = null;
    },

    clearAllErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.executeError = null;
      state.toggleError = null;
    }
  },
  
  extraReducers: (builder) => {
    // Fetch jobs
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.fetchJobs, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.jobs = action.payload;
      }
    });

    // Create job
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.createJob, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        state.jobs.push(action.payload);
        state.createError = null;
      },
      onRejected: (state, action) => {
        state.createError = action.payload as string;
      }
    });

    // Update job
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.updateJob, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const jobIndex = state.jobs.findIndex(job => job.id === action.payload.id);
        if (jobIndex >= 0) {
          state.jobs[jobIndex] = action.payload;
        }
        state.updateError = null;
      },
      onRejected: (state, action) => {
        state.updateError = action.payload as string;
      }
    });

    // Delete job
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.deleteJob, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        state.jobs = state.jobs.filter(job => job.id !== action.payload.jobId);
        if (state.selectedJobId === action.payload.jobId) {
          state.selectedJobId = null;
        }
        state.deleteError = null;
      },
      onRejected: (state, action) => {
        state.deleteError = action.payload as string;
      }
    });

    // Execute job
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.executeJob, {
      loadingFlag: 'isExecuting',
      onFulfilled: (state, action) => {
        const jobIndex = state.jobs.findIndex(job => job.id === action.payload.jobId);
        if (jobIndex >= 0) {
          state.jobs[jobIndex].status = 'running';
          state.jobs[jobIndex].lastRun = new Date().toISOString();
        }
        state.executeError = null;
      },
      onRejected: (state, action) => {
        state.executeError = action.payload as string;
      }
    });

    // Toggle job status
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.toggleJobStatus, {
      loadingFlag: 'isToggling',
      onFulfilled: (state, action) => {
        const jobIndex = state.jobs.findIndex(job => job.id === action.payload.jobId);
        if (jobIndex >= 0) {
          state.jobs[jobIndex].status = action.payload.status;
          state.jobs[jobIndex].updatedAt = new Date().toISOString();
        }
        state.toggleError = null;
      },
      onRejected: (state, action) => {
        state.toggleError = action.payload as string;
      }
    });

    // Fetch job logs
    AsyncReducerBuilder.addAsyncCase(builder, scheduledJobThunks.fetchJobLogs, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        // Could store logs in state if needed
        // For now, logs are typically handled by the component
      }
    });
  },
});

// Helper function to calculate next run time
function calculateNextRun(frequency: ScheduledJob['frequency'], cronExpression?: string): string {
  const now = new Date();
  
  switch (frequency) {
    case 'minutely':
      return new Date(now.getTime() + 60 * 1000).toISOString();
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0);
      return nextWeek.toISOString();
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth.toISOString();
    default:
      // For custom cron expressions, we'd need a cron parser
      // For now, default to 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
}

export const { 
  setSelectedJob,
  recordJobExecution,
  updateNextRun,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearExecuteError,
  clearToggleError,
  clearAllErrors
} = scheduledJobSlice.actions;

export default scheduledJobSlice.reducer;