import {
  ActionContext,
  ActionResult
} from '../../types/ActionTypes';
import { ActionConfig } from '../../base/BasePageController';
import { callCloudFunction } from '@/utils/apiUtils';

/**
 * Get AI configuration action
 */
export function getAIConfigurationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getAIConfiguration',
      name: 'Get AI Configuration',
      description: 'Get AI assistant configuration settings',
      category: 'data',
      permissions: ['ai:read'],
      parameters: []
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('getAIConfiguration', {
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error fetching AI configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch AI configuration'
        };
      }
    }
  };
}

/**
 * Update AI configuration action
 */
export function getUpdateAIConfigurationAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'updateAIConfiguration',
      name: 'Update AI Configuration',
      description: 'Update AI assistant configuration settings',
      category: 'data',
      permissions: ['ai:manage'],
      parameters: [
        { name: 'defaultModel', type: 'string', required: false, description: 'Default AI model to use' },
        { name: 'maxTokens', type: 'number', required: false, description: 'Maximum tokens per request' },
        { name: 'temperature', type: 'number', required: false, description: 'AI response temperature (0-1)' },
        { name: 'systemPrompt', type: 'string', required: false, description: 'System prompt for AI responses' },
        { name: 'enabledFeatures', type: 'array', required: false, description: 'List of enabled AI features' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          defaultModel,
          maxTokens,
          temperature,
          systemPrompt,
          enabledFeatures
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        // Validate temperature if provided
        if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
          return {
            success: false,
            error: 'Temperature must be a number between 0 and 1'
          };
        }

        // Validate maxTokens if provided
        if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens < 1)) {
          return {
            success: false,
            error: 'Max tokens must be a positive number'
          };
        }

        const result = await callCloudFunction('updateAIConfiguration', {
          defaultModel,
          maxTokens,
          temperature,
          systemPrompt,
          enabledFeatures,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error updating AI configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update AI configuration'
        };
      }
    }
  };
}

/**
 * Get AI usage statistics action
 */
export function getAIUsageStatsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'getAIUsageStats',
      name: 'Get AI Usage Statistics',
      description: 'Get AI assistant usage statistics',
      category: 'data',
      permissions: ['ai:read'],
      parameters: [
        { name: 'startDate', type: 'string', required: false, description: 'Start date for statistics (ISO string)' },
        { name: 'endDate', type: 'string', required: false, description: 'End date for statistics (ISO string)' },
        { name: 'granularity', type: 'string', required: false, description: 'Statistics granularity (day, week, month)' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          startDate,
          endDate,
          granularity = 'day'
        } = params;

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('getAIUsageStats', {
          startDate,
          endDate,
          granularity,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error fetching AI usage statistics:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch AI usage statistics'
        };
      }
    }
  };
}

/**
 * Export conversations action
 */
export function getExportConversationsAction(): {
  config: ActionConfig,
  executor: (params: Record<string, unknown>, context: ActionContext) => Promise<any>
} {
  return {
    config: {
      id: 'exportConversations',
      name: 'Export AI Conversations',
      description: 'Export AI conversations to various formats',
      category: 'data',
      permissions: ['ai:read'],
      parameters: [
        { name: 'format', type: 'string', required: true, description: 'Export format (json, csv, pdf)' },
        { name: 'conversationIds', type: 'array', required: false, description: 'Specific conversation IDs to export' },
        { name: 'startDate', type: 'string', required: false, description: 'Start date for export filter' },
        { name: 'endDate', type: 'string', required: false, description: 'End date for export filter' }
      ]
    },
    executor: async (params: Record<string, unknown>, context: ActionContext) => {
      try {
        const {
          format,
          conversationIds,
          startDate,
          endDate
        } = params;

        // Validate required parameters
        if (!format || !['json', 'csv', 'pdf'].includes(format as string)) {
          return {
            success: false,
            error: 'Valid export format is required (json, csv, pdf)'
          };
        }

        // Validate organization context
        const orgId = context.organization?.id;
        if (!orgId) {
          throw new Error('Organization context required');
        }

        const result = await callCloudFunction('exportAIConversations', {
          format,
          conversationIds,
          startDate,
          endDate,
          organizationId: orgId,
          userId: context.user.userId
        });

        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('Error exporting conversations:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export conversations'
        };
      }
    }
  };
}