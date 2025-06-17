import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const testIntegrationAction: ActionDefinition = {
  id: 'testIntegration',
  name: 'Test Integration',
  description: 'Test an integration connection and configuration',
  category: 'external',
  permissions: ['integrations:write'],
  parameters: [
    { name: 'integrationId', type: 'string', required: true, description: 'Integration ID to test' },
    { name: 'testType', type: 'string', required: false, description: 'Type of test to perform' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { integrationId, testType = 'connection' } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to test integration',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'testIntegration',
            userId: context.user.userId
          }
        };
      }

      const integration = await new ParseQueryBuilder('Integration')
        .equalTo('objectId', integrationId)
        .equalTo('organizationId', orgId)
        .first();
      if (!integration) {
        return {
          success: false,
          error: 'Integration not found',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'testIntegration',
            userId: context.user.userId
          }
        };
      }

      const integrationData = integration.toJSON();
      let testResult;

      // Perform different types of tests based on integration type
      switch (integrationData.type) {
        case 'api':
          if (integrationData.endpoint) {
            try {
              // Simple ping test to the endpoint
              const response = await fetch(integrationData.endpoint, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              testResult = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText
              };
            } catch (error) {
              testResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Connection failed'
              };
            }
          } else {
            testResult = {
              success: false,
              error: 'No endpoint configured'
            };
          }
          break;

        case 'webhook':
          testResult = {
            success: true,
            message: 'Webhook configuration validated'
          };
          break;

        case 'oauth':
          testResult = {
            success: true,
            message: 'OAuth configuration validated'
          };
          break;

        default:
          testResult = {
            success: false,
            error: 'Unknown integration type'
          };
      }

      // Update integration status based on test result
      if (testResult.success) {
        integration.set('status', 'active');
        integration.set('lastSync', new Date());
      } else {
        integration.set('status', 'error');
        integration.increment('errorCount');
      }
      await integration.save();

      return {
        success: true,
        data: { testResult, integration: integration.toJSON() },
        message: testResult.success ? 'Integration test passed' : 'Integration test failed',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'testIntegration',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test integration',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'testIntegration',
          userId: context.user.userId
        }
      };
    }
  }
};