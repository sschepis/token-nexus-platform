/* global Parse */

const checkSlugAvailability = async request => {
  const { slug } = request.params;

  if (!slug) {
    throw new Error('Slug is required');
  }

  const query = new Parse.Query('CMSApplication');

  query.equalTo('slug', slug);
  const count = await query.count({ useMasterKey: true });

  return {
    available: count === 0,
    message: count > 0 ? 'This slug is already in use' : 'Slug is available',
    suggestedSlug: count > 0 ? `${slug}-${Math.floor(Math.random() * 1000)}` : null,
  };
};

const createApplication = async request => {
  const { name, description, ownerId, organizationId, slug } = request.params;

  if (!ownerId) {
    throw new Error('Owner ID is required');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  if (!name) {
    throw new Error('Application name is required');
  }

  // Get owner user
  const userQuery = new Parse.Query(Parse.User);

  userQuery.equalTo('objectId', ownerId);
  const user = await userQuery.first({ useMasterKey: true });

  if (!user) {
    throw new Error('Owner user not found');
  }

  // Get organization and verify access
  const organization = await new Parse.Query('Organization')
    .equalTo('objectId', organizationId)
    .first({ useMasterKey: true });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Verify user has access to this organization
  const isAdmin = await Parse.Cloud.run('checkUserRole', { userId: user.id });

  if (
    !isAdmin.isAdmin &&
    !isAdmin.organizationRoles.some(role => role.organizationId === organizationId)
  ) {
    throw new Error('Unauthorized access to organization');
  }

  // Generate and validate slug
  const finalSlug =
    slug ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

  // Check if slug is valid
  if (!finalSlug.match(/^[a-z0-9-]+$/)) {
    throw new Error('Slug can only contain lowercase letters, numbers and hyphens');
  }

  // Check if slug is available
  const slugQuery = new Parse.Query('CMSApplication');

  slugQuery.equalTo('slug', finalSlug);
  slugQuery.equalTo('organization', organization);

  const existingApp = await slugQuery.first({ useMasterKey: true });

  if (existingApp) {
    throw new Error('An application with this slug already exists in this organization');
  }

  // Create application
  const application = new Parse.Object('CMSApplication');

  application.set('name', name);
  application.set('slug', finalSlug);
  application.set('description', description);
  application.set('organization', organization);
  application.set('createdBy', user);
  application.set('updatedBy', user);
  application.set('owner', user);
  application.set('status', 'draft');
  application.set('isPublic', request.params.isPublic || false);
  application.set('settings', {
    enableAPI: true,
    enableWebhooks: false,
    enableCustomDomain: false,
  });

  // Set up ACL for application
  const appAcl = new Parse.ACL();

  appAcl.setPublicReadAccess(false);
  appAcl.setRoleReadAccess('admin', true);
  appAcl.setRoleWriteAccess('admin', true);
  appAcl.setReadAccess(user.id, true);
  appAcl.setWriteAccess(user.id, true);
  application.setACL(appAcl);

  await application.save(null, { useMasterKey: true });

  return {
    success: true,
    application: {
      id: application.id,
      name: application.get('name'),
      description: application.get('description'),
      organizationId: organization.id,
      createdBy: user.id,
    },
  };
};

const updateApplication = async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { applicationId, name, description, status } = request.params;
  const user = request.user;

  if (!applicationId) {
    throw new Error('Application ID is required');
  }

  try {
    const query = new Parse.Query('CMSApplication');
    const application = await query.get(applicationId, { useMasterKey: true });

    if (!application) {
      throw new Error('Application not found');
    }

    // Update fields
    if (name) application.set('name', name);
    if (description) application.set('description', description);
    if (status) application.set('status', status);

    application.set('updatedBy', user);
    await application.save(null, { useMasterKey: true });

    return {
      success: true,
      application: {
        id: application.id,
        name: application.get('name'),
        description: application.get('description'),
        status: application.get('status'),
        updatedAt: application.updatedAt,
      },
    };
  } catch (error) {
    console.error('Error updating application:', error);
    throw error;
  }
};

module.exports = {
  checkSlugAvailability,
  createApplication,
  updateApplication,
};
