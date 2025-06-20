// parse-server/src/cloud/organizations/index.js

// This file ensures all cloud functions defined in this directory are loaded by Parse Server.
// When Parse Server initializes, it typically loads 'main.js'.
// 'main.js' can then require this 'index.js' to load all organization-related functions.

// Removed test functions that were causing module not found errors
require('./listOrganizationsForAdmin');
require('./getOrganizationDetailsAdmin');
require('./createOrganization');
require('./suspendOrganization');
require('./activateOrganization');
require('./getOrganizationSettings');
require('./updateOrganizationSettings');
require('./createOrgAndUserWithRole');
require('./getUserOrganizations');
require('./getUserDetails');
require('./getOrganizationProfile');
require('./setCurrentOrganization');

console.log("Organization cloud functions initialized from organizations/index.js");