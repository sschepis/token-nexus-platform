import { ActionContext } from '../types/ActionTypes';

export async function deleteNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { notificationIds, confirmDelete } = params;

  if (!confirmDelete) {
    throw new Error('Delete confirmation is required');
  }

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Notification IDs array is required');
  }

  const query = new Parse.Query('Notification');
  query.containedIn('objectId', notificationIds as string[]);
  
  // Ensure user can only delete their own notifications or org notifications they created
  const userQuery = new Parse.Query('Notification');
  userQuery.equalTo('recipientId', context.user.userId);
  
  const createdQuery = new Parse.Query('Notification');
  createdQuery.equalTo('createdBy', context.user.userId);
  
  // Note: Parse.Query.or and matchesQuery will be handled at runtime
  const combinedQuery = (Parse.Query as any).or(userQuery, createdQuery);
  (query as any).matchesQuery('objectId', combinedQuery);

  const notifications = await query.find();
  
  // Delete notifications
  const deletePromises = notifications.map(notification => notification.destroy());
  await Promise.all(deletePromises);

  return { 
    deletedCount: notifications.length,
    notificationIds: notifications.map(n => n.id)
  };
}