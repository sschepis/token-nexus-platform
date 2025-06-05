/* eslint-disable no-console */
const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function listApplications() {
  try {
    // Get organization
    const orgQuery = new Parse.Query('Organization');

    orgQuery.equalTo('objectId', 'S3eO5wzJIi');
    const organization = await orgQuery.first({ useMasterKey: true });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get all applications for this organization
    const appQuery = new Parse.Query('CMSApplication');

    appQuery.equalTo('organization', organization);
    appQuery.include('createdBy');
    const applications = await appQuery.find({ useMasterKey: true });

    console.log('Applications for organization:', organization.get('name'));
    if (applications.length === 0) {
      console.log('No applications found');
    } else {
      applications.forEach(app => {
        console.log({
          id: app.id,
          name: app.get('name'),
          description: app.get('description'),
          status: app.get('status'),
          createdBy: app.get('createdBy').get('username'),
          settings: app.get('settings'),
        });
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

listApplications();
