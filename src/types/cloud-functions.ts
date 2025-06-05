export type FunctionLanguage = 'javascript' | 'typescript';
export type FunctionRuntime = 'nodejs18.x' | 'nodejs20.x';
export type FunctionStatus = 'active' | 'disabled' | 'error' | 'draft' | 'deployed';

export interface CloudFunction {
  id: string;
  name: string;
  description: string;
  code: string;
  language: FunctionLanguage;
  runtime: FunctionRuntime;
  status: FunctionStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  category?: string;
  triggers?: string[];
  boundRoutes?: string[];
  executionCount?: number;
  lastExecuted?: string;
  environment?: string;
  version?: number;
  tags?: string[];
}

export interface CloudFunctionState {
  functions: CloudFunction[];
  selectedFunctionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface FunctionExecutionLog {
  id: string;
  functionName: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  executionTime: number;
  userId: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface FunctionStats {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution: Date;
  errorCount: number;
  peakExecutionsPerHour: number;
}

export interface CreateFunctionRequest {
  name: string;
  description: string;
  code: string;
  language: FunctionLanguage;
  runtime: FunctionRuntime;
  category?: string;
  triggers?: string[];
  tags?: string[];
}

export interface UpdateFunctionRequest {
  id: string;
  name?: string;
  description?: string;
  code?: string;
  language?: FunctionLanguage;
  runtime?: FunctionRuntime;
  category?: string;
  triggers?: string[];
  tags?: string[];
  status?: FunctionStatus;
}

export interface ExecuteFunctionRequest {
  functionName: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
}

export interface ExecuteFunctionResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  timestamp: string;
}