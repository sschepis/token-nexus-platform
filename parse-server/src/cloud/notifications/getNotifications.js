const Parse = require('parse/node');

/**
 * Get notifications for the current user
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.type - Filter by notification type (optional)
 * @param {boolean} request.params.unreadOnly - Only return unread notifications (optional)
 * @param {number} request.params.limit - Limit number of results (optional, default 50)
 * @param {number} request.params.skip - Skip number of results (optional, default 0)
 * @returns {Object} Response with notifications array
 */
Parse.Cloud.define('getNotifications', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Query notifications for the current user
    const notificationQuery = new Parse.Query('Notification');
    notificationQuery.equalTo('userId', user.id);
    
    // Apply type filter if provided
    if (params.type) {
      notificationQuery.equalTo('type', params.type);
    }
    
    // Apply unread filter if requested
    if (params.unreadOnly === true) {
      notificationQuery.equalTo('isRead', false);
    }
    
    // Apply pagination
    const limit = Math.min(params.limit || 50, 200); // Max 200 notifications per request
    const skip = params.skip || 0;
    notificationQuery.limit(limit);
    notificationQuery.skip(skip);
    
    // Order by creation date (newest first)
    notificationQuery.descending('createdAt');

    const notifications = await notificationQuery.find({ sessionToken: user.getSessionToken() });

    // Get unread count for the user
    const unreadQuery = new Parse.Query('Notification');
    unreadQuery.equalTo('userId', user.id);
    unreadQuery.equalTo('isRead', false);
    const unreadCount = await unreadQuery.count({ sessionToken: user.getSessionToken() });

    // Format response to match frontend expectations
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.get('type'),
      title: notification.get('title'),
      message: notification.get('message'),
      timestamp: notification.get('createdAt')?.toISOString(),
      isRead: notification.get('isRead'),
      priority: notification.get('priority'),
      actionUrl: notification.get('actionUrl'),
      actionLabel: notification.get('actionLabel'),
      userId: notification.get('userId'),
      // Additional metadata
      data: notification.get('data'),
      updatedAt: notification.get('updatedAt')?.toISOString()
    }));

    return {
      success: true,
      notifications: formattedNotifications,
      unreadCount: unreadCount,
      total: formattedNotifications.length,
      hasMore: formattedNotifications.length === limit
    };

  } catch (error) {
    console.error('Error in getNotifications:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch notifications');
  }
});