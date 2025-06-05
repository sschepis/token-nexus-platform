/**
 * AI Cloud Functions
 * Exposes AI/ML functionality through Parse Cloud Functions
 */

const AIService = require('../services/AIService');

/**
 * Initialize AI cloud functions
 */
function initialize() {
  // Optimize content
  Parse.Cloud.define('optimizeContent', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.content) {
        throw new Error('Missing required parameter: content');
      }

      const suggestions = await AIService.optimizeContent(params.content);
      return suggestions;
    } catch (error) {
      console.error('Content optimization error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to optimize content');
    }
  });

  // Generate tags
  Parse.Cloud.define('generateTags', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.content) {
        throw new Error('Missing required parameter: content');
      }

      const tags = await AIService.generateTags(params.content);
      return tags;
    } catch (error) {
      console.error('Tag generation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to generate tags');
    }
  });

  // Get optimal schedule
  Parse.Cloud.define('getOptimalSchedule', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.content) {
        throw new Error('Missing required parameter: content');
      }

      const schedule = await AIService.getOptimalSchedule(params.content);
      return schedule;
    } catch (error) {
      console.error('Schedule optimization error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get optimal schedule');
    }
  });

  // Get content suggestions
  Parse.Cloud.define('getContentSuggestions', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      const suggestions = await AIService.getContentSuggestions(params);
      return suggestions;
    } catch (error) {
      console.error('Content suggestions error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get content suggestions');
    }
  });

  // Before save trigger for Content
  Parse.Cloud.beforeSave('Content', async request => {
    try {
      const content = request.object;

      // Only process if content is new or significantly modified
      if (request.original) {
        const originalContent = request.original.get('content');
        const newContent = content.get('content');

        if (originalContent === newContent) {
          return;
        }
      }

      // Generate tags if none provided
      if (!content.get('tags') || content.get('tags').length === 0) {
        const tags = await AIService.generateTags({
          title: content.get('title'),
          content: content.get('content'),
        });
        content.set('tags', tags);
      }

      // Add AI-generated metadata
      const metadata = await AIService.optimizeContent({
        title: content.get('title'),
        content: content.get('content'),
        type: content.get('type'),
        audience: content.get('audience'),
      });

      content.set('aiMetadata', metadata);
    } catch (error) {
      console.error('Content AI processing error:', error);
      // Don't block save on AI processing error
    }
  });

  // After save trigger for analytics-based suggestions
  Parse.Cloud.afterSave('AnalyticsEvent', async request => {
    try {
      const event = request.object;

      // Only process relevant analytics events
      if (event.get('type') !== 'pageView' && event.get('type') !== 'engagement') {
        return;
      }

      // Update content suggestions based on new analytics data
      const contentId = event.get('data').contentId;
      if (contentId) {
        const query = new Parse.Query('Content');
        const content = await query.get(contentId, { useMasterKey: true });

        if (content) {
          const suggestions = await AIService.getContentSuggestions({
            contentId,
            timeframe: '24h',
          });

          content.set('aiSuggestions', suggestions);
          await content.save(null, { useMasterKey: true });
        }
      }
    } catch (error) {
      console.error('Analytics-based suggestions error:', error);
    }
  });
}

module.exports = {
  initialize,
};
