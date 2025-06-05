// parse-server/cloud/functions/access-policy/index.js

// This file ensures all access policy-related cloud functions are loaded by Parse Server.
// When Parse Server initializes, it typically loads 'main.js'.
// 'main.js' can then require this 'index.js' to load all access policy-related functions.

// Load shared utilities first
require('./shared');

// Load all individual access policy functions
require('./createAccessPolicy');
require('./updateAccessPolicy');
require('./getPolicies');
require('./evaluateAccess');
require('./analyzePolicyImpact');

console.log("Access policy cloud functions initialized from access-policy/index.js");