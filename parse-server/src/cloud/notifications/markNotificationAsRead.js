/**
 * Mark a specific notification as read
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.notificationId - Notification ID to mark as read
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('markNotificationAsRead', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.notificationId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: notificationId');
    }

    // Query the notification
    const notificationQuery = new Parse.Query('Notification');
    notificationQuery.equalTo('userId', user.id); // Ensure user can only mark their own notifications
    
    const notification = await notificationQuery.get(params.notificationId, { sessionToken: user.getSessionToken() });
    
    if (!notification) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Notification not found or access denied');
    }

    // Check if notification is already read
    if (notification.get('isRead')) {
      return {
        success: true,
        message: 'Notification was already marked as read',
        notification: {
          id: notification.id,
          isRead: true,
          updatedAt: notification.get('updatedAt')?.toISOString()
        }
      };
    }

    // Mark notification as read
    notification.set('isRead', true);
    notification.set('readAt', new Date());
    
    const savedNotification = await notification.save(null, { sessionToken: user.getSessionToken() });

    // Get updated unread count for the user
    const unreadQuery = new Parse.Query('Notification');
    unreadQuery.equalTo('userId', user.id);
    unreadQuery.equalTo('isRead', false);
    const unreadCount = await unreadQuery.count({ sessionToken: user.getSessionToken() });

    return {
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: savedNotification.id,
        isRead: savedNotification.get('isRead'),
        readAt: savedNotification.get('readAt')?.toISOString(),
        updatedAt: savedNotification.get('updatedAt')?.toISOString()
      },
      unreadCount: unreadCount
    };

  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to mark notification as read');
  }
});