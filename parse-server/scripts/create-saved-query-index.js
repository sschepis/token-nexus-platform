const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createSavedQueryIndex() {
  try {
    console.log('Creating index for SavedQuery collection...');

    // Create compound index on createdBy and name fields
    const schema = new Parse.Schema('SavedQuery');
    
    // Add createdBy field if it doesn't exist
    await schema.addField('createdBy', 'String', {
      required: true,
      indexed: true
    });

    // Add name field if it doesn't exist
    await schema.addField('name', 'String', {
      required: true,
      indexed: true
    });

    // Add query field if it doesn't exist
    await schema.addField('query', 'Object', {
      required: true
    });

    // Save the schema updates
    await schema.save();

    // Create the index
    await schema.addIndex('createdBy_name_index', {
      createdBy: 1,
      name: 1
    });

    console.log('Successfully created index for SavedQuery collection');
    process.exit(0);
  } catch (error) {
    console.error('Error creating index:', error);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

createSavedQueryIndex();
