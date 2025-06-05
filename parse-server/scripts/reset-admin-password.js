const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function resetAdminPassword() {
  try {
    const user = await new Parse.Query(Parse.User)
      .equalTo('email', 'admin@example.com')
      .first({ useMasterKey: true });

    if (!user) {
      throw new Error('Admin user not found');
    }

    // This will properly hash the password
    user.setPassword('admin');
    await user.save(null, { useMasterKey: true });
    
    console.log('Successfully reset password for user:', {
      id: user.id,
      email: user.get('email')
    });
    
    console.log('\nYou can now login with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();
