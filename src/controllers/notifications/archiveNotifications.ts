import { ActionContext } from '../types/ActionTypes';

export async function archiveNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { notificationIds } = params;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Notification IDs array is required');
  }

  const query = new Parse.Query('Notification');
  query.containedIn('objectId', notificationIds as string[]);
  
  // Ensure user can only archive their own notifications
  const userQuery = new Parse.Query('Notification');
  userQuery.equalTo('recipientId', context.user.userId);
  
  const orgQuery = new Parse.Query('Notification');
  orgQuery.equalTo('organizationId', context.user.organizationId);
  orgQuery.equalTo('recipientType', 'organization');
  
  // Note: Parse.Query.or and matchesQuery will be handled at runtime
  const combinedQuery = (Parse.Query as any).or(userQuery, orgQuery);
  (query as any).matchesQuery('objectId', combinedQuery);

  const notifications = await query.find();
  
  // Update status to archived
  const updatePromises = notifications.map(notification => {
    notification.set('status', 'archived');
    notification.set('archivedAt', new Date());
    notification.set('archivedBy', context.user.userId);
    return notification.save();
  });

  await Promise.all(updatePromises);

  return { 
    archivedCount: notifications.length,
    notificationIds: notifications.map(n => n.id)
  };
}