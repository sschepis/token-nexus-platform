/* eslint-disable no-underscore-dangle */
const Parse = require('parse/node');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errors');

/**
 * Content Scheduling Service
 * Handles content scheduling, publishing, and optimization
 */
class ContentSchedulingService {
  constructor(dependencies = {}) {
    this.initialized = false;
    this.dependencies = dependencies;
  }

  initialize(dependencies = {}) {
    this.dependencies = {
      ...this.dependencies,
      ...dependencies,
    };
    this.initialized = true;
  }

  validateInitialization() {
    if (!this.initialized) {
      throw new Error('ContentSchedulingService not initialized');
    }
  }

  /**
   * Schedule content for publishing
   * @param {Object} params Scheduling parameters
   * @param {string} params.contentId Content ID
   * @param {Date} params.publishAt Publish date/time
   * @param {string} params.timezone Publisher's timezone
   * @param {Object} params.recurrence Optional recurrence settings
   * @return {Promise<Object>} Scheduled content details
   */
  async scheduleContent(params) {
    this.validateInitialization();
    const { contentId, publishAt, timezone, recurrence } = params;

    try {
      // Get content
      const content = await new Parse.Query('CMSContent').get(contentId, { useMasterKey: true });

      if (!content) {
        throw new Error('Content not found');
      }

      // Get optimal publishing time if not specified
      const actualPublishTime = publishAt || (await this._getOptimalPublishTime(content, timezone));

      // Create schedule entry
      const schedule = new Parse.Object('CMSContentSchedule');

      schedule.set({
        content: content,
        publishAt: actualPublishTime,
        timezone,
        status: 'pending',
        recurrence,
      });

      await schedule.save(null, { useMasterKey: true });

      // Update content status
      content.set('status', 'scheduled');
      content.set('scheduledAt', actualPublishTime);
      await content.save(null, { useMasterKey: true });

      return {
        scheduleId: schedule.id,
        contentId: content.id,
        publishAt: actualPublishTime,
        status: 'scheduled',
      };
    } catch (error) {
      throw handleError(error, 'content scheduling');
    }
  }

  /**
   * Process scheduled content
   * @return {Promise<Object>} Processing results
   */
  async processScheduledContent() {
    this.validateInitialization();

    try {
      const now = new Date();

      // Find due schedules
      const scheduleQuery = new Parse.Query('CMSContentSchedule')
        .equalTo('status', 'pending')
        .lessThanOrEqualTo('publishAt', now);

      const dueSchedules = await scheduleQuery.find({ useMasterKey: true });

      const results = {
        processed: 0,
        errors: 0,
        details: [],
      };

      // Process each schedule
      for (const schedule of dueSchedules) {
        try {
          const content = schedule.get('content');

          // Publish content
          await Parse.Cloud.run('publishContent', {
            contentId: content.id,
          });

          // Handle recurrence
          const recurrence = schedule.get('recurrence');

          if (recurrence) {
            await this._scheduleNextOccurrence(schedule);
          } else {
            schedule.set('status', 'completed');
          }

          results.processed++;
          results.details.push({
            contentId: content.id,
            status: 'success',
          });
        } catch (error) {
          logger.error('Error processing scheduled content:', error);
          schedule.set('status', 'error');
          schedule.set('error', error.message);

          results.errors++;
          results.details.push({
            contentId: schedule.get('content').id,
            status: 'error',
            error: error.message,
          });
        }

        await schedule.save(null, { useMasterKey: true });
      }

      return results;
    } catch (error) {
      throw handleError(error, 'processing scheduled content');
    }
  }

  /**
   * Get optimal publishing time
   * @param {Parse.Object} content Content object
   * @param {string} timezone Publisher's timezone
   * @return {Promise<Date>} Optimal publishing time
   * @private
   */
  async _getOptimalPublishTime(content, timezone) {
    const ai = this.dependencies.ai;

    if (!ai) {
      throw new Error('AI service not available');
    }

    const schedule = await ai.getOptimalSchedule({
      title: content.get('title'),
      content: content.get('content'),
      type: content.get('type'),
      timezone,
    });

    return new Date(schedule.recommendedTime);
  }

  /**
   * Schedule next occurrence based on recurrence settings
   * @param {Parse.Object} schedule Current schedule
   * @return {Promise<void>}
   * @private
   */
  async _scheduleNextOccurrence(schedule) {
    const recurrence = schedule.get('recurrence');
    const lastPublishAt = schedule.get('publishAt');

    // Calculate next occurrence
    const nextPublishAt = this._calculateNextOccurrence(lastPublishAt, recurrence);

    if (nextPublishAt) {
      // Create new schedule
      const newSchedule = new Parse.Object('CMSContentSchedule');

      newSchedule.set({
        content: schedule.get('content'),
        publishAt: nextPublishAt,
        timezone: schedule.get('timezone'),
        status: 'pending',
        recurrence,
        previousSchedule: schedule,
      });

      await newSchedule.save(null, { useMasterKey: true });
    }

    schedule.set('status', 'completed');
    await schedule.save(null, { useMasterKey: true });
  }

  /**
   * Calculate next occurrence based on recurrence settings
   * @param {Date} lastDate Last occurrence date
   * @param {Object} recurrence Recurrence settings
   * @return {Date|null} Next occurrence date or null if no more occurrences
   * @private
   */
  _calculateNextOccurrence(lastDate, recurrence) {
    const { frequency, interval = 1, endDate, maxOccurrences } = recurrence;

    const nextDate = new Date(lastDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      default:
        return null;
    }

    // Check end conditions
    if (endDate && nextDate > new Date(endDate)) {
      return null;
    }

    if (maxOccurrences) {
      // TODO: Check against occurrence count
    }

    return nextDate;
  }
}

module.exports = new ContentSchedulingService();
