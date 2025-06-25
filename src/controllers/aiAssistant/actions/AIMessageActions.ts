import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Send message to AI conversation action
 */
export function getSendMessageAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'sendMessage',
      name: 'Send AI Message',
      description: 'Send a message to an AI conversation',
      category: 'data',
      permissions: ['ai:write'],
      parameters: [
        { name: 'conversationId', type: 'string', required: true, description: 'ID of the conversation' },
        { name: 'message', type: 'string', required: true, description: 'Message content to send' },
        { name: 'model', type: 'string', required: false, description: 'AI model to use for response' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          conversationId,
          message,
          model = 'gpt-4'
        } = params;

        // Validate required parameters
        if (!conversationId) {
          return {
            success: false,
            error: 'Conversation ID is required'
          };
        }

        if (!message || typeof message !== 'string' || !message.trim()) {
          return {
            success: false,
            error: 'Message content is required'
          };
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('sendAIMessage', {
          conversationId,
          message: message.toString().trim(),
          model,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error sending message:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message'
        };
      }
    }
  };
}

/**
 * Get conversation messages action
 */
export function getConversationMessagesAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getConversationMessages',
      name: 'Get Conversation Messages',
      description: 'Get messages from an AI conversation',
      category: 'data',
      permissions: ['ai:read'],
      parameters: [
        { name: 'conversationId', type: 'string', required: true, description: 'ID of the conversation' },
        { name: 'limit', type: 'number', required: false, description: 'Number of messages to fetch' },
        { name: 'offset', type: 'number', required: false, description: 'Number of messages to skip for pagination' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          conversationId,
          limit = 50,
          offset = 0
        } = params;

        // Validate required parameters
        if (!conversationId) {
          return {
            success: false,
            error: 'Conversation ID is required'
          };
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('getConversationMessages', {
          conversationId,
          limit,
          offset,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error fetching conversation messages:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch conversation messages'
        };
      }
    }
  };
}

/**
 * Delete message action
 */
export function getDeleteMessageAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'deleteMessage',
      name: 'Delete AI Message',
      description: 'Delete a message from an AI conversation',
      category: 'data',
      permissions: ['ai:manage'],
      parameters: [
        { name: 'conversationId', type: 'string', required: true, description: 'ID of the conversation' },
        { name: 'messageId', type: 'string', required: true, description: 'ID of the message to delete' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for deletion' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          conversationId,
          messageId,
          reason
        } = params;

        // Validate required parameters
        if (!conversationId) {
          return {
            success: false,
            error: 'Conversation ID is required'
          };
        }

        if (!messageId) {
          return {
            success: false,
            error: 'Message ID is required'
          };
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('deleteAIMessage', {
          conversationId,
          messageId,
          reason: reason || 'User requested deletion',
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error deleting message:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete message'
        };
      }
    }
  };
}