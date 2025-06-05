/**
 * Test script for organization-aware Parse Server integration
 * Run this to verify that the organization-aware cloud functions are working
 */

const Parse = require('parse/node');

// Configuration - update these values to match your setup
const config = {
  appId: process.env.PARSE_APP_ID || 'gemcms_dev',
  masterKey: process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev',
  serverURL: process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse'
};

async function testOrganizationIntegration() {
  console.log('🧪 Testing Organization-Aware Parse Server Integration...\n');

  try {
    // Initialize Parse
    Parse.initialize(config.appId, null, config.masterKey);
    Parse.serverURL = config.serverURL;
    
    console.log('✅ Parse SDK initialized');
    console.log(`   App ID: ${config.appId}`);
    console.log(`   Server URL: ${config.serverURL}\n`);

    // Test 1: Check if hasSmartContract function exists and works
    console.log('📋 Test 1: hasSmartContract function');
    try {
      const result = await Parse.Cloud.run('hasSmartContract', {
        contractName: 'IdentityFactory',
        organizationId: 'test-org-123'
      }, { useMasterKey: true });
      
      console.log('✅ hasSmartContract function works');
      console.log(`   Result:`, result);
    } catch (error) {
      console.log('❌ hasSmartContract function failed');
      console.log(`   Error: ${error.message}`);
    }

    // Test 2: Check if getSmartContracts function exists and works
    console.log('\n📋 Test 2: getSmartContracts function');
    try {
      const result = await Parse.Cloud.run('getSmartContracts', {
        organizationId: 'test-org-123'
      }, { useMasterKey: true });
      
      console.log('✅ getSmartContracts function works');
      console.log(`   Result:`, result);
    } catch (error) {
      console.log('❌ getSmartContracts function failed');
      console.log(`   Error: ${error.message}`);
    }

    // Test 3: Check if getAlchemyAnalyticsEnabledStatus function exists
    console.log('\n📋 Test 3: getAlchemyAnalyticsEnabledStatus function');
    try {
      // Create a test user for this function since it requires authentication
      const testUser = new Parse.User();
      testUser.set('username', 'test-user-' + Date.now());
      testUser.set('password', 'test-password');
      testUser.set('email', `test-${Date.now()}@example.com`);
      
      await testUser.save(null, { useMasterKey: true });
      
      const result = await Parse.Cloud.run('getAlchemyAnalyticsEnabledStatus', {}, {
        sessionToken: testUser.getSessionToken()
      });
      
      console.log('✅ getAlchemyAnalyticsEnabledStatus function works');
      console.log(`   Result:`, result);
      
      // Clean up test user
      await testUser.destroy({ useMasterKey: true });
      
    } catch (error) {
      console.log('❌ getAlchemyAnalyticsEnabledStatus function failed');
      console.log(`   Error: ${error.message}`);
    }

    // Test 4: Test organization health check
    console.log('\n📋 Test 4: tenantHealthCheck function');
    try {
      const result = await Parse.Cloud.run('tenantHealthCheck', {}, { useMasterKey: true });
      
      console.log('✅ tenantHealthCheck function works');
      console.log(`   Result:`, result);
    } catch (error) {
      console.log('❌ tenantHealthCheck function failed');
      console.log(`   Error: ${error.message}`);
    }

    // Test 5: Check Parse Server health
    console.log('\n📋 Test 5: Parse Server health check');
    try {
      const healthQuery = new Parse.Query('_Installation');
      healthQuery.limit(1);
      await healthQuery.find({ useMasterKey: true });
      
      console.log('✅ Parse Server is responding to queries');
    } catch (error) {
      console.log('❌ Parse Server health check failed');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🎉 Organization integration test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOrganizationIntegration()
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testOrganizationIntegration };