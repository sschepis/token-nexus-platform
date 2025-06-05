import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const createIntegrationAction: ActionDefinition = {
  id: 'createIntegration',
  name: 'Create Integration',
  description: 'Create a new external service integration',
  category: 'data',
  permissions: ['integrations:write'],
  parameters: [
    { name: 'name', type: 'string', required: true, description: 'Integration name' },
    { name: 'type', type: 'string', required: true, description: 'Integration type (webhook, api, oauth)' },
    { name: 'category', type: 'string', required: true, description: 'Integration category' },
    { name: 'description', type: 'string', required: false, description: 'Integration description' },
    { name: 'endpoint', type: 'string', required: false, description: 'API endpoint URL' },
    { name: 'credentials', type: 'object', required: false, description: 'Authentication credentials' },
    { name: 'configuration', type: 'object', required: false, description: 'Integration configuration' },
    { name: 'webhookEvents', type: 'array', required: false, description: 'Webhook event types' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { 
        name, 
        type, 
        category, 
        description, 
        endpoint, 
        credentials = {}, 
        configuration = {},
        webhookEvents = []
      } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to create integration',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'createIntegration',
            userId: context.user.userId
          }
        };
      }

      const Integration = Parse.Object.extend('Integration');
      const integration = new Integration();

      integration.set('name', name);
      integration.set('type', type);
      integration.set('category', category);
      integration.set('description', description || '');
      integration.set('endpoint', endpoint || '');
      integration.set('credentials', credentials);
      integration.set('configuration', configuration);
      integration.set('webhookEvents', webhookEvents);
      integration.set('organizationId', orgId);
      integration.set('createdBy', context.user.userId);
      integration.set('status', 'inactive');
      integration.set('isActive', true);
      integration.set('lastSync', null);
      integration.set('errorCount', 0);

      const savedIntegration = await integration.save();

      return {
        success: true,
        data: { integration: savedIntegration.toJSON() },
        message: `Integration "${name}" created successfully`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'createIntegration',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create integration',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'createIntegration',
          userId: context.user.userId
        }
      };
    }
  }
};