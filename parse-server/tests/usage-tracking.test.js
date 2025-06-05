const Parse = require('parse/node');
const { setupTestEnvironment, teardownTestEnvironment } = require('./helpers');

describe('Usage Tracking', () => {
  let testOrg;
  let testApp;
  let testInstallation;

  beforeAll(async () => {
    await setupTestEnvironment();

    testOrg = new Parse.Object('Organization');
    testOrg.set({
      name: 'Test Organization',
      status: 'active',
    });
    await testOrg.save(null, { useMasterKey: true });

    testApp = new Parse.Object('CMSApplication');
    testApp.set({
      name: 'Test App',
      description: 'Test application for usage tracking',
      version: '1.0.0',
      status: 'published',
    });
    await testApp.save(null, { useMasterKey: true });

    testInstallation = new Parse.Object('CMSAppInstallation');
    testInstallation.set({
      organization: testOrg,
      application: testApp,
      status: 'installed',
      version: '1.0.0',
    });
    await testInstallation.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('Resource Usage', () => {
    test('should track storage usage', async () => {
      // Simulate file upload
      const fileData = Buffer.from('test file content');
      const file = new Parse.File('test.txt', fileData);

      await file.save();

      await Parse.Cloud.run('trackStorageUsage', {
        installationId: testInstallation.id,
        fileId: file.id,
        size: fileData.length,
      });

      const usage = await Parse.Cloud.run('getStorageUsage', {
        installationId: testInstallation.id,
      });

      expect(usage.totalSize).toBeGreaterThan(0);
      expect(usage.fileCount).toBe(1);
      expect(usage.breakdown).toBeDefined();
    });

    test('should track database usage', async () => {
      // Create test records
      const records = [];

      for (let i = 0; i < 5; i++) {
        const record = new Parse.Object('TestData');

        record.set({
          installation: testInstallation,
          data: { field: `value${i}` },
        });
        records.push(record);
      }
      await Parse.Object.saveAll(records, { useMasterKey: true });

      const usage = await Parse.Cloud.run('getDatabaseUsage', {
        installationId: testInstallation.id,
      });

      expect(usage.recordCount).toBeGreaterThan(0);
      expect(usage.dataSize).toBeGreaterThan(0);
      expect(usage.tableBreakdown).toBeDefined();
    });

    test('should enforce storage limits', async () => {
      const largeData = Buffer.alloc(1024 * 1024 * 100); // 100MB
      const largeFile = new Parse.File('large.txt', largeData);

      await largeFile.save();

      await expect(
        Parse.Cloud.run('validateStorageLimit', {
          installationId: testInstallation.id,
          size: largeData.length,
        })
      ).rejects.toThrow();
    });
  });

  describe('API Usage', () => {
    test('should track API requests', async () => {
      const requests = [
        { endpoint: '/api/data', method: 'GET', status: 200, time: 50 },
        { endpoint: '/api/users', method: 'POST', status: 201, time: 100 },
        { endpoint: '/api/files', method: 'PUT', status: 200, time: 150 },
      ];

      for (const req of requests) {
        await Parse.Cloud.run('trackApiRequest', {
          installationId: testInstallation.id,
          ...req,
        });
      }

      const usage = await Parse.Cloud.run('getApiUsage', {
        installationId: testInstallation.id,
      });

      expect(usage.totalRequests).toBe(requests.length);
      expect(usage.endpoints).toBeDefined();
      expect(usage.methods).toBeDefined();
      expect(usage.responseStats).toBeDefined();
    });

    test('should enforce rate limits', async () => {
      const requests = Array(100).fill({
        endpoint: '/api/test',
        method: 'GET',
      });

      await expect(
        Parse.Cloud.run('validateRateLimit', {
          installationId: testInstallation.id,
          requests: requests.length,
        })
      ).rejects.toThrow();
    });

    test('should track performance metrics', async () => {
      const metrics = [
        { endpoint: '/api/data', responseTime: 50, timestamp: new Date() },
        { endpoint: '/api/data', responseTime: 100, timestamp: new Date() },
        { endpoint: '/api/data', responseTime: 75, timestamp: new Date() },
      ];

      for (const metric of metrics) {
        await Parse.Cloud.run('trackPerformanceMetric', {
          installationId: testInstallation.id,
          ...metric,
        });
      }

      const performance = await Parse.Cloud.run('getPerformanceMetrics', {
        installationId: testInstallation.id,
        endpoint: '/api/data',
      });

      expect(performance.avgResponseTime).toBeDefined();
      expect(performance.p95ResponseTime).toBeDefined();
      expect(performance.timeSeriesData).toBeDefined();
    });
  });

  describe('User Activity', () => {
    test('should track user sessions', async () => {
      const sessions = [
        { userId: 'user1', duration: 300, actions: ['view', 'edit'] },
        { userId: 'user2', duration: 600, actions: ['view'] },
        { userId: 'user1', duration: 450, actions: ['delete'] },
      ];

      for (const session of sessions) {
        await Parse.Cloud.run('trackUserSession', {
          installationId: testInstallation.id,
          ...session,
        });
      }

      const activity = await Parse.Cloud.run('getUserActivity', {
        installationId: testInstallation.id,
      });

      expect(activity.uniqueUsers).toBe(2);
      expect(activity.totalSessions).toBe(sessions.length);
      expect(activity.avgSessionDuration).toBeDefined();
      expect(activity.userActions).toBeDefined();
    });

    test('should track feature usage', async () => {
      const features = [
        { feature: 'dashboard', userId: 'user1', count: 5 },
        { feature: 'reports', userId: 'user2', count: 3 },
        { feature: 'dashboard', userId: 'user2', count: 2 },
      ];

      for (const usage of features) {
        await Parse.Cloud.run('trackFeatureUsage', {
          installationId: testInstallation.id,
          ...usage,
        });
      }

      const featureStats = await Parse.Cloud.run('getFeatureUsageStats', {
        installationId: testInstallation.id,
      });

      expect(featureStats.features).toBeDefined();
      expect(featureStats.userBreakdown).toBeDefined();
      expect(featureStats.timeSeriesData).toBeDefined();
    });
  });

  describe('Usage Reports', () => {
    test('should generate daily usage report', async () => {
      const report = await Parse.Cloud.run('generateDailyUsageReport', {
        installationId: testInstallation.id,
        date: new Date(),
      });

      expect(report.storage).toBeDefined();
      expect(report.api).toBeDefined();
      expect(report.users).toBeDefined();
      expect(report.features).toBeDefined();
    });

    test('should aggregate monthly usage', async () => {
      const usage = await Parse.Cloud.run('getMonthlyUsage', {
        installationId: testInstallation.id,
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
      });

      expect(usage.dailyBreakdown).toBeDefined();
      expect(usage.trends).toBeDefined();
      expect(usage.comparisons).toBeDefined();
    });

    test('should detect usage anomalies', async () => {
      const anomalies = await Parse.Cloud.run('detectUsageAnomalies', {
        installationId: testInstallation.id,
        timeframe: 'last7days',
      });

      expect(anomalies.storage).toBeDefined();
      expect(anomalies.api).toBeDefined();
      expect(anomalies.users).toBeDefined();
      expect(anomalies.recommendations).toBeDefined();
    });
  });
});
