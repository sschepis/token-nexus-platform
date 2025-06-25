export interface ExecutionEnvironment {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CodeExecution {
  id: string;
  environmentId: string;
  code: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecution?: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'inactive' | 'error';
}

export interface AppTrigger {
  id: string;
  name: string;
  event: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface AppAPI {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  enabled: boolean;
  configuration: Record<string, any>;
}