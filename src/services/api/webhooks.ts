/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { apiService, mockResponse } from './base'; // Import apiService and mockResponse

/**
 * @file Webhooks API services.
 * Handles operations related to webhooks via Parse Cloud Functions.
 */
export const webhooksApi = {
  /**
   * Creates a new webhook.
   * @param {object} params - Parameters for the new webhook.
   * @param {string} params.name - The name of the webhook.
   * @param {string} params.url - The URL where webhook events will be sent.
   * @param {string[]} params.events - An array of event types that will trigger this webhook.
   * @param {boolean} [params.isActive] - Whether the webhook is active.
   * @param {string} [params.secret] - An optional secret for signing webhook requests.
   * @returns {Promise<{ data: { webhook: any } }>} A promise that resolves with an object containing the newly created webhook.
   * @throws {Error} Throws an error if webhook creation fails.
   */
  createWebhook: async (params: {
    name: string;
    url: string;
    events: string[];
    isActive?: boolean;
    secret?: string;
  }): Promise<{ data: { webhook: any } }> => {
    try {
      const result = await Parse.Cloud.run('createWebhook', params);
      
      return {
        data: {
          webhook: result.webhook
        }
      };
    } catch (error: any) {
      console.debug('[Webhooks API] Error calling createWebhook cloud function:', error);
      throw new Error(error.message || 'Failed to create webhook');
    }
  },

  /**
   * Fetches a list of webhooks.
   * @param {object} [params] - Optional parameters for filtering and pagination.
   * @param {number} [params.limit] - Maximum number of webhooks to return.
   * @param {number} [params.skip] - Number of webhooks to skip for pagination.
   * @returns {Promise<{ data: { webhooks: any[]; totalCount: number } }>} A promise that resolves with an object containing the list of webhooks and total count.
   * @throws {Error} Throws an error if fetching webhooks fails.
   */
  getWebhooks: async (params?: {
    limit?: number;
    skip?: number;
  }): Promise<{ data: { webhooks: any[]; totalCount: number } }> => {
    try {
      const result = await Parse.Cloud.run('getWebhooks', params || {});
      
      return {
        data: {
          webhooks: result.webhooks || [],
          totalCount: result.totalCount || 0
        }
      };
    } catch (error: any) {
      console.debug('[Webhooks API] Error calling getWebhooks cloud function:', error);
      throw new Error(error.message || 'Failed to fetch webhooks');
    }
  },

  /**
   * Updates an existing webhook.
   * @param {string} webhookId - The ID of the webhook to update.
   * @param {object} params - Parameters to update for the webhook.
   * @param {string} [params.name] - New name for the webhook.
   * @param {string} [params.url] - New URL for the webhook.
   * @param {string[]} [params.events] - New array of event types.
   * @param {boolean} [params.isActive] - New active status for the webhook.
   * @param {string} [params.secret] - New secret for signing webhook requests.
   * @returns {Promise<{ data: { webhook: any } }>} A promise that resolves with an object containing the updated webhook.
   * @throws {Error} Throws an error if updating the webhook fails.
   */
  updateWebhook: async (webhookId: string, params: {
    name?: string;
    url?: string;
    events?: string[];
    isActive?: boolean;
    secret?: string;
  }): Promise<{ data: { webhook: any } }> => {
    try {
      const result = await Parse.Cloud.run('updateWebhook', { webhookId, ...params });
      
      return {
        data: {
          webhook: result.webhook
        }
      };
    } catch (error: any) {
      console.debug('[Webhooks API] Error calling updateWebhook cloud function:', error);
      throw new Error(error.message || 'Failed to update webhook');
    }
  },

  /**
   * Deletes a webhook.
   * @param {string} webhookId - The ID of the webhook to delete.
   * @returns {Promise<{ data: { success: boolean; message: string } }>} A promise that resolves with a success status.
   * @throws {Error} Throws an error if deleting the webhook fails.
   */
  deleteWebhook: async (webhookId: string): Promise<{ data: { success: boolean; message: string } }> => {
    try {
      const result = await Parse.Cloud.run('deleteWebhook', { webhookId });
      
      return {
        data: {
          success: result.success,
          message: result.message
        }
      };
    } catch (error: any) {
      console.debug('[Webhooks API] Error calling deleteWebhook cloud function:', error);
      throw new Error(error.message || 'Failed to delete webhook');
    }
  },

  /**
   * Tests a webhook by sending a sample event.
   * @param {string} webhookId - The ID of the webhook to test.
   * @returns {Promise<{ data: { testResult: any } }>} A promise that resolves with the test result.
   * @throws {Error} Throws an error if testing the webhook fails.
   */
  testWebhook: async (webhookId: string): Promise<{ data: { testResult: any } }> => {
    try {
      const result = await Parse.Cloud.run('testWebhook', { webhookId });
      return { data: result };
    } catch (error: any) {
      console.debug('[Webhooks API] Error calling testWebhook cloud function:', error);
      throw new Error(error.message || 'Failed to test webhook');
    }
  },
};

export const mockWebhooksApis = {
  createWebhook: (params: any) => {
    const newWebhook = {
      id: `wh-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...params,
    };
    return mockResponse({ webhook: newWebhook });
  },

  getWebhooks: () => {
    return mockResponse({
      webhooks: [
        {
          id: 'wh-1',
          name: 'Order Created Webhook',
          url: 'https://example.com/webhook/order',
          events: ['order.created', 'order.updated'],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    });
  },

  updateWebhook: (webhookId: string, params: any) => {
    return mockResponse({ webhook: { id: webhookId, ...params } });
  },

  deleteWebhook: (webhookId: string) => {
    return mockResponse({ success: true, message: `Webhook ${webhookId} deleted successfully` });
  },

  testWebhook: (webhookId: string) => {
    return mockResponse({ testResult: { success: true, message: `Webhook ${webhookId} tested successfully.` } });
  },
};

// Merge Webhook APIs into the global apiService
Object.assign(apiService, process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockWebhooksApis : webhooksApi);