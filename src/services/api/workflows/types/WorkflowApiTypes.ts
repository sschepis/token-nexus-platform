export interface WorkflowFilters {
  status?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
}

export interface WorkflowExecutionFilters {
  workflowId?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export interface NodeTypeFilters {
  category?: string;
}

export interface WorkflowValidationParams {
  workflowId?: string;
  nodes?: any[];
  edges?: any[];
}

export interface WorkflowStatisticsParams {
  timeRange?: string;
  workflowId?: string;
}