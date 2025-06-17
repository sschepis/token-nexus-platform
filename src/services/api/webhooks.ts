import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Refactored webhooks API using the new utility functions
 * This eliminates all the repetitive error handling and Parse.Cloud.run patterns
 */

export interface CreateWebhookParams {
  name: string;
  url: string;
  events: string[];
  isActive?: boolean;
  secret?: string;
}

export interface UpdateWebhookParams {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  secret?: string;
}

export interface WebhookFilters {
  limit?: number;
  skip?: number;
}

export const webhooksApi = {
  /**
   * Creates a new webhook
   */
  async createWebhook(params: CreateWebhookParams) {
    return callCloudFunction('createWebhook', params as unknown as Record<string, unknown>, {
      errorMessage: 'Failed to create webhook'
    });
  },

  /**
   * Fetches a list of webhooks
   */
  async getWebhooks(params: WebhookFilters = {}) {
    return callCloudFunction('getWebhooks', params as Record<string, unknown>, {
      errorMessage: 'Failed to fetch webhooks'
    });
  },

  /**
   * Updates an existing webhook
   */
  async updateWebhook(webhookId: string, params: UpdateWebhookParams) {
    return callCloudFunction('updateWebhook', { webhookId, ...params }, {
      errorMessage: 'Failed to update webhook'
    });
  },

  /**
   * Deletes a webhook
   */
  async deleteWebhook(webhookId: string) {
    return callCloudFunction('deleteWebhook', { webhookId }, {
      errorMessage: 'Failed to delete webhook'
    });
  },

  /**
   * Tests a webhook by sending a sample event
   */
  async testWebhook(webhookId: string) {
    return callCloudFunction('testWebhook', { webhookId }, {
      errorMessage: 'Failed to test webhook'
    });
  },

  /**
   * Batch delete multiple webhooks
   */
  async batchDeleteWebhooks(webhookIds: string[]) {
    const operations = webhookIds.map(webhookId => 
      () => this.deleteWebhook(webhookId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch update multiple webhooks
   */
  async batchUpdateWebhooks(updates: Array<{ webhookId: string; params: UpdateWebhookParams }>) {
    const operations = updates.map(({ webhookId, params }) => 
      () => this.updateWebhook(webhookId, params)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  },

  /**
   * Batch test multiple webhooks
   */
  async batchTestWebhooks(webhookIds: string[]) {
    const operations = webhookIds.map(webhookId => 
      () => this.testWebhook(webhookId)
    );

    const { batchApiCalls } = await import('../../utils/apiUtils');
    return batchApiCalls(operations, {
      continueOnError: true,
      showErrorToast: false
    });
  }
};

// Mock implementations for development
const mockWebhooksApis = {
  createWebhook: (params: CreateWebhookParams) => {
    const newWebhook = {
      id: `wh-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...params,
    };
    return Promise.resolve({
      success: true,
      data: { webhook: newWebhook }
    });
  },

  getWebhooks: (params?: WebhookFilters) => {
    return Promise.resolve({
      success: true,
      data: {
        webhooks: [
          {
            id: 'wh-1',
            name: 'Order Created Webhook',
            url: 'https://example.com/webhook/order',
            events: ['order.created', 'order.updated'],
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'wh-2',
            name: 'User Registration Webhook',
            url: 'https://example.com/webhook/user',
            events: ['user.created', 'user.updated'],
            isActive: false,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
        totalCount: 2,
      }
    });
  },

  updateWebhook: (webhookId: string, params: UpdateWebhookParams) => {
    return Promise.resolve({
      success: true,
      data: { webhook: { id: webhookId, ...params, updatedAt: new Date().toISOString() } }
    });
  },

  deleteWebhook: (webhookId: string) => {
    return Promise.resolve({
      success: true,
      data: { success: true, message: `Webhook ${webhookId} deleted successfully` }
    });
  },

  testWebhook: (webhookId: string) => {
    return Promise.resolve({
      success: true,
      data: { testResult: { success: true, message: `Webhook ${webhookId} tested successfully.`, responseTime: 150 } }
    });
  },

  batchDeleteWebhooks: (webhookIds: string[]) => {
    return Promise.resolve({
      results: webhookIds.map(() => ({ success: true })),
      successCount: webhookIds.length,
      errorCount: 0
    });
  },

  batchUpdateWebhooks: (updates: Array<{ webhookId: string; params: UpdateWebhookParams }>) => {
    return Promise.resolve({
      results: updates.map(() => ({ success: true })),
      successCount: updates.length,
      errorCount: 0
    });
  },

  batchTestWebhooks: (webhookIds: string[]) => {
    return Promise.resolve({
      results: webhookIds.map(() => ({ success: true })),
      successCount: webhookIds.length,
      errorCount: 0
    });
  }
};

// Export individual functions for backward compatibility
export const {
  createWebhook,
  getWebhooks,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  batchDeleteWebhooks,
  batchUpdateWebhooks,
  batchTestWebhooks
} = webhooksApi;

// Use mock or real API based on environment
const finalWebhooksApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' ? mockWebhooksApis : webhooksApi;

// Default export
export default finalWebhooksApi;