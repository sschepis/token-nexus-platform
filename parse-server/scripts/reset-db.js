const { MongoClient } = require('mongodb');
const config = require('../src/config');

async function resetDatabase() {
  const dbUri = process.env.DATABASE_URI || config.parseServer.databaseURI;

  console.log('Connecting to database...');
  const client = new MongoClient(dbUri);

  try {
    await client.connect();
    const dbName = dbUri.split('/').pop().split('?')[0];
    const db = client.db(dbName);

    console.log(`Dropping database: ${dbName}`);
    await db.dropDatabase();
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Execute if run directly
if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;
