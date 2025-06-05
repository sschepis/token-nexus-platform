#!/usr/bin/env node

const Parse = require('parse/node');

async function updateAISchemas() {
  try {
    console.log('🔄 Updating AI schemas...');
    
    // Initialize Parse first
    const config = require('../src/config');
    Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);
    Parse.serverURL = config.parseServer.serverURL;
    
    // Now load the schema definitions (after Parse is initialized)
    const aiSchema = require('../cloud/schema/aiSchema');
    const { initializeSchema } = require('../cloud/schema/initSchemas');
    
    // Update AI schemas
    const results = await initializeSchema(aiSchema, { verbose: true });
    
    console.log('✅ AI schemas updated successfully!');
    console.log(`Success: ${results.success.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`);
    
    if (results.success.length > 0) {
      console.log('Updated schemas:', results.success.join(', '));
    }
    
    if (results.skipped.length > 0) {
      console.log('Skipped schemas:', results.skipped.join(', '));
    }
    
    if (results.failed.length > 0) {
      console.log('Failed schemas:', results.failed.join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating AI schemas:', error);
    process.exit(1);
  }
}

updateAISchemas();