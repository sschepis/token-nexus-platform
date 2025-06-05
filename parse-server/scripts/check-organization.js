const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function checkOrganization() {
  try {
    // Get all organizations
    const organizations = await new Parse.Query('Organization')
      .include('createdBy')
      .find({ useMasterKey: true });

    console.log('All organizations in database:');
    organizations.forEach(org => {
      console.log({
        id: org.id,
        name: org.get('name'),
        subdomain: org.get('subdomain'),
        createdBy: {
          id: org.get('createdBy').id,
          username: org.get('createdBy').get('username')
        },
        settings: org.get('settings'),
        acl: org.getACL(),
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      });
    });

    if (organizations.length === 0) {
      console.log('No organizations found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkOrganization();
