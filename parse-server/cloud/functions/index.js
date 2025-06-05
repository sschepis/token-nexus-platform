// Centralized Cloud Function imports for Parse Server

// Core Organization Management
require('./organization/organizationManagement');
require('./organization/organizations');
require('./organization/orgUsers');

// User Management
require('./global/globalUserManagement');

// App Framework & Marketplace
require('./schema/appFrameworkSchemas');
require('./scheduledJobs/appScheduledJobs');
require('./triggers/appTriggers');
require('./apis/appAPIs');
require('./bootstrap/appFrameworkInit');
require('./integrations/appStore');
require('./organization/orgAppInstallations');
require('./integrations/marketplaceManagement');

// AI Assistant
require('./ai/aiAssistant');
require('./ai/aiAssistantSettings');
// require('./ai/aiFunctions'); // Commented out as file not found
require('./ai/scheduledTasks');


// Blockchain & Contracts
require('./blockchain/blockchain');
require('./organization/orgContracts');
require('./integrations/dfnsWallet');
require('./blockchain/chainConfiguration');
require('./blockchain/contractDeployment');

// Schema & Artifacts
require('./schema/schemas');
require('./artifacts/artifacts');
require('./object-management/objectManager');

// Setup
require('./bootstrap/setup');

// Integrations
require('./integrations/integrations');
require('./apis/apiManagement');

// Dashboard & Reporting
require('./dashboard/dashboard');
require('./reports/reportManagement');

// CMS & Marketing
require('./cms/marketingCMS');
require('./cms/pageBuilder');
require('./cms/pageManagement');
require('./cms/component');

// Global Management
require('./global/globalOrgManagement');
require('./organization/parentOrgManagement');

// App Bundle Management
require('./bootstrap/appBundleManagement');

// Other specific functions
require('./application/applicationManagement');
require('./configuration/configurationManagement');
require('./configuration/platformConfig');
require('./environment'); // Environment related functions
require('./security/errorTracking');
require('./analytics/getSystemAnalytics');
require('./bootstrap/initialization');
require('./testing/visualTesting');
require('./testing/visualTestingApi');
require('./workflow/workflow');

// Existing sub-modules that had `index.js` files
require('./access-policy');
require('./ai');
require('./analytics');
require('./application');
require('./assistant');
require('./auth');
require('./components');
require('./initialization');
require('./organization');
require('./roles');
require('./triggers');
require('./webhooks');
require('./tokens');
require('./oauth');

// No module.exports needed here.
// The require() statements are enough to define the Parse.Cloud.defines globally.
