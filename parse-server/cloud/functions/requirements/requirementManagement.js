const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');
const semver = require('semver'); // Required for dependency checks

const checkSystemRequirements = withOrganizationContext(async request => {
  const { user, organizationId, organization } = request;
  const { requirements } = request.params;

  if (!user || !organizationId) {
    throw new Error('User and organization context are required.');
  }

  // Get organization's resource usage
  const resourceUsage = await Parse.Cloud.run('getOrganizationResourceUsage', {
    organizationId,
  });

  const checks = [];

  // Check storage requirements
  if (requirements.storage) {
    const availableStorage = resourceUsage.storageLimit - resourceUsage.storageUsed;

    checks.push({
      name: 'Storage Space',
      passed: availableStorage >= requirements.storage,
      required: true,
      message: `Requires ${requirements.storage}MB of storage space. Available: ${availableStorage}MB`,
    });
  }

  // Check memory requirements
  if (requirements.memory) {
    const availableMemory = resourceUsage.memoryLimit - resourceUsage.memoryUsed;

    checks.push({
      name: 'Memory',
      passed: availableMemory >= requirements.memory,
      required: true,
      message: `Requires ${requirements.memory}MB of memory. Available: ${availableMemory}MB`,
    });
  }

  // Check CPU requirements
  if (requirements.cpu) {
    const availableCPU = resourceUsage.cpuLimit - resourceUsage.cpuUsed;

    checks.push({
      name: 'CPU',
      passed: availableCPU >= requirements.cpu,
      required: true,
      message: `Requires ${requirements.cpu} CPU units. Available: ${availableCPU}`,
    });
  }

  // Check required services
  if (requirements.services) {
    const availableServices = await Parse.Cloud.run('getAvailableServices', {
      organizationId,
    });

    requirements.services.forEach(service => {
      const serviceAvailable = availableServices.includes(service);

      checks.push({
        name: `Service: ${service}`,
        passed: serviceAvailable,
        required: true,
        message: serviceAvailable
          ? `Service ${service} is available`
          : `Required service ${service} is not available`,
      });
    });
  }

  // Check required features
  if (requirements.features) {
    const availableFeatures = await Parse.Cloud.run('getAvailableFeatures', {
      organizationId,
    });

    requirements.features.forEach(feature => {
      const featureAvailable = availableFeatures.includes(feature);

      checks.push({
        name: `Feature: ${feature}`,
        passed: featureAvailable,
        required: true,
        message: featureAvailable
          ? `Feature ${feature} is available`
          : `Required feature ${feature} is not available`,
      });
    });
  }

  return checks;
});

const checkDependencies = withOrganizationContext(async request => {
  const { user, organizationId, organization } = request;
  const { dependencies } = request.params;

  if (!user || !organizationId) {
    throw new Error('User and organization context are required.');
  }

  // Fetch organization's installed applications
  const installedApps = await new Parse.Query('InstalledApplication')
    .equalTo('organization', organization)
    .include(['marketplaceApp'])
    .find({ useMasterKey: true });

  return dependencies.map(dep => {
    const installedApp = installedApps.find(app => app.get('marketplaceApp').id === dep.id);

    if (!installedApp) {
      return {
        name: dep.name,
        passed: false,
        required: dep.required,
        message: `Required dependency ${dep.name} is not installed`,
      };
    }

    const installedVersion = semver.clean(installedApp.get('installedVersion')?.get('version') || '0.0.0');
    const meetsVersion = semver.satisfies(installedVersion, dep.version);

    return {
      name: dep.name,
      passed: meetsVersion,
      required: dep.required,
      message: meetsVersion
        ? `Dependency ${dep.name} v${installedVersion} satisfies requirement v${dep.version}`
        : `Dependency ${dep.name} v${installedVersion} does not satisfy requirement v${dep.version}`,
    };
  });
});

const checkPermissions = withOrganizationContext(async request => {
  const { user, organizationId } = request;
  const { permissions } = request.params;

  if (!user || !organizationId) {
    throw new Error('User and organization context are required.');
  }

  // Get user's permissions for the organization
  const userPermissions = await Parse.Cloud.run('getUserPermissions', {
    organizationId,
    // Note: userId is already available in the request.user object
    userId: user.id,
  });

  return permissions.map(permission => {
    // Check if the user has the required permission
    const hasPermission = userPermissions.includes(permission.name);

    return {
      name: permission.name,
      passed: hasPermission,
      required: permission.required,
      message: hasPermission
        ? `User has required permission: ${permission.name}`
        : `User lacks required permission: ${permission.name}`,
    };
  });
});

const validateAppSettings = async request => {
  const { appId, settings } = request.params;

  // Fetch app to get validation rules
  const app = await new Parse.Query('MarketplaceApp')
    .equalTo('objectId', appId)
    .first({ useMasterKey: true });

  if (!app) {
    throw new Error('Application not found');
  }

  const validationRules = app.get('validationRules');
  const errors = [];

  // Validate settings
  if (validationRules.settings) {
    Object.entries(validationRules.settings).forEach(([key, rule]) => {
      const value = settings.settings?.[key];

      if (rule.required && !value) {
        errors.push(`Setting ${key} is required`);
      } else if (value) {
        if (rule.type === 'number') {
          const numValue = Number(value);

          if (isNaN(numValue)) {
            errors.push(`Setting ${key} must be a number`);
          } else {
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push(`Setting ${key} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push(`Setting ${key} must be at most ${rule.max}`);
            }
          }
        } else if (rule.pattern) {
          const regex = new RegExp(rule.pattern);

          if (!regex.test(String(value))) {
            errors.push(`Setting ${key} has invalid format`);
          }
        }
      }
    });
  }

  // Validate features
  if (validationRules.features) {
    Object.entries(validationRules.features).forEach(([key, rule]) => {
      const enabled = settings.features?.[key];

      if (rule.required && !enabled) {
        errors.push(`Feature ${key} is required`);
      }
      if (enabled && rule.dependencies) {
        rule.dependencies.forEach(dep => {
          if (!settings.features?.[dep]) {
            errors.push(`Feature ${key} requires ${dep} to be enabled`);
          }
        });
      }
    });
  }

  // Validate integrations
  if (validationRules.integrations) {
    Object.entries(validationRules.integrations).forEach(([key, rule]) => {
      const integration = settings.integrations?.[key];

      if (rule.required && !integration?.enabled) {
        errors.push(`Integration ${key} is required`);
      }
      if (integration?.enabled && rule.settings) {
        Object.entries(rule.settings).forEach(([settingKey, settingRule]) => {
          const value = integration.config?.[settingKey];

          if (settingRule.required && !value) {
            errors.push(`Setting ${settingKey} is required for integration ${key}`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    error: errors.join('; '),
  };
};

const setupAppEnvironment = withOrganizationContext(async request => {
  const { user, organizationId, organization } = request;
  const { appId, settings } = request.params;

  if (!user || !organizationId) {
    throw new Error('User and organization context are required.');
  }

  // Validate settings first
  const validationResult = await validateAppSettings(request);

  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }

  // Create environment configuration
  const AppEnvironment = Parse.Object.extend('AppEnvironment');
  const environment = new AppEnvironment();

  environment.set('organization', organization);
  environment.set('application', new Parse.Object('MarketplaceApp', { id: appId }));
  environment.set('settings', settings.settings);
  environment.set('features', settings.features);
  environment.set('integrations', settings.integrations);
  environment.set('status', 'active');

  await environment.save(null, { useMasterKey: true });

  // Setup any required services or integrations
  if (settings.integrations) {
    for (const [key, integration] of Object.entries(settings.integrations)) {
      if (integration.enabled) {
        await Parse.Cloud.run(`setup${key}Integration`, {
          organizationId,
          appId,
          config: integration.config,
        });
      }
    }
  }

  return {
    success: true,
    environmentId: environment.id,
  };
});

module.exports = {
  checkSystemRequirements,
  checkDependencies,
  checkPermissions,
  validateAppSettings,
  setupAppEnvironment,
};
