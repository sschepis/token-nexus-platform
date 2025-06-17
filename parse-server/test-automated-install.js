/**
 * Test script for automated install functionality
 * This script demonstrates how to test the automated install feature
 */

const Parse = require('parse/node');

// Configuration
const config = {
  serverURL: process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse',
  appId: process.env.PARSE_SERVER_APPLICATION_ID || 'your-app-id',
  masterKey: process.env.PARSE_SERVER_MASTER_KEY || 'your-master-key'
};

async function testAutomatedInstall() {
  console.log('Testing automated install functionality...');
  
  try {
    // Initialize Parse SDK
    Parse.initialize(config.appId, null, config.masterKey);
    Parse.serverURL = config.serverURL;
    
    console.log('Connected to Parse Server at:', config.serverURL);
    
    // Test the automated install function
    console.log('Calling checkAndRunAutomatedInstall...');
    const result = await Parse.Cloud.run('checkAndRunAutomatedInstall', {}, { useMasterKey: true });
    
    console.log('Automated install result:', result);
    
    if (result.success) {
      console.log('✅ Automated install completed successfully');
      
      // Verify the setup by checking platform config
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const configQuery = new Parse.Query(PlatformConfig);
      const platformConfig = await configQuery.first({ useMasterKey: true });
      
      if (platformConfig) {
        console.log('✅ Platform config found:');
        console.log('  - Current State:', platformConfig.get('currentState'));
        console.log('  - Parent Org ID:', platformConfig.get('parentOrgId'));
        console.log('  - Setup Completed At:', platformConfig.get('setupCompletedAt'));
      }
      
      // Check if system admin user exists
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('isAdmin', true);
      const adminUser = await userQuery.first({ useMasterKey: true });
      
      if (adminUser) {
        console.log('✅ System admin user found:');
        console.log('  - Email:', adminUser.get('email'));
        console.log('  - First Name:', adminUser.get('firstName'));
        console.log('  - Last Name:', adminUser.get('lastName'));
      }
      
    } else {
      console.log('ℹ️ Automated install was skipped:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing automated install:', error);
    process.exit(1);
  }
}

// Run the test
testAutomatedInstall()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });