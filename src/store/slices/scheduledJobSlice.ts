import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { ScheduledJob, ScheduledJobState, CreateJobRequest, UpdateJobRequest } from '@/types/scheduled-jobs';

const initialState: ScheduledJobState = {
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
  isLoading: false,
  error: null
};

export const scheduledJobSlice = createSlice({
  name: 'scheduledJob',
  initialState,
  reducers: {
    addJob: (state, action: PayloadAction<CreateJobRequest>) => {
      const newJob: ScheduledJob = {
        id: uuidv4(),
        ...action.payload,
        status: 'disabled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        timeout: action.payload.timeout || 300,
        maxRetries: action.payload.maxRetries || 3
      };
      state.jobs.push(newJob);
    },
    
    updateJob: (state, action: PayloadAction<UpdateJobRequest>) => {
      const { id, ...updates } = action.payload;
      const jobIndex = state.jobs.findIndex(job => job.id === id);
      
      if (jobIndex >= 0) {
        state.jobs[jobIndex] = {
          ...state.jobs[jobIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
          version: (state.jobs[jobIndex].version || 1) + 1
        };
      }
    },
    
    deleteJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      state.jobs = state.jobs.filter(job => job.id !== jobId);
      
      if (state.selectedJobId === jobId) {
        state.selectedJobId = null;
      }
    },
    
    setSelectedJob: (state, action: PayloadAction<string | null>) => {
      state.selectedJobId = action.payload;
    },
    
    setJobStatus: (state, action: PayloadAction<{ id: string; status: ScheduledJob['status'] }>) => {
      const { id, status } = action.payload;
      const jobIndex = state.jobs.findIndex(job => job.id === id);
      
      if (jobIndex >= 0) {
        state.jobs[jobIndex].status = status;
        state.jobs[jobIndex].updatedAt = new Date().toISOString();
      }
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
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
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
  addJob, 
  updateJob, 
  deleteJob, 
  setSelectedJob,
  setJobStatus,
  recordJobExecution,
  updateNextRun,
  setLoading,
  setError
} = scheduledJobSlice.actions;

export default scheduledJobSlice.reducer;