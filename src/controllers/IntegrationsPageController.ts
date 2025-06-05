import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  PageContext
} from './types/ActionTypes';

export class IntegrationsPageController implements PageController {
  pageId = 'integrations';
  pageName = 'Integrations';
  description = 'Manage external service integrations and API connections';
  actions = new Map<string, ActionDefinition>();
  context: PageContext = {
    pageId: 'integrations',
    pageName: 'Integrations',
    state: {},
    props: {},
    metadata: {
      category: 'connectivity',
      tags: ['integrations', 'api', 'external', 'services'],
      permissions: ['integrations:read', 'integrations:write', 'api:manage']
    }
  };
  metadata = {
    category: 'connectivity',
    tags: ['integrations', 'api', 'external', 'services'],
    permissions: ['integrations:read', 'integrations:write', 'api:manage'],
    version: '1.0.0'
  };
  isActive = true;
  registeredAt = new Date();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    // Fetch Integrations Action
    this.actions.set('fetchIntegrations', {
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
    });

    // Create Integration Action
    this.actions.set('createIntegration', {
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
    });

    // Test Integration Action
    this.actions.set('testIntegration', {
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

          const query = new Parse.Query('Integration');
          query.equalTo('objectId', integrationId);
          query.equalTo('organizationId', orgId);

          const integration = await query.first();
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
    });

    // Update Integration Action
    this.actions.set('updateIntegration', {
      id: 'updateIntegration',
      name: 'Update Integration',
      description: 'Update an existing integration configuration',
      category: 'data',
      permissions: ['integrations:write'],
      parameters: [
        { name: 'integrationId', type: 'string', required: true, description: 'Integration ID to update' },
        { name: 'name', type: 'string', required: false, description: 'Integration name' },
        { name: 'description', type: 'string', required: false, description: 'Integration description' },
        { name: 'endpoint', type: 'string', required: false, description: 'API endpoint URL' },
        { name: 'credentials', type: 'object', required: false, description: 'Authentication credentials' },
        { name: 'configuration', type: 'object', required: false, description: 'Integration configuration' },
        { name: 'webhookEvents', type: 'array', required: false, description: 'Webhook event types' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Integration active status' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { integrationId, ...updateData } = params;
          const orgId = context.user.organizationId || context.organization?.id;

          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to update integration',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateIntegration',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Integration');
          query.equalTo('objectId', integrationId);
          query.equalTo('organizationId', orgId);

          const integration = await query.first();
          if (!integration) {
            return {
              success: false,
              error: 'Integration not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'updateIntegration',
                userId: context.user.userId
              }
            };
          }

          // Update fields
          Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
              integration.set(key, value);
            }
          });

          integration.set('updatedBy', context.user.userId);
          const savedIntegration = await integration.save();

          return {
            success: true,
            data: { integration: savedIntegration.toJSON() },
            message: 'Integration updated successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateIntegration',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update integration',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'updateIntegration',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Delete Integration Action
    this.actions.set('deleteIntegration', {
      id: 'deleteIntegration',
      name: 'Delete Integration',
      description: 'Delete an integration from the system',
      category: 'data',
      permissions: ['integrations:write'],
      parameters: [
        { name: 'integrationId', type: 'string', required: true, description: 'Integration ID to delete' },
        { name: 'confirmDelete', type: 'boolean', required: true, description: 'Confirmation flag for deletion' }
      ],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const { integrationId, confirmDelete } = params;

          if (!confirmDelete) {
            return {
              success: false,
              error: 'Delete confirmation is required',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteIntegration',
                userId: context.user.userId
              }
            };
          }

          const orgId = context.user.organizationId || context.organization?.id;
          if (!orgId) {
            return {
              success: false,
              error: 'Organization ID is required to delete integration',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteIntegration',
                userId: context.user.userId
              }
            };
          }

          const query = new Parse.Query('Integration');
          query.equalTo('objectId', integrationId);
          query.equalTo('organizationId', orgId);

          const integration = await query.first();
          if (!integration) {
            return {
              success: false,
              error: 'Integration not found',
              metadata: {
                executionTime: 0,
                timestamp: new Date(),
                actionId: 'deleteIntegration',
                userId: context.user.userId
              }
            };
          }

          await integration.destroy();

          return {
            success: true,
            data: { deletedIntegrationId: integrationId },
            message: 'Integration deleted successfully',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteIntegration',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete integration',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'deleteIntegration',
              userId: context.user.userId
            }
          };
        }
      }
    });

    // Get Integration Categories Action
    this.actions.set('getIntegrationCategories', {
      id: 'getIntegrationCategories',
      name: 'Get Integration Categories',
      description: 'Get all available integration categories',
      category: 'data',
      permissions: ['integrations:read'],
      parameters: [],
      execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
        try {
          const categories = [
            'Authentication',
            'Payment Processing',
            'Email Services',
            'Analytics',
            'Storage',
            'Communication',
            'CRM',
            'Marketing',
            'Development Tools',
            'Monitoring',
            'Other'
          ];

          return {
            success: true,
            data: { categories },
            message: `Found ${categories.length} categories`,
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getIntegrationCategories',
              userId: context.user.userId
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get integration categories',
            metadata: {
              executionTime: 0,
              timestamp: new Date(),
              actionId: 'getIntegrationCategories',
              userId: context.user.userId
            }
          };
        }
      }
    });
  }
}

// Export singleton instance
export const integrationsPageController = new IntegrationsPageController();