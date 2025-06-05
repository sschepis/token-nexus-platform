// Cloud functions for PageBuilder functionality

// Save page to cloud storage
Parse.Cloud.define('savePageToCloud', async (request) => {
  const { user } = request;
  const { pageId, title, slug, html, css, js, metadata, organizationId, status = 'draft' } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!title || !slug) {
    throw new Error('Title and slug are required');
  }

  try {
    // Verify user has access to the organization
    if (organizationId) {
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('user', user);
      roleQuery.equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
      roleQuery.equalTo('isActive', true);
      const hasAccess = await roleQuery.first({ useMasterKey: true });

      if (!hasAccess && !user.get('isSystemAdmin')) {
        throw new Error('Access denied to this organization');
      }
    }

    const PageContent = Parse.Object.extend('PageContent');
    let page;

    if (pageId) {
      // Update existing page
      const query = new Parse.Query(PageContent);
      page = await query.get(pageId, { useMasterKey: true });
      
      if (!page) {
        throw new Error('Page not found');
      }

      // Check ownership
      if (page.get('author').id !== user.id && !user.get('isSystemAdmin')) {
        throw new Error('You do not have permission to edit this page');
      }
    } else {
      // Create new page
      page = new PageContent();
      page.set('author', user);
      
      // Check for duplicate slug
      const slugQuery = new Parse.Query(PageContent);
      slugQuery.equalTo('slug', slug);
      if (organizationId) {
        slugQuery.equalTo('organization', {
          __type: 'Pointer',
          className: 'Organization',
          objectId: organizationId
        });
      }
      const existing = await slugQuery.first({ useMasterKey: true });
      if (existing) {
        throw new Error('A page with this slug already exists');
      }
    }

    // Update fields
    page.set('title', title);
    page.set('slug', slug);
    page.set('html', html || '');
    page.set('css', css || '');
    page.set('js', js || '');
    page.set('metadata', metadata || {});
    page.set('status', status);
    page.set('lastModifiedBy', user);
    page.set('lastModifiedAt', new Date());

    if (organizationId) {
      page.set('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
    }

    // Set ACL
    const acl = new Parse.ACL();
    acl.setReadAccess(user, true);
    acl.setWriteAccess(user, true);
    if (organizationId) {
      acl.setRoleReadAccess(`org_${organizationId}_admin`, true);
      acl.setRoleWriteAccess(`org_${organizationId}_admin`, true);
      acl.setRoleReadAccess(`org_${organizationId}_member`, true);
    }
    acl.setRoleReadAccess('SystemAdmin', true);
    acl.setRoleWriteAccess('SystemAdmin', true);
    page.setACL(acl);

    await page.save(null, { useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', pageId ? 'pagebuilder.page_updated' : 'pagebuilder.page_created');
    log.set('targetType', 'PageContent');
    log.set('targetId', page.id);
    log.set('actor', user);
    if (organizationId) {
      log.set('organizationId', organizationId);
    }
    log.set('details', {
      title,
      slug,
      status
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      pageId: page.id,
      message: pageId ? 'Page updated successfully' : 'Page created successfully'
    };

  } catch (error) {
    console.error('Save page error:', error);
    throw error;
  }
});

// Get page from cloud storage
Parse.Cloud.define('getPageFromCloud', async (request) => {
  const { pageId, slug } = request.params;

  if (!pageId && !slug) {
    throw new Error('Page ID or slug is required');
  }

  try {
    const PageContent = Parse.Object.extend('PageContent');
    const query = new Parse.Query(PageContent);

    if (pageId) {
      query.equalTo('objectId', pageId);
    } else {
      query.equalTo('slug', slug);
    }

    query.include('author');
    query.include('organization');
    query.include('lastModifiedBy');

    const page = await query.first({ useMasterKey: true });

    if (!page) {
      throw new Error('Page not found');
    }

    return {
      success: true,
      page: {
        id: page.id,
        title: page.get('title'),
        slug: page.get('slug'),
        html: page.get('html'),
        css: page.get('css'),
        js: page.get('js'),
        metadata: page.get('metadata'),
        status: page.get('status'),
        author: {
          id: page.get('author').id,
          name: `${page.get('author').get('firstName') || ''} ${page.get('author').get('lastName') || ''}`.trim(),
          email: page.get('author').get('email')
        },
        organization: page.get('organization') ? {
          id: page.get('organization').id,
          name: page.get('organization').get('name')
        } : null,
        lastModifiedBy: page.get('lastModifiedBy') ? {
          id: page.get('lastModifiedBy').id,
          name: `${page.get('lastModifiedBy').get('firstName') || ''} ${page.get('lastModifiedBy').get('lastName') || ''}`.trim()
        } : null,
        lastModifiedAt: page.get('lastModifiedAt'),
        createdAt: page.get('createdAt')
      }
    };

  } catch (error) {
    console.error('Get page error:', error);
    throw error;
  }
});

// List pages
Parse.Cloud.define('listPages', async (request) => {
  const { user } = request;
  const { organizationId, status, page = 1, limit = 20, searchQuery } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    const PageContent = Parse.Object.extend('PageContent');
    const query = new Parse.Query(PageContent);

    // Filter by organization if provided
    if (organizationId) {
      query.equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
    } else if (!user.get('isSystemAdmin')) {
      // Non-admin users can only see their own pages or org pages they have access to
      const userQuery = new Parse.Query(PageContent);
      userQuery.equalTo('author', user);

      // Get user's organizations
      const OrgRole = Parse.Object.extend('OrgRole');
      const orgRoleQuery = new Parse.Query(OrgRole);
      orgRoleQuery.equalTo('user', user);
      orgRoleQuery.equalTo('isActive', true);
      const orgRoles = await orgRoleQuery.find({ useMasterKey: true });
      
      if (orgRoles.length > 0) {
        const orgQueries = orgRoles.map(role => {
          const orgQuery = new Parse.Query(PageContent);
          orgQuery.equalTo('organization', role.get('organization'));
          return orgQuery;
        });
        
        query._orQuery([userQuery, ...orgQueries]);
      } else {
        query.equalTo('author', user);
      }
    }

    if (status) {
      query.equalTo('status', status);
    }

    if (searchQuery) {
      const titleQuery = new Parse.Query(PageContent);
      titleQuery.contains('title', searchQuery);
      
      const slugQuery = new Parse.Query(PageContent);
      slugQuery.contains('slug', searchQuery);
      
      query._orQuery([titleQuery, slugQuery]);
    }

    query.include('author');
    query.include('organization');
    query.descending('lastModifiedAt');
    query.limit(limit);
    query.skip((page - 1) * limit);

    const [results, total] = await Promise.all([
      query.find({ useMasterKey: true }),
      query.count({ useMasterKey: true })
    ]);

    const pages = results.map(page => ({
      id: page.id,
      title: page.get('title'),
      slug: page.get('slug'),
      status: page.get('status'),
      author: {
        id: page.get('author').id,
        name: `${page.get('author').get('firstName') || ''} ${page.get('author').get('lastName') || ''}`.trim(),
        email: page.get('author').get('email')
      },
      organization: page.get('organization') ? {
        id: page.get('organization').id,
        name: page.get('organization').get('name')
      } : null,
      lastModifiedAt: page.get('lastModifiedAt'),
      createdAt: page.get('createdAt')
    }));

    return {
      success: true,
      pages,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };

  } catch (error) {
    console.error('List pages error:', error);
    throw error;
  }
});

// Delete page
Parse.Cloud.define('deletePageFromCloud', async (request) => {
  const { user } = request;
  const { pageId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!pageId) {
    throw new Error('Page ID is required');
  }

  try {
    const PageContent = Parse.Object.extend('PageContent');
    const query = new Parse.Query(PageContent);
    const page = await query.get(pageId, { useMasterKey: true });

    if (!page) {
      throw new Error('Page not found');
    }

    // Check permissions
    const isOwner = page.get('author').id === user.id;
    const organizationId = page.get('organization')?.id;
    let hasOrgAccess = false;

    if (organizationId && !isOwner) {
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('user', user);
      roleQuery.equalTo('organization', page.get('organization'));
      roleQuery.equalTo('role', 'admin');
      roleQuery.equalTo('isActive', true);
      hasOrgAccess = await roleQuery.first({ useMasterKey: true }) !== null;
    }

    if (!isOwner && !hasOrgAccess && !user.get('isSystemAdmin')) {
      throw new Error('You do not have permission to delete this page');
    }

    await page.destroy({ useMasterKey: true });

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'pagebuilder.page_deleted');
    log.set('targetType', 'PageContent');
    log.set('targetId', pageId);
    log.set('actor', user);
    if (organizationId) {
      log.set('organizationId', organizationId);
    }
    log.set('details', {
      title: page.get('title'),
      slug: page.get('slug')
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Page deleted successfully'
    };

  } catch (error) {
    console.error('Delete page error:', error);
    throw error;
  }
});

// Generate JWT for page access (for embedding or API access)
Parse.Cloud.define('generatePageAccessToken', async (request) => {
  const { user } = request;
  const { pageId, expiresIn = '1h' } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!pageId) {
    throw new Error('Page ID is required');
  }

  try {
    const PageContent = Parse.Object.extend('PageContent');
    const query = new Parse.Query(PageContent);
    const page = await query.get(pageId, { useMasterKey: true });

    if (!page) {
      throw new Error('Page not found');
    }

    // Check access
    const isOwner = page.get('author').id === user.id;
    const organizationId = page.get('organization')?.id;
    let hasAccess = isOwner;

    if (!hasAccess && organizationId) {
      const OrgRole = Parse.Object.extend('OrgRole');
      const roleQuery = new Parse.Query(OrgRole);
      roleQuery.equalTo('user', user);
      roleQuery.equalTo('organization', page.get('organization'));
      roleQuery.equalTo('isActive', true);
      hasAccess = await roleQuery.first({ useMasterKey: true }) !== null;
    }

    if (!hasAccess && !user.get('isSystemAdmin')) {
      throw new Error('Access denied to this page');
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        pageId: page.id,
        userId: user.id,
        organizationId: organizationId || null,
        permissions: ['read'],
        type: 'page_access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn }
    );

    // Log the action
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', 'pagebuilder.token_generated');
    log.set('targetType', 'PageContent');
    log.set('targetId', pageId);
    log.set('actor', user);
    if (organizationId) {
      log.set('organizationId', organizationId);
    }
    log.set('details', {
      expiresIn
    });
    
    await log.save(null, { useMasterKey: true });

    return {
      success: true,
      token,
      expiresIn,
      pageId: page.id,
      pageSlug: page.get('slug')
    };

  } catch (error) {
    console.error('Generate token error:', error);
    throw error;
  }
});

// Get available components for dynamic integration
Parse.Cloud.define('getAvailableComponents', async (request) => {
  const { user } = request;
  const { organizationId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Get custom components from CMSComponent class
    const CMSComponent = Parse.Object.extend('CMSComponent');
    const customComponentsQuery = new Parse.Query(CMSComponent);

    // Filter by organization if provided, or get public components
    if (organizationId) {
      customComponentsQuery.equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
      // Optionally allow public components from other orgs too, or just current org's components
      const publicComponentsQuery = new Parse.Query(CMSComponent);
      publicComponentsQuery.equalTo('isPublic', true);
      customComponentsQuery._orQuery([customComponentsQuery, publicComponentsQuery]);
    } else {
      // If no organization context, return only public components
      customComponentsQuery.equalTo('isPublic', true);
    }

    // Include related data like object binding if stored as pointer/relation
    customComponentsQuery.include('objectBinding'); // Assuming objectBinding is a pointer to a schema or object
    customComponentsQuery.descending('createdAt');

    const customComponents = await customComponentsQuery.find({ useMasterKey: true });

    const componentsData = customComponents.map(comp => ({
      id: comp.id,
      name: comp.get('name'),
      description: comp.get('description'),
      type: comp.get('type'), // 'display', 'form', 'logic'
      objectBinding: comp.get('objectBinding')?.id || comp.get('objectBinding'), // Get ID if pointer, else raw string
      preview: comp.get('preview'),
      elements: comp.get('elements'), // Content of the component
      createdAt: comp.get('createdAt').toISOString(),
      updatedAt: comp.get('updatedAt').toISOString(),
      isPublic: comp.get('isPublic'),
      // Add other relevant fields based on CMSComponent schema
    }));

    return {
      success: true,
      components: componentsData
    };

  } catch (error) {
    console.error('Get components error:', error);
    throw error;
  }
});

module.exports = {};