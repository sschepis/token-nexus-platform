import { ActionContext } from '../types/ActionTypes';
import { ParseQueryBuilder } from '../../utils/parseUtils';

export async function fetchNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { type, status, priority, limit = 50, includeArchived = false } = params;
  const orgId = context.user.organizationId || context.organization?.id;

  if (!orgId) {
    throw new Error('Organization ID is required to fetch notifications');
  }

  // Create OR query for user and organization notifications
  const userQuery = new ParseQueryBuilder('Notification')
    .equalTo('recipientId', context.user.userId);
  
  const orgQuery = new ParseQueryBuilder('Notification')
    .equalTo('organizationId', orgId)
    .equalTo('recipientType', 'organization');
  
  let combinedQuery = ParseQueryBuilder.or(userQuery, orgQuery);

  if (!includeArchived) {
    combinedQuery = combinedQuery.notEqualTo('status', 'archived');
  }

  if (type) {
    combinedQuery = combinedQuery.equalTo('type', type);
  }

  if (status) {
    combinedQuery = combinedQuery.equalTo('status', status);
  }

  if (priority) {
    combinedQuery = combinedQuery.equalTo('priority', priority);
  }

  const notifications = await combinedQuery
    .descending('createdAt')
    .limit(limit as number)
    .find();
  const notificationData = notifications.map(notification => notification.toJSON());

  // Count unread notifications
  const userUnreadQuery = new ParseQueryBuilder('Notification')
    .equalTo('recipientId', context.user.userId)
    .equalTo('status', 'unread');
  
  const orgUnreadQuery = new ParseQueryBuilder('Notification')
    .equalTo('organizationId', orgId)
    .equalTo('recipientType', 'organization')
    .equalTo('status', 'unread');
  
  const unreadCombinedQuery = ParseQueryBuilder.or(userUnreadQuery, orgUnreadQuery);
  const unreadCount = await unreadCombinedQuery.count();

  return { 
    notifications: notificationData,
    unreadCount,
    totalCount: notificationData.length
  };
}