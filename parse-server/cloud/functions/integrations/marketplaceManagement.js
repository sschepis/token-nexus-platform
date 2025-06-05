/* eslint-disable no-console */
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

const fetchMarketplaceApps = async request => {
  console.log('fetchMarketplaceApps params:', request.params);
  const { search = '', category = 'all' } = request.params || {};

  // Check if user is system admin or organization admin
  const userRoles = await Parse.Cloud.run('checkUserRole', { userId: request.user.id });

  if (!userRoles.isAdmin && userRoles.organizationRoles.length === 0) {
    throw new Error(
      'You must be a system administrator or organization administrator to access the marketplace'
    );
  }

  // Build query to fetch template applications
  const query = new Parse.Query('CMSApplication');

  query.equalTo('isTemplate', true);

  // Apply filters
  if (category && typeof category === 'string' && category !== 'all') {
    query.equalTo('category', category);
  }

  if (search && typeof search === 'string' && search.trim()) {
    query.matches('name', new RegExp(search.trim(), 'i'));
  }

  // Only fetch active applications
  query.equalTo('status', 'active');
  query.ascending('name');

  // Include related data
  query.include(['template', 'createdBy']);

  const apps = await query.find({ useMasterKey: true });

  // Transform apps to match the AppMarketplaceItem interface
  const transformedApps = apps.map(app => ({
    id: app.id,
    name: app.get('name'),
    description: app.get('description'),
    version: app.get('version'),
    type: app.get('type'),
    publisher: app.get('createdBy')?.get('username') || 'System',
    components: app.get('components') || [],
    template: app.get('template')?.toJSON(),
    configuration: app.get('configuration') || {},
    settings: app.get('settings') || {},
  }));

  return { apps: transformedApps };
};

async function performInstallMarketplaceAppLogic(request) {
  const { appId } = request.params;
  const { organization, organizationId } = request; // From middleware

  // Fetch the app template
  const appTemplate = await new Parse.Query('CMSApplication')
    .equalTo('objectId', appId)
    .first({ useMasterKey: true });

  if (!appTemplate) {
    throw new Error('Application template not found');
  }

  // Check if app is already installed
  const existingInstall = await new Parse.Query('InstalledApplication')
    .equalTo('organization', organization) // Use organization object from middleware
    .equalTo('template', appTemplate)
    .first({ useMasterKey: true });

  if (existingInstall) {
    throw new Error('Application is already installed');
  }

  // Create installation record
  const Application = Parse.Object.extend('CMSApplication');
  const installation = new Application();

  installation.set('organization', organization); // Use organization object from middleware
  installation.set('template', appTemplate);
  installation.set('name', appTemplate.get('name'));
  installation.set('description', appTemplate.get('description'));
  installation.set('type', appTemplate.get('type'));
  installation.set('version', appTemplate.get('version'));
  installation.set('components', appTemplate.get('components'));
  installation.set('configuration', appTemplate.get('configuration'));
  installation.set('settings', appTemplate.get('settings'));
  installation.set('status', 'installing');
  installation.set('isTemplate', false);
  installation.set('createdBy', request.user);
  installation.set('updatedBy', request.user);
  installation.set('installedBy', request.user);

  await installation.save(null, { useMasterKey: true });

  // Trigger installation process
  // This would typically be handled by a background job
  // For now, we'll just mark it as installed
  installation.set('status', 'installed');
  await installation.save(null, { useMasterKey: true });

  return {
    success: true,
    installationId: installation.id,
  };
}

Parse.Cloud.define(
  'installMarketplaceApp',
  withOrganizationContext(performInstallMarketplaceAppLogic)
);

module.exports = {
  fetchMarketplaceApps,
};
