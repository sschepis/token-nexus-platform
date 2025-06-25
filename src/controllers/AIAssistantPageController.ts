import { AIAssistantBaseController } from './aiAssistant/AIAssistantBaseController';

// Import action functions
import {
  getFetchConversationsAction,
  getCreateConversationAction,
  getArchiveConversationAction,
  getDeleteConversationAction
} from './aiAssistant/actions/AIConversationActions';

import {
  getSendMessageAction,
  getConversationMessagesAction,
  getDeleteMessageAction
} from './aiAssistant/actions/AIMessageActions';

import {
  getAIConfigurationAction,
  getUpdateAIConfigurationAction,
  getAIUsageStatsAction,
  getExportConversationsAction
} from './aiAssistant/actions/AIConfigurationActions';

/**
 * AI Assistant Page Controller
 * Manages AI assistant interactions, conversations, and configurations
 * Extends AIAssistantBaseController which provides standardized BasePageController functionality
 */
export class AIAssistantPageController extends AIAssistantBaseController {
  constructor() {
    super();
    this.initializeActions();
  }

  /**
   * Initialize all AI assistant actions (required by BasePageController)
   */
  protected initializeActions(): void {
    // Conversation management actions
    const fetchConversationsAction = getFetchConversationsAction();
    this.registerAction(fetchConversationsAction.config, fetchConversationsAction.executor);

    const createConversationAction = getCreateConversationAction();
    this.registerAction(createConversationAction.config, createConversationAction.executor);

    const archiveConversationAction = getArchiveConversationAction();
    this.registerAction(archiveConversationAction.config, archiveConversationAction.executor);

    const deleteConversationAction = getDeleteConversationAction();
    this.registerAction(deleteConversationAction.config, deleteConversationAction.executor);

    // Message management actions
    const sendMessageAction = getSendMessageAction();
    this.registerAction(sendMessageAction.config, sendMessageAction.executor);

    const conversationMessagesAction = getConversationMessagesAction();
    this.registerAction(conversationMessagesAction.config, conversationMessagesAction.executor);

    const deleteMessageAction = getDeleteMessageAction();
    this.registerAction(deleteMessageAction.config, deleteMessageAction.executor);

    // Configuration and utility actions
    const getAIConfigAction = getAIConfigurationAction();
    this.registerAction(getAIConfigAction.config, getAIConfigAction.executor);

    const updateAIConfigAction = getUpdateAIConfigurationAction();
    this.registerAction(updateAIConfigAction.config, updateAIConfigAction.executor);

    const getUsageStatsAction = getAIUsageStatsAction();
    this.registerAction(getUsageStatsAction.config, getUsageStatsAction.executor);

    const exportConversationsAction = getExportConversationsAction();
    this.registerAction(exportConversationsAction.config, exportConversationsAction.executor);
  }

  /**
   * Get AI Assistant specific configuration
   */
  getAIAssistantConfig() {
    return {
      ...this.getAIConfig(),
      supportedExportFormats: ['json', 'csv', 'pdf'],
      defaultModel: 'gpt-4',
      maxConversationsPerUser: 100,
      maxMessagesPerConversation: 1000,
      retentionPeriodDays: 365
    };
  }

  /**
   * Validate AI Assistant operation permissions
   */
  validateOperation(operation: string, context: any): boolean {
    return this.validateAIPermissions(operation, context);
  }
}

// Export singleton instance
export const aiAssistantPageController = new AIAssistantPageController();