const Parse = require('parse/node');

/**
 * Delete a specific notification
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.notificationId - Notification ID to delete
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('deleteNotification', async (request) => {
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
    notificationQuery.equalTo('userId', user.id); // Ensure user can only delete their own notifications
    
    const notification = await notificationQuery.get(params.notificationId, { sessionToken: user.getSessionToken() });
    
    if (!notification) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Notification not found or access denied');
    }

    // Store notification details for audit log before deletion
    const notificationDetails = {
      id: notification.id,
      type: notification.get('type'),
      title: notification.get('title'),
      isRead: notification.get('isRead'),
      createdAt: notification.get('createdAt')?.toISOString()
    };

    const wasUnread = !notification.get('isRead');

    // Delete the notification
    await notification.destroy({ sessionToken: user.getSessionToken() });

    // Get updated unread count for the user
    const unreadQuery = new Parse.Query('Notification');
    unreadQuery.equalTo('userId', user.id);
    unreadQuery.equalTo('isRead', false);
    const unreadCount = await unreadQuery.count({ sessionToken: user.getSessionToken() });

    // Create audit log entry
    try {
      const AuditLog = Parse.Object.extend('AuditLog');
      const auditLog = new AuditLog();
      auditLog.set('action', 'notification_deleted');
      auditLog.set('userId', user.id);
      auditLog.set('resourceType', 'Notification');
      auditLog.set('resourceId', params.notificationId);
      auditLog.set('details', {
        notificationTitle: notificationDetails.title,
        notificationType: notificationDetails.type,
        wasUnread: wasUnread,
        deletedAt: new Date().toISOString()
      });
      await auditLog.save(null, { useMasterKey: true });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return {
      success: true,
      message: 'Notification deleted successfully',
      deletedNotification: {
        id: notificationDetails.id,
        type: notificationDetails.type,
        title: notificationDetails.title
      },
      unreadCount: unreadCount
    };

  } catch (error) {
    console.error('Error in deleteNotification:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete notification');
  }
});