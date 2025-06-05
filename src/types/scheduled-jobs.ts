export type JobStatus = 'active' | 'disabled' | 'running' | 'completed' | 'failed' | 'scheduled';
export type JobFrequency = 'once' | 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  code: string;
  status: JobStatus;
  frequency: JobFrequency;
  cronExpression?: string; // For custom frequency
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  tags?: string[];
  executionCount?: number;
  successCount?: number;
  failureCount?: number;
  averageExecutionTime?: number;
  lastError?: string;
  timeout?: number; // in seconds
  retryCount?: number;
  maxRetries?: number;
  parameters?: Record<string, unknown>;
}

export interface ScheduledJobState {
  jobs: ScheduledJob[];
  selectedJobId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CreateJobRequest {
  name: string;
  description: string;
  code: string;
  frequency: JobFrequency;
  cronExpression?: string;
  timeout?: number;
  maxRetries?: number;
  parameters?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateJobRequest {
  id: string;
  name?: string;
  description?: string;
  code?: string;
  frequency?: JobFrequency;
  cronExpression?: string;
  timeout?: number;
  maxRetries?: number;
  parameters?: Record<string, unknown>;
  tags?: string[];
  status?: JobStatus;
}

export interface JobExecutionLog {
  id: string;
  jobId: string;
  jobName: string;
  timestamp: string;
  executionTime: number;
  success: boolean;
  error?: string;
  result?: unknown;
  triggeredBy: 'schedule' | 'manual';
  retryAttempt?: number;
}

export interface JobStats {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution?: Date;
  nextExecution?: Date;
  failureCount: number;
  longestExecution: number;
  shortestExecution: number;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Run Once', description: 'Execute only once at specified time' },
  { value: 'minutely', label: 'Every Minute', description: 'Execute every minute' },
  { value: 'hourly', label: 'Hourly', description: 'Execute every hour' },
  { value: 'daily', label: 'Daily', description: 'Execute once per day' },
  { value: 'weekly', label: 'Weekly', description: 'Execute once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Execute once per month' },
  { value: 'custom', label: 'Custom (Cron)', description: 'Use custom cron expression' }
] as const;

export const PREDEFINED_CRON_EXPRESSIONS = {
  minutely: '* * * * *',
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *'
} as const;