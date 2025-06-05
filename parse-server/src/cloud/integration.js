/**
 * Integration Cloud Functions
 * Exposes integration functionality through Parse Cloud Functions
 */

const IntegrationService = require('../services/IntegrationService');

/**
 * Initialize integration cloud functions
 */
function initialize() {
  // Install extension
  Parse.Cloud.define('installExtension', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.extensionId) {
        throw new Error('Missing required parameter: extensionId');
      }

      const result = await IntegrationService.installExtension(params);
      return result;
    } catch (error) {
      console.error('Extension installation error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to install extension');
    }
  });

  // Connect service
  Parse.Cloud.define('connectService', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.service || !params.credentials) {
        throw new Error('Missing required parameters: service and credentials are required');
      }

      const result = await IntegrationService.connectService(params);
      return result;
    } catch (error) {
      console.error('Service connection error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to connect service');
    }
  });

  // Register webhook
  Parse.Cloud.define('registerWebhook', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.event || !params.url || !params.secret) {
        throw new Error('Missing required parameters: event, url, and secret are required');
      }

      const result = await IntegrationService.registerWebhook(params);
      return result;
    } catch (error) {
      console.error('Webhook registration error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to register webhook');
    }
  });

  // Trigger webhook
  Parse.Cloud.define('triggerWebhook', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.event || !params.data) {
        throw new Error('Missing required parameters: event and data are required');
      }

      const result = await IntegrationService.triggerWebhook(params.event, params.data);
      return result;
    } catch (error) {
      console.error('Webhook trigger error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to trigger webhook');
    }
  });

  // After save trigger for Extension
  Parse.Cloud.afterSave('Extension', async request => {
    try {
      const extension = request.object;

      // Only process if status changed
      if (request.original && extension.get('status') !== request.original.get('status')) {
        // Handle status change
        switch (extension.get('status')) {
          case 'active':
            // Activate extension
            await IntegrationService.extensions.set(extension.id, {
              ...extension.toJSON(),
              status: 'active',
            });
            break;

          case 'inactive':
            // Deactivate extension
            await IntegrationService.extensions.set(extension.id, {
              ...extension.toJSON(),
              status: 'inactive',
            });
            break;

          case 'uninstalled':
            // Remove extension
            IntegrationService.extensions.delete(extension.id);
            break;
        }
      }
    } catch (error) {
      console.error('Extension after save error:', error);
    }
  });

  // After save trigger for ServiceConnection
  Parse.Cloud.afterSave('ServiceConnection', async request => {
    try {
      const connection = request.object;

      // Only process if status changed
      if (request.original && connection.get('status') !== request.original.get('status')) {
        // Handle status change
        switch (connection.get('status')) {
          case 'active':
            // Activate connection
            await IntegrationService.connections.set(connection.get('service'), {
              ...connection.toJSON(),
              status: 'active',
            });
            break;

          case 'inactive':
            // Deactivate connection
            await IntegrationService.connections.set(connection.get('service'), {
              ...connection.toJSON(),
              status: 'inactive',
            });
            break;

          case 'disconnected':
            // Remove connection
            IntegrationService.connections.delete(connection.get('service'));
            break;
        }
      }
    } catch (error) {
      console.error('Service connection after save error:', error);
    }
  });

  // After save trigger for Webhook
  Parse.Cloud.afterSave('Webhook', async request => {
    try {
      const webhook = request.object;

      // Only process if status changed
      if (request.original && webhook.get('status') !== request.original.get('status')) {
        // Handle status change
        switch (webhook.get('status')) {
          case 'active':
            // Activate webhook
            await IntegrationService.webhooks.set(webhook.id, {
              ...webhook.toJSON(),
              status: 'active',
            });
            break;

          case 'inactive':
            // Deactivate webhook
            await IntegrationService.webhooks.set(webhook.id, {
              ...webhook.toJSON(),
              status: 'inactive',
            });
            break;

          case 'deleted':
            // Remove webhook
            IntegrationService.webhooks.delete(webhook.id);
            break;
        }
      }
    } catch (error) {
      console.error('Webhook after save error:', error);
    }
  });
}

module.exports = {
  initialize,
};
