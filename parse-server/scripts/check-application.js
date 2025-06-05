const Parse = require('parse/node');

// Initialize Parse with your Parse Server configuration
Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.serverURL = 'http://localhost:1337/parse';
// Use master key to bypass ACL
Parse.Cloud.useMasterKey();

async function checkApplication() {
  try {
    const orgId = 'yKAUBfNuy2';
    const appId = 'w1dkF1EejT';

    // Query the organization
    const orgQuery = new Parse.Query('Organization');
    const org = await orgQuery.get(orgId);

    console.log('Organization found:', {
      id: org.id,
      name: org.get('name'),
    });

    // Query the application
    const appQuery = new Parse.Query('CMSApplication');

    appQuery.include('organization');

    const app = await appQuery.get(appId);

    console.log('Application found:', {
      id: app.id,
      name: app.get('name'),
      organization: {
        id: app.get('organization').id,
        name: app.get('organization').get('name'),
      },
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkApplication();
