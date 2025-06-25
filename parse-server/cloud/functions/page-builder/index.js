const pageBuilderFunctions = require('./pageBuilder');

// Auto-initialize the page builder functions
pageBuilderFunctions(Parse);

console.log('✓ Page builder cloud functions loaded');

// Also export the function for manual initialization if needed
module.exports = Parse => {
  pageBuilderFunctions(Parse);
  console.log('✓ Page builder cloud functions loaded');
};