const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function checkMarketplaceApps() {
  try {
    // Query all marketplace apps
    const query = new Parse.Query('MarketplaceApp');

    query.include(['preview', 'publisher']);
    const apps = await query.find({ useMasterKey: true });

    console.log('\nFound', apps.length, 'marketplace apps:\n');

    apps.forEach(app => {
      console.log('App:', {
        id: app.id,
        name: app.get('name'),
        description: app.get('description'),
        version: app.get('version'),
        category: app.get('category'),
        status: app.get('status'),
        publisher: app.get('publisher')?.get('name'),
        pricing: app.get('pricing'),
        preview: {
          images: app.get('preview')?.get('images'),
          demoUrl: app.get('preview')?.get('demoUrl'),
        },
      });
      console.log('---');
    });

    // Query publishers
    const publisherQuery = new Parse.Query('Publisher');
    const publishers = await publisherQuery.find({ useMasterKey: true });

    console.log('\nFound', publishers.length, 'publishers:\n');
    publishers.forEach(pub => {
      console.log('Publisher:', {
        id: pub.id,
        name: pub.get('name'),
        description: pub.get('description'),
        website: pub.get('website'),
      });
    });

    // Query previews
    const previewQuery = new Parse.Query('Preview');
    const previews = await previewQuery.find({ useMasterKey: true });

    console.log('\nFound', previews.length, 'previews:\n');
    previews.forEach(preview => {
      console.log('Preview:', {
        id: preview.id,
        images: preview.get('images'),
        demoUrl: preview.get('demoUrl'),
      });
    });
  } catch (error) {
    console.error('Error checking marketplace apps:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkMarketplaceApps();
