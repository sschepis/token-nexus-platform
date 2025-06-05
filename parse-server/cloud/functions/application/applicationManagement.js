const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Get organization applications
const getOrganizationApplications = withOrganizationContext(async request => {
  const { organization, organizationId } = request; // organization and organizationId from middleware
  const user = request.user; // Still needed for audit logging or createdBy etc.

  // No need for explicit user check (middleware handles auth if organizationId is required)
  // No need to fetch organization or verify access (middleware handles this)

  console.log('Fetching applications for organization:', organizationId);

  // Get all applications for this organization
  let applications;

  try {
    applications = await new Parse.Query('CMSApplication')
      .equalTo('organization', organization) // Use organization object from middleware
      .include('createdBy')
      .find({ useMasterKey: true });
  } catch (err) {
    console.error('Error fetching applications:', err);
    throw new Error('Failed to fetch applications');
  }

  console.log('Found applications:', applications.length);

  const mappedApplications = applications.map(app => {
    const createdBy = app.get('createdBy');

    console.log('Mapping application:', {
      id: app.id,
      name: app.get('name'),
      createdBy: createdBy?.id,
    });

    return {
      id: app.id,
      name: app.get('name'),
      description: app.get('description') || '',
      slug: app.get('slug') || '',
      version: app.get('settings')?.version || '1.0.0',
      status: app.get('status') || 'draft',
      isPublic: app.get('settings')?.isPublic || false,
      owner: {
        id: createdBy?.id || '',
        name: createdBy?.get('username') || 'Unknown',
        email: createdBy?.get('email'),
        avatar: createdBy?.get('avatar'),
      },
      stats: {
        pages: app.get('stats')?.pages || 0,
        apis: app.get('stats')?.apis || 0,
        workflows: app.get('stats')?.workflows || 0,
      },
      theme: {
        primaryColor: app.get('theme')?.primaryColor,
        logo: app.get('theme')?.logo,
        favicon: app.get('theme')?.favicon,
        customCss: app.get('theme')?.customCss,
      },
      settings: {
        enableApi: app.get('settings')?.enableApi || false,
        enableWebhooks: app.get('settings')?.enableWebhooks || false,
        enableCustomDomain: app.get('settings')?.enableCustomDomain || false,
        customDomain: app.get('settings')?.customDomain,
        seoEnabled: app.get('settings')?.seoEnabled || false,
        analyticsEnabled: app.get('settings')?.analyticsEnabled || false,
      },
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  });

  console.log('Returning mapped applications:', mappedApplications.length);

  return mappedApplications;
});

module.exports = {
  getOrganizationApplications,
};
