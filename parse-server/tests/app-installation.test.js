const Parse = require('parse/node');
const { setupTestEnvironment, teardownTestEnvironment } = require('./helpers');

describe('App Installation', () => {
  let testOrg;
  let testApp;

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
      description: 'Test application for installation tests',
      version: '1.0.0',
      status: 'published',
      requirements: {
        minStorage: 100,
        minMemory: 256,
        services: ['database', 'storage'],
      },
    });
    await testApp.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('Installation Process', () => {
    test('should validate organization requirements', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'pending',
      });

      await installation.save(null, { useMasterKey: true });

      const result = await Parse.Cloud.run('validateInstallationRequirements', {
        installationId: installation.id,
      });

      expect(result.canInstall).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.currentResources).toBeDefined();
    });

    test('should create installation record', async () => {
      const result = await Parse.Cloud.run('installApplication', {
        organizationId: testOrg.id,
        applicationId: testApp.id,
        configuration: {
          name: 'Test Installation',
          settings: {
            theme: 'default',
            features: ['basic', 'advanced'],
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.installationId).toBeDefined();

      const installation = await new Parse.Query('CMSAppInstallation').get(result.installationId, {
        useMasterKey: true,
      });

      expect(installation.get('status')).toBe('installed');
      expect(installation.get('version')).toBe(testApp.get('version'));
    });

    test('should configure installed application', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'installed',
        version: testApp.get('version'),
        configuration: {
          name: 'Test Installation',
          settings: {
            theme: 'default',
            features: ['basic'],
          },
        },
      });
      await installation.save(null, { useMasterKey: true });

      const newConfig = {
        name: 'Updated Installation',
        settings: {
          theme: 'dark',
          features: ['basic', 'advanced', 'premium'],
        },
      };

      const result = await Parse.Cloud.run('configureApplication', {
        installationId: installation.id,
        configuration: newConfig,
      });

      expect(result.success).toBe(true);

      const updatedInstallation = await new Parse.Query('CMSAppInstallation').get(installation.id, {
        useMasterKey: true,
      });

      expect(updatedInstallation.get('configuration')).toEqual(newConfig);
    });
  });

  describe('Uninstallation Process', () => {
    test('should validate uninstallation requirements', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'installed',
      });
      await installation.save(null, { useMasterKey: true });

      const result = await Parse.Cloud.run('validateUninstallation', {
        installationId: installation.id,
      });

      expect(result.canUninstall).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.activeUsers).toBeDefined();
    });

    test('should uninstall application', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'installed',
      });
      await installation.save(null, { useMasterKey: true });

      const result = await Parse.Cloud.run('uninstallApplication', {
        installationId: installation.id,
      });

      expect(result.success).toBe(true);

      const uninstalledApp = await new Parse.Query('CMSAppInstallation').get(installation.id, {
        useMasterKey: true,
      });

      expect(uninstalledApp.get('status')).toBe('uninstalled');
      expect(uninstalledApp.get('uninstalledAt')).toBeDefined();
    });

    test('should cleanup after uninstallation', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'uninstalled',
        uninstalledAt: new Date(),
      });
      await installation.save(null, { useMasterKey: true });

      const result = await Parse.Cloud.run('cleanupUninstalledApp', {
        installationId: installation.id,
      });

      expect(result.success).toBe(true);
      expect(result.cleanedResources).toBeDefined();
      expect(result.remainingData).toBeDefined();
    });
  });

  describe('Installation Status', () => {
    test('should track installation progress', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'installing',
      });
      await installation.save(null, { useMasterKey: true });

      const progress = await Parse.Cloud.run('getInstallationProgress', {
        installationId: installation.id,
      });

      expect(progress.status).toBeDefined();
      expect(progress.steps).toBeDefined();
      expect(progress.currentStep).toBeDefined();
      expect(progress.progress).toBeDefined();
    });

    test('should handle installation failures', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'installing',
      });
      await installation.save(null, { useMasterKey: true });

      // Simulate failure
      await Parse.Cloud.run('simulateInstallationFailure', {
        installationId: installation.id,
        error: 'Insufficient resources',
      });

      const failedInstallation = await new Parse.Query('CMSAppInstallation').get(installation.id, {
        useMasterKey: true,
      });

      expect(failedInstallation.get('status')).toBe('failed');
      expect(failedInstallation.get('error')).toBeDefined();
      expect(failedInstallation.get('failedAt')).toBeDefined();
    });

    test('should retry failed installations', async () => {
      const installation = new Parse.Object('CMSAppInstallation');

      installation.set({
        organization: testOrg,
        application: testApp,
        status: 'failed',
        error: 'Previous error',
        failedAt: new Date(),
      });
      await installation.save(null, { useMasterKey: true });

      const result = await Parse.Cloud.run('retryInstallation', {
        installationId: installation.id,
      });

      expect(result.success).toBe(true);

      const retryingInstallation = await new Parse.Query('CMSAppInstallation').get(
        installation.id,
        { useMasterKey: true }
      );

      expect(retryingInstallation.get('status')).toBe('installing');
      expect(retryingInstallation.get('error')).toBeUndefined();
      expect(retryingInstallation.get('retryCount')).toBeDefined();
    });
  });
});
