import { ActionContext } from '../types/ActionTypes';

export async function fetchNotifications(params: Record<string, unknown>, context: ActionContext) {
  const { type, status, priority, limit = 50, includeArchived = false } = params;
  const orgId = context.user.organizationId || context.organization?.id;

  if (!orgId) {
    throw new Error('Organization ID is required to fetch notifications');
  }

  // Filter by user or organization
  const userQuery = new Parse.Query('Notification');
  userQuery.equalTo('recipientId', context.user.userId);
  
  const orgQuery = new Parse.Query('Notification');
  orgQuery.equalTo('organizationId', orgId);
  orgQuery.equalTo('recipientType', 'organization');
  
  const combinedQuery = (Parse.Query as any).or(userQuery, orgQuery);

  if (!includeArchived) {
    combinedQuery.notEqualTo('status', 'archived');
  }

  if (type) {
    combinedQuery.equalTo('type', type);
  }

  if (status) {
    combinedQuery.equalTo('status', status);
  }

  if (priority) {
    combinedQuery.equalTo('priority', priority);
  }

  combinedQuery.descending('createdAt');
  combinedQuery.limit(limit as number);

  const notifications = await combinedQuery.find();
  const notificationData = notifications.map(notification => notification.toJSON());

  // Count unread notifications
  const userUnreadQuery = new Parse.Query('Notification');
  userUnreadQuery.equalTo('recipientId', context.user.userId);
  userUnreadQuery.equalTo('status', 'unread');
  
  const orgUnreadQuery = new Parse.Query('Notification');
  orgUnreadQuery.equalTo('organizationId', orgId);
  orgUnreadQuery.equalTo('recipientType', 'organization');
  orgUnreadQuery.equalTo('status', 'unread');
  
  const unreadCombinedQuery = (Parse.Query as any).or(userUnreadQuery, orgUnreadQuery);
  const unreadCount = await unreadCombinedQuery.count();

  return { 
    notifications: notificationData,
    unreadCount,
    totalCount: notificationData.length
  };
}