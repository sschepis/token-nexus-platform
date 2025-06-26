// Dashboard Cloud Functions Entry Point
// This file imports and registers all dashboard-related cloud functions

// Import all dashboard modules
require('./config');
require('./metrics');
require('./activity');
require('./health');
require('./queries');
require('./charts');

