/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Result of action execution
 */
export interface ActionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
  metadata?: {
    executionTime?: number;
    timestamp: Date;
    actionId: string;
    userId: string;
    executedByAI?: boolean;
    aiExecutionTimestamp?: Date;
  };
}

/**
 * Action validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    parameter: string;
    message: string;
    value: unknown;
  }>;
}