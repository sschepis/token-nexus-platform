import { ActionContext } from '../types/ActionTypes';
import { ParseQueryBuilder } from '../../utils/parseUtils';

export async function deleteNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { notificationIds, confirmDelete } = params;

  if (!confirmDelete) {
    throw new Error('Delete confirmation is required');
  }

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Notification IDs array is required');
  }

  // Create OR query for user notifications and notifications they created
  const userQuery = new ParseQueryBuilder('Notification')
    .equalTo('recipientId', context.user.userId);
  
  const createdQuery = new ParseQueryBuilder('Notification')
    .equalTo('createdBy', context.user.userId);
  
  const accessibleQuery = ParseQueryBuilder.or(userQuery, createdQuery);
  
  // Filter by notification IDs and ensure user access
  const notifications = await new ParseQueryBuilder('Notification')
    .containedIn('objectId', notificationIds as string[])
    .getQuery()
    .matchesQuery('objectId', accessibleQuery.getQuery())
    .find();
  
  // Delete notifications
  const deletePromises = notifications.map(notification => notification.destroy());
  await Promise.all(deletePromises);

  return { 
    deletedCount: notifications.length,
    notificationIds: notifications.map(n => n.id)
  };
}