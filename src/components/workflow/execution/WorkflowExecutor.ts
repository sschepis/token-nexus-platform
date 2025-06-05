import { 
  Workflow, 
  WorkflowExecution, 
  NodeExecution, 
  ExecutionStatus,
  WorkflowNode,
  WorkflowEdge 
} from '@/types/workflows';
import { WorkflowUtils } from '../utils/WorkflowUtils';
import { NodeExecutor } from './NodeExecutor';
import { ExecutionContext } from './ExecutionContext';

export interface ExecutionOptions {
  dryRun?: boolean;
  timeout?: number;
  maxRetries?: number;
  triggerData?: any;
  userId?: string;
  organizationId: string;
}

export interface ExecutionResult {
  success: boolean;
  execution: WorkflowExecution;
  error?: string;
}

export class WorkflowExecutor {
  private nodeExecutor: NodeExecutor;
  private activeExecutions = new Map<string, ExecutionContext>();

  constructor() {
    this.nodeExecutor = new NodeExecutor();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'pending',
      startTime,
      triggeredBy: options.triggerData ? 'trigger' : 'manual',
      triggerData: options.triggerData,
      nodeExecutions: [],
      organizationId: options.organizationId,
      userId: options.userId,
    };

    // Create execution context
    const context = new ExecutionContext(execution, workflow, options);
    this.activeExecutions.set(executionId, context);

    try {
      // Validate workflow before execution
      const validation = WorkflowUtils.validateWorkflow(workflow);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // Get execution order
      const executionOrder = WorkflowUtils.getExecutionOrder(workflow.nodes, workflow.edges);
      if (executionOrder.length === 0) {
        throw new Error('No executable nodes found in workflow');
      }

      // Update execution status
      execution.status = 'running';
      context.updateExecution({ status: 'running' });

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found in workflow`);
        }

        // Check if execution should continue
        if (context.shouldStop()) {
          break;
        }

        // Execute node
        const nodeResult = await this.executeNode(node, context);
        
        // Handle node execution result
        if (!nodeResult.success) {
          if (node.data.config.continueOnError) {
            console.warn(`Node ${nodeId} failed but continuing execution:`, nodeResult.error);
          } else {
            throw new Error(`Node ${nodeId} execution failed: ${nodeResult.error}`);
          }
        }

        // Update context with node output
        context.setNodeOutput(nodeId, nodeResult.output);

        // Handle conditional logic
        if (node.category === 'logic' && node.type.includes('condition')) {
          const shouldContinue = this.evaluateCondition(node, nodeResult.output, context);
          if (!shouldContinue) {
            break;
          }
        }
      }

      // Complete execution
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      execution.status = 'completed';
      execution.endTime = endTime;
      execution.duration = duration;

      context.updateExecution({
        status: 'completed',
        endTime,
        duration,
      });

      return {
        success: true,
        execution,
      };

    } catch (error) {
      // Handle execution error
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      execution.status = 'failed';
      execution.endTime = endTime;
      execution.duration = duration;
      execution.error = errorMessage;

      context.updateExecution({
        status: 'failed',
        endTime,
        duration,
        error: errorMessage,
      });

      return {
        success: false,
        execution,
        error: errorMessage,
      };

    } finally {
      // Clean up
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    const nodeExecution: NodeExecution = {
      id: this.generateNodeExecutionId(),
      nodeId: node.id,
      nodeName: node.name,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0,
    };

    // Add to execution context
    context.addNodeExecution(nodeExecution);

    try {
      // Update status to running
      nodeExecution.status = 'running';
      context.updateNodeExecution(nodeExecution.id, { status: 'running' });

      // Get input data for the node
      const input = this.getNodeInput(node, context);
      nodeExecution.input = input;

      // Execute the node
      const result = await this.nodeExecutor.executeNode(node, input, context);

      // Update execution with result
      const endTime = new Date();
      const duration = endTime.getTime() - nodeExecution.startTime.getTime();

      nodeExecution.status = result.success ? 'completed' : 'failed';
      nodeExecution.endTime = endTime;
      nodeExecution.duration = duration;
      nodeExecution.output = result.output;
      nodeExecution.error = result.error;

      context.updateNodeExecution(nodeExecution.id, {
        status: nodeExecution.status,
        endTime,
        duration,
        output: result.output,
        error: result.error,
      });

      return result;

    } catch (error) {
      // Handle node execution error
      const endTime = new Date();
      const duration = endTime.getTime() - nodeExecution.startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      nodeExecution.status = 'failed';
      nodeExecution.endTime = endTime;
      nodeExecution.duration = duration;
      nodeExecution.error = errorMessage;

      context.updateNodeExecution(nodeExecution.id, {
        status: 'failed',
        endTime,
        duration,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get input data for a node based on connected edges
   */
  private getNodeInput(node: WorkflowNode, context: ExecutionContext): any {
    const workflow = context.getWorkflow();
    const incomingEdges = workflow.edges.filter(edge => edge.target === node.id);

    if (incomingEdges.length === 0) {
      // No incoming edges, use trigger data or empty object
      return context.getTriggerData() || {};
    }

    // Collect outputs from source nodes
    const input: any = {};
    
    for (const edge of incomingEdges) {
      const sourceOutput = context.getNodeOutput(edge.source);
      if (sourceOutput !== undefined) {
        // Merge source output into input
        if (typeof sourceOutput === 'object' && sourceOutput !== null) {
          Object.assign(input, sourceOutput);
        } else {
          input[edge.source] = sourceOutput;
        }
      }
    }

    return input;
  }

  /**
   * Evaluate condition for logic nodes
   */
  private evaluateCondition(
    node: WorkflowNode,
    nodeOutput: any,
    context: ExecutionContext
  ): boolean {
    const condition = node.data.config.condition;
    if (!condition) {
      return true;
    }

    try {
      // Simple condition evaluation
      // In a real implementation, you'd want a more sophisticated expression evaluator
      const variables = {
        ...context.getVariables(),
        output: nodeOutput,
        node: node.data.config,
      };

      // Replace variables in condition
      let evaluatedCondition = condition;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedCondition = evaluatedCondition.replace(regex, JSON.stringify(value));
      }

      // Evaluate the condition (WARNING: This is unsafe for production)
      // In production, use a safe expression evaluator
      return new Function('return ' + evaluatedCondition)();

    } catch (error) {
      console.error('Failed to evaluate condition:', error);
      return false;
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return false;
    }

    context.cancel();
    return true;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    const context = this.activeExecutions.get(executionId);
    return context ? context.getExecution().status : null;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique node execution ID
   */
  private generateNodeExecutionId(): string {
    return `node_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const workflowExecutor = new WorkflowExecutor();