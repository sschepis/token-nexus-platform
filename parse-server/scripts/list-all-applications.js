const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function listAllApplications() {
  try {
    // Get all applications
    const applications = await new Parse.Query('CMSApplication')
      .include('organization')
      .include('createdBy')
      .find({ useMasterKey: true });

    console.log('All applications in database:');
    applications.forEach(app => {
      console.log({
        id: app.id,
        name: app.get('name'),
        description: app.get('description'),
        status: app.get('status'),
        organization: {
          id: app.get('organization').id,
          name: app.get('organization').get('name')
        },
        createdBy: {
          id: app.get('createdBy').id,
          username: app.get('createdBy').get('username')
        },
        settings: app.get('settings')
      });
    });

    if (applications.length === 0) {
      console.log('No applications found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

listAllApplications();
