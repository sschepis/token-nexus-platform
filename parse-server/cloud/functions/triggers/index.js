// parse-server/cloud/functions/triggers/index.js

// This file ensures all trigger-related cloud functions are loaded by Parse Server.
// When Parse Server initializes, it typically loads 'main.js'.
// 'main.js' can then require this 'index.js' to load all trigger-related functions.

// Load shared utilities first
require('./shared');

// Load all individual trigger functions
require('./createApplicationTrigger');
require('./updateApplicationTrigger');
require('./testApplicationTrigger');
require('./listTriggerExecutions');
require('./testTrigger');
require('./getTriggerLogs');
require('./getTriggerStats');

// Load initialization and Parse hooks
require('./initialization');

console.log("Trigger cloud functions initialized from triggers/index.js");