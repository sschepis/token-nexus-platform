/* global Parse */

const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

// Get organization theme
Parse.Cloud.define('getOrganizationTheme', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId } = request.params; // organizationId now guaranteed

  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    // Organization access is already validated by middleware
    
    const query = new Parse.Query('OrganizationTheme');
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    
    const theme = await query.first({ useMasterKey: true });
    
    if (theme) {
      return {
        success: true,
        theme: {
          id: theme.id,
          organizationId: theme.get('organization')?.id,
          name: theme.get('name'),
          description: theme.get('description'),
          colors: theme.get('colors'),
          typography: theme.get('typography'),
          spacing: theme.get('spacing'),
          components: theme.get('components'),
          customCSS: theme.get('customCSS'),
          isActive: theme.get('isActive'),
          createdAt: theme.get('createdAt'),
          updatedAt: theme.get('updatedAt')
        }
      };
    } else {
      return {
        success: false,
        message: 'No custom theme found for organization'
      };
    }
  } catch (error) {
    console.error('Error getting organization theme:', error);
    throw new Error(`Failed to get organization theme: ${error.message}`);
  }
});

// Save organization theme
Parse.Cloud.define('saveOrganizationTheme', async (request) => {
  // Apply organization context middleware
  request = await withOrganizationContext(request);
  
  const { user } = request;
  const { organizationId, theme } = request.params; // organizationId now guaranteed

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!theme) {
    throw new Error('Theme data is required');
  }

  try {
    // Organization access is already validated by middleware
    
    // Check if theme already exists
    const query = new Parse.Query('OrganizationTheme');
    query.equalTo('organization', {
      __type: 'Pointer',
      className: 'Organization',
      objectId: organizationId
    });
    
    let themeObject = await query.first({ useMasterKey: true });
    
    if (!themeObject) {
      // Create new theme
      const OrganizationTheme = Parse.Object.extend('OrganizationTheme');
      themeObject = new OrganizationTheme();
      themeObject.set('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organizationId
      });
      themeObject.set('createdBy', user);
    }
    
    // Update theme properties
    themeObject.set('name', theme.name || 'Custom Theme');
    themeObject.set('description', theme.description || '');
    themeObject.set('colors', theme.colors || {});
    themeObject.set('typography', theme.typography || {});
    themeObject.set('spacing', theme.spacing || {});
    themeObject.set('components', theme.components || {});
    themeObject.set('customCSS', theme.customCSS || '');
    themeObject.set('isActive', theme.isActive !== false);
    themeObject.set('updatedBy', user);
    
    const savedTheme = await themeObject.save(null, { useMasterKey: true });
    
    return {
      success: true,
      theme: {
        id: savedTheme.id,
        organizationId: savedTheme.get('organization')?.id,
        name: savedTheme.get('name'),
        description: savedTheme.get('description'),
        colors: savedTheme.get('colors'),
        typography: savedTheme.get('typography'),
        spacing: savedTheme.get('spacing'),
        components: savedTheme.get('components'),
        customCSS: savedTheme.get('customCSS'),
        isActive: savedTheme.get('isActive'),
        createdAt: savedTheme.get('createdAt'),
        updatedAt: savedTheme.get('updatedAt')
      }
    };
  } catch (error) {
    console.error('Error saving organization theme:', error);
    throw new Error(`Failed to save organization theme: ${error.message}`);
  }
});