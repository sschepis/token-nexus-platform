const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function checkApplicationPointers() {
  try {
    // Get all applications
    const applications = await new Parse.Query('CMSApplication')
      .include('organization')
      .include('createdBy')
      .find({ useMasterKey: true });

    console.log('Checking application pointers:');
    applications.forEach(app => {
      const org = app.get('organization');
      console.log('\nApplication:', {
        id: app.id,
        name: app.get('name'),
        className: app.className,
        organization: org ? {
          id: org.id,
          name: org.get('name'),
          className: org.className,
          pointer: org.toPointer()
        } : 'null'
      });

      // Check if organization pointer is valid
      if (!org) {
        console.error(`Warning: Application ${app.id} has no organization pointer`);
      } else if (!(org instanceof Parse.Object)) {
        console.error(`Warning: Application ${app.id} has invalid organization pointer type`);
      }
    });

    // Also check organization class
    const orgs = await new Parse.Query('Organization').find({ useMasterKey: true });
    console.log('\nOrganizations in database:', orgs.map(org => ({
      id: org.id,
      name: org.get('name'),
      className: org.className,
      pointer: org.toPointer()
    })));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkApplicationPointers();
