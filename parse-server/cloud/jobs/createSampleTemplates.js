/* global Parse */

/**
 * Create sample templates if none exist
 */
Parse.Cloud.job('createSampleTemplates', async () => {
  const query = new Parse.Query('CMSTemplate');
  const count = await query.count({ useMasterKey: true });

  if (count === 0) {
    const Template = Parse.Object.extend('CMSTemplate');

    // Create a basic template
    const basicTemplate = new Template();

    basicTemplate.set('name', 'Basic Website');
    basicTemplate.set('description', 'A simple website template with basic pages');
    basicTemplate.set('type', 'custom');
    basicTemplate.set('version', '1.0.0');
    basicTemplate.set('status', 'active');
    basicTemplate.set('components', [
      {
        name: 'Header',
        type: 'layout',
        configuration: {
          logo: true,
          navigation: true,
        },
      },
      {
        name: 'Footer',
        type: 'layout',
        configuration: {
          copyright: true,
          socialLinks: true,
        },
      },
    ]);
    basicTemplate.set('dependencies', []);
    basicTemplate.set('apis', []);
    basicTemplate.set('triggers', []);
    basicTemplate.set('themes', [
      {
        name: 'Default Theme',
        styles: {
          body: {
            'font-family': 'Arial, sans-serif',
            'line-height': '1.6',
          },
        },
        components: {},
        variables: {
          'primary-color': '#007bff',
          'secondary-color': '#6c757d',
        },
      },
    ]);
    basicTemplate.set('defaultConfiguration', {
      siteName: 'My Website',
      description: 'A simple website built with GemCMS',
    });

    await basicTemplate.save(null, { useMasterKey: true });

    // Create a dynamic template
    const dynamicTemplate = new Template();

    dynamicTemplate.set('name', 'Dynamic Portal');
    dynamicTemplate.set(
      'description',
      'A dynamic portal with user authentication and content management'
    );
    dynamicTemplate.set('type', 'dynamic');
    dynamicTemplate.set('version', '1.0.0');
    dynamicTemplate.set('status', 'active');
    dynamicTemplate.set('components', [
      {
        name: 'UserDashboard',
        type: 'feature',
        configuration: {
          profile: true,
          notifications: true,
        },
      },
      {
        name: 'ContentManager',
        type: 'feature',
        configuration: {
          editor: true,
          media: true,
        },
      },
    ]);
    dynamicTemplate.set('dependencies', [
      {
        name: 'Authentication',
        version: '1.0.0',
        type: 'component',
        required: true,
      },
    ]);
    dynamicTemplate.set('apis', [
      {
        name: 'User Profile',
        method: 'GET',
        path: '/api/profile',
        authentication: 'jwt',
      },
    ]);
    dynamicTemplate.set('triggers', [
      {
        name: 'Welcome Email',
        type: 'notification',
        event: {
          type: 'create',
          object: 'User',
        },
        action: {
          type: 'email',
          template: 'welcome',
        },
      },
    ]);
    dynamicTemplate.set('themes', [
      {
        name: 'Modern Theme',
        styles: {
          body: {
            'font-family': 'system-ui, -apple-system, sans-serif',
            'line-height': '1.6',
          },
        },
        components: {},
        variables: {
          'primary-color': '#0070f3',
          'secondary-color': '#7928ca',
        },
      },
    ]);
    dynamicTemplate.set('defaultConfiguration', {
      siteName: 'My Portal',
      description: 'A dynamic portal built with GemCMS',
      features: {
        userRegistration: true,
        contentManagement: true,
      },
    });

    await dynamicTemplate.save(null, { useMasterKey: true });
  }
});

console.log('✓ Sample templates job registered');