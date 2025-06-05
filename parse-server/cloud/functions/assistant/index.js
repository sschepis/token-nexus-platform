// parse-server/cloud/functions/assistant/index.js

// This file ensures all AI assistant-related cloud functions are loaded by Parse Server.
// When Parse Server initializes, it typically loads 'main.js'.
// 'main.js' can then require this 'index.js' to load all assistant-related functions.

// Load shared utilities first
require('./shared');

// Load all individual assistant functions
require('./assistantProcessMessage');
require('./assistantGetCapabilities');
require('./assistantExecuteAction');

console.log("AI assistant cloud functions initialized from assistant/index.js");