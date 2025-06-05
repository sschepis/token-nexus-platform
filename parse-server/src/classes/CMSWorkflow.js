/**
 * CMS Workflow Class
 * Manages business processes and multi-step operations
 */

const Parse = require('parse/node');

class CMSWorkflow extends Parse.Object {
  constructor() {
    super('CMSWorkflow');
  }

  static get className() {
    return 'CMSWorkflow';
  }

  static get schema() {
    return {
      // Basic Info
      name: { type: 'String', required: true },
      description: { type: 'String' },
      version: { type: 'String', default: '1.0.0' },
      status: {
        type: 'String',
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft',
      },

      // Relationships
      application: { type: 'Pointer', targetClass: 'CMSApplication', required: true },
      createdBy: { type: 'Pointer', targetClass: '_User', required: true },

      // Workflow Definition
      steps: {
        type: 'Array',
        required: true,
        default: [],
      },

      // Input/Output Schema
      inputSchema: {
        type: 'Object',
        default: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      outputSchema: {
        type: 'Object',
        default: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // Access Control
      permissions: {
        type: 'Object',
        default: {
          start: [], // Roles that can start workflow
          view: [], // Roles that can view workflow
          manage: [], // Roles that can manage workflow
        },
      },

      // Execution Settings
      settings: {
        type: 'Object',
        default: {
          timeout: 3600, // Workflow timeout in seconds
          maxRetries: 3,
          concurrency: 10, // Max concurrent instances
          keepCompleted: 30, // Days to keep completed instances
          async: true,
        },
      },

      // Variables
      variables: {
        type: 'Array',
        default: [],
      },

      // Statistics
      stats: {
        type: 'Object',
        default: {
          totalInstances: 0,
          completedInstances: 0,
          failedInstances: 0,
          averageDuration: 0,
        },
      },

      // Metadata
      createdAt: { type: 'Date', required: true },
      updatedAt: { type: 'Date', required: true },
      publishedAt: { type: 'Date' },
    };
  }

  /**
   * Initialize workflow
   */
  static async initialize(params) {
    const {
      name,
      description,
      application,
      createdBy,
      steps,
      inputSchema,
      outputSchema,
      settings = {},
    } = params;

    const workflow = new CMSWorkflow();
    workflow.set('name', name);
    workflow.set('description', description);
    workflow.set('application', application);
    workflow.set('createdBy', createdBy);
    workflow.set('steps', steps);
    workflow.set('inputSchema', inputSchema);
    workflow.set('outputSchema', outputSchema);
    workflow.set('settings', {
      ...workflow.get('settings'),
      ...settings,
    });

    return workflow.save(null, { useMasterKey: true });
  }

  /**
   * Start workflow instance
   */
  async startInstance(input = {}, context = {}) {
    // Validate input
    this.validateInput(input);

    // Create workflow instance
    const instance = new Parse.Object('CMSWorkflowInstance');
    instance.set('workflow', this);
    instance.set('status', 'running');
    instance.set('input', input);
    instance.set('context', context);
    instance.set('currentStep', this.getInitialStep());
    instance.set('variables', this.initializeVariables());

    await instance.save(null, { useMasterKey: true });

    // Start execution
    return this.executeInstance(instance);
  }

  /**
   * Execute workflow instance
   */
  async executeInstance(instance) {
    const startTime = Date.now();
    const context = {
      workflow: this,
      instance,
      variables: instance.get('variables'),
      history: [],
    };

    try {
      let currentStep = instance.get('currentStep');

      while (currentStep) {
        // Execute step
        const result = await this.executeStep(currentStep, context);

        // Record step execution
        context.history.push({
          step: currentStep.id,
          result,
          timestamp: new Date(),
        });

        // Update instance variables
        instance.set('variables', context.variables);

        // Get next step
        currentStep = this.getNextStep(currentStep, result, context);
        instance.set('currentStep', currentStep);

        await instance.save(null, { useMasterKey: true });
      }

      // Workflow completed
      instance.set('status', 'completed');
      instance.set('completedAt', new Date());
      instance.set('duration', Date.now() - startTime);

      await instance.save(null, { useMasterKey: true });
      await this.updateStats({ success: true, duration: instance.get('duration') });

      return instance;
    } catch (error) {
      // Handle workflow error
      instance.set('status', 'failed');
      instance.set('error', error.message);
      instance.set('failedAt', new Date());

      await instance.save(null, { useMasterKey: true });
      await this.updateStats({ success: false, duration: Date.now() - startTime });

      throw error;
    }
  }

  /**
   * Execute workflow step
   */
  async executeStep(step, context) {
    switch (step.type) {
      case 'task':
        return this.executeTask(step, context);

      case 'decision':
        return this.executeDecision(step, context);

      case 'parallel':
        return this.executeParallel(step, context);

      case 'wait':
        return this.executeWait(step, context);

      case 'subprocess':
        return this.executeSubprocess(step, context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Get next step based on current step result
   */
  getNextStep(currentStep, result, context) {
    if (!currentStep.next || currentStep.next.length === 0) {
      return null; // Workflow complete
    }

    // Evaluate conditions if multiple next steps
    if (currentStep.next.length > 1) {
      for (const nextStepId of currentStep.next) {
        const conditions = currentStep.conditions[nextStepId];
        if (this.evaluateConditions(conditions, result, context)) {
          return this.getStepById(nextStepId);
        }
      }
      return null;
    }

    return this.getStepById(currentStep.next[0]);
  }

  /**
   * Validate workflow input
   */
  validateInput(input) {
    const schema = this.get('inputSchema');
    // Implement JSON Schema validation
    return true;
  }

  /**
   * Initialize workflow variables
   */
  initializeVariables() {
    return this.get('variables').reduce((acc, variable) => {
      acc[variable.name] = variable.default;
      return acc;
    }, {});
  }

  /**
   * Update workflow statistics
   */
  async updateStats({ success, duration }) {
    const stats = this.get('stats');

    stats.totalInstances++;
    if (success) {
      stats.completedInstances++;
    } else {
      stats.failedInstances++;
    }

    stats.averageDuration =
      (stats.averageDuration * (stats.totalInstances - 1) + duration) / stats.totalInstances;

    this.set('stats', stats);
    await this.save(null, { useMasterKey: true });
  }

  /**
   * Get step by ID
   */
  getStepById(stepId) {
    return this.get('steps').find(step => step.id === stepId);
  }

  /**
   * Get initial workflow step
   */
  getInitialStep() {
    return this.get('steps')[0];
  }

  /**
   * Before save trigger
   */
  static async beforeSave(request) {
    const workflow = request.object;

    // Set timestamps
    if (!workflow.get('createdAt')) {
      workflow.set('createdAt', new Date());
    }
    workflow.set('updatedAt', new Date());

    // Validate workflow definition
    this.validateWorkflowDefinition(workflow);
  }

  /**
   * Validate workflow definition
   */
  static validateWorkflowDefinition(workflow) {
    const steps = workflow.get('steps');

    // Ensure at least one step
    if (!steps || steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate step references
    const stepIds = new Set(steps.map(step => step.id));
    steps.forEach(step => {
      (step.next || []).forEach(nextId => {
        if (!stepIds.has(nextId)) {
          throw new Error(`Invalid step reference: ${nextId}`);
        }
      });
    });

    // Validate no cycles
    this.validateNoCycles(steps);
  }

  /**
   * Validate workflow has no cycles
   */
  static validateNoCycles(steps) {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = stepId => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step && step.next) {
        for (const nextId of step.next) {
          if (hasCycle(nextId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    if (hasCycle(steps[0].id)) {
      throw new Error('Workflow contains cycles');
    }
  }
}

Parse.Object.registerSubclass('CMSWorkflow', CMSWorkflow);
module.exports = CMSWorkflow;
