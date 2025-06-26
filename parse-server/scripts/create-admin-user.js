/* eslint-disable no-console */
const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createAdminUser() {
  // Helper function to create Parse User
  async function createParseUser(details) {
    const newUser = new Parse.User();

    // Prepare user attributes

    // Set user attributes
    Object.entries(details).forEach(([key, value]) => {
      newUser.set(key, value);
    });

    // Save user to database
    await newUser.save(null, { useMasterKey: true });

    return newUser;
  }

  try {
    // Prepare user query

    // Check if any users exist
    const userQuery = new Parse.Query(Parse.User);

    // Count existing users
    const userCount = await userQuery.count({ useMasterKey: true });

    // Validate user count
    if (userCount > 0) {
      console.log('Users already exist in the database. Skipping admin user creation.');
      process.exit(0);

      return;
    }

    // Prepare admin user creation
    const userDetails = {
      username: 'admin@nomyx.io',
      password: 'admin',
      email: 'admin@nomyx.io',
      isAdmin: true,
    };

    // Create new admin user
    const user = await createParseUser(userDetails);

    console.log('Created first admin user:', {
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
    });

    // Check for existing admin role and delete if found
    const roleQuery = new Parse.Query(Parse.Role);

    roleQuery.equalTo('name', 'admin');
    const existingRole = await roleQuery.first({ useMasterKey: true });

    if (existingRole) {
      await existingRole.destroy({ useMasterKey: true });
      console.log('Deleted existing admin role');
    }

    // Create new admin role
    const acl = new Parse.ACL();

    acl.setPublicReadAccess(true);

    // Prepare admin role
    const adminRole = new Parse.Role('admin', acl);

    // Add user to admin role
    adminRole.getUsers().add(user);

    // Prepare to save admin role

    await adminRole.save(null, { useMasterKey: true });

    console.log('Added user to admin role');

    // Verify user roles and isAdmin flag
    const verifyUserQuery = new Parse.Query(Parse.User);

    verifyUserQuery.equalTo('username', 'admin@nomyx.io');
    const verifiedUser = await verifyUserQuery.first({ useMasterKey: true });

    const verifyRoleQuery = new Parse.Query(Parse.Role);

    verifyRoleQuery.equalTo('name', 'admin');
    const verifiedAdminRole = await verifyRoleQuery.first({ useMasterKey: true });

    console.log('\nVerification:');
    console.log('isAdmin flag:', verifiedUser.get('isAdmin'));
    console.log('User roles:', await verifiedAdminRole.getUsers().query().find());

    console.log('\nYou can now login with:');
    console.log('Email: admin@nomyx.io');
    console.log('Password: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUser();
