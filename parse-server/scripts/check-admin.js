const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function checkAdmin() {
  try {
    // Check user
    const user = await new Parse.Query(Parse.User)
      .equalTo('objectId', 'Vn7sW2AWq4')
      .first({ useMasterKey: true });

    console.log('User:', {
      id: user.id,
      username: user.get('username'),
      isAdmin: user.get('isAdmin'),
      email: user.get('email'),
      roles: user.get('roles'),
    });

    // Check roles
    const roles = await new Parse.Query(Parse.Role).find({ useMasterKey: true });

    console.log(
      '\nRoles:',
      roles.map(r => ({
        name: r.get('name'),
        users: r.get('users')?.toJSON(),
      }))
    );
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit();
}

checkAdmin();
