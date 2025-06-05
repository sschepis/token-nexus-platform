/**
 * Workflow Service
 * Handles content workflows, versioning, and A/B testing
 */

const Parse = require('parse/node');
const config = require('../config');
const AnalyticsService = require('./AnalyticsService');
const AIService = require('./AIService');

class WorkflowService {
  constructor() {
    // Default configuration if none provided
    const defaultConfig = {
      enabled: false,
      requireApproval: true,
      autoPublish: false,
      notifyOnTransition: true,
      defaultWorkflow: {
        name: 'Default Content Workflow',
        description: 'Standard content approval workflow',
        stages: [
          { id: 'draft', name: 'Draft', type: 'start' },
          { id: 'review', name: 'In Review', type: 'review' },
          { id: 'approved', name: 'Approved', type: 'approval' },
          { id: 'published', name: 'Published', type: 'end' },
        ],
        transitions: [
          { from: 'draft', to: 'review', action: 'submit', roles: ['author', 'editor'] },
          { from: 'review', to: 'approved', action: 'approve', roles: ['editor', 'admin'] },
          { from: 'review', to: 'draft', action: 'reject', roles: ['editor', 'admin'] },
          { from: 'approved', to: 'published', action: 'publish', roles: ['editor', 'admin'] },
        ],
      },
    };

    this.config = config.workflow || defaultConfig;
    this.initialized = false;
  }

  /**
   * Initialize the workflow service
   */
  async initialize() {
    if (!this.config.enabled) {
      console.log('Workflow service is disabled');
      return;
    }

    try {
      // Initialize workflow classes
      await this._initializeClasses();

      // Initialize workflow states
      await this._initializeWorkflowStates();

      this.initialized = true;
      console.log('Workflow service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize workflow service:', error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   * @param {Object} params Workflow parameters
   * @returns {Promise<Object>} Created workflow
   */
  async createWorkflow(params) {
    if (!this.initialized) {
      throw new Error('Workflow service is not initialized');
    }

    const { name, description, stages, transitions, settings } = params;

    try {
      const Workflow = Parse.Object.extend('Workflow');
      const workflow = new Workflow();

      workflow.set('name', name);
      workflow.set('description', description);
      workflow.set('stages', stages);
      workflow.set('transitions', transitions);
      workflow.set('settings', settings);
      workflow.set('status', 'active');

      await workflow.save(null, { useMasterKey: true });
      return workflow;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Start a workflow instance
   * @param {Object} params Instance parameters
   * @returns {Promise<Object>} Workflow instance
   */
  async startWorkflowInstance(params) {
    if (!this.initialized) {
      throw new Error('Workflow service is not initialized');
    }

    const { workflowId, contentId, userId, metadata = {} } = params;

    try {
      // Get workflow definition
      const workflow = await new Parse.Query('Workflow').get(workflowId, { useMasterKey: true });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Create workflow instance
      const WorkflowInstance = Parse.Object.extend('WorkflowInstance');
      const instance = new WorkflowInstance();

      instance.set('workflow', workflow);
      instance.set('contentId', contentId);
      instance.set('userId', userId);
      instance.set('currentStage', workflow.get('stages')[0].id);
      instance.set('history', [
        {
          stage: workflow.get('stages')[0].id,
          timestamp: new Date(),
          userId: userId,
          action: 'start',
        },
      ]);
      instance.set('metadata', metadata);
      instance.set('status', 'active');

      await instance.save(null, { useMasterKey: true });
      return instance;
    } catch (error) {
      console.error('Failed to start workflow instance:', error);
      throw error;
    }
  }

  /**
   * Transition workflow instance to next stage
   * @param {Object} params Transition parameters
   * @returns {Promise<Object>} Updated instance
   */
  async transitionWorkflow(params) {
    if (!this.initialized) {
      throw new Error('Workflow service is not initialized');
    }

    const { instanceId, action, userId, comments = '', metadata = {} } = params;

    try {
      // Get workflow instance
      const instance = await new Parse.Query('WorkflowInstance')
        .include('workflow')
        .get(instanceId, { useMasterKey: true });

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      const workflow = instance.get('workflow');
      const currentStage = instance.get('currentStage');
      const transition = this._findTransition(workflow, currentStage, action);

      if (!transition) {
        throw new Error('Invalid transition');
      }

      // Update instance
      instance.set('currentStage', transition.to);
      instance.add('history', {
        stage: transition.to,
        timestamp: new Date(),
        userId: userId,
        action: action,
        comments: comments,
      });
      instance.set('metadata', { ...instance.get('metadata'), ...metadata });

      // Handle special transitions
      if (transition.type === 'publish') {
        await this._handlePublish(instance);
      } else if (transition.type === 'review') {
        await this._handleReview(instance);
      }

      await instance.save(null, { useMasterKey: true });
      return instance;
    } catch (error) {
      console.error('Failed to transition workflow:', error);
      throw error;
    }
  }

  /**
   * Create content version
   * @param {Object} params Version parameters
   * @returns {Promise<Object>} Created version
   */
  async createVersion(params) {
    if (!this.initialized) {
      throw new Error('Workflow service is not initialized');
    }

    const { contentId, userId, changes, description = '' } = params;

    try {
      const ContentVersion = Parse.Object.extend('ContentVersion');
      const version = new ContentVersion();

      version.set('contentId', contentId);
      version.set('userId', userId);
      version.set('changes', changes);
      version.set('description', description);
      version.set('timestamp', new Date());
      version.set('status', 'created');

      await version.save(null, { useMasterKey: true });
      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  }

  /**
   * Start A/B test
   * @param {Object} params Test parameters
   * @returns {Promise<Object>} Created test
   */
  async startABTest(params) {
    if (!this.initialized) {
      throw new Error('Workflow service is not initialized');
    }

    const { contentId, variants, metrics, duration, userId } = params;

    try {
      const ABTest = Parse.Object.extend('ABTest');
      const test = new ABTest();

      test.set('contentId', contentId);
      test.set('variants', variants);
      test.set('metrics', metrics);
      test.set('duration', duration);
      test.set('startedBy', userId);
      test.set('startDate', new Date());
      test.set('status', 'running');
      test.set('results', {});

      await test.save(null, { useMasterKey: true });

      // Schedule test completion
      setTimeout(async () => {
        await this._completeABTest(test.id);
      }, duration * 1000);

      return test;
    } catch (error) {
      console.error('Failed to start A/B test:', error);
      throw error;
    }
  }

  /**
   * Initialize Parse classes
   * @private
   */
  async _initializeClasses() {
    const schema = new Parse.Schema();
    const classes = [
      {
        className: 'Workflow',
        fields: {
          name: 'String',
          description: 'String',
          stages: 'Array',
          transitions: 'Array',
          settings: 'Object',
          status: 'String',
        },
      },
      {
        className: 'WorkflowInstance',
        fields: {
          workflow: 'Pointer<Workflow>',
          contentId: 'String',
          userId: 'String',
          currentStage: 'String',
          history: 'Array',
          metadata: 'Object',
          status: 'String',
        },
      },
      {
        className: 'ContentVersion',
        fields: {
          contentId: 'String',
          userId: 'String',
          changes: 'Object',
          description: 'String',
          timestamp: 'Date',
          status: 'String',
        },
      },
      {
        className: 'ABTest',
        fields: {
          contentId: 'String',
          variants: 'Array',
          metrics: 'Array',
          duration: 'Number',
          startedBy: 'String',
          startDate: 'Date',
          status: 'String',
          results: 'Object',
        },
      },
    ];

    for (const classConfig of classes) {
      try {
        await schema.get(classConfig.className);
      } catch (error) {
        const classSchema = new Parse.Schema(classConfig.className);
        for (const [field, type] of Object.entries(classConfig.fields)) {
          classSchema.addField(field, type);
        }
        await classSchema.save();
      }
    }
  }

  /**
   * Initialize default workflow states
   * @private
   */
  async _initializeWorkflowStates() {
    const defaultWorkflow = {
      name: 'Default Content Workflow',
      description: 'Standard content approval workflow',
      stages: [
        {
          id: 'draft',
          name: 'Draft',
          type: 'start',
        },
        {
          id: 'review',
          name: 'In Review',
          type: 'review',
        },
        {
          id: 'approved',
          name: 'Approved',
          type: 'approval',
        },
        {
          id: 'published',
          name: 'Published',
          type: 'end',
        },
      ],
      transitions: [
        {
          from: 'draft',
          to: 'review',
          action: 'submit',
          roles: ['author', 'editor'],
        },
        {
          from: 'review',
          to: 'approved',
          action: 'approve',
          roles: ['editor', 'admin'],
        },
        {
          from: 'review',
          to: 'draft',
          action: 'reject',
          roles: ['editor', 'admin'],
        },
        {
          from: 'approved',
          to: 'published',
          action: 'publish',
          roles: ['editor', 'admin'],
        },
      ],
      settings: {
        requireApproval: true,
        autoPublish: false,
        notifyOnTransition: true,
      },
    };

    try {
      const query = new Parse.Query('Workflow');
      query.equalTo('name', defaultWorkflow.name);
      const existing = await query.first({ useMasterKey: true });

      if (!existing) {
        await this.createWorkflow(defaultWorkflow);
      }
    } catch (error) {
      console.error('Failed to initialize workflow states:', error);
      throw error;
    }
  }

  /**
   * Find valid transition
   * @param {Object} workflow Workflow object
   * @param {string} currentStage Current stage
   * @param {string} action Requested action
   * @returns {Object|null} Found transition
   * @private
   */
  _findTransition(workflow, currentStage, action) {
    return workflow.get('transitions').find(t => t.from === currentStage && t.action === action);
  }

  /**
   * Handle publish transition
   * @param {Object} instance Workflow instance
   * @private
   */
  async _handlePublish(instance) {
    try {
      const content = await new Parse.Query('Content').get(instance.get('contentId'), {
        useMasterKey: true,
      });

      if (content) {
        content.set('status', 'published');
        content.set('publishedAt', new Date());
        await content.save(null, { useMasterKey: true });

        // Get AI recommendations for promotion
        const recommendations = await AIService.optimizeContent({
          title: content.get('title'),
          content: content.get('content'),
          type: content.get('type'),
        });

        instance.set('publishMetadata', {
          recommendations,
          analytics: await AnalyticsService.getAnalytics({
            timeframe: '24h',
            metrics: ['pageViews', 'engagement'],
            filters: {
              contentId: content.id,
            },
          }),
        });
      }
    } catch (error) {
      console.error('Failed to handle publish:', error);
      throw error;
    }
  }

  /**
   * Handle review transition
   * @param {Object} instance Workflow instance
   * @private
   */
  async _handleReview(instance) {
    try {
      const content = await new Parse.Query('Content').get(instance.get('contentId'), {
        useMasterKey: true,
      });

      if (content) {
        // Get AI suggestions for improvement
        const suggestions = await AIService.optimizeContent({
          title: content.get('title'),
          content: content.get('content'),
          type: content.get('type'),
        });

        instance.set('reviewMetadata', {
          suggestions,
          aiScore: suggestions.engagement.predictedScore,
          seoScore: suggestions.seo.score,
        });
      }
    } catch (error) {
      console.error('Failed to handle review:', error);
      throw error;
    }
  }

  /**
   * Complete A/B test
   * @param {string} testId Test ID
   * @private
   */
  async _completeABTest(testId) {
    try {
      const test = await new Parse.Query('ABTest').get(testId, { useMasterKey: true });

      if (!test || test.get('status') !== 'running') {
        return;
      }

      // Gather analytics for each variant
      const results = {};
      for (const variant of test.get('variants')) {
        results[variant.id] = await AnalyticsService.getAnalytics({
          timeframe: `${test.get('duration')}s`,
          metrics: test.get('metrics'),
          filters: {
            contentId: test.get('contentId'),
            variant: variant.id,
          },
        });
      }

      // Determine winner
      const winner = this._determineTestWinner(results, test.get('metrics'));

      test.set('status', 'completed');
      test.set('results', {
        variantResults: results,
        winner: winner,
        completedAt: new Date(),
      });

      await test.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Failed to complete A/B test:', error);
    }
  }

  /**
   * Determine A/B test winner
   * @param {Object} results Test results
   * @param {Array} metrics Test metrics
   * @returns {Object} Winner information
   * @private
   */
  _determineTestWinner(results, metrics) {
    const scores = Object.entries(results).map(([variantId, data]) => {
      let score = 0;
      metrics.forEach(metric => {
        score += (data[metric] || 0) * (metric === 'conversion' ? 2 : 1); // Weight conversions higher
      });
      return { variantId, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return {
      variantId: scores[0].variantId,
      score: scores[0].score,
      improvement: ((scores[0].score - scores[1].score) / scores[1].score) * 100,
    };
  }
}

module.exports = new WorkflowService();
