const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function listUsers() {
  try {
    const users = await new Parse.Query(Parse.User)
      .find({ useMasterKey: true });
    
    console.log('All users in database:');
    users.forEach(user => {
      console.log({
        id: user.id,
        username: user.get('username'),
        email: user.get('email'),
        isAdmin: user.get('isAdmin')
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
