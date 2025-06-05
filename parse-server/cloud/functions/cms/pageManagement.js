module.exports = Parse => {
  // Get all pages for an application
  Parse.Cloud.define('getApplicationPages', async request => {
    const { applicationId } = request.params;
    const { user } = request;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    // Get application and verify access
    const application = await new Parse.Query('CMSApplication')
      .equalTo('objectId', applicationId)
      .include(['organization', 'organization.createdBy', 'organization.updatedBy'])
      .first({ useMasterKey: true });

    if (!application) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Application not found');
    }

    // Get all pages for this application
    const pages = await new Parse.Query('CMSWebPage')
      .equalTo('application', application)
      .include('createdBy')
      .include('updatedBy')
      .find({ useMasterKey: true });

    return pages.map(page => ({
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      status: page.get('status'),
      content: page.get('content'),
      createdBy: page.get('createdBy')?.toJSON(),
      updatedBy: page.get('updatedBy')?.toJSON(),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
  });

  // Create a new page
  Parse.Cloud.define('createPage', async request => {
    const { applicationId, title, slug, content } = request.params;
    const { user } = request;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    if (!title) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Title is required');
    }

    // Get application and verify access
    const application = await new Parse.Query('CMSApplication')
      .equalTo('objectId', applicationId)
      .include(['organization', 'organization.createdBy', 'organization.updatedBy'])
      .first({ useMasterKey: true });

    if (!application) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Application not found');
    }

    // Generate slug if not provided
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug is already in use
    const existingPage = await new Parse.Query('CMSWebPage')
      .equalTo('application', application)
      .equalTo('slug', finalSlug)
      .first({ useMasterKey: true });

    if (existingPage) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A page with this slug already exists');
    }

    // Create page
    const page = new Parse.Object('CMSWebPage');

    // Set all required fields from baseSchema and CMSWebPage schema
    page.set('application', application);
    page.set('organization', application.get('organization'));
    page.set('title', title);
    page.set('slug', finalSlug);
    page.set('content', content || '');
    page.set('status', 'draft');
    page.set('createdBy', user);
    page.set('updatedBy', user);
    page.set('metadata', {});
    page.set('html', '');
    page.set('css', '');
    page.set('components', {});
    page.set('style', {});
    page.set('seo', {
      title: '',
      description: '',
      keywords: [],
      ogImage: '',
    });

    await page.save(null, { useMasterKey: true });

    return {
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      status: page.get('status'),
      content: page.get('content'),
      createdBy: user.toJSON(),
      updatedBy: user.toJSON(),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  });

  // Update a page
  Parse.Cloud.define('updatePage', async request => {
    const { pageId, title, slug, content, status } = request.params;
    const { user } = request;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    // Get page and verify access
    const page = await new Parse.Query('CMSWebPage')
      .equalTo('objectId', pageId)
      .include('application')
      .first({ useMasterKey: true });

    if (!page) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
    }

    // If slug is being changed, verify it's not already in use
    if (slug && slug !== page.get('slug')) {
      const existingPage = await new Parse.Query('CMSWebPage')
        .equalTo('application', page.get('application'))
        .equalTo('slug', slug)
        .first({ useMasterKey: true });

      if (existingPage) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'A page with this slug already exists');
      }
    }

    // Update fields
    if (title) page.set('title', title);
    if (slug) page.set('slug', slug);
    if (content !== undefined) page.set('content', content);
    if (status) page.set('status', status);
    page.set('updatedBy', user);

    await page.save(null, { useMasterKey: true });

    return {
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      status: page.get('status'),
      content: page.get('content'),
      updatedBy: user.toJSON(),
      updatedAt: page.updatedAt,
    };
  });

  // Delete a page
  Parse.Cloud.define('deletePage', async request => {
    const { pageId } = request.params;
    const { user } = request;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    // Get page and verify access
    const page = await new Parse.Query('CMSWebPage')
      .equalTo('objectId', pageId)
      .first({ useMasterKey: true });

    if (!page) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
    }

    await page.destroy({ useMasterKey: true });

    return { success: true };
  });

  // Get a single page by ID
  Parse.Cloud.define('getPage', async request => {
    const { pageId } = request.params;
    const { user } = request;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    // Get page and verify access
    const page = await new Parse.Query('CMSWebPage')
      .equalTo('objectId', pageId)
      .include('createdBy')
      .include('updatedBy')
      .first({ useMasterKey: true });

    if (!page) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
    }

    return {
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      status: page.get('status'),
      content: page.get('content'),
      createdBy: page.get('createdBy')?.toJSON(),
      updatedBy: page.get('updatedBy')?.toJSON(),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  });
};
