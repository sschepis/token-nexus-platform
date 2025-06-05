const Parse = require('parse/node');
const { setupTestEnvironment, teardownTestEnvironment } = require('./helpers');

describe('Update Process', () => {
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
      description: 'Test application for update process',
      version: '1.0.0',
      status: 'published',
      updateManifest: {
        '1.0.0': {
          releaseDate: new Date(),
          changes: ['Initial release'],
          requiredMigrations: [],
        },
      },
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

  describe('Version Management', () => {
    test('should check for available updates', async () => {
      // Add new version to app
      const updateManifest = {
        ...testApp.get('updateManifest'),
        '1.1.0': {
          releaseDate: new Date(),
          changes: ['Bug fixes', 'New features'],
          requiredMigrations: ['data-v1.1.0'],
        },
      };

      testApp.set('version', '1.1.0');
      testApp.set('updateManifest', updateManifest);
      await testApp.save(null, { useMasterKey: true });

      const updates = await Parse.Cloud.run('checkForUpdates', {
        installationId: testInstallation.id,
      });

      expect(updates.available).toBe(true);
      expect(updates.currentVersion).toBe('1.0.0');
      expect(updates.latestVersion).toBe('1.1.0');
      expect(updates.changes).toBeDefined();
      expect(updates.requiredMigrations).toBeDefined();
    });

    test('should validate update compatibility', async () => {
      const compatibility = await Parse.Cloud.run('validateUpdateCompatibility', {
        installationId: testInstallation.id,
        targetVersion: '1.1.0',
      });

      expect(compatibility.canUpdate).toBeDefined();
      expect(compatibility.requirements).toBeDefined();
      expect(compatibility.conflicts).toBeDefined();
      expect(compatibility.estimatedDowntime).toBeDefined();
    });

    test('should handle version dependencies', async () => {
      // Add version with dependencies
      const updateManifest = {
        ...testApp.get('updateManifest'),
        '1.2.0': {
          releaseDate: new Date(),
          changes: ['Major update'],
          requiredMigrations: ['data-v1.2.0'],
          dependencies: {
            requiredVersion: '1.1.0',
          },
        },
      };

      testApp.set('version', '1.2.0');
      testApp.set('updateManifest', updateManifest);
      await testApp.save(null, { useMasterKey: true });

      await expect(
        Parse.Cloud.run('validateUpdateCompatibility', {
          installationId: testInstallation.id,
          targetVersion: '1.2.0',
        })
      ).rejects.toThrow();
    });
  });

  describe('Update Process', () => {
    test('should create update backup', async () => {
      const backup = await Parse.Cloud.run('createUpdateBackup', {
        installationId: testInstallation.id,
      });

      expect(backup.id).toBeDefined();
      expect(backup.timestamp).toBeDefined();
      expect(backup.version).toBe('1.0.0');
      expect(backup.data).toBeDefined();
    });

    test('should perform update installation', async () => {
      const result = await Parse.Cloud.run('installUpdate', {
        installationId: testInstallation.id,
        targetVersion: '1.1.0',
      });

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('1.1.0');
      expect(result.migrationResults).toBeDefined();

      const updatedInstallation = await new Parse.Query('CMSAppInstallation').get(
        testInstallation.id,
        { useMasterKey: true }
      );

      expect(updatedInstallation.get('version')).toBe('1.1.0');
      expect(updatedInstallation.get('lastUpdateDate')).toBeDefined();
    });

    test('should handle failed updates', async () => {
      // Simulate a failed update
      await Parse.Cloud.run('simulateUpdateFailure', {
        installationId: testInstallation.id,
        error: 'Migration failed',
      });

      const failedInstallation = await new Parse.Query('CMSAppInstallation').get(
        testInstallation.id,
        { useMasterKey: true }
      );

      expect(failedInstallation.get('status')).toBe('update_failed');
      expect(failedInstallation.get('lastError')).toBeDefined();
    });
  });

  describe('Rollback Process', () => {
    test('should validate rollback capability', async () => {
      const capability = await Parse.Cloud.run('validateRollbackCapability', {
        installationId: testInstallation.id,
        targetVersion: '1.0.0',
      });

      expect(capability.canRollback).toBeDefined();
      expect(capability.backupAvailable).toBeDefined();
      expect(capability.dataLossRisk).toBeDefined();
    });

    test('should perform rollback', async () => {
      const result = await Parse.Cloud.run('performRollback', {
        installationId: testInstallation.id,
        targetVersion: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(result.restoredVersion).toBe('1.0.0');
      expect(result.restoredFromBackup).toBeDefined();

      const rolledBackInstallation = await new Parse.Query('CMSAppInstallation').get(
        testInstallation.id,
        { useMasterKey: true }
      );

      expect(rolledBackInstallation.get('version')).toBe('1.0.0');
      expect(rolledBackInstallation.get('status')).toBe('installed');
    });
  });

  describe('Update History', () => {
    test('should track update history', async () => {
      const history = await Parse.Cloud.run('getUpdateHistory', {
        installationId: testInstallation.id,
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].version).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].status).toBeDefined();
      expect(history[0].changes).toBeDefined();
    });

    test('should manage update artifacts', async () => {
      const artifacts = await Parse.Cloud.run('getUpdateArtifacts', {
        installationId: testInstallation.id,
      });

      expect(artifacts.backups).toBeDefined();
      expect(artifacts.logs).toBeDefined();
      expect(artifacts.migrations).toBeDefined();
    });

    test('should clean old update artifacts', async () => {
      const result = await Parse.Cloud.run('cleanUpdateArtifacts', {
        installationId: testInstallation.id,
        olderThan: '30d',
      });

      expect(result.success).toBe(true);
      expect(result.cleanedArtifacts).toBeDefined();
      expect(result.freedSpace).toBeDefined();
    });
  });
});
