const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function cleanupApplications() {
  try {
    // Get all applications
    const applications = await new Parse.Query('CMSApplication')
      .include('organization')
      .include('createdBy')
      .find({ useMasterKey: true });

    // Keep track of seen names
    const seenNames = new Map();

    // Find duplicates and empty apps
    const toDelete = [];
    applications.forEach(app => {
      const name = app.get('name');
      const description = app.get('description');

      // If app has no description or is a duplicate 'app' name, mark for deletion
      if (!description || (name === 'app' && seenNames.has(name))) {
        toDelete.push(app);
      } else {
        seenNames.set(name, app);
      }
    });

    // Delete marked applications
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} applications:`);
      for (const app of toDelete) {
        console.log({
          id: app.id,
          name: app.get('name'),
          description: app.get('description')
        });
        await app.destroy({ useMasterKey: true });
      }
      console.log('Cleanup complete');
    } else {
      console.log('No applications need cleanup');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

cleanupApplications();
