module.exports = Parse => {
  const { checkUserRole } = require('../../roles'); // Corrected path to roles module

  Parse.Cloud.define('listThemes', async request => {
    const { applicationId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user }); // Pass user object instead of userId
    
    const application = await new Parse.Query('CMSApplication').get(applicationId, {
      useMasterKey: true,
    });

    if (!application) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Application not found');
    }

    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin', 'developer'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to this application'
      );
    }

    const query = new Parse.Query('CMSTheme');
    query.equalTo('application', application);

    return query.find({ useMasterKey: true });
  });

  Parse.Cloud.define('createTheme', async request => {
    const { applicationId, themeData } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const application = await new Parse.Query('CMSApplication').get(applicationId, {
      useMasterKey: true,
    });

    if (!application) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Application not found');
    }

    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin', 'developer'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to this application'
      );
    }

    const theme = new Parse.Object('CMSTheme');

    theme.set('application', application);
    theme.set('name', themeData.name);
    theme.set('type', themeData.type);
    theme.set('colors', themeData.colors);
    theme.set('typography', themeData.typography);
    theme.set('spacing', themeData.spacing);
    theme.set('description', themeData.description);
    theme.set('metadata', {
      version: '1.0.0',
      lastUpdated: new Date(),
      author: user.get('username'),
    });

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('updateTheme', async request => {
    const { themeId, themeData } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    const userRoles = await checkUserRole({ user });
    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin', 'developer'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to this theme'
      );
    }

    theme.set('name', themeData.name);
    theme.set('type', themeData.type);
    theme.set('colors', themeData.colors);
    theme.set('typography', themeData.typography);
    theme.set('spacing', themeData.spacing);
    theme.set('description', themeData.description);
    theme.set('metadata', {
      ...theme.get('metadata'),
      lastUpdated: new Date(),
      lastUpdatedBy: user.get('username'),
    });

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('deleteTheme', async request => {
    const { themeId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    const userRoles = await checkUserRole({ user });
    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to delete this theme'
      );
    }

    return theme.destroy({ useMasterKey: true });
  });

  Parse.Cloud.define('updateThemeVersion', async request => {
    const { themeId, version, versionData } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    const userRoles = await checkUserRole({ user });
    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin', 'developer'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to update this theme'
      );
    }

    const versions = theme.get('versions') || [];
    const updatedVersions = versions.filter(v => v.version !== version);

    updatedVersions.push({
      ...versionData,
      version,
      createdAt: new Date(),
      author: user.get('username'),
    });

    theme.set('versions', updatedVersions);

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('updateThemeInheritance', async request => {
    const { themeId, inheritance } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    const userRoles = await checkUserRole({ user });
    const organization = application.get('organization');
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === organization.id && ['admin', 'developer'].includes(role.role)
    );

    if (!userRoles.isAdmin && !hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to update this theme'
      );
    }

    theme.set('inheritance', inheritance);

    return theme.save(null, { useMasterKey: true });
  });

  // Organization Theme Management Functions
  Parse.Cloud.define('getOrganizationTheme', async request => {
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const orgId = user.get('organizationId') || request.params.orgId;
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has access to this organization
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === orgId
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to this organization'
      );
    }

    try {
      const query = new Parse.Query('ThemeConfiguration');
      query.equalTo('organizationId', orgId);
      query.equalTo('isActive', true);
      const themeConfig = await query.first({ useMasterKey: true });

      if (!themeConfig) {
        return { success: true, theme: null, isDefault: true };
      }

      return { success: true, theme: themeConfig.toJSON(), isDefault: false };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get organization theme: ${error.message}`);
    }
  });

  Parse.Cloud.define('getAvailableThemes', async request => {
    const { orgId, includeCustom = true, category } = request.params;
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const effectiveOrgId = orgId || user.get('organizationId');
    
    if (!effectiveOrgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has access to this organization
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === effectiveOrgId
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have access to this organization'
      );
    }

    try {
      // Get built-in themes (this would be replaced with actual built-in theme data)
      let themes = [
        { id: 'light', name: 'Light', category: 'built-in', isCustom: false },
        { id: 'dark', name: 'Dark', category: 'built-in', isCustom: false },
        { id: 'corporate', name: 'Corporate', category: 'professional', isCustom: false }
      ];

      if (includeCustom) {
        const query = new Parse.Query('ThemeTemplate');
        query.equalTo('organizationId', effectiveOrgId);
        if (category) {
          query.equalTo('category', category);
        }
        const customThemes = await query.find({ useMasterKey: true });
        const customThemeData = customThemes.map(theme => ({
          ...theme.toJSON(),
          isCustom: true
        }));
        themes = [...themes, ...customThemeData];
      }

      if (category) {
        themes = themes.filter(theme => theme.category === category);
      }

      return { success: true, themes };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to get available themes: ${error.message}`);
    }
  });

  Parse.Cloud.define('applyTheme', async request => {
    const { orgId, userId, themeId, themeName, customizations = {} } = request.params;
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const effectiveOrgId = orgId || user.get('organizationId');
    const effectiveUserId = userId || user.id;
    
    if (!effectiveOrgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has theme write permissions
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === effectiveOrgId && ['admin', 'theme_manager'].includes(role.role)
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have permission to apply themes'
      );
    }

    try {
      let themeData;

      if (themeId) {
        // Apply custom theme
        const query = new Parse.Query('ThemeTemplate');
        const customTheme = await query.get(themeId, { useMasterKey: true });
        if (!customTheme) {
          throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Custom theme not found');
        }
        themeData = customTheme.toJSON();
      } else if (themeName) {
        // Apply built-in theme (this would use actual built-in theme data)
        const builtInThemes = {
          'light': { name: 'Light', colors: { primary: '#007bff' } },
          'dark': { name: 'Dark', colors: { primary: '#6c757d' } },
          'corporate': { name: 'Corporate', colors: { primary: '#0066cc' } }
        };
        themeData = builtInThemes[themeName];
        if (!themeData) {
          throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Built-in theme not found');
        }
      } else {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Either themeId or themeName must be provided');
      }

      // Deactivate current active theme
      const currentQuery = new Parse.Query('ThemeConfiguration');
      currentQuery.equalTo('organizationId', effectiveOrgId);
      currentQuery.equalTo('isActive', true);
      const currentTheme = await currentQuery.first({ useMasterKey: true });
      if (currentTheme) {
        currentTheme.set('isActive', false);
        await currentTheme.save(null, { useMasterKey: true });
      }

      // Create new theme configuration
      const ThemeConfiguration = Parse.Object.extend('ThemeConfiguration');
      const newThemeConfig = new ThemeConfiguration();

      newThemeConfig.set('organizationId', effectiveOrgId);
      newThemeConfig.set('name', themeData.name);
      newThemeConfig.set('description', themeData.description || '');
      newThemeConfig.set('colors', { ...themeData.colors, ...customizations.colors });
      newThemeConfig.set('typography', { ...themeData.typography, ...customizations.typography });
      newThemeConfig.set('spacing', { ...themeData.spacing, ...customizations.spacing });
      newThemeConfig.set('components', { ...themeData.components, ...customizations.components });
      newThemeConfig.set('customizations', customizations);
      newThemeConfig.set('appliedBy', effectiveUserId);
      newThemeConfig.set('isActive', true);

      const savedThemeConfig = await newThemeConfig.save(null, { useMasterKey: true });
      return { success: true, theme: savedThemeConfig.toJSON() };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to apply theme: ${error.message}`);
    }
  });

  Parse.Cloud.define('createCustomTheme', async request => {
    const { orgId, userId, themeData } = request.params;
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const effectiveOrgId = orgId || user.get('organizationId');
    const effectiveUserId = userId || user.id;
    
    if (!effectiveOrgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has theme management permissions
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === effectiveOrgId && ['admin', 'theme_manager'].includes(role.role)
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have permission to create custom themes'
      );
    }

    try {
      const ThemeTemplate = Parse.Object.extend('ThemeTemplate');
      const themeTemplate = new ThemeTemplate();

      themeTemplate.set('name', themeData.name);
      themeTemplate.set('description', themeData.description || '');
      themeTemplate.set('category', themeData.category || 'custom');
      themeTemplate.set('baseTheme', themeData.baseTheme || '');
      themeTemplate.set('colors', themeData.colors || {});
      themeTemplate.set('typography', themeData.typography || {});
      themeTemplate.set('spacing', themeData.spacing || {});
      themeTemplate.set('components', themeData.components || {});
      themeTemplate.set('organizationId', effectiveOrgId);
      themeTemplate.set('createdBy', effectiveUserId);
      themeTemplate.set('isActive', true);

      const savedTheme = await themeTemplate.save(null, { useMasterKey: true });
      return { success: true, theme: savedTheme.toJSON() };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to create custom theme: ${error.message}`);
    }
  });

  Parse.Cloud.define('updateThemeCustomization', async request => {
    const { orgId, userId, customizations, merge = true } = request.params;
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const effectiveOrgId = orgId || user.get('organizationId');
    const effectiveUserId = userId || user.id;
    
    if (!effectiveOrgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has theme write permissions
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === effectiveOrgId && ['admin', 'theme_manager'].includes(role.role)
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have permission to update theme customizations'
      );
    }

    try {
      const query = new Parse.Query('ThemeConfiguration');
      query.equalTo('organizationId', effectiveOrgId);
      query.equalTo('isActive', true);
      const currentTheme = await query.first({ useMasterKey: true });

      if (!currentTheme) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'No active theme found to customize');
      }

      if (merge) {
        const existingCustomizations = currentTheme.get('customizations') || {};
        const mergedCustomizations = { ...existingCustomizations, ...customizations };
        currentTheme.set('customizations', mergedCustomizations);

        if (customizations.colors) {
          const existingColors = currentTheme.get('colors') || {};
          currentTheme.set('colors', { ...existingColors, ...customizations.colors });
        }
        if (customizations.typography) {
          const existingTypography = currentTheme.get('typography') || {};
          currentTheme.set('typography', { ...existingTypography, ...customizations.typography });
        }
        if (customizations.spacing) {
          const existingSpacing = currentTheme.get('spacing') || {};
          currentTheme.set('spacing', { ...existingSpacing, ...customizations.spacing });
        }
        if (customizations.components) {
          const existingComponents = currentTheme.get('components') || {};
          currentTheme.set('components', { ...existingComponents, ...customizations.components });
        }
      } else {
        currentTheme.set('customizations', customizations);
        currentTheme.set('colors', customizations.colors || {});
        currentTheme.set('typography', customizations.typography || {});
        currentTheme.set('spacing', customizations.spacing || {});
        currentTheme.set('components', customizations.components || {});
      }

      currentTheme.set('updatedBy', effectiveUserId);
      const savedTheme = await currentTheme.save(null, { useMasterKey: true });
      return { success: true, theme: savedTheme.toJSON() };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to update theme customization: ${error.message}`);
    }
  });

  Parse.Cloud.define('deleteCustomTheme', async request => {
    const { themeTemplateId } = request.params;
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    
    try {
      const query = new Parse.Query('ThemeTemplate');
      const themeTemplate = await query.get(themeTemplateId, { useMasterKey: true });
      
      if (!themeTemplate) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme template not found');
      }

      const orgId = themeTemplate.get('organizationId');
      
      // Check if user has theme management permissions
      const hasAccess = userRoles.organizationRoles.some(
        role => role.organizationId === orgId && ['admin', 'theme_manager'].includes(role.role)
      ) || userRoles.isAdmin;

      if (!hasAccess) {
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN,
          'User does not have permission to delete this theme'
        );
      }

      await themeTemplate.destroy({ useMasterKey: true });
      return { success: true, themeTemplateId };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to delete custom theme: ${error.message}`);
    }
  });

  Parse.Cloud.define('resetOrganizationTheme', async request => {
    const user = request.user;
    
    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const userRoles = await checkUserRole({ user });
    const orgId = user.get('organizationId') || request.params.orgId;
    const userId = user.id;
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Organization ID is required');
    }

    // Check if user has theme write permissions
    const hasAccess = userRoles.organizationRoles.some(
      role => role.organizationId === orgId && ['admin', 'theme_manager'].includes(role.role)
    ) || userRoles.isAdmin;

    if (!hasAccess) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'User does not have permission to reset theme'
      );
    }

    try {
      // Deactivate current active theme
      const currentQuery = new Parse.Query('ThemeConfiguration');
      currentQuery.equalTo('organizationId', orgId);
      currentQuery.equalTo('isActive', true);
      const currentTheme = await currentQuery.first({ useMasterKey: true });
      
      if (currentTheme) {
        currentTheme.set('isActive', false);
        await currentTheme.save(null, { useMasterKey: true });
      }

      // Return default theme data
      const defaultTheme = {
        id: 'default',
        name: 'Default Theme',
        organizationId: orgId,
        colors: { primary: '#007bff', secondary: '#6c757d' },
        typography: { fontFamily: 'Arial, sans-serif' },
        spacing: { base: '1rem' },
        components: {},
        isDefault: true
      };

      return { success: true, theme: defaultTheme };
    } catch (error) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to reset theme: ${error.message}`);
    }
  });
};
