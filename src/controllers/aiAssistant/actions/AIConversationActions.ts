import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Fetch AI conversations action
 */
export function getFetchConversationsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'fetchConversations',
      name: 'Fetch AI Conversations',
      description: 'Get AI conversations for the current user',
      category: 'data',
      permissions: ['ai:read'],
      parameters: [
        { name: 'searchTerm', type: 'string', required: false, description: 'Search term for filtering conversations' },
        { name: 'limit', type: 'number', required: false, description: 'Number of conversations to fetch' },
        { name: 'offset', type: 'number', required: false, description: 'Number of conversations to skip for pagination' },
        { name: 'status', type: 'string', required: false, description: 'Filter by conversation status' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          searchTerm,
          limit = 50,
          offset = 0,
          status
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('fetchAIConversations', {
          searchTerm,
          limit,
          offset,
          status,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch conversations'
        };
      }
    }
  };
}

/**
 * Create AI conversation action
 */
export function getCreateConversationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'createConversation',
      name: 'Create AI Conversation',
      description: 'Create a new AI conversation',
      category: 'data',
      permissions: ['ai:write'],
      parameters: [
        { name: 'title', type: 'string', required: false, description: 'Title for the conversation' },
        { name: 'initialMessage', type: 'string', required: true, description: 'Initial message to start the conversation' },
        { name: 'model', type: 'string', required: false, description: 'AI model to use for the conversation' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          title,
          initialMessage,
          model = 'gpt-4'
        } = params;

        // Validate required parameters
        if (!initialMessage || typeof initialMessage !== 'string' || !initialMessage.trim()) {
          return {
            success: false,
            error: 'Initial message is required'
          };
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('createAIConversation', {
          title: title || 'New Conversation',
          initialMessage: initialMessage.toString().trim(),
          model,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error creating conversation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create conversation'
        };
      }
    }
  };
}

/**
 * Archive AI conversation action
 */
export function getArchiveConversationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'archiveConversation',
      name: 'Archive AI Conversation',
      description: 'Archive an AI conversation',
      category: 'data',
      permissions: ['ai:manage'],
      parameters: [
        { name: 'conversationId', type: 'string', required: true, description: 'ID of the conversation to archive' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { conversationId } = params;

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

        const result = await callCloudFunction('archiveAIConversation', {
          conversationId,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error archiving conversation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to archive conversation'
        };
      }
    }
  };
}

/**
 * Delete AI conversation action
 */
export function getDeleteConversationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'deleteConversation',
      name: 'Delete AI Conversation',
      description: 'Delete an AI conversation permanently',
      category: 'data',
      permissions: ['ai:manage'],
      parameters: [
        { name: 'conversationId', type: 'string', required: true, description: 'ID of the conversation to delete' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for deletion' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const { conversationId, reason } = params;

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

        const result = await callCloudFunction('deleteAIConversation', {
          conversationId,
          reason: reason || 'User requested deletion',
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error deleting conversation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete conversation'
        };
      }
    }
  };
}