const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function ensureSystemAdmin() {
  try {
    // Try to find existing admin user
    let adminUser = await new Parse.Query(Parse.User)
      .equalTo('email', 'admin@gemcms.com')
      .first({ useMasterKey: true });

    if (!adminUser) {
      // Create new admin user
      adminUser = new Parse.User();
      adminUser.set('username', 'admin@gemcms.com');
      adminUser.set('email', 'admin@gemcms.com');
      adminUser.set('password', 'admin');
      adminUser.set('firstName', 'System');
      adminUser.set('lastName', 'Administrator');
      adminUser.set('isAdmin', true);
      
      await adminUser.save(null, { useMasterKey: true });
      console.log('Created new system admin user');
    } else {
      // Update existing user to ensure admin flag is set
      adminUser.set('isAdmin', true);
      await adminUser.save(null, { useMasterKey: true });
      console.log('Updated existing user to system admin');
    }

    console.log('System admin user details:', {
      id: adminUser.id,
      username: adminUser.get('username'),
      email: adminUser.get('email'),
      isAdmin: adminUser.get('isAdmin'),
      firstName: adminUser.get('firstName'),
      lastName: adminUser.get('lastName')
    });

    console.log('\nYou can now login with:');
    console.log('Email: admin@gemcms.com');
    console.log('Password: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

ensureSystemAdmin();