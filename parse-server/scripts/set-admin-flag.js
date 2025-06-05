const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function setAdminFlag() {
  try {
    const user = await new Parse.Query(Parse.User)
      .equalTo('username', 'admin')
      .first({ useMasterKey: true });

    if (!user) {
      throw new Error('Admin user not found');
    }

    user.set('isAdmin', true);
    await user.save(null, { useMasterKey: true });
    
    console.log('Successfully set isAdmin flag to true for user:', {
      id: user.id,
      username: user.get('username'),
      isAdmin: user.get('isAdmin'),
      email: user.get('email')
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdminFlag();
