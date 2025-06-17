import { ActionContext } from '../types/ActionTypes';
import { ParseQueryBuilder } from '../../utils/parseUtils';

export async function archiveNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { notificationIds } = params;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new Error('Notification IDs array is required');
  }

  // Create OR query for user and organization notifications
  const userQuery = new ParseQueryBuilder('Notification')
    .equalTo('recipientId', context.user.userId);
  
  const orgQuery = new ParseQueryBuilder('Notification')
    .equalTo('organizationId', context.user.organizationId)
    .equalTo('recipientType', 'organization');
  
  const accessibleQuery = ParseQueryBuilder.or(userQuery, orgQuery);
  
  // Filter by notification IDs and ensure user access
  const notifications = await new ParseQueryBuilder('Notification')
    .containedIn('objectId', notificationIds as string[])
    .getQuery()
    .matchesQuery('objectId', accessibleQuery.getQuery())
    .find();
  
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