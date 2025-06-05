import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

export const fetchIntegrationsAction: ActionDefinition = {
  id: 'fetchIntegrations',
  name: 'Fetch Integrations',
  description: 'Get all configured integrations with their status',
  category: 'data',
  permissions: ['integrations:read'],
  parameters: [
    { name: 'category', type: 'string', required: false, description: 'Filter by integration category' },
    { name: 'status', type: 'string', required: false, description: 'Filter by integration status' },
    { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive integrations' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { category, status, includeInactive = false } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to fetch integrations',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchIntegrations',
            userId: context.user.userId
          }
        };
      }

      const query = new Parse.Query('Integration');
      query.equalTo('organizationId', orgId);

      if (!includeInactive) {
        query.equalTo('isActive', true);
      }

      if (category) {
        query.equalTo('category', category);
      }

      if (status) {
        query.equalTo('status', status);
      }

      query.descending('updatedAt');
      const integrations = await query.find();
      const integrationData = integrations.map(integration => {
        const data = integration.toJSON();
        // Remove sensitive data like API keys from response
        if (data.credentials) {
          data.credentials = Object.keys(data.credentials).reduce((acc: any, key: string) => {
            acc[key] = '***';
            return acc;
          }, {});
        }
        return data;
      });

      return {
        success: true,
        data: { integrations: integrationData },
        message: `Found ${integrationData.length} integrations`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchIntegrations',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch integrations',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchIntegrations',
          userId: context.user.userId
        }
      };
    }
  }
};