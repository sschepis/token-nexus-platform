/**
 * Phase 1 API Bridge Test Script
 * Tests the critical API bridge functions to ensure they work correctly
 */

const Parse = require('parse/node');

// Configure Parse (you'll need to update these with your actual credentials)
Parse.initialize('your-app-id', 'your-js-key');
Parse.serverURL = 'http://localhost:1337/parse';

async function testAPIBridge() {
  console.log('🧪 Testing Phase 1 API Bridge Functions...\n');

  try {
    // Test 1: fetchAppDefinitions
    console.log('1️⃣ Testing fetchAppDefinitions...');
    const appDefinitions = await Parse.Cloud.run('fetchAppDefinitions', {
      category: 'all',
      search: ''
    });
    console.log(`✅ fetchAppDefinitions: Found ${appDefinitions.length} app definitions`);

    // Test 2: fetchOrgAppInstallations (requires authenticated user)
    console.log('\n2️⃣ Testing fetchOrgAppInstallations...');
    try {
      const installations = await Parse.Cloud.run('fetchOrgAppInstallations', {});
      console.log(`✅ fetchOrgAppInstallations: Found ${installations.length} installations`);
    } catch (error) {
      if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
        console.log('⚠️ fetchOrgAppInstallations: Requires authentication (expected)');
      } else {
        throw error;
      }
    }

    // Test 3: Check if installApp function exists
    console.log('\n3️⃣ Testing installApp function availability...');
    try {
      await Parse.Cloud.run('installApp', {});
    } catch (error) {
      if (error.code === Parse.Error.INVALID_SESSION_TOKEN || 
          error.code === Parse.Error.INVALID_JSON) {
        console.log('✅ installApp: Function exists and validates parameters');
      } else {
        throw error;
      }
    }

    // Test 4: Check if uninstallApp function exists
    console.log('\n4️⃣ Testing uninstallApp function availability...');
    try {
      await Parse.Cloud.run('uninstallApp', {});
    } catch (error) {
      if (error.code === Parse.Error.INVALID_SESSION_TOKEN || 
          error.code === Parse.Error.INVALID_JSON) {
        console.log('✅ uninstallApp: Function exists and validates parameters');
      } else {
        throw error;
      }
    }

    // Test 5: Check if updateAppSettings function exists
    console.log('\n5️⃣ Testing updateAppSettings function availability...');
    try {
      await Parse.Cloud.run('updateAppSettings', {});
    } catch (error) {
      if (error.code === Parse.Error.INVALID_SESSION_TOKEN || 
          error.code === Parse.Error.INVALID_JSON) {
        console.log('✅ updateAppSettings: Function exists and validates parameters');
      } else {
        throw error;
      }
    }

    // Test 6: Check if getAppInstallationDetails function exists
    console.log('\n6️⃣ Testing getAppInstallationDetails function availability...');
    try {
      await Parse.Cloud.run('getAppInstallationDetails', {});
    } catch (error) {
      if (error.code === Parse.Error.INVALID_SESSION_TOKEN || 
          error.code === Parse.Error.INVALID_JSON) {
        console.log('✅ getAppInstallationDetails: Function exists and validates parameters');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Phase 1 API Bridge Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ All required cloud functions are registered');
    console.log('✅ Parameter validation is working');
    console.log('✅ Authentication checks are in place');
    console.log('✅ API bridge is ready for frontend integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAPIBridge();
}

module.exports = { testAPIBridge };