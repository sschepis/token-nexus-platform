/**
 * Workflow Cloud Functions
 * Exposes workflow functionality through Parse Cloud Functions
 */

const WorkflowService = require('../services/WorkflowService');

/**
 * Initialize workflow cloud functions
 */
function initialize() {
  // Create workflow
  Parse.Cloud.define('createWorkflow', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.name || !params.stages || !params.transitions) {
        throw new Error('Missing required parameters: name, stages, and transitions are required');
      }

      const workflow = await WorkflowService.createWorkflow(params);
      return workflow;
    } catch (error) {
      console.error('Workflow creation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create workflow');
    }
  });

  // Start workflow instance
  Parse.Cloud.define('startWorkflowInstance', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.workflowId || !params.contentId) {
        throw new Error('Missing required parameters: workflowId and contentId are required');
      }

      const instance = await WorkflowService.startWorkflowInstance({
        ...params,
        userId: user.id,
      });
      return instance;
    } catch (error) {
      console.error('Workflow instance creation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to start workflow instance');
    }
  });

  // Transition workflow
  Parse.Cloud.define('transitionWorkflow', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.instanceId || !params.action) {
        throw new Error('Missing required parameters: instanceId and action are required');
      }

      const instance = await WorkflowService.transitionWorkflow({
        ...params,
        userId: user.id,
      });
      return instance;
    } catch (error) {
      console.error('Workflow transition error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to transition workflow');
    }
  });

  // Create content version
  Parse.Cloud.define('createVersion', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.contentId || !params.changes) {
        throw new Error('Missing required parameters: contentId and changes are required');
      }

      const version = await WorkflowService.createVersion({
        ...params,
        userId: user.id,
      });
      return version;
    } catch (error) {
      console.error('Version creation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create version');
    }
  });

  // Start A/B test
  Parse.Cloud.define('startABTest', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.contentId || !params.variants || !params.metrics || !params.duration) {
        throw new Error(
          'Missing required parameters: contentId, variants, metrics, and duration are required'
        );
      }

      const test = await WorkflowService.startABTest({
        ...params,
        userId: user.id,
      });
      return test;
    } catch (error) {
      console.error('A/B test creation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to start A/B test');
    }
  });

  // Before save trigger for Content
  Parse.Cloud.beforeSave('Content', async request => {
    try {
      const content = request.object;
      const user = request.user;

      // Only process if content is being updated
      if (request.original) {
        const changes = {};
        const fields = ['title', 'content', 'metadata'];

        fields.forEach(field => {
          const oldValue = request.original.get(field);
          const newValue = content.get(field);

          if (oldValue !== newValue) {
            changes[field] = {
              old: oldValue,
              new: newValue,
            };
          }
        });

        // Create version if there are changes
        if (Object.keys(changes).length > 0) {
          await WorkflowService.createVersion({
            contentId: content.id,
            userId: user ? user.id : 'system',
            changes,
            description: 'Auto-generated version',
          });
        }
      }
    } catch (error) {
      console.error('Content version creation error:', error);
      // Don't block save on version creation error
    }
  });

  // After save trigger for WorkflowInstance
  Parse.Cloud.afterSave('WorkflowInstance', async request => {
    try {
      const instance = request.object;

      // Get associated content
      const query = new Parse.Query('Content');
      const content = await query.get(instance.get('contentId'), { useMasterKey: true });

      if (content) {
        // Update content status based on workflow stage
        const currentStage = instance.get('currentStage');
        content.set('workflowStatus', currentStage);

        // Handle special stages
        if (currentStage === 'published') {
          content.set('status', 'published');
          content.set('publishedAt', new Date());
        } else if (currentStage === 'draft') {
          content.set('status', 'draft');
        }

        await content.save(null, { useMasterKey: true });
      }
    } catch (error) {
      console.error('Workflow after save error:', error);
    }
  });

  // After save trigger for ABTest
  Parse.Cloud.afterSave('ABTest', async request => {
    try {
      const test = request.object;

      // Only process completed tests
      if (test.get('status') === 'completed') {
        const results = test.get('results');
        const winner = results.winner;

        if (winner) {
          // Update content with winning variant
          const query = new Parse.Query('Content');
          const content = await query.get(test.get('contentId'), { useMasterKey: true });

          if (content) {
            const winningVariant = test.get('variants').find(v => v.id === winner.variantId);
            if (winningVariant) {
              Object.entries(winningVariant.changes).forEach(([key, value]) => {
                content.set(key, value);
              });

              content.set('abTestResults', {
                testId: test.id,
                winner: winner,
                appliedAt: new Date(),
              });

              await content.save(null, { useMasterKey: true });
            }
          }
        }
      }
    } catch (error) {
      console.error('A/B test after save error:', error);
    }
  });
}

module.exports = {
  initialize,
};
