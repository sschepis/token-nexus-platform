// Bootstrap functions index
// This file imports all bootstrap-related cloud functions

// Platform setup functions
require('./platformSetup');

// Sample data seeding functions
require('./sampleData');

// Automated installation functions
require('./automatedInstall');

// User and organization fix utilities
require('./userOrgFixes');

// Smart Contract Studio initialization
require('./smartContractStudio');

console.log('Bootstrap cloud functions loaded successfully');

module.exports = {};