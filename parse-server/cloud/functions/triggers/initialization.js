/* global Parse */

const { registerTriggers } = require('./shared');

// Register triggers when the server starts
registerTriggers().catch(error => {
  console.error('Failed to register triggers:', error);
});

// Re-register triggers when they are modified
Parse.Cloud.afterSave('CMSTrigger', async () => {
  await registerTriggers();
});

Parse.Cloud.afterDelete('CMSTrigger', async () => {
  await registerTriggers();
});