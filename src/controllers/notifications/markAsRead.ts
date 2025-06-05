import { ActionContext } from '../types/ActionTypes';

export async function markAsRead(params: Record<string, unknown>, context: ActionContext) {
  const { notificationIds } = params;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Notification IDs array is required');
  }

  const query = new Parse.Query('Notification');
  query.containedIn('objectId', notificationIds as string[]);
  
  // Ensure user can only mark their own notifications as read
  const userQuery = new Parse.Query('Notification');
  userQuery.equalTo('recipientId', context.user.userId);
  
  const orgQuery = new Parse.Query('Notification');
  orgQuery.equalTo('organizationId', context.user.organizationId);
  orgQuery.equalTo('recipientType', 'organization');
  
  const combinedQuery = (Parse.Query as any).or(userQuery, orgQuery);
  (query as any).matchesQuery('objectId', combinedQuery);

  const notifications = await query.find();
  
  // Update status to read
  const updatePromises = notifications.map(notification => {
    notification.set('status', 'read');
    notification.set('readAt', new Date());
    notification.set('readBy', context.user.userId);
    return notification.save();
  });

  await Promise.all(updatePromises);

  return { 
    updatedCount: notifications.length,
    notificationIds: notifications.map(n => n.id)
  };
}