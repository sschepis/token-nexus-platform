import { PageContext } from '../../types/ActionTypes';

export interface AIAssistantPageContext extends PageContext {
  state: {};
  props: {};
  metadata: {
    category: string;
    tags: string[];
    permissions: string[];
  };
}

export interface FetchConversationsParams {
  limit?: number;
  skip?: number;
  includeArchived?: boolean;
  searchTerm?: string;
}

export interface CreateConversationParams {
  title?: string;
  initialMessage: string;
  context?: Record<string, unknown>;
}

export interface SendMessageParams {
  conversationId: string;
  message: string;
  attachments?: any[];
}

export interface GetConversationMessagesParams {
  conversationId: string;
  limit?: number;
  skip?: number;
}

export interface ArchiveConversationParams {
  conversationId: string;
}