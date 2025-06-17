import { ActionContext } from '../types/ActionTypes';
import { createParseObject } from '../../utils/parseUtils';

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

  const notificationData: Record<string, any> = {
    title,
    message,
    type,
    priority,
    recipientType,
    recipientId: recipientId || null,
    actionUrl: actionUrl || '',
    metadata,
    organizationId: orgId,
    createdBy: context.user.userId,
    status: 'unread',
    isActive: true
  };

  if (expiresAt) {
    notificationData.expiresAt = new Date(expiresAt as string);
  }

  const savedNotification = await createParseObject('Notification', notificationData);

  return { notification: savedNotification.toJSON() };
}