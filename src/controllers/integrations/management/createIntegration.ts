import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { createParseObject } from '../../../utils/parseUtils';

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

      const integrationData = {
        name,
        type,
        category,
        description: description || '',
        endpoint: endpoint || '',
        credentials,
        configuration,
        webhookEvents,
        organizationId: orgId,
        createdBy: context.user.userId,
        status: 'inactive',
        isActive: true,
        lastSync: null,
        errorCount: 0
      };

      const savedIntegration = await createParseObject('Integration', integrationData);

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