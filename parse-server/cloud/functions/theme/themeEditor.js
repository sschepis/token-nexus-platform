const { checkUserRole } = require('../roles');

module.exports = Parse => {
  Parse.Cloud.define('updateThemeColors', async request => {
    const { themeId, colors } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    // Check user's role and permissions
    const userRoles = await checkUserRole({ userId: user.id });
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

    theme.set('colors', colors);

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('updateThemeTypography', async request => {
    const { themeId, typography } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    // Check user's role and permissions
    const userRoles = await checkUserRole({ userId: user.id });
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

    theme.set('typography', typography);

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('updateThemeSpacing', async request => {
    const { themeId, spacing } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    // Check user's role and permissions
    const userRoles = await checkUserRole({ userId: user.id });
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

    theme.set('spacing', spacing);

    return theme.save(null, { useMasterKey: true });
  });

  Parse.Cloud.define('updateThemeAdvanced', async request => {
    const { themeId, advanced } = request.params;
    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const theme = await new Parse.Query('CMSTheme').get(themeId, { useMasterKey: true });

    if (!theme) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Theme not found');
    }

    const application = theme.get('application');

    // Check user's role and permissions
    const userRoles = await checkUserRole({ userId: user.id });
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

    theme.set('advanced', advanced);

    return theme.save(null, { useMasterKey: true });
  });
};
