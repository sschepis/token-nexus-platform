module.exports = Parse => {
  // CMSReport schema for reports functionality
  const CMSReportSchema = new Parse.Schema('CMSReport');
  CMSReportSchema.addString('name');
  CMSReportSchema.addString('description');
  CMSReportSchema.addString('type');
  CMSReportSchema.addString('category');
  CMSReportSchema.addString('format');
  CMSReportSchema.addString('status', { defaultValue: 'draft' });
  CMSReportSchema.addString('organizationId');
  CMSReportSchema.addString('createdBy');
  CMSReportSchema.addString('updatedBy');
  CMSReportSchema.addString('fileUrl');
  CMSReportSchema.addObject('query');
  CMSReportSchema.addObject('filters');
  CMSReportSchema.addObject('schedule');
  CMSReportSchema.addDate('startDate');
  CMSReportSchema.addDate('endDate');
  CMSReportSchema.addDate('lastRun');
  CMSReportSchema.addNumber('runCount', { defaultValue: 0 });
  CMSReportSchema.addBoolean('isActive', { defaultValue: true });
  CMSReportSchema.addBoolean('isPublic', { defaultValue: false });

  // CMSReportResult schema for report execution results
  const CMSReportResultSchema = new Parse.Schema('CMSReportResult');
  CMSReportResultSchema.addPointer('report', 'CMSReport');
  CMSReportResultSchema.addString('organizationId');
  CMSReportResultSchema.addString('createdBy');
  CMSReportResultSchema.addString('updatedBy');
  CMSReportResultSchema.addString('status');
  CMSReportResultSchema.addString('error');
  CMSReportResultSchema.addObject('data');
  CMSReportResultSchema.addNumber('runTime');

  // Integration schema for integrations functionality
  const IntegrationSchema = new Parse.Schema('Integration');
  IntegrationSchema.addString('name');
  IntegrationSchema.addString('description');
  IntegrationSchema.addString('type');
  IntegrationSchema.addString('provider');
  IntegrationSchema.addString('organizationId');
  IntegrationSchema.addString('createdBy');
  IntegrationSchema.addString('updatedBy');
  IntegrationSchema.addObject('config');
  IntegrationSchema.addObject('credentials');
  IntegrationSchema.addString('status', { defaultValue: 'inactive' });
  IntegrationSchema.addBoolean('isActive', { defaultValue: true });
  IntegrationSchema.addDate('lastSync');
  IntegrationSchema.addNumber('syncCount', { defaultValue: 0 });

  // CustomPage schema for page builder functionality
  const CustomPageSchema = new Parse.Schema('CustomPage');
  CustomPageSchema.addString('name');
  CustomPageSchema.addString('path');
  CustomPageSchema.addString('title');
  CustomPageSchema.addString('description');
  CustomPageSchema.addString('category', { defaultValue: 'custom' });
  CustomPageSchema.addString('organizationId');
  CustomPageSchema.addString('createdBy');
  CustomPageSchema.addString('updatedBy');
  CustomPageSchema.addObject('layout');
  CustomPageSchema.addArray('components');
  CustomPageSchema.addBoolean('isActive', { defaultValue: true });
  CustomPageSchema.addBoolean('isPublic', { defaultValue: false });

  // CMSMetric schema for analytics metrics
  const CMSMetricSchema = new Parse.Schema('CMSMetric');
  CMSMetricSchema.addString('name');
  CMSMetricSchema.addString('organizationId');
  CMSMetricSchema.addNumber('value');
  CMSMetricSchema.addString('unit');
  CMSMetricSchema.addDate('timestamp');
  CMSMetricSchema.addObject('metadata');

  // VisitorStats schema for visitor analytics
  const VisitorStatsSchema = new Parse.Schema('VisitorStats');
  VisitorStatsSchema.addString('organizationId');
  VisitorStatsSchema.addString('page');
  VisitorStatsSchema.addNumber('count', { defaultValue: 0 });
  VisitorStatsSchema.addDate('date');

  // APIStats schema for API performance metrics
  const APIStatsSchema = new Parse.Schema('APIStats');
  APIStatsSchema.addString('organizationId');
  APIStatsSchema.addString('endpoint');
  APIStatsSchema.addNumber('avgResponseTime');
  APIStatsSchema.addNumber('requestCount');
  APIStatsSchema.addNumber('errorCount');
  APIStatsSchema.addDate('date');

  // Function to create schemas safely
  async function createSchemaIfNotExists(schema) {
    try {
      await schema.save();
      console.log(`✓ Created schema: ${schema.className}`);
    } catch (error) {
      if (error.code === 103) {
        console.log(`✓ Schema already exists: ${schema.className}`);
      } else {
        console.error(`✗ Error creating schema ${schema.className}:`, error);
      }
    }
  }

  // Create all schemas
  const schemas = [
    CMSReportSchema,
    CMSReportResultSchema,
    IntegrationSchema,
    CustomPageSchema,
    CMSMetricSchema,
    VisitorStatsSchema,
    APIStatsSchema
  ];

  // Initialize schemas
  Promise.all(schemas.map(createSchemaIfNotExists))
    .then(() => {
      console.log('✓ All reports and integrations schemas initialized');
    })
    .catch(error => {
      console.error('✗ Error initializing schemas:', error);
    });
};