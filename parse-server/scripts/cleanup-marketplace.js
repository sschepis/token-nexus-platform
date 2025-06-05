/* eslint-disable no-console */
const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function cleanup() {
  try {
    // Delete all installed applications first
    const installQuery = new Parse.Query('InstalledApplication');
    const installations = await installQuery.find({ useMasterKey: true });

    await Parse.Object.destroyAll(installations, { useMasterKey: true });
    console.log(`Deleted ${installations.length} installed applications`);

    // Delete all marketplace apps
    const appQuery = new Parse.Query('MarketplaceApp');
    const apps = await appQuery.find({ useMasterKey: true });

    await Parse.Object.destroyAll(apps, { useMasterKey: true });
    console.log(`Deleted ${apps.length} marketplace apps`);

    // Delete all previews
    const previewQuery = new Parse.Query('Preview');
    const previews = await previewQuery.find({ useMasterKey: true });

    await Parse.Object.destroyAll(previews, { useMasterKey: true });
    console.log(`Deleted ${previews.length} previews`);

    // Delete publisher
    const publisherQuery = new Parse.Query('Publisher').equalTo('name', 'Sample Publisher');
    const publishers = await publisherQuery.find({ useMasterKey: true });

    await Parse.Object.destroyAll(publishers, { useMasterKey: true });
    console.log(`Deleted ${publishers.length} publishers`);

    console.log('Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();
