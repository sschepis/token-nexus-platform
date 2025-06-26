const Parse = require('parse/node');

// Initialize Parse
Parse.initialize('your-app-id', 'your-js-key', 'your-master-key');
Parse.serverURL = 'http://localhost:1337/parse';

async function testLogin() {
  try {
    console.log('Testing customUserLogin...');
    
    const result = await Parse.Cloud.run('customUserLogin', {
      username: 'admin@nomyx.io',
      password: 'admin123'
    });
    
    console.log('Login result:', JSON.stringify(result, null, 2));
    console.log('Organizations count:', result.organizations?.length || 0);
    console.log('Current org:', result.currentOrg);
    console.log('Is admin:', result.isAdmin);
    
  } catch (error) {
    console.error('Login test failed:', error);
  }
}

testLogin();