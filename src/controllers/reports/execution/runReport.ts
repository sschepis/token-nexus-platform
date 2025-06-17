import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import { ParseQueryBuilder, updateParseObject } from '../../../utils/parseUtils';

export const runReportAction: ActionDefinition = {
  id: 'runReport',
  name: 'Run Report',
  description: 'Execute a report and generate results',
  category: 'data',
  permissions: ['reports:read'],
  parameters: [
    { name: 'reportId', type: 'string', required: true, description: 'Report ID to run' },
    { name: 'parameters', type: 'object', required: false, description: 'Runtime parameters' },
    { name: 'format', type: 'string', required: false, description: 'Output format (json, csv, pdf)' }
  ],
  execute: async (params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> => {
    try {
      const { reportId, parameters = {}, format = 'json' } = params;
      const orgId = context.user.organizationId || context.organization?.id;

      if (!orgId) {
        return {
          success: false,
          error: 'Organization ID is required to run report',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'runReport',
            userId: context.user.userId
          }
        };
      }

      // Get report using ParseQueryBuilder
      const report = await new ParseQueryBuilder('Report')
        .equalTo('objectId', reportId)
        .equalTo('organizationId', orgId)
        .first();

      if (!report) {
        return {
          success: false,
          error: 'Report not found',
          metadata: {
            executionTime: 0,
            timestamp: new Date(),
            actionId: 'runReport',
            userId: context.user.userId
          }
        };
      }

      const dataSource = report.get('dataSource');
      const visualization = report.get('visualization');
      
      // Execute the report based on data source configuration
      let reportData;
      if (dataSource.type === 'parse_query') {
        // Build data query using ParseQueryBuilder
        let dataQueryBuilder = new ParseQueryBuilder(dataSource.className)
          .equalTo('organizationId', orgId);
        
        // Apply filters from report configuration
        const filters = report.get('filters') || [];
        filters.forEach((filter: any) => {
          if (filter.field && filter.operator && filter.value !== undefined) {
            switch (filter.operator) {
              case 'equals':
                dataQueryBuilder = dataQueryBuilder.equalTo(filter.field, filter.value);
                break;
              case 'contains':
                dataQueryBuilder = dataQueryBuilder.contains(filter.field, filter.value);
                break;
              case 'greaterThan':
                dataQueryBuilder = dataQueryBuilder.greaterThan(filter.field, filter.value);
                break;
              case 'lessThan':
                dataQueryBuilder = dataQueryBuilder.lessThan(filter.field, filter.value);
                break;
            }
          }
        });

        // Apply runtime parameters
        Object.entries(parameters as Record<string, any>).forEach(([key, value]) => {
          if (value !== undefined) {
            dataQueryBuilder = dataQueryBuilder.equalTo(key, value);
          }
        });

        const results = await dataQueryBuilder.find();
        reportData = results.map(result => result.toJSON());
      } else {
        // Handle other data source types
        reportData = [];
      }

      // Update report run statistics using utility
      await updateParseObject(
        'Report',
        reportId as string,
        {
          runCount: (report.get('runCount') || 0) + 1,
          lastRun: new Date()
        },
        { organizationId: orgId }
      );

      return {
        success: true,
        data: { 
          reportData,
          visualization,
          format,
          runAt: new Date(),
          recordCount: reportData.length
        },
        message: `Report executed successfully with ${reportData.length} records`,
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'runReport',
          userId: context.user.userId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run report',
        metadata: {
          executionTime: 0,
          timestamp: new Date(),
          actionId: 'runReport',
          userId: context.user.userId
        }
      };
    }
  }
};