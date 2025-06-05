
const getAppConfiguration = async request => {
  const { installationId } = request.params;

  // Fetch the installation
  const installation = await new Parse.Query('InstalledApplication')
    .equalTo('objectId', installationId)
    .include(['marketplaceApp', 'organization'])
    .first({ useMasterKey: true });

  if (!installation) {
    throw new Error('Installation not found');
  }

  // Check user access to the organization
  const userOrgs = await new Parse.Query('OrganizationUser')
    .equalTo('user', request.user)
    .equalTo('organization', installation.get('organization'))
    .first({ useMasterKey: true });

  if (!userOrgs) {
    throw new Error('User does not have access to this organization');
  }

  // Get the configuration or create default if none exists
  const configQuery = new Parse.Query('AppConfiguration').equalTo('installation', installation);

  let config = await configQuery.first({ useMasterKey: true });

  if (!config) {
    // Create default configuration based on marketplace app template
    const marketplaceApp = installation.get('marketplaceApp');
    const defaultConfig = marketplaceApp.get('defaultConfiguration') || {
      environment: 'development',
      settings: {},
      features: {},
      integrations: {},
    };

    const AppConfiguration = Parse.Object.extend('AppConfiguration');

    config = new AppConfiguration();
    config.set('installation', installation);
    config.set('environment', defaultConfig.environment);
    config.set('settings', defaultConfig.settings);
    config.set('features', defaultConfig.features);
    config.set('integrations', defaultConfig.integrations);

    await config.save(null, { useMasterKey: true });
  }

  return {
    environment: config.get('environment'),
    settings: config.get('settings'),
    features: config.get('features'),
    integrations: config.get('integrations'),
  };
};

const updateAppConfiguration = async request => {
  const { installationId, config: newConfig } = request.params;

  // Validate the configuration structure
  if (!newConfig || typeof newConfig !== 'object') {
    throw new Error('Invalid configuration format');
  }

  // Fetch the installation
  const installation = await new Parse.Query('InstalledApplication')
    .equalTo('objectId', installationId)
    .include(['organization'])
    .first({ useMasterKey: true });

  if (!installation) {
    throw new Error('Installation not found');
  }

  // Check user access to the organization
  const userOrgs = await new Parse.Query('OrganizationUser')
    .equalTo('user', request.user)
    .equalTo('organization', installation.get('organization'))
    .first({ useMasterKey: true });

  if (!userOrgs) {
    throw new Error('User does not have access to this organization');
  }

  // Get existing configuration
  const configQuery = new Parse.Query('AppConfiguration').equalTo('installation', installation);

  let config = await configQuery.first({ useMasterKey: true });

  if (!config) {
    const AppConfiguration = Parse.Object.extend('AppConfiguration');

    config = new AppConfiguration();
    config.set('installation', installation);
  }

  // Update configuration
  config.set('environment', newConfig.environment);
  config.set('settings', newConfig.settings);
  config.set('features', newConfig.features);
  config.set('integrations', newConfig.integrations);

  // Save configuration
  await config.save(null, { useMasterKey: true });

  // Update installation status
  installation.set('status', 'active');
  await installation.save(null, { useMasterKey: true });

  return {
    success: true,
    message: 'Configuration updated successfully',
  };
};

module.exports = {
  getAppConfiguration,
  updateAppConfiguration,
};
