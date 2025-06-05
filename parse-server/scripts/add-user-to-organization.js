const Parse = require('parse/node');

require('dotenv').config();

const { PARSE_APP_ID, PARSE_MASTER_KEY, PARSE_SERVER_URL } = process.env;

Parse.initialize(PARSE_APP_ID, null, PARSE_MASTER_KEY);
Parse.serverURL = PARSE_SERVER_URL;

async function addUserToOrganization(userId, organizationId, role = 'member') {
  try {
    const result = await Parse.Cloud.run(
      'addUserToOrganization',
      {
        userId,
        organizationId,
        role,
      },
      { useMasterKey: true }
    );

    console.log('Success:', result.message);

    return true;
  } catch (error) {
    console.error('Error adding user to organization:', error.message);

    return false;
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node add-user-to-organization.js <userId> <organizationId> [role]');
  process.exit(1);
}

const [userId, organizationId, role] = args;

// Execute
addUserToOrganization(userId, organizationId, role)
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  });
