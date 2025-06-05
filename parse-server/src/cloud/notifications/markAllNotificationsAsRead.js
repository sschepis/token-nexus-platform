const Parse = require('parse/node');

/**
 * Mark all notifications as read for the current user
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.type - Only mark notifications of this type as read (optional)
 * @returns {Object} Response with success status and count of marked notifications
 */
Parse.Cloud.define('markAllNotificationsAsRead', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Query unread notifications for the current user
    const notificationQuery = new Parse.Query('Notification');
    notificationQuery.equalTo('userId', user.id);
    notificationQuery.equalTo('isRead', false);
    
    // Apply type filter if provided
    if (params.type) {
      notificationQuery.equalTo('type', params.type);
    }
    
    // Limit to prevent timeout on large datasets
    notificationQuery.limit(1000); // Process max 1000 notifications at once
    
    const unreadNotifications = await notificationQuery.find({ sessionToken: user.getSessionToken() });

    if (unreadNotifications.length === 0) {
      return {
        success: true,
        message: 'No unread notifications to mark as read',
        markedCount: 0,
        unreadCount: 0
      };
    }

    // Mark all notifications as read
    const currentTime = new Date();
    unreadNotifications.forEach(notification => {
      notification.set('isRead', true);
      notification.set('readAt', currentTime);
    });

    // Save all notifications in batch
    await Parse.Object.saveAll(unreadNotifications, { sessionToken: user.getSessionToken() });

    // Get updated unread count for the user
    const remainingUnreadQuery = new Parse.Query('Notification');
    remainingUnreadQuery.equalTo('userId', user.id);
    remainingUnreadQuery.equalTo('isRead', false);
    const remainingUnreadCount = await remainingUnreadQuery.count({ sessionToken: user.getSessionToken() });

    // Create audit log entry
    try {
      const AuditLog = Parse.Object.extend('AuditLog');
      const auditLog = new AuditLog();
      auditLog.set('action', 'notifications_marked_all_read');
      auditLog.set('userId', user.id);
      auditLog.set('resourceType', 'Notification');
      auditLog.set('details', {
        markedCount: unreadNotifications.length,
        type: params.type || 'all',
        timestamp: currentTime.toISOString()
      });
      await auditLog.save(null, { useMasterKey: true });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      success: true,
      message: `Marked ${unreadNotifications.length} notification${unreadNotifications.length === 1 ? '' : 's'} as read`,
      markedCount: unreadNotifications.length,
      unreadCount: remainingUnreadCount
    };

  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to mark all notifications as read');
  }
});