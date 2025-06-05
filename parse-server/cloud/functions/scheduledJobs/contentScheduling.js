/* global Parse */

const contentScheduling = require('../../../src/services/ContentSchedulingService');
const AIService = require('../../../src/services/AIService');

// Initialize services
contentScheduling.initialize({
  ai: AIService,
});

/**
 * Schedule content for publishing
 */
const scheduleContent = request => {
  const { contentId, publishAt, timezone, recurrence } = request.params;

  if (!contentId) {
    throw new Error('Content ID is required');
  }

  return contentScheduling.scheduleContent({
    contentId,
    publishAt: publishAt ? new Date(publishAt) : null,
    timezone,
    recurrence,
  });
};

/**
 * Process scheduled content
 * This is called by a background job
 */
const processScheduledContent = () => contentScheduling.processScheduledContent();

/**
 * Get optimal publishing time
 */
const getOptimalPublishTime = async request => {
  const { contentId, timezone } = request.params;

  if (!contentId) {
    throw new Error('Content ID is required');
  }

  const content = await new Parse.Query('CMSContent').get(contentId, { useMasterKey: true });

  if (!content) {
    throw new Error('Content not found');
  }

  const schedule = await AIService.getOptimalSchedule({
    title: content.get('title'),
    content: content.get('content'),
    type: content.get('type'),
    timezone,
  });

  return {
    recommendedTime: schedule.recommendedTime,
    confidence: schedule.confidence,
    reasoning: schedule.reasoning,
  };
};

module.exports = {
  scheduleContent,
  processScheduledContent,
  getOptimalPublishTime,
};
