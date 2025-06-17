import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const getReportCategoriesAction: ActionDefinition = {
  id: 'getReportCategories',
  name: 'Get Report Categories',
  description: 'Get all available report categories',
  category: 'data',
  permissions: ['reports:read'],
  parameters: [],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to get categories',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'getReportCategories',
            userId: context.user.userId
          }
        };
      }

      // Build query using ParseQueryBuilder utility
      const reports = await new ParseQueryBuilder('Report')
        .equalTo('organizationId', orgId)
        .select('category')
        .find();
        
      const categorySet = new Set(reports.map(r => r.get('category')).filter(Boolean));
      const categories = Array.from(categorySet);

      return {
        success: true,
        data: { categories },
        message: `Found ${categories.length} categories`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getReportCategories',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report categories',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'getReportCategories',
          userId: context.user.userId
        }
      };
    }
  }
};