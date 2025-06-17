import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

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

      let queryBuilder = new ParseQueryBuilder('Integration')
        .equalTo('organizationId', orgId);

      if (!includeInactive) {
        queryBuilder = queryBuilder.equalTo('isActive', true);
      }

      if (category) {
        queryBuilder = queryBuilder.equalTo('category', category);
      }

      if (status) {
        queryBuilder = queryBuilder.equalTo('status', status);
      }

      const integrations = await queryBuilder
        .descending('updatedAt')
        .find();
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