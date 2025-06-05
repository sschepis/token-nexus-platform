import { 
  WorkflowExecution, 
  NodeExecution, 
  Workflow,
  ExecutionStatus 
} from '@/types/workflows';

export interface ExecutionOptions {
  dryRun?: boolean;
  timeout?: number;
  maxRetries?: number;
  triggerData?: any;
  userId?: string;
  organizationId: string;
}

export class ExecutionContext {
  private execution: WorkflowExecution;
  private workflow: Workflow;
  private options: ExecutionOptions;
  private variables: Record<string, any> = {};
  private nodeOutputs: Record<string, any> = {};
  private cancelled = false;

  constructor(
    execution: WorkflowExecution,
    workflow: Workflow,
    options: ExecutionOptions
  ) {
    this.execution = execution;
    this.workflow = workflow;
    this.options = options;
    
    // Initialize variables with trigger data
    if (options.triggerData) {
      this.variables = { ...options.triggerData };
    }
  }

  /**
   * Get the current execution
   */
  getExecution(): WorkflowExecution {
    return this.execution;
  }

  /**
   * Get the workflow being executed
   */
  getWorkflow(): Workflow {
    return this.workflow;
  }

  /**
   * Get execution options
   */
  getOptions(): ExecutionOptions {
    return this.options;
  }

  /**
   * Update execution properties
   */
  updateExecution(updates: Partial<WorkflowExecution>): void {
    Object.assign(this.execution, updates);
  }

  /**
   * Add a node execution
   */
  addNodeExecution(nodeExecution: NodeExecution): void {
    this.execution.nodeExecutions.push(nodeExecution);
  }

  /**
   * Update a node execution
   */
  updateNodeExecution(nodeExecutionId: string, updates: Partial<NodeExecution>): void {
    const nodeExecution = this.execution.nodeExecutions.find(ne => ne.id === nodeExecutionId);
    if (nodeExecution) {
      Object.assign(nodeExecution, updates);
    }
  }

  /**
   * Get a node execution by ID
   */
  getNodeExecution(nodeExecutionId: string): NodeExecution | undefined {
    return this.execution.nodeExecutions.find(ne => ne.id === nodeExecutionId);
  }

  /**
   * Get node executions by node ID
   */
  getNodeExecutionsByNodeId(nodeId: string): NodeExecution[] {
    return this.execution.nodeExecutions.filter(ne => ne.nodeId === nodeId);
  }

  /**
   * Set a variable
   */
  setVariable(key: string, value: any): void {
    this.variables[key] = value;
  }

  /**
   * Get a variable
   */
  getVariable(key: string): any {
    return this.variables[key];
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, any> {
    return { ...this.variables };
  }

  /**
   * Set node output
   */
  setNodeOutput(nodeId: string, output: any): void {
    this.nodeOutputs[nodeId] = output;
  }

  /**
   * Get node output
   */
  getNodeOutput(nodeId: string): any {
    return this.nodeOutputs[nodeId];
  }

  /**
   * Get all node outputs
   */
  getNodeOutputs(): Record<string, any> {
    return { ...this.nodeOutputs };
  }

  /**
   * Get trigger data
   */
  getTriggerData(): any {
    return this.options.triggerData;
  }

  /**
   * Check if execution should stop
   */
  shouldStop(): boolean {
    return this.cancelled || this.execution.status === 'cancelled';
  }

  /**
   * Cancel the execution
   */
  cancel(): void {
    this.cancelled = true;
    this.updateExecution({ status: 'cancelled' });
  }

  /**
   * Check if execution is cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Check if this is a dry run
   */
  isDryRun(): boolean {
    return this.options.dryRun === true;
  }

  /**
   * Get timeout value
   */
  getTimeout(): number {
    return this.options.timeout || 300000; // 5 minutes default
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.options.maxRetries || 3;
  }

  /**
   * Log execution event
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      executionId: this.execution.id,
    };

    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    
    // In a real implementation, you'd want to store these logs
    // in a persistent storage system
  }

  /**
   * Create a snapshot of the current context
   */
  createSnapshot(): {
    execution: WorkflowExecution;
    variables: Record<string, any>;
    nodeOutputs: Record<string, any>;
  } {
    return {
      execution: JSON.parse(JSON.stringify(this.execution)),
      variables: { ...this.variables },
      nodeOutputs: { ...this.nodeOutputs },
    };
  }

  /**
   * Restore context from snapshot
   */
  restoreFromSnapshot(snapshot: {
    execution: WorkflowExecution;
    variables: Record<string, any>;
    nodeOutputs: Record<string, any>;
  }): void {
    this.execution = snapshot.execution;
    this.variables = snapshot.variables;
    this.nodeOutputs = snapshot.nodeOutputs;
  }
}