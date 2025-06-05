
const checkForUpdates = async request => {
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

  const marketplaceApp = installation.get('marketplaceApp');
  const currentVersion = installation.get('version');
  const latestVersion = marketplaceApp.get('version');

  // Compare versions using semver
  const hasUpdate = require('semver').gt(latestVersion, currentVersion);

  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    releaseNotes: hasUpdate ? marketplaceApp.get('releaseNotes') : null,
    updateSize: hasUpdate ? marketplaceApp.get('updateSize') : null,
    criticalUpdate: hasUpdate ? marketplaceApp.get('criticalUpdate') || false : false,
  };
};

const performAppUpdate = async request => {
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

  const marketplaceApp = installation.get('marketplaceApp');
  const currentVersion = installation.get('version');
  const latestVersion = marketplaceApp.get('version');

  // Verify an update is available
  if (!require('semver').gt(latestVersion, currentVersion)) {
    throw new Error('No update available');
  }

  // Start update process
  installation.set('status', 'updating');
  await installation.save(null, { useMasterKey: true });

  let updateLog;

  try {
    // Create update log
    const UpdateLog = Parse.Object.extend('UpdateLog');

    updateLog = new UpdateLog();
    updateLog.set('installation', installation);
    updateLog.set('fromVersion', currentVersion);
    updateLog.set('toVersion', latestVersion);
    updateLog.set('status', 'in_progress');
    updateLog.set('startedBy', request.user);
    await updateLog.save(null, { useMasterKey: true });

    // Perform update steps
    // 1. Backup current configuration
    const configQuery = new Parse.Query('AppConfiguration').equalTo('installation', installation);
    const config = await configQuery.first({ useMasterKey: true });

    if (config) {
      const ConfigBackup = Parse.Object.extend('AppConfigurationBackup');
      const backup = new ConfigBackup();

      backup.set('installation', installation);
      backup.set('version', currentVersion);
      backup.set('configuration', {
        environment: config.get('environment'),
        settings: config.get('settings'),
        features: config.get('features'),
        integrations: config.get('integrations'),
      });
      await backup.save(null, { useMasterKey: true });
    }

    // 2. Update version and status
    installation.set('version', latestVersion);
    installation.set('status', 'active');
    await installation.save(null, { useMasterKey: true });

    // 3. Complete update log
    updateLog.set('status', 'completed');
    updateLog.set('completedAt', new Date());
    await updateLog.save(null, { useMasterKey: true });

    return {
      success: true,
      version: latestVersion,
      message: 'Update completed successfully',
    };
  } catch (error) {
    // Handle update failure
    installation.set('status', 'error');
    await installation.save(null, { useMasterKey: true });

    if (updateLog) {
      updateLog.set('status', 'failed');
      updateLog.set('error', error.message);
      await updateLog.save(null, { useMasterKey: true });
    }

    throw new Error(`Update failed: ${error.message}`);
  }
};

module.exports = {
  checkForUpdates,
  performAppUpdate,
};
