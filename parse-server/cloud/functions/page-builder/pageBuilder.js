module.exports = Parse => {
  // Cloud functions for managing custom pages

  Parse.Cloud.define('getCustomPages', async (request) => {
    const { organizationId, includeInactive = false, searchTerm, category } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    try {
      const query = new Parse.Query('CustomPage');
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }

      if (!includeInactive) {
        query.equalTo('isActive', true);
      }

      if (searchTerm) {
        query.contains('name', searchTerm);
      }

      if (category) {
        query.equalTo('category', category);
      }

      query.descending('createdAt');
      query.limit(100);

      const pages = await query.find({ useMasterKey: true });
      const pageData = pages.map(page => {
        const json = page.toJSON();
        json.id = page.id;
        return json;
      });

      return { success: true, pages: pageData };
    } catch (error) {
      console.error('Error in getCustomPages:', error);
      
      // If the class doesn't exist, return empty array instead of error
      if (error.code === 119) { // Class doesn't exist
        return { success: true, pages: [] };
      }
      
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch pages: ${error.message}`);
    }
  });

  Parse.Cloud.define('createCustomPage', async (request) => {
    const { name, path, title, description, layout = {}, components = [], category = 'custom', organizationId } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    if (!name || !path) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Name and path are required.');
    }

    try {
      const CustomPage = Parse.Object.extend('CustomPage');
      const page = new CustomPage();

      page.set('name', name);
      page.set('path', path);
      page.set('title', title || name);
      page.set('description', description || '');
      page.set('layout', layout);
      page.set('components', components);
      page.set('category', category);
      page.set('organizationId', organizationId);
      page.set('createdBy', request.user.id);
      page.set('isActive', true);

      const savedPage = await page.save(null, { useMasterKey: true });
      const pageData = savedPage.toJSON();
      pageData.id = savedPage.id;

      return { success: true, page: pageData, message: `Page "${name}" created successfully` };
    } catch (error) {
      console.error('Error in createCustomPage:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create page: ${error.message}`);
    }
  });

  Parse.Cloud.define('updateCustomPage', async (request) => {
    const { pageId, organizationId, ...updateData } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    if (!pageId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Page ID is required.');
    }

    try {
      const query = new Parse.Query('CustomPage');
      query.equalTo('objectId', pageId);
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }

      const page = await query.first({ useMasterKey: true });
      
      if (!page) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
      }

      // Update fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          page.set(key, value);
        }
      });

      page.set('updatedBy', request.user.id);
      const savedPage = await page.save(null, { useMasterKey: true });
      
      const pageData = savedPage.toJSON();
      pageData.id = savedPage.id;

      return { success: true, page: pageData, message: 'Page updated successfully' };
    } catch (error) {
      console.error('Error in updateCustomPage:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to update page: ${error.message}`);
    }
  });

  Parse.Cloud.define('deleteCustomPage', async (request) => {
    const { pageId, organizationId, confirmDelete } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    if (!pageId || !confirmDelete) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Page ID and confirmation are required.');
    }

    try {
      const query = new Parse.Query('CustomPage');
      query.equalTo('objectId', pageId);
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }

      const page = await query.first({ useMasterKey: true });
      
      if (!page) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
      }

      await page.destroy({ useMasterKey: true });

      return { success: true, deletedPageId: pageId, message: 'Page deleted successfully' };
    } catch (error) {
      console.error('Error in deleteCustomPage:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to delete page: ${error.message}`);
    }
  });

  Parse.Cloud.define('getCustomPageById', async (request) => {
    const { pageId, organizationId } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    if (!pageId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Page ID is required.');
    }

    try {
      const query = new Parse.Query('CustomPage');
      query.equalTo('objectId', pageId);
      
      if (organizationId) {
        query.equalTo('organizationId', organizationId);
      }

      const page = await query.first({ useMasterKey: true });
      
      if (!page) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Page not found');
      }

      const pageData = page.toJSON();
      pageData.id = page.id;

      return { success: true, page: pageData };
    } catch (error) {
      console.error('Error in getCustomPageById:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get page: ${error.message}`);
    }
  });

  Parse.Cloud.define('generatePageAccessToken', async (request) => {
    const { pageId, expiresIn = '24h' } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    if (!pageId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Page ID is required.');
    }

    try {
      // Generate a simple token (in production, use proper JWT or similar)
      const token = `page_${pageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return { 
        success: true, 
        token: token,
        expiresIn: expiresIn,
        message: 'Access token generated successfully'
      };
    } catch (error) {
      console.error('Error in generatePageAccessToken:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to generate token: ${error.message}`);
    }
  });
};