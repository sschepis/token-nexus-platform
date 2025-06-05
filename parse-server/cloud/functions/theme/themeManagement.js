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
};
