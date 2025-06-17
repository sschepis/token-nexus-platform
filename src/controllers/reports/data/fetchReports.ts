import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder } from '../../../utils/parseUtils';

export const fetchReportsAction: ActionDefinition = {
  id: 'fetchReports',
  name: 'Fetch Reports',
  description: 'Get all available reports with filtering options',
  category: 'data',
  permissions: ['reports:read'],
  parameters: [
    { name: 'category', type: 'string', required: false, description: 'Filter by report category' },
    { name: 'searchTerm', type: 'string', required: false, description: 'Search term for report names' },
    { name: 'includeInactive', type: 'boolean', required: false, description: 'Include inactive reports' },
    { name: 'createdBy', type: 'string', required: false, description: 'Filter by report creator' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { category, searchTerm, includeInactive = false, createdBy } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to fetch reports',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'fetchReports',
            userId: context.user.userId
          }
        };
      }

      // Build query using ParseQueryBuilder utility
      let queryBuilder = new ParseQueryBuilder('Report')
        .equalTo('organizationId', orgId);

      if (!includeInactive) {
        queryBuilder = queryBuilder.equalTo('isActive', true);
      }

      if (category) {
        queryBuilder = queryBuilder.equalTo('category', category);
      }

      if (searchTerm) {
        queryBuilder = queryBuilder.contains('name', searchTerm.toString());
      }

      if (createdBy) {
        queryBuilder = queryBuilder.equalTo('createdBy', createdBy);
      }

      const reports = await queryBuilder
        .descending('updatedAt')
        .find();
      
      const reportData = reports.map(report => report.toJSON());

      return {
        success: true,
        data: { reports: reportData },
        message: `Found ${reportData.length} reports`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchReports',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'fetchReports',
          userId: context.user.userId
        }
      };
    }
  }
};