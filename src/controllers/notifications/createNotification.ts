import { ActionContext } from '../types/ActionTypes';

export async function createNotification(params: Record<string, unknown>, context: ActionContext) {
  const { 
    title, 
    message, 
    type, 
    priority = 'medium', 
    recipientType, 
    recipientId,
    actionUrl,
    metadata = {},
    expiresAt
  } = params;
  const orgId = context.user.organizationId || context.organization?.id;

  if (!orgId) {
    throw new Error('Organization ID is required to create notification');
  }

  const Notification = Parse.Object.extend('Notification');
  const notification = new Notification();

  notification.set('title', title);
  notification.set('message', message);
  notification.set('type', type);
  notification.set('priority', priority);
  notification.set('recipientType', recipientType);
  notification.set('recipientId', recipientId || null);
  notification.set('actionUrl', actionUrl || '');
  notification.set('metadata', metadata);
  notification.set('organizationId', orgId);
  notification.set('createdBy', context.user.userId);
  notification.set('status', 'unread');
  notification.set('isActive', true);

  if (expiresAt) {
    notification.set('expiresAt', new Date(expiresAt as string));
  }

  const savedNotification = await notification.save();

  return { notification: savedNotification.toJSON() };
}