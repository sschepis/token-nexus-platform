import { ActionDefinition, ActionContext, ActionResult } from '../../types/ActionTypes';
import Parse from 'parse';

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

      const query = new Parse.Query('Report');
      query.equalTo('objectId', reportId);
      query.equalTo('organizationId', orgId);

      const report = await query.first();
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
        const dataQuery = new Parse.Query(dataSource.className);
        
        // Apply organization filter
        dataQuery.equalTo('organizationId', orgId);
        
        // Apply filters from report configuration
        const filters = report.get('filters') || [];
        filters.forEach((filter: any) => {
          if (filter.field && filter.operator && filter.value !== undefined) {
            switch (filter.operator) {
              case 'equals':
                dataQuery.equalTo(filter.field, filter.value);
                break;
              case 'contains':
                dataQuery.contains(filter.field, filter.value);
                break;
              case 'greaterThan':
                dataQuery.greaterThan(filter.field, filter.value);
                break;
              case 'lessThan':
                dataQuery.lessThan(filter.field, filter.value);
                break;
            }
          }
        });

        // Apply runtime parameters
        Object.entries(parameters as Record<string, any>).forEach(([key, value]) => {
          if (value !== undefined) {
            dataQuery.equalTo(key, value);
          }
        });

        const results = await dataQuery.find();
        reportData = results.map(result => result.toJSON());
      } else {
        // Handle other data source types
        reportData = [];
      }

      // Update report run statistics
      report.increment('runCount');
      report.set('lastRun', new Date());
      await report.save();

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