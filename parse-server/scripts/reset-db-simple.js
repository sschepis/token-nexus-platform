#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetDatabase() {
  // Get database URI directly from environment or use default
  const dbUri = process.env.DATABASE_URI || 'mongodb://localhost:27017/gemcms';
  
  console.log('🗑️  Preparing to reset database...');
  console.log(`📍 Database URI: ${dbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in log
  
  const client = new MongoClient(dbUri);

  try {
    await client.connect();
    const dbName = dbUri.split('/').pop().split('?')[0];
    const db = client.db(dbName);

    // Get list of collections before dropping
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in database '${dbName}'`);
    
    // Confirm before dropping
    console.log(`\n⚠️  WARNING: This will drop the entire '${dbName}' database!`);
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`🔥 Dropping database: ${dbName}`);
    await db.dropDatabase();
    
    console.log('✅ Database reset successfully!');
    
    // Also remove the platform state file to ensure fresh setup
    const fs = require('fs');
    const platformStateFile = '.platform-state';
    try {
      if (fs.existsSync(platformStateFile)) {
        fs.unlinkSync(platformStateFile);
        console.log('🗑️  Removed platform state file');
      }
    } catch (error) {
      console.warn('⚠️  Could not remove platform state file:', error.message);
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your Parse Server to reinitialize schemas');
    console.log('   2. The schemas will be created fresh on startup');
    console.log('   3. Navigate to the app - it should now show the setup page');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Execute if run directly
if (require.main === module) {
  resetDatabase().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = resetDatabase;