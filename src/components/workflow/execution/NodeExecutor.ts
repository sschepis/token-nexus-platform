import { WorkflowNode } from '@/types/workflows';
import { ExecutionContext } from './ExecutionContext';

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    logs: string[];
  };
}

export class NodeExecutor {
  /**
   * Execute a workflow node
   */
  async executeNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    let retryCount = 0;
    const maxRetries = context.getMaxRetries();

    while (retryCount <= maxRetries) {
      try {
        context.log('info', `Executing node ${node.name} (${node.type})`, { nodeId: node.id, attempt: retryCount + 1 });
        
        let result: any;
        
        // Execute based on node category
        switch (node.category) {
          case 'trigger':
            result = await this.executeTriggerNode(node, input, context);
            break;
          case 'action':
            result = await this.executeActionNode(node, input, context);
            break;
          case 'logic':
            result = await this.executeLogicNode(node, input, context);
            break;
          case 'integration':
            result = await this.executeIntegrationNode(node, input, context);
            break;
          default:
            throw new Error(`Unknown node category: ${node.category}`);
        }

        const executionTime = Date.now() - startTime;
        
        context.log('info', `Node ${node.name} executed successfully`, { 
          nodeId: node.id, 
          executionTime,
          output: result 
        });

        return {
          success: true,
          output: result,
          metadata: {
            executionTime,
            retryCount,
            logs,
          },
        };

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        context.log('error', `Node ${node.name} execution failed (attempt ${retryCount})`, { 
          nodeId: node.id, 
          error: errorMessage 
        });

        logs.push(`Attempt ${retryCount}: ${errorMessage}`);

        if (retryCount > maxRetries) {
          const executionTime = Date.now() - startTime;
          
          return {
            success: false,
            error: errorMessage,
            metadata: {
              executionTime,
              retryCount: retryCount - 1,
              logs,
            },
          };
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected execution path');
  }

  /**
   * Execute trigger node
   */
  private async executeTriggerNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    // Trigger nodes typically just pass through their trigger data
    // In a real implementation, this might validate trigger conditions
    
    const config = node.data.config;
    
    switch (node.type) {
      case 'parse-trigger':
        return this.executeParseServerTrigger(config, input, context);
      case 'webhook-trigger':
        return this.executeWebhookTrigger(config, input, context);
      case 'schedule-trigger':
        return this.executeScheduleTrigger(config, input, context);
      default:
        return input || context.getTriggerData() || {};
    }
  }

  /**
   * Execute action node
   */
  private async executeActionNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    const config = node.data.config;
    
    if (context.isDryRun()) {
      context.log('info', `Dry run: Would execute action ${node.type}`, { config, input });
      return { dryRun: true, action: node.type, input };
    }

    switch (node.type) {
      case 'email-action':
        return this.executeEmailAction(config, input, context);
      case 'notification-action':
        return this.executeNotificationAction(config, input, context);
      case 'api-action':
        return this.executeApiAction(config, input, context);
      case 'ai-action':
        return this.executeAiAction(config, input, context);
      case 'workflow-action':
        return this.executeWorkflowAction(config, input, context);
      default:
        throw new Error(`Unknown action type: ${node.type}`);
    }
  }

  /**
   * Execute logic node
   */
  private async executeLogicNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    const config = node.data.config;
    
    switch (node.type) {
      case 'condition-logic':
        return this.executeConditionLogic(config, input, context);
      case 'loop-logic':
        return this.executeLoopLogic(config, input, context);
      case 'transform-logic':
        return this.executeTransformLogic(config, input, context);
      case 'delay-logic':
        return this.executeDelayLogic(config, input, context);
      case 'parallel-logic':
        return this.executeParallelLogic(config, input, context);
      default:
        throw new Error(`Unknown logic type: ${node.type}`);
    }
  }

  /**
   * Execute integration node
   */
  private async executeIntegrationNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    const config = node.data.config;
    
    if (context.isDryRun()) {
      context.log('info', `Dry run: Would execute integration ${node.type}`, { config, input });
      return { dryRun: true, integration: node.type, input };
    }

    // Integration nodes would connect to external services
    // This is a simplified implementation
    return {
      integration: node.type,
      config,
      input,
      timestamp: new Date().toISOString(),
    };
  }

  // Specific node type implementations

  private async executeParseServerTrigger(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Parse Server trigger implementation
    return {
      triggerType: 'parse',
      className: config.className,
      triggerEvent: config.triggerEvent,
      object: input,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeWebhookTrigger(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Webhook trigger implementation
    return {
      triggerType: 'webhook',
      webhookUrl: config.webhookUrl,
      payload: input,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeScheduleTrigger(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Schedule trigger implementation
    return {
      triggerType: 'schedule',
      schedule: config.schedule,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeEmailAction(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Email action implementation
    const emailData = {
      to: this.interpolateString(config.to, input, context),
      subject: this.interpolateString(config.subject, input, context),
      template: config.template,
      data: input,
    };

    context.log('info', 'Sending email', emailData);
    
    // In a real implementation, this would send an actual email
    return {
      action: 'email',
      sent: true,
      emailData,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeNotificationAction(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Notification action implementation
    const notificationData = {
      type: config.notificationType || 'push',
      message: this.interpolateString(config.message, input, context),
      recipients: config.recipients || [],
      data: input,
    };

    context.log('info', 'Sending notification', notificationData);
    
    return {
      action: 'notification',
      sent: true,
      notificationData,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeApiAction(config: any, input: any, context: ExecutionContext): Promise<any> {
    // API action implementation
    const url = this.interpolateString(config.url, input, context);
    const method = config.method || 'GET';
    const headers = config.headers || {};
    const body = config.body ? this.interpolateObject(config.body, input, context) : undefined;

    context.log('info', 'Making API request', { url, method, headers });

    // In a real implementation, this would make an actual HTTP request
    return {
      action: 'api',
      request: { url, method, headers, body },
      response: { status: 200, data: { success: true } },
      timestamp: new Date().toISOString(),
    };
  }

  private async executeAiAction(config: any, input: any, context: ExecutionContext): Promise<any> {
    // AI action implementation
    const prompt = this.interpolateString(config.aiPrompt, input, context);
    const model = config.model || 'gpt-4';

    context.log('info', 'Processing with AI', { prompt, model });

    // In a real implementation, this would call an AI service
    return {
      action: 'ai',
      prompt,
      model,
      response: 'AI response would go here',
      timestamp: new Date().toISOString(),
    };
  }

  private async executeWorkflowAction(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Sub-workflow execution
    const workflowId = config.workflowId;
    
    context.log('info', 'Executing sub-workflow', { workflowId, input });

    // In a real implementation, this would execute another workflow
    return {
      action: 'workflow',
      workflowId,
      input,
      result: 'Sub-workflow execution result would go here',
      timestamp: new Date().toISOString(),
    };
  }

  private async executeConditionLogic(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Condition logic implementation
    const condition = config.condition;
    const result = this.evaluateCondition(condition, input, context);
    
    return {
      logic: 'condition',
      condition,
      result,
      input,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeLoopLogic(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Loop logic implementation
    const loopCount = config.loopCount || 1;
    const results = [];

    for (let i = 0; i < loopCount; i++) {
      results.push({
        iteration: i + 1,
        input,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      logic: 'loop',
      loopCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeTransformLogic(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Transform logic implementation
    const script = config.transformScript;
    
    // In a real implementation, this would safely execute the transform script
    return {
      logic: 'transform',
      script,
      input,
      output: input, // Placeholder - would be transformed data
      timestamp: new Date().toISOString(),
    };
  }

  private async executeDelayLogic(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Delay logic implementation
    const delayMs = config.delayMs || 1000;
    
    if (!context.isDryRun()) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return {
      logic: 'delay',
      delayMs,
      input,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeParallelLogic(config: any, input: any, context: ExecutionContext): Promise<any> {
    // Parallel logic implementation
    const branches = config.branches || 1;
    
    return {
      logic: 'parallel',
      branches,
      input,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods

  private interpolateString(template: string, input: any, context: ExecutionContext): string {
    if (!template) return '';
    
    let result = template;
    
    // Replace {{variable}} patterns
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getVariableValue(variable.trim(), input, context);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  private interpolateObject(obj: any, input: any, context: ExecutionContext): any {
    if (typeof obj === 'string') {
      return this.interpolateString(obj, input, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, input, context));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, input, context);
      }
      return result;
    }
    
    return obj;
  }

  private getVariableValue(variable: string, input: any, context: ExecutionContext): any {
    // Check input first
    if (input && typeof input === 'object' && variable in input) {
      return input[variable];
    }
    
    // Check context variables
    const contextValue = context.getVariable(variable);
    if (contextValue !== undefined) {
      return contextValue;
    }
    
    // Check node outputs
    const nodeOutput = context.getNodeOutput(variable);
    if (nodeOutput !== undefined) {
      return nodeOutput;
    }
    
    return undefined;
  }

  private evaluateCondition(condition: string, input: any, context: ExecutionContext): boolean {
    if (!condition) return true;
    
    try {
      // Simple condition evaluation
      // In production, use a safe expression evaluator
      const variables = {
        ...context.getVariables(),
        ...input,
        input,
      };

      let evaluatedCondition = condition;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedCondition = evaluatedCondition.replace(regex, JSON.stringify(value));
      }

      return new Function('return ' + evaluatedCondition)();
    } catch (error) {
      context.log('error', 'Failed to evaluate condition', { condition, error });
      return false;
    }
  }
}