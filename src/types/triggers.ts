export type TriggerType = 'beforeSave' | 'afterSave' | 'beforeDelete' | 'afterDelete' | 'beforeFind' | 'afterFind';
export type TriggerStatus = 'active' | 'disabled' | 'error' | 'draft';

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'greaterThan' | 'lessThan';
  value: string;
}

export interface ParseTrigger {
  id: string;
  name: string;
  description: string;
  className: string; // Parse class name (e.g., 'User', 'Post', etc.)
  triggerType: TriggerType;
  code: string;
  status: TriggerStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  tags?: string[];
  executionCount?: number;
  lastExecuted?: string;
  errorCount?: number;
  lastError?: string;
  conditions?: string; // Optional conditions for when trigger should fire
}

export interface TriggerState {
  triggers: ParseTrigger[];
  selectedTriggerId: string | null;
  isLoading: boolean;
  error: string | null;
  availableClasses: string[];
}

export interface CreateTriggerRequest {
  name: string;
  description: string;
  className: string;
  triggerType: TriggerType;
  code: string;
  conditions?: string;
  tags?: string[];
}

export interface UpdateTriggerRequest {
  id: string;
  name?: string;
  description?: string;
  code?: string;
  conditions?: string;
  tags?: string[];
  status?: TriggerStatus;
}

export interface TriggerExecutionLog {
  id: string;
  triggerId: string;
  triggerName: string;
  className: string;
  triggerType: TriggerType;
  timestamp: string;
  executionTime: number;
  success: boolean;
  error?: string;
  objectId?: string;
  userId?: string;
}

export interface TriggerStats {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution?: Date;
  errorCount: number;
  peakExecutionsPerHour: number;
}