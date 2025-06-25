import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';
import { 
  CommunicationChannel, 
  AppMessage, 
  EventSubscription, 
  DataSyncRule, 
  CreateChannelParams, 
  SendMessageParams, 
  GetMessagesParams, 
  CreateSubscriptionParams, 
  CreateSyncRuleParams 
} from './communication/types/CommunicationTypes';

/**
 * Communication API for App Framework communication management
 * Handles channels, messages, event subscriptions, and data sync rules
 */
export const communicationApi = {
  /**
   * Get communication channels for an organization
   */
  async getCommunicationChannels(params: { organizationId: string }) {
    return callCloudFunctionForArray<CommunicationChannel>('getCommunicationChannels', params, {
      errorMessage: 'Failed to fetch communication channels'
    });
  },

  /**
   * Get app messages
   */
  async getAppMessages(params: GetMessagesParams) {
    return callCloudFunctionForArray<AppMessage>('getAppMessages', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to fetch app messages'
    });
  },

  /**
   * Get event subscriptions for an organization
   */
  async getEventSubscriptions(params: { organizationId: string }) {
    return callCloudFunctionForArray<EventSubscription>('getEventSubscriptions', params, {
      errorMessage: 'Failed to fetch event subscriptions'
    });
  },

  /**
   * Get data sync rules for an organization
   */
  async getDataSyncRules(params: { organizationId: string }) {
    return callCloudFunctionForArray<DataSyncRule>('getDataSyncRules', params, {
      errorMessage: 'Failed to fetch data sync rules'
    });
  },

  /**
   * Create a new communication channel
   */
  async createCommunicationChannel(params: CreateChannelParams) {
    return callCloudFunction<CommunicationChannel>('createCommunicationChannel', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create communication channel'
    });
  },

  /**
   * Send an app message
   */
  async sendAppMessage(params: SendMessageParams) {
    return callCloudFunction<AppMessage>('sendAppMessage', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to send app message'
    });
  },

  /**
   * Create an event subscription
   */
  async createEventSubscription(params: CreateSubscriptionParams) {
    return callCloudFunction<EventSubscription>('createEventSubscription', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create event subscription'
    });
  },

  /**
   * Create a data sync rule
   */
  async createDataSyncRule(params: CreateSyncRuleParams) {
    return callCloudFunction<DataSyncRule>('createDataSyncRule', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create data sync rule'
    });
  },

  /**
   * Trigger data sync for a rule
   */
  async triggerDataSync(params: { ruleId: string }) {
    return callCloudFunction<{ success: boolean }>('triggerDataSync', params, {
      errorMessage: 'Failed to trigger data sync'
    });
  },

  /**
   * Mark a message as read
   */
  async markMessageAsRead(params: { messageId: string }) {
    return callCloudFunction<{ success: boolean }>('markMessageAsRead', params, {
      errorMessage: 'Failed to mark message as read'
    });
  }
};

export default communicationApi;