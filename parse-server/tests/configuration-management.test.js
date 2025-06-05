const Parse = require('parse/node');
const { setupTestEnvironment, teardownTestEnvironment } = require('./helpers');

describe('Configuration Management', () => {
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
      description: 'Test application for configuration tests',
      version: '1.0.0',
      status: 'published',
      configSchema: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark', 'custom'],
          },
          features: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          limits: {
            type: 'object',
            properties: {
              maxUsers: { type: 'number' },
              maxStorage: { type: 'number' },
            },
          },
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

  describe('Environment Configuration', () => {
    test('should create environment-specific configurations', async () => {
      const environments = ['development', 'staging', 'production'];

      for (const env of environments) {
        const config = {
          theme: 'light',
          features: ['basic'],
          limits: {
            maxUsers: env === 'production' ? 1000 : 100,
            maxStorage: env === 'production' ? 1000 : 100,
          },
        };

        const result = await Parse.Cloud.run('setEnvironmentConfig', {
          installationId: testInstallation.id,
          environment: env,
          config,
        });

        expect(result.success).toBe(true);

        const savedConfig = await Parse.Cloud.run('getEnvironmentConfig', {
          installationId: testInstallation.id,
          environment: env,
        });

        expect(savedConfig).toEqual(config);
      }
    });

    test('should validate configuration against schema', async () => {
      const invalidConfig = {
        theme: 'invalid-theme',
        features: ['invalid-feature'],
        limits: {
          maxUsers: 'not-a-number',
        },
      };

      await expect(
        Parse.Cloud.run('setEnvironmentConfig', {
          installationId: testInstallation.id,
          environment: 'development',
          config: invalidConfig,
        })
      ).rejects.toThrow();
    });

    test('should handle environment inheritance', async () => {
      const baseConfig = {
        theme: 'light',
        features: ['basic'],
        limits: {
          maxUsers: 100,
          maxStorage: 100,
        },
      };

      await Parse.Cloud.run('setEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'development',
        config: baseConfig,
      });

      const stagingOverrides = {
        limits: {
          maxUsers: 200,
        },
      };

      await Parse.Cloud.run('setEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'staging',
        config: stagingOverrides,
        inherit: 'development',
      });

      const stagingConfig = await Parse.Cloud.run('getEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'staging',
      });

      expect(stagingConfig.theme).toBe(baseConfig.theme);
      expect(stagingConfig.features).toEqual(baseConfig.features);
      expect(stagingConfig.limits.maxUsers).toBe(stagingOverrides.limits.maxUsers);
      expect(stagingConfig.limits.maxStorage).toBe(baseConfig.limits.maxStorage);
    });
  });

  describe('Configuration Variables', () => {
    test('should manage environment variables', async () => {
      const variables = {
        API_KEY: 'test-api-key',
        API_SECRET: 'test-api-secret',
        ENDPOINT_URL: 'https://api.test.com',
      };

      const result = await Parse.Cloud.run('setEnvironmentVariables', {
        installationId: testInstallation.id,
        environment: 'development',
        variables,
      });

      expect(result.success).toBe(true);

      const savedVars = await Parse.Cloud.run('getEnvironmentVariables', {
        installationId: testInstallation.id,
        environment: 'development',
      });

      expect(savedVars).toEqual(variables);
    });

    test('should handle secret variables', async () => {
      const secrets = {
        DB_PASSWORD: 'secret-password',
        AUTH_TOKEN: 'secret-token',
      };

      const result = await Parse.Cloud.run('setSecretVariables', {
        installationId: testInstallation.id,
        environment: 'production',
        secrets,
      });

      expect(result.success).toBe(true);

      const savedSecrets = await Parse.Cloud.run('getSecretVariables', {
        installationId: testInstallation.id,
        environment: 'production',
      });

      // Secrets should be masked
      expect(savedSecrets.DB_PASSWORD).toBe('********');
      expect(savedSecrets.AUTH_TOKEN).toBe('********');
    });
  });

  describe('Feature Flags', () => {
    test('should manage feature flags', async () => {
      const flags = {
        newFeature: {
          enabled: true,
          users: ['admin', 'beta-tester'],
          percentage: 50,
        },
        experimentalApi: {
          enabled: false,
        },
      };

      const result = await Parse.Cloud.run('setFeatureFlags', {
        installationId: testInstallation.id,
        environment: 'development',
        flags,
      });

      expect(result.success).toBe(true);

      const savedFlags = await Parse.Cloud.run('getFeatureFlags', {
        installationId: testInstallation.id,
        environment: 'development',
      });

      expect(savedFlags).toEqual(flags);
    });

    test('should evaluate feature flags', async () => {
      const flags = {
        newFeature: {
          enabled: true,
          users: ['test-user'],
          percentage: 100,
        },
      };

      await Parse.Cloud.run('setFeatureFlags', {
        installationId: testInstallation.id,
        environment: 'production',
        flags,
      });

      const evaluation = await Parse.Cloud.run('evaluateFeatureFlags', {
        installationId: testInstallation.id,
        environment: 'production',
        userId: 'test-user',
      });

      expect(evaluation.newFeature).toBe(true);
    });
  });

  describe('Configuration History', () => {
    test('should track configuration changes', async () => {
      const config = {
        theme: 'dark',
        features: ['advanced'],
      };

      await Parse.Cloud.run('setEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'development',
        config,
      });

      const history = await Parse.Cloud.run('getConfigurationHistory', {
        installationId: testInstallation.id,
        environment: 'development',
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].config).toEqual(config);
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].user).toBeDefined();
    });

    test('should restore previous configuration', async () => {
      const originalConfig = {
        theme: 'light',
        features: ['basic'],
      };

      const updatedConfig = {
        theme: 'dark',
        features: ['advanced'],
      };

      // Save original config
      await Parse.Cloud.run('setEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'development',
        config: originalConfig,
      });

      // Update config
      await Parse.Cloud.run('setEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'development',
        config: updatedConfig,
      });

      // Get history
      const history = await Parse.Cloud.run('getConfigurationHistory', {
        installationId: testInstallation.id,
        environment: 'development',
      });

      // Restore to original version
      const result = await Parse.Cloud.run('restoreConfiguration', {
        installationId: testInstallation.id,
        environment: 'development',
        version: history[1].version,
      });

      expect(result.success).toBe(true);

      const restoredConfig = await Parse.Cloud.run('getEnvironmentConfig', {
        installationId: testInstallation.id,
        environment: 'development',
      });

      expect(restoredConfig).toEqual(originalConfig);
    });
  });
});
