/* eslint-disable no-console */
const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createSampleApp() {
  try {
    // Create admin user if needed for createdBy field
    const adminQuery = new Parse.Query(Parse.User);

    adminQuery.equalTo('username', 'admin@nomyx.io');
    const adminUser = await adminQuery.first({ useMasterKey: true });

    if (!adminUser) {
      console.log('Admin user not found. Please run create-admin-user.js first.');
      process.exit(1);
    }

    // Delete any existing applications
    const Application = Parse.Object.extend('CMSApplication');
    const query = new Parse.Query(Application);
    const existingApps = await query.find({ useMasterKey: true });

    for (const app of existingApps) {
      await app.destroy({ useMasterKey: true });
    }
    console.log('Deleted existing applications');

    // Create Analytics Dashboard
    const analyticsApp = new Application();

    analyticsApp.set('name', 'Analytics Dashboard');
    analyticsApp.set(
      'description',
      'A powerful analytics dashboard with real-time data visualization, customizable widgets, and export capabilities.'
    );
    analyticsApp.set('type', 'dynamic');
    analyticsApp.set('version', '1.0.0');
    analyticsApp.set('status', 'active');
    analyticsApp.set('isTemplate', true);
    analyticsApp.set('createdBy', adminUser);
    analyticsApp.set('updatedBy', adminUser);
    // Get organization
    const orgQuery = new Parse.Query('Organization');

    orgQuery.equalTo('objectId', 'S3eO5wzJIi');
    const organization = await orgQuery.first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    analyticsApp.set('organization', organization);

    analyticsApp.set('components', [
      {
        name: 'DashboardLayout',
        type: 'layout',
        configuration: {
          widgets: true,
          customization: true,
        },
      },
      {
        name: 'DataVisualization',
        type: 'feature',
        configuration: {
          charts: true,
          realtime: true,
        },
      },
      {
        name: 'ExportTools',
        type: 'feature',
        configuration: {
          formats: ['csv', 'pdf', 'json'],
        },
      },
    ]);

    analyticsApp.set('settings', {
      notifications: {
        enabled: true,
        email: true,
        push: false,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelist: [],
      },
      performance: {
        cacheEnabled: true,
        maxConcurrentRequests: 100,
      },
    });

    await analyticsApp.save(null, { useMasterKey: true });
    console.log('Created Analytics Dashboard application');

    const cmsApp = new Application();

    cmsApp.set('name', 'Content Management System');
    cmsApp.set(
      'description',
      'A comprehensive CMS with built-in SEO tools, media management, and a user-friendly interface.'
    );
    cmsApp.set('type', 'dynamic');
    cmsApp.set('version', '1.0.0');
    cmsApp.set('status', 'active');
    cmsApp.set('isTemplate', true);
    cmsApp.set('createdBy', adminUser);
    cmsApp.set('updatedBy', adminUser);
    cmsApp.set('organization', organization);

    cmsApp.set('components', [
      {
        name: 'ContentEditor',
        type: 'feature',
        configuration: {
          richText: true,
          mediaLibrary: true,
        },
      },
      {
        name: 'SEOTools',
        type: 'feature',
        configuration: {
          metaEditor: true,
          sitemapGenerator: true,
        },
      },
      {
        name: 'MediaManager',
        type: 'feature',
        configuration: {
          upload: true,
          optimization: true,
          gallery: true,
        },
      },
    ]);

    cmsApp.set('settings', {
      notifications: {
        enabled: true,
        email: true,
        push: false,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelist: [],
      },
      performance: {
        cacheEnabled: true,
        maxConcurrentRequests: 100,
      },
    });

    await cmsApp.save(null, { useMasterKey: true });
    console.log('Created Content Management System application');

    console.log('Successfully created sample applications');
  } catch (error) {
    console.error('Error creating sample apps:', error);
    process.exit(1);
  }

  process.exit(0);
}

createSampleApp();
