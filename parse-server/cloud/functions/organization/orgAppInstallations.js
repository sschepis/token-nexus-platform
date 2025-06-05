// Cloud functions for organization app installations

// Get installed apps for organization
Parse.Cloud.define('getInstalledAppsForOrg', async (request) => {
  const { user } = request;
  const { organizationId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    // Verify user has access to the organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    roleQuery.equalTo('isActive', true);
    const userRole = await roleQuery.first({ useMasterKey: true });

    if (!userRole && !user.get('isSystemAdmin')) {
      throw new Error('Access denied to this organization');
    }

    // Get installed apps
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const query = new Parse.Query(OrgAppInstallation);
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    query.include('appDefinition');
    query.include('installedVersion');
    query.include('installedBy');
    query.descending('installationDate');

    const installations = await query.find({ useMasterKey: true });

    const results = installations.map(installation => ({
      id: installation.id,
      appDefinition: {
        id: installation.get('appDefinition').id,
        name: installation.get('appDefinition').get('name'),
        description: installation.get('appDefinition').get('description'),
        icon: installation.get('appDefinition').get('icon'),
        publisher: installation.get('appDefinition').get('publisher'),
        category: installation.get('appDefinition').get('category')
      },
      installedVersion: {
        id: installation.get('installedVersion').id,
        version: installation.get('installedVersion').get('version'),
        changelog: installation.get('installedVersion').get('changelog')
      },
      status: installation.get('status'),
      installationDate: installation.get('installationDate'),
      lastUpdated: installation.get('lastUpdated'),
      installedBy: {
        id: installation.get('installedBy').id,
        email: installation.get('installedBy').get('email'),
        name: `${installation.get('installedBy').get('firstName') || ''} ${installation.get('installedBy').get('lastName') || ''}`.trim()
      },
      configuration: installation.get('configuration') || {},
      permissions: installation.get('permissions') || []
    }));

    return {
      success: true,
      installations: results,
      total: results.length
    };

  } catch (error) {
    console.error('Get installed apps error:', error);
    throw error;
  }
});

// Install app in organization
Parse.Cloud.define('installAppInOrg', async (request) => {
  const { user } = request;
  const { organizationId, appDefinitionId, versionId, configuration = {} } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !appDefinitionId) {
    throw new Error('Organization ID and app definition ID are required');
  }

  try {
    // Verify user has admin access to the organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can install apps');
    }

    // Get the app definition
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const appQuery = new Parse.Query(AppDefinition);
    const appDefinition = await appQuery.get(appDefinitionId, { useMasterKey: true });

    if (!appDefinition || !appDefinition.get('isActive')) {
      throw new Error('App definition not found or inactive');
    }

    // Get the version (use current version if not specified)
    let appVersion;
    if (versionId) {
      const AppVersion = Parse.Object.extend('AppVersion');
      const versionQuery = new Parse.Query(AppVersion);
      appVersion = await versionQuery.get(versionId, { useMasterKey: true });
    } else {
      appVersion = appDefinition.get('currentVersion');
      if (!appVersion) {
        throw new Error('No published version available for this app');
      }
    }

    // Check if app is already installed
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const existingQuery = new Parse.Query(OrgAppInstallation);
    existingQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    existingQuery.equalTo('appDefinition', appDefinition);
    const existingInstallation = await existingQuery.first({ useMasterKey: true });

    if (existingInstallation) {
      throw new Error('This app is already installed in the organization');
    }

    // Get organization
    const Organization = Parse.Object.extend('Organization');
    const orgQuery = new Parse.Query(Organization);
    const organization = await orgQuery.get(organizationId, { useMasterKey: true });

    // Create installation record
    const installation = new OrgAppInstallation();
    installation.set('organization', organization);
    installation.set('appDefinition', appDefinition);
    installation.set('installedVersion', appVersion);
    installation.set('status', 'active');
    installation.set('installationDate', new Date());
    installation.set('lastUpdated', new Date());
    installation.set('installedBy', user);
    installation.set('configuration', configuration);
    installation.set('permissions', appDefinition.get('defaultPermissions') || []);

    // Set ACL
    const installACL = new Parse.ACL();
    installACL.setPublicReadAccess(false);
    installACL.setPublicWriteAccess(false);
    installACL.setRoleReadAccess(`org_${organizationId}_member`, true);
    installACL.setRoleWriteAccess(`org_${organizationId}_admin`, true);
    installACL.setRoleReadAccess('SystemAdmin', true);
    installACL.setRoleWriteAccess('SystemAdmin', true);
    installation.setACL(installACL);

    await installation.save(null, { useMasterKey: true });

    // Log the installation
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'app.installed');
    log.set('targetType', 'OrgAppInstallation');
    log.set('targetId', installation.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      appName: appDefinition.get('name'),
      version: appVersion.get('version')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      installationId: installation.id,
      message: `${appDefinition.get('name')} installed successfully`
    };

  } catch (error) {
    console.error('Install app error:', error);
    throw error;
  }
});

// Uninstall app from organization
Parse.Cloud.define('uninstallAppFromOrg', async (request) => {
  const { user } = request;
  const { organizationId, installationId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !installationId) {
    throw new Error('Organization ID and installation ID are required');
  }

  try {
    // Verify user has admin access to the organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can uninstall apps');
    }

    // Get the installation
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installQuery = new Parse.Query(OrgAppInstallation);
    installQuery.include('appDefinition');
    const installation = await installQuery.get(installationId, { useMasterKey: true });

    if (!installation) {
      throw new Error('Installation not found');
    }

    // Verify it belongs to the organization
    if (installation.get('organization').id !== organizationId) {
      throw new Error('Installation does not belong to this organization');
    }

    const appName = installation.get('appDefinition').get('name');

    // Delete the installation
    await installation.destroy({ useMasterKey: true });

    // Log the uninstallation
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'app.uninstalled');
    log.set('targetType', 'OrgAppInstallation');
    log.set('targetId', installationId);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      appName: appName
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `${appName} uninstalled successfully`
    };

  } catch (error) {
    console.error('Uninstall app error:', error);
    throw error;
  }
});

// Update app in organization
Parse.Cloud.define('updateAppInOrg', async (request) => {
  const { user } = request;
  const { organizationId, installationId, versionId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !installationId || !versionId) {
    throw new Error('Organization ID, installation ID, and version ID are required');
  }

  try {
    // Verify user has admin access to the organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can update apps');
    }

    // Get the installation
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installQuery = new Parse.Query(OrgAppInstallation);
    installQuery.include('appDefinition');
    installQuery.include('installedVersion');
    const installation = await installQuery.get(installationId, { useMasterKey: true });

    if (!installation) {
      throw new Error('Installation not found');
    }

    // Verify it belongs to the organization
    if (installation.get('organization').id !== organizationId) {
      throw new Error('Installation does not belong to this organization');
    }

    // Get the new version
    const AppVersion = Parse.Object.extend('AppVersion');
    const versionQuery = new Parse.Query(AppVersion);
    const newVersion = await versionQuery.get(versionId, { useMasterKey: true });

    if (!newVersion) {
      throw new Error('Version not found');
    }

    // Verify the version belongs to the same app
    if (newVersion.get('appDefinition').id !== installation.get('appDefinition').id) {
      throw new Error('Version does not belong to the installed app');
    }

    // Check if it's actually an update
    const currentVersion = installation.get('installedVersion');
    if (currentVersion.id === newVersion.id) {
      throw new Error('App is already on this version');
    }

    // Update the installation
    installation.set('installedVersion', newVersion);
    installation.set('lastUpdated', new Date());
    installation.set('updatedBy', user);
    await installation.save(null, { useMasterKey: true });

    // Log the update
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'app.updated');
    log.set('targetType', 'OrgAppInstallation');
    log.set('targetId', installation.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      appName: installation.get('appDefinition').get('name'),
      fromVersion: currentVersion.get('version'),
      toVersion: newVersion.get('version')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: `${installation.get('appDefinition').get('name')} updated to version ${newVersion.get('version')}`
    };

  } catch (error) {
    console.error('Update app error:', error);
    throw error;
  }
});

// Update app configuration
Parse.Cloud.define('updateAppConfiguration', async (request) => {
  const { user } = request;
  const { organizationId, installationId, configuration } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!organizationId || !installationId || !configuration) {
    throw new Error('Organization ID, installation ID, and configuration are required');
  }

  try {
    // Verify user has admin access to the organization
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can update app configuration');
    }

    // Get the installation
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installQuery = new Parse.Query(OrgAppInstallation);
    installQuery.include('appDefinition');
    const installation = await installQuery.get(installationId, { useMasterKey: true });

    if (!installation) {
      throw new Error('Installation not found');
    }

    // Verify it belongs to the organization
    if (installation.get('organization').id !== organizationId) {
      throw new Error('Installation does not belong to this organization');
    }

    // Update configuration
    installation.set('configuration', configuration);
    installation.set('lastUpdated', new Date());
    installation.set('configUpdatedBy', user);
    await installation.save(null, { useMasterKey: true });

    // Log the configuration update
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'app.configuration_updated');
    log.set('targetType', 'OrgAppInstallation');
    log.set('targetId', installation.id);
    log.set('actor', user);
    log.set('organizationId', organizationId);
    log.set('details', {
      appName: installation.get('appDefinition').get('name')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'App configuration updated successfully'
    };

  } catch (error) {
    console.error('Update app configuration error:', error);
    throw error;
  }
});

module.exports = {};