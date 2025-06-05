/**
 * Parse Installation Cache Clearing Instructions
 * 
 * This script provides instructions for manually clearing Parse installation cache
 * since localStorage is only available in browser environments.
 */

console.log('='.repeat(60));
console.log('PARSE INSTALLATION CACHE CLEARING INSTRUCTIONS');
console.log('='.repeat(60));
console.log();
console.log('Since localStorage is only available in browsers, please follow these steps:');
console.log();
console.log('1. Open your browser and navigate to your Token Nexus Platform app');
console.log('2. Open Developer Tools (F12 or right-click → Inspect)');
console.log('3. Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)');
console.log('4. In the left sidebar, find "Local Storage"');
console.log('5. Click on your domain (e.g., localhost:3000)');
console.log('6. Look for and delete these keys:');
console.log('   - parse/gemcms_dev/installationId');
console.log('   - parse/gemcms_dev/currentUser');
console.log('   - Any other keys starting with "parse/"');
console.log();
console.log('Alternative method:');
console.log('7. In the Console tab, run this command:');
console.log('   localStorage.clear();');
console.log();
console.log('8. Refresh the page to reinitialize the Parse installation');
console.log();
console.log('='.repeat(60));
console.log('CACHE CLEARING COMPLETE - Please follow the browser instructions above');
console.log('='.repeat(60));